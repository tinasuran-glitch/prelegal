"use client";

import Link from "next/link";
import { useAuth } from "./AuthContext";
import type { User } from "@/lib/auth";

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const { logout } = useAuth();

  return (
    <div className="flex flex-1 flex-col">
      <header className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold" style={{ color: "#032147" }}>
            Prelegal
          </span>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/" style={{ color: "#209dd7" }}>
              New Document
            </Link>
            <Link href="/documents" style={{ color: "#209dd7" }}>
              My Documents
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span style={{ color: "#888888" }}>{user.email}</span>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md border px-3 py-1.5 font-medium"
            style={{ borderColor: "#753991", color: "#753991" }}
          >
            Log out
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col">{children}</div>

      <footer
        className="no-print border-t border-zinc-200 px-6 py-3 text-center text-xs dark:border-zinc-800"
        style={{ color: "#888888" }}
      >
        Documents generated here are drafts only and are subject to legal review. Nothing here is legal advice.
      </footer>
    </div>
  );
}
