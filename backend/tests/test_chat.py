from app.catalog import DOCUMENT_TYPES, normalize_label
from app.chat import (
    ChatMessage,
    ChatRequest,
    NdaFields,
    RoutingResult,
    build_generic_fields_model,
    ensure_follow_up_question,
    generic_missing_fields,
    mnda_is_complete,
    run_chat_turn,
)

COMPLETE_MNDA_FIELDS = NdaFields(
    party1_name="Ada Lovelace",
    party1_company="Analytical Engines Inc.",
    party2_name="Grace Hopper",
    party2_company="Compiler Co.",
    purpose="Evaluating a partnership.",
    effective_date="2026-07-02",
    governing_law="Delaware",
    jurisdiction="New Castle, DE",
)


# ---- catalog ----


def test_normalize_label_strips_possessive_variants():
    assert normalize_label("Customer") == "Customer"
    assert normalize_label("Customer's") == "Customer"
    assert normalize_label("Customer’s") == "Customer"


def test_document_types_cover_all_eleven_non_coverpage_entries():
    assert len(DOCUMENT_TYPES) == 11
    assert DOCUMENT_TYPES["mutual-nda"].is_mnda is True
    assert all(doc.is_mnda is False for doc_id, doc in DOCUMENT_TYPES.items() if doc_id != "mutual-nda")
    assert "mutual-nda-coverpage" not in DOCUMENT_TYPES


def test_pilot_agreement_field_labels_are_deduped_and_readable():
    labels = DOCUMENT_TYPES["pilot-agreement"].field_labels
    assert "Customer" in labels
    assert "Provider" in labels
    assert "Governing Law" in labels
    # possessive variants collapse into the base label, not duplicated
    assert labels.count("Customer") == 1


# ---- shared follow-up-question guarantee ----


def test_ensure_follow_up_question_leaves_question_untouched():
    reply = "Got it, thanks! What's the purpose of the agreement?"
    assert ensure_follow_up_question(reply, ["purpose"]) == reply


def test_ensure_follow_up_question_leaves_complete_reply_untouched():
    reply = "All set, here is your summary."
    assert ensure_follow_up_question(reply, []) == reply


def test_ensure_follow_up_question_appends_question_when_missing():
    reply = "Great, thanks! I've recorded that."
    result = ensure_follow_up_question(reply, ["the purpose", "the jurisdiction"])
    assert result.startswith(reply)
    assert result.endswith("?")
    assert "the purpose" in result
    assert "the jurisdiction" in result


# ---- MNDA completeness ----


def test_mnda_is_complete_true_when_all_required_fields_present():
    assert mnda_is_complete(COMPLETE_MNDA_FIELDS) is True


def test_mnda_is_complete_false_when_a_required_field_missing():
    fields = COMPLETE_MNDA_FIELDS.model_copy(update={"purpose": None})
    assert mnda_is_complete(fields) is False


def test_mnda_is_complete_false_for_non_iso_date():
    fields = COMPLETE_MNDA_FIELDS.model_copy(update={"effective_date": "July 2, 2026"})
    assert mnda_is_complete(fields) is False


# ---- generic dynamic field model ----


def test_build_generic_fields_model_uses_original_labels_as_aliases():
    doc_type = DOCUMENT_TYPES["pilot-agreement"]
    model_cls = build_generic_fields_model(doc_type)

    instance = model_cls.model_validate({"Customer": "Acme Corp", "Provider": "Globex Inc"})

    assert instance.model_dump(by_alias=True)["Customer"] == "Acme Corp"
    assert instance.model_dump(by_alias=True)["Provider"] == "Globex Inc"


def test_generic_missing_fields_lists_only_unset_labels():
    doc_type = DOCUMENT_TYPES["pilot-agreement"]
    fields = {label: "x" for label in doc_type.field_labels}
    fields["Governing Law"] = None

    assert generic_missing_fields(doc_type, fields) == ["Governing Law"]


def test_generic_missing_fields_empty_when_all_present():
    doc_type = DOCUMENT_TYPES["pilot-agreement"]
    fields = {label: "x" for label in doc_type.field_labels}

    assert generic_missing_fields(doc_type, fields) == []


# ---- dispatcher ----


def test_run_chat_turn_routes_to_routing_when_no_document_type(monkeypatch):
    def fake_routing(messages):
        return RoutingResult(reply="What kind of document do you need?", document_type=None, confirmed=False)

    monkeypatch.setattr("app.chat.call_routing_llm", fake_routing)

    request = ChatRequest(messages=[ChatMessage(role="user", content="hi")])
    result = run_chat_turn(request)

    assert result.document_type is None
    assert result.document_type_confirmed is False


def test_run_chat_turn_routes_to_mnda_when_confirmed(monkeypatch):
    from app.chat import MndaLLMTurn

    def fake_mnda(messages):
        return MndaLLMTurn(reply="Here is your summary.", fields=COMPLETE_MNDA_FIELDS)

    monkeypatch.setattr("app.chat.call_mnda_llm", fake_mnda)

    request = ChatRequest(
        messages=[ChatMessage(role="user", content="Acme and Globex")],
        document_type="mutual-nda",
    )
    result = run_chat_turn(request)

    assert result.document_type == "mutual-nda"
    assert result.is_complete is True
    assert result.fields["party1Name"] == "Ada Lovelace"


def test_run_chat_turn_routes_to_generic_for_non_mnda_type(monkeypatch):
    def fake_generic(doc_type, messages):
        fields = {label: "x" for label in doc_type.field_labels}
        return "Here is your summary.", fields

    monkeypatch.setattr("app.chat.call_generic_llm", fake_generic)

    request = ChatRequest(
        messages=[ChatMessage(role="user", content="Acme and Globex")],
        document_type="pilot-agreement",
    )
    result = run_chat_turn(request)

    assert result.document_type == "pilot-agreement"
    assert result.is_complete is True
    assert result.fields["Customer"] == "x"
