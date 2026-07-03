from app.chat import (
    ChatMessage,
    ChatRequest,
    LLMChatTurn,
    NdaFields,
    compute_is_complete,
    ensure_follow_up_question,
    run_chat_turn,
)

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


def test_ensure_follow_up_question_leaves_reply_with_question_untouched():
    fields = COMPLETE_FIELDS.model_copy(update={"purpose": None})
    reply = "Got it, thanks! What's the purpose of the agreement?"
    assert ensure_follow_up_question(reply, fields) == reply


def test_ensure_follow_up_question_leaves_complete_reply_untouched():
    reply = "All set, here is your summary."
    assert ensure_follow_up_question(reply, COMPLETE_FIELDS) == reply


def test_ensure_follow_up_question_appends_question_when_model_omits_one():
    fields = COMPLETE_FIELDS.model_copy(update={"purpose": None, "jurisdiction": None})
    reply = "Great, thanks! I've recorded the parties."

    result = ensure_follow_up_question(reply, fields)

    assert result.startswith(reply)
    assert result.endswith("?")
    assert "purpose" in result
    assert "jurisdiction" in result


def test_run_chat_turn_appends_follow_up_question_when_model_omits_one(monkeypatch):
    incomplete_fields = COMPLETE_FIELDS.model_copy(update={"purpose": None})

    def fake_call_llm(messages):
        return LLMChatTurn(reply="Great, thanks! I've recorded the parties.", fields=incomplete_fields)

    monkeypatch.setattr("app.chat.call_llm", fake_call_llm)

    request = ChatRequest(messages=[ChatMessage(role="user", content="hi")])
    result = run_chat_turn(request)

    assert result.is_complete is False
    assert result.reply.endswith("?")
