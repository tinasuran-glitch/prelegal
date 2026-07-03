"use client";

import { useEffect, useRef, useState } from "react";
import { sendChatMessage, type ChatMessage } from "@/lib/chat";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I can help you draft a Mutual NDA, Cloud Service Agreement, Pilot Agreement, and several other legal documents. What kind of agreement do you need today?",
};

export function ChatPanel({
  onTurnComplete,
}: {
  onTurnComplete: (
    documentType: string | null,
    fields: Record<string, string | null>,
    isComplete: boolean
  ) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Return focus to the input once the assistant's reply lands (the input
  // is disabled while sending, so it can't hold focus until re-enabled).
  useEffect(() => {
    if (!isSending) {
      inputRef.current?.focus();
    }
  }, [isSending]);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    const nextMessages = [...messages, { role: "user", content } as ChatMessage];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const result = await sendChatMessage(nextMessages, documentType);
      setMessages([...nextMessages, { role: "assistant", content: result.reply }]);
      if (result.documentTypeConfirmed && result.documentType) {
        setDocumentType(result.documentType);
      }
      onTurnComplete(result.documentTypeConfirmed ? result.documentType : null, result.fields, result.isComplete);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="no-print flex flex-col gap-4 p-6 lg:h-screen lg:min-h-0">
      <header>
        <h1 className="text-2xl font-semibold" style={{ color: "#032147" }}>
          Prelegal Document Creator
        </h1>
        <p className="text-sm" style={{ color: "#888888" }}>
          Chat with the assistant to draft your legal agreement.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <ul className="flex flex-col gap-3">
          {messages.map((message, index) => (
            <li
              key={index}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              {message.content}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isSending}
          placeholder="Type your answer…"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          style={{ borderColor: "#209dd7" }}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="rounded-md px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "#753991" }}
        >
          {isSending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
