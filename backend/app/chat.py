import re
from datetime import date, datetime, timezone
from typing import Literal

from litellm import completion
from pydantic import BaseModel, ConfigDict, Field, create_model
from pydantic.alias_generators import to_camel

from app.catalog import DOCUMENT_TYPES, DocumentType

MODEL = "openrouter/openai/gpt-oss-120b"
# "smartstart" (per the project skill docs) isn't a real OpenRouter provider slug —
# confirmed via a 404 when forced strict. "cerebras" is the real slug and is what
# CLAUDE.md's AI design section actually asks for; ~15-20x faster in practice.
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

_DOCUMENT_TYPE_IDS = tuple(DOCUMENT_TYPES.keys())
DocumentTypeId = Literal[_DOCUMENT_TYPE_IDS]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(CamelModel):
    messages: list[ChatMessage]
    document_type: DocumentTypeId | None = None


class ChatTurnResponse(CamelModel):
    reply: str
    document_type: DocumentTypeId | None = None
    document_type_confirmed: bool = False
    fields: dict[str, str | None] = {}
    is_complete: bool = False


def ensure_follow_up_question(reply: str, missing: list[str]) -> str:
    """Guarantees a follow-up question when fields are still missing, since the
    model doesn't reliably comply with the system prompt's instruction to ask one."""
    if "?" in reply or not missing:
        return reply
    return f"{reply.rstrip()} Could you also tell me {', '.join(missing)}?"


# ---- Document-type routing ----


class RoutingResult(CamelModel):
    reply: str
    document_type: DocumentTypeId | None = None
    confirmed: bool = False


def build_routing_system_prompt() -> str:
    catalog_list = "\n".join(
        f'- "{doc.id}": {doc.name} — {doc.description}' for doc in DOCUMENT_TYPES.values()
    )
    return f"""You are a friendly legal-intake assistant for a service that only \
generates the following document types:

{catalog_list}

Figure out which of these document types (if any) the user wants, using the id \
in quotes above. Rules:
- If the user's request clearly and directly matches one of these types, set \
document_type to its id and confirmed to true, and reply with a short \
acknowledgement plus your first question about that document's details.
- If the user asks for something not in this list, explain briefly that you \
can't generate that, suggest the closest match from the list above by name, set \
document_type to that id, and set confirmed to false — do not start asking \
about its fields until the user agrees.
- If your previous message was such a suggestion and this message agrees to it, \
set document_type to the previously suggested id and confirmed to true.
- If your previous message was such a suggestion and this message declines or \
asks for something else, don't confirm; either propose a different closest \
match (confirmed false) or, if nothing reasonably matches, say so and ask what \
they'd like instead (document_type null).
- If it isn't yet clear what the user wants at all, leave document_type null \
and ask what kind of document they need."""


def call_routing_llm(messages: list[ChatMessage]) -> RoutingResult:
    llm_messages = [{"role": "system", "content": build_routing_system_prompt()}] + [
        {"role": m.role, "content": m.content} for m in messages
    ]
    response = completion(
        model=MODEL,
        messages=llm_messages,
        response_format=RoutingResult,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return RoutingResult.model_validate_json(response.choices[0].message.content)


def run_routing_turn(messages: list[ChatMessage]) -> ChatTurnResponse:
    routing = call_routing_llm(messages)
    return ChatTurnResponse(
        reply=routing.reply,
        document_type=routing.document_type,
        document_type_confirmed=routing.confirmed,
    )


# ---- Mutual NDA (own fixed field set — richer than what its Standard Terms
# spans alone reveal, since party/signature details live only on its Cover Page) ----

MNDA_REQUIRED_FIELDS = [
    "party1_name",
    "party1_company",
    "party2_name",
    "party2_company",
    "purpose",
    "effective_date",
    "governing_law",
    "jurisdiction",
]

ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

MNDA_FIELD_LABELS = {
    "party1_name": "the first party's signatory name",
    "party1_company": "the first party's company",
    "party2_name": "the second party's signatory name",
    "party2_company": "the second party's company",
    "purpose": "the purpose of sharing confidential information",
    "effective_date": "the effective date",
    "governing_law": "the governing law",
    "jurisdiction": "the jurisdiction for disputes",
}


class NdaFields(CamelModel):
    party1_name: str | None = None
    party1_title: str | None = None
    party1_company: str | None = None
    party1_notice_address: str | None = None
    party2_name: str | None = None
    party2_title: str | None = None
    party2_company: str | None = None
    party2_notice_address: str | None = None
    purpose: str | None = None
    effective_date: str | None = None
    mnda_term_type: Literal["expires", "continues"] | None = None
    mnda_term_years: str | None = None
    confidentiality_term_type: Literal["years", "perpetuity"] | None = None
    confidentiality_years: str | None = None
    governing_law: str | None = None
    jurisdiction: str | None = None
    modifications: str | None = None


class MndaLLMTurn(CamelModel):
    reply: str
    fields: NdaFields


def build_mnda_system_prompt(today: date) -> str:
    return f"""You are a friendly legal-intake assistant helping a user fill out a \
Common Paper Mutual Non-Disclosure Agreement (Mutual NDA). Have a natural, \
freeform conversation to learn the following fields. Ask about a few related \
fields at a time rather than one at a time, and don't repeat questions for \
information already given earlier in the conversation.

Required fields (the NDA cannot be finished without these):
- party1_name, party1_company: signatory name and company for the first party
- party2_name, party2_company: signatory name and company for the second party
- purpose: why the parties are sharing confidential information
- effective_date: the date the agreement starts, as an ISO 8601 date \
(YYYY-MM-DD). Resolve relative dates (e.g. "today", "next Monday") using \
today's date, which is {today.isoformat()}.
- governing_law: the state/jurisdiction whose law governs the agreement
- jurisdiction: the courts where disputes will be resolved

Optional fields (ask only if it comes up naturally, otherwise leave unset):
- party1_title, party2_title: signatory job titles
- party1_notice_address, party2_notice_address: notice addresses
- mnda_term_type ("expires" or "continues") and mnda_term_years: how long the \
NDA itself lasts
- confidentiality_term_type ("years" or "perpetuity") and \
confidentiality_years: how long confidentiality obligations last
- modifications: any custom changes to the standard NDA terms

In every reply, return the complete set of fields known so far (not just what \
changed this turn) — once a field is established, keep returning it even if a \
later message doesn't repeat it.

If any required field is still unknown after this message, your reply MUST \
end with a direct follow-up question asking for exactly the missing required \
field(s). Never end a reply with only a statement or acknowledgement while \
required information is still missing. Once all required fields are known, \
say so and briefly summarize what you have instead of asking another \
question."""


def call_mnda_llm(messages: list[ChatMessage]) -> MndaLLMTurn:
    system_prompt = build_mnda_system_prompt(datetime.now(timezone.utc).date())
    llm_messages = [{"role": "system", "content": system_prompt}] + [
        {"role": m.role, "content": m.content} for m in messages
    ]
    response = completion(
        model=MODEL,
        messages=llm_messages,
        response_format=MndaLLMTurn,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return MndaLLMTurn.model_validate_json(response.choices[0].message.content)


def mnda_missing_required_fields(fields: NdaFields) -> list[str]:
    missing = [name for name in MNDA_REQUIRED_FIELDS if not getattr(fields, name)]
    if "effective_date" not in missing and not ISO_DATE_RE.match(fields.effective_date or ""):
        missing.append("effective_date")
    return missing


def mnda_is_complete(fields: NdaFields) -> bool:
    return not mnda_missing_required_fields(fields)


def run_mnda_turn(messages: list[ChatMessage]) -> ChatTurnResponse:
    turn = call_mnda_llm(messages)
    fields = turn.fields
    missing = [MNDA_FIELD_LABELS[name] for name in mnda_missing_required_fields(fields)]
    return ChatTurnResponse(
        reply=ensure_follow_up_question(turn.reply, missing),
        document_type="mutual-nda",
        document_type_confirmed=True,
        fields=fields.model_dump(by_alias=True),
        is_complete=mnda_is_complete(fields),
    )


# ---- Generic documents (field set derived from each template's own spans) ----


def _sanitize_field_name(label: str, index: int, used: set[str]) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_") or f"field_{index}"
    if slug in used:
        slug = f"{slug}_{index}"
    return slug


def build_generic_fields_model(doc_type: DocumentType) -> type[BaseModel]:
    used: set[str] = set()
    fields = {}
    for i, label in enumerate(doc_type.field_labels):
        name = _sanitize_field_name(label, i, used)
        used.add(name)
        fields[name] = (str | None, Field(default=None, alias=label))
    return create_model(
        f"{doc_type.id}_fields",
        __config__=ConfigDict(populate_by_name=True),
        **fields,
    )


def build_generic_system_prompt(doc_type: DocumentType, today: date) -> str:
    field_list = "\n".join(f"- {label}" for label in doc_type.field_labels)
    return f"""You are a friendly legal-intake assistant helping a user fill out a \
{doc_type.name}. {doc_type.description}

Have a natural, freeform conversation to learn values for the following fields. \
Ask about a few related fields at a time rather than one at a time, and don't \
repeat questions for information already given earlier in the conversation. If \
a field is a date, use ISO 8601 format (YYYY-MM-DD); resolve relative dates \
(e.g. "today") using today's date, which is {today.isoformat()}.

Fields:
{field_list}

In every reply, return the complete set of fields known so far (not just what \
changed this turn) — once a field is established, keep returning it even if a \
later message doesn't repeat it.

If any field is still unknown after this message, your reply MUST end with a \
direct follow-up question asking for exactly the missing field(s). Never end a \
reply with only a statement or acknowledgement while fields are still missing. \
Once all fields are known, say so and briefly summarize what you have instead \
of asking another question."""


def call_generic_llm(doc_type: DocumentType, messages: list[ChatMessage]) -> tuple[str, dict[str, str | None]]:
    fields_model = build_generic_fields_model(doc_type)
    turn_model = create_model(
        f"{doc_type.id}_turn",
        __config__=ConfigDict(populate_by_name=True),
        reply=(str, ...),
        fields=(fields_model, ...),
    )

    system_prompt = build_generic_system_prompt(doc_type, datetime.now(timezone.utc).date())
    llm_messages = [{"role": "system", "content": system_prompt}] + [
        {"role": m.role, "content": m.content} for m in messages
    ]
    response = completion(
        model=MODEL,
        messages=llm_messages,
        response_format=turn_model,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    turn = turn_model.model_validate_json(response.choices[0].message.content)
    return turn.reply, turn.fields.model_dump(by_alias=True)


def generic_missing_fields(doc_type: DocumentType, fields: dict[str, str | None]) -> list[str]:
    return [label for label in doc_type.field_labels if not fields.get(label)]


def run_generic_turn(doc_type: DocumentType, messages: list[ChatMessage]) -> ChatTurnResponse:
    reply, fields = call_generic_llm(doc_type, messages)
    missing = generic_missing_fields(doc_type, fields)
    return ChatTurnResponse(
        reply=ensure_follow_up_question(reply, missing),
        document_type=doc_type.id,
        document_type_confirmed=True,
        fields=fields,
        is_complete=not missing,
    )


# ---- Dispatcher ----


def run_chat_turn(request: ChatRequest) -> ChatTurnResponse:
    if request.document_type is None:
        return run_routing_turn(request.messages)

    doc_type = DOCUMENT_TYPES[request.document_type]
    if doc_type.is_mnda:
        return run_mnda_turn(request.messages)
    return run_generic_turn(doc_type, request.messages)
