// The backend from KAN-6; its port is fixed both in local dev and in the
// Docker image (see scripts/docker-entrypoint.sh).
const API_BASE_URL = "http://localhost:8000";

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
}

export async function sendChatMessage(
  messages: ChatMessage[],
  documentType: string | null
): Promise<ChatTurnResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, documentType }),
  });

  if (!response.ok) {
    throw new Error("The AI assistant is unavailable right now. Please try again.");
  }

  return response.json();
}
