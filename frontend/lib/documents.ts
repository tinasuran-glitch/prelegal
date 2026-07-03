import { API_BASE_URL } from "./api";

export interface DocumentSummary {
  id: number;
  documentType: string;
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetail extends DocumentSummary {
  fields: Record<string, string | null>;
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/documents`, { credentials: "include", cache: "no-store" });
  if (!response.ok) {
    throw new Error("Could not load your documents.");
  }
  return response.json();
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${id}`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Document not found.");
  }
  return response.json();
}
