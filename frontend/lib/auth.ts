import { API_BASE_URL } from "./api";

export interface User {
  id: number;
  email: string;
}

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return typeof body.detail === "string" ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

export async function signup(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Could not create an account."));
  }
  return response.json();
}

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, "Invalid email or password."));
  }
  return response.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
}

export async function getCurrentUser(): Promise<User | null> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: "include" });
  if (!response.ok) return null;
  return response.json();
}
