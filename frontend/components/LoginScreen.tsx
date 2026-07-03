"use client";

import { useState } from "react";

export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-6 dark:bg-black">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onLoggedIn();
        }}
        className="flex w-full max-w-sm flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold" style={{ color: "#032147" }}>
            Sign in to Prelegal
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            style={{ borderColor: "#209dd7" }}
          />
        </label>

        <button
          type="submit"
          className="rounded-md px-5 py-2.5 text-sm font-medium text-white"
          style={{ backgroundColor: "#753991" }}
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
