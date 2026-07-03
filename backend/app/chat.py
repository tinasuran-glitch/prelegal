import re
from datetime import date, timezone, datetime
from typing import Literal

from litellm import completion
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

MODEL = "openrouter/openai/gpt-oss-120b"
# "smartstart" (per the project skill docs) isn't a real OpenRouter provider slug —
# confirmed via a 404 when forced strict. "cerebras" is the real slug and is what
# CLAUDE.md's AI design section actually asks for; ~15-20x faster in practice.
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

REQUIRED_FIELDS = [
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

FIELD_LABELS = {
    "party1_name": "the first party's signatory name",
    "party1_company": "the first party's company",
    "party2_name": "the second party's signatory name",
    "party2_company": "the second party's company",
    "purpose": "the purpose of sharing confidential information",
    "effective_date": "the effective date",
    "governing_law": "the governing law",
    "jurisdiction": "the jurisdiction for disputes",
}


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ChatMessage(CamelModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(CamelModel):
    messages: list[ChatMessage]


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


class LLMChatTurn(CamelModel):
    reply: str
    fields: NdaFields


class ChatTurnResponse(CamelModel):
    reply: str
    fields: NdaFields
    is_complete: bool


def build_system_prompt(today: date) -> str:
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


def call_llm(messages: list[ChatMessage]) -> LLMChatTurn:
    system_prompt = build_system_prompt(datetime.now(timezone.utc).date())
    llm_messages = [{"role": "system", "content": system_prompt}] + [
        {"role": m.role, "content": m.content} for m in messages
    ]
    response = completion(
        model=MODEL,
        messages=llm_messages,
        response_format=LLMChatTurn,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return LLMChatTurn.model_validate_json(response.choices[0].message.content)


def missing_required_fields(fields: NdaFields) -> list[str]:
    missing = [name for name in REQUIRED_FIELDS if not getattr(fields, name)]
    if "effective_date" not in missing and not ISO_DATE_RE.match(fields.effective_date or ""):
        missing.append("effective_date")
    return missing


def compute_is_complete(fields: NdaFields) -> bool:
    return not missing_required_fields(fields)


def ensure_follow_up_question(reply: str, fields: NdaFields) -> str:
    """Guarantees a follow-up question when required info is still missing, since the
    model doesn't reliably comply with the system prompt's instruction to ask one."""
    if "?" in reply:
        return reply
    missing = missing_required_fields(fields)
    if not missing:
        return reply
    labels = [FIELD_LABELS[name] for name in missing]
    return f"{reply.rstrip()} Could you also tell me {', '.join(labels)}?"


def run_chat_turn(request: ChatRequest) -> ChatTurnResponse:
    turn = call_llm(request.messages)
    fields = turn.fields
    return ChatTurnResponse(
        reply=ensure_follow_up_question(turn.reply, fields),
        fields=fields,
        is_complete=compute_is_complete(fields),
    )
