"use client";

import { AppShell } from "./AppShell";
import { useAuth } from "./AuthContext";
import { LoginScreen } from "./LoginScreen";

/** Gates the app behind a real signed-in session; renders the authenticated shell once one exists. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-sm" style={{ color: "#888888" }}>
          Loading…
        </p>
      </main>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <AppShell user={user}>{children}</AppShell>;
}
