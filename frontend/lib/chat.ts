import type { NdaFormData } from "./types";

// The backend from KAN-6; its port is fixed both in local dev and in the
// Docker image (see scripts/docker-entrypoint.sh).
const API_BASE_URL = "http://localhost:8000";

const PLACEHOLDER = "[Not yet provided]";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type PartialNdaFields = { [K in keyof NdaFormData]: NdaFormData[K] | null };

interface ChatTurnResponse {
  reply: string;
  fields: PartialNdaFields;
  isComplete: boolean;
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatTurnResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error("The AI assistant is unavailable right now. Please try again.");
  }

  return response.json();
}

/** Fills in placeholders for fields the chat hasn't gathered yet, so the live preview always renders. */
export function toFormData(fields: PartialNdaFields): NdaFormData {
  return {
    party1Name: fields.party1Name || PLACEHOLDER,
    party1Title: fields.party1Title || "",
    party1Company: fields.party1Company || PLACEHOLDER,
    party1NoticeAddress: fields.party1NoticeAddress || "",
    party2Name: fields.party2Name || PLACEHOLDER,
    party2Title: fields.party2Title || "",
    party2Company: fields.party2Company || PLACEHOLDER,
    party2NoticeAddress: fields.party2NoticeAddress || "",
    purpose: fields.purpose || PLACEHOLDER,
    effectiveDate: fields.effectiveDate || "",
    mndaTermType: fields.mndaTermType || "expires",
    mndaTermYears: fields.mndaTermYears || "1",
    confidentialityTermType: fields.confidentialityTermType || "years",
    confidentialityYears: fields.confidentialityYears || "1",
    governingLaw: fields.governingLaw || PLACEHOLDER,
    jurisdiction: fields.jurisdiction || PLACEHOLDER,
    modifications: fields.modifications || "",
  };
}
