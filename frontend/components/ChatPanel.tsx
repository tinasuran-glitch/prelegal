"use client";

import { useState } from "react";
import { sendChatMessage, type ChatMessage, type PartialNdaFields } from "@/lib/chat";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'll help you put together a Common Paper Mutual NDA. Let's start with the two parties — who's involved (names, titles, and companies)?",
};

export function ChatPanel({
  onFieldsChange,
}: {
  onFieldsChange: (fields: PartialNdaFields, isComplete: boolean) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const result = await sendChatMessage(nextMessages);
      setMessages([...nextMessages, { role: "assistant", content: result.reply }]);
      onFieldsChange(result.fields, result.isComplete);
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
          Mutual NDA Creator
        </h1>
        <p className="text-sm" style={{ color: "#888888" }}>
          Chat with the assistant to fill in your Mutual NDA.
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
