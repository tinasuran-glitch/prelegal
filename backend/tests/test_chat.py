from app.chat import ChatMessage, ChatRequest, LLMChatTurn, NdaFields, compute_is_complete, run_chat_turn

COMPLETE_FIELDS = NdaFields(
    party1_name="Ada Lovelace",
    party1_company="Analytical Engines Inc.",
    party2_name="Grace Hopper",
    party2_company="Compiler Co.",
    purpose="Evaluating a partnership.",
    effective_date="2026-07-02",
    governing_law="Delaware",
    jurisdiction="New Castle, DE",
)


def test_compute_is_complete_true_when_all_required_fields_present():
    assert compute_is_complete(COMPLETE_FIELDS) is True


def test_compute_is_complete_false_when_a_required_field_missing():
    fields = COMPLETE_FIELDS.model_copy(update={"purpose": None})
    assert compute_is_complete(fields) is False


def test_compute_is_complete_false_for_non_iso_date():
    fields = COMPLETE_FIELDS.model_copy(update={"effective_date": "July 2, 2026"})
    assert compute_is_complete(fields) is False


def test_run_chat_turn_computes_is_complete_from_llm_fields(monkeypatch):
    def fake_call_llm(messages):
        return LLMChatTurn(reply="Here is your NDA summary.", fields=COMPLETE_FIELDS)

    monkeypatch.setattr("app.chat.call_llm", fake_call_llm)

    request = ChatRequest(messages=[ChatMessage(role="user", content="hi")])
    result = run_chat_turn(request)

    assert result.reply == "Here is your NDA summary."
    assert result.is_complete is True
    assert result.fields.party1_name == "Ada Lovelace"
