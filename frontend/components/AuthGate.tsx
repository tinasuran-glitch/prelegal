"use client";

import { useSyncExternalStore } from "react";
import { LoginScreen } from "./LoginScreen";

const STORAGE_KEY = "prelegal_authed";
const AUTH_EVENT = "prelegal-auth-change";

function subscribe(callback: () => void) {
  window.addEventListener(AUTH_EVENT, callback);
  return () => window.removeEventListener(AUTH_EVENT, callback);
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot() {
  return false;
}

function login() {
  localStorage.setItem(STORAGE_KEY, "true");
  window.dispatchEvent(new Event(AUTH_EVENT));
}

/** Fake login gate: any credentials pass, no backend call. Foundation-only, real auth comes later. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const authed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!authed) {
    return <LoginScreen onLoggedIn={login} />;
  }

  return <>{children}</>;
}
