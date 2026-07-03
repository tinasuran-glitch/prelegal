"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getDocumentTypeNames } from "@/lib/actions";
import { listDocuments, type DocumentSummary } from "@/lib/documents";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [typeNames, setTypeNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listDocuments(), getDocumentTypeNames()])
      .then(([docs, names]) => {
        setDocuments(docs);
        setTypeNames(names);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong."));
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold" style={{ color: "#032147" }}>
        My Documents
      </h1>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {!error && documents === null && (
        <p className="text-sm" style={{ color: "#888888" }}>
          Loading…
        </p>
      )}

      {documents !== null && documents.length === 0 && (
        <p className="text-sm" style={{ color: "#888888" }}>
          You haven&apos;t started a document yet.{" "}
          <Link href="/" className="underline" style={{ color: "#209dd7" }}>
            Start one now
          </Link>
          .
        </p>
      )}

      {documents && documents.length > 0 && (
        <ul className="flex flex-col gap-3">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/documents/${doc.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium" style={{ color: "#032147" }}>
                    {typeNames[doc.documentType] ?? doc.documentType}
                  </span>
                  <span className="text-xs" style={{ color: "#888888" }}>
                    Last updated {new Date(doc.updatedAt).toLocaleString()}
                  </span>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={
                    doc.isComplete
                      ? { backgroundColor: "#ecad0a33", color: "#753991" }
                      : { backgroundColor: "#88888822", color: "#888888" }
                  }
                >
                  {doc.isComplete ? "Complete" : "Draft"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
