import { API_BASE_URL } from "./api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatTurnResponse {
  reply: string;
  documentType: string | null;
  documentTypeConfirmed: boolean;
  fields: Record<string, string | null>;
  isComplete: boolean;
  documentId: number | null;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  documentType: string | null,
  documentId: number | null
): Promise<ChatTurnResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, documentType, documentId }),
  });

  if (response.status === 401) {
    throw new Error("Your session expired. Please sign in again.");
  }
  if (!response.ok) {
    throw new Error("The AI assistant is unavailable right now. Please try again.");
  }

  return response.json();
}
