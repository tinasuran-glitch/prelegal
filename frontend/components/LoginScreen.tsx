"use client";

import { useState } from "react";
import { useAuth } from "./AuthContext";

export function LoginScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === "signin") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold" style={{ color: "#032147" }}>
            {mode === "signin" ? "Sign in to Prelegal" : "Create your Prelegal account"}
          </h1>
          <p className="text-sm" style={{ color: "#888888" }}>
            Draft legal agreements from templates, guided by AI chat.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            style={{ borderColor: "#209dd7" }}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            style={{ borderColor: "#209dd7" }}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "#753991" }}
        >
          {isSubmitting ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="text-sm underline"
          style={{ color: "#209dd7" }}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
