"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NdaDocument } from "@/components/NdaDocument";
import { renderNda } from "@/lib/actions";
import { getDocument } from "@/lib/documents";
import type { NdaResult } from "@/lib/types";

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [preview, setPreview] = useState<NdaResult | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocument(id)
      .then(async (doc) => {
        setIsComplete(doc.isComplete);
        setPreview(await renderNda(doc.documentType, doc.fields));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load this document."));
  }, [id]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <Link href="/documents" className="no-print text-sm underline" style={{ color: "#209dd7" }}>
        ← Back to My Documents
      </Link>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {!error && !preview && (
        <p className="text-sm" style={{ color: "#888888" }}>
          Loading…
        </p>
      )}

      {preview && <NdaDocument result={preview} isComplete={isComplete} />}
    </main>
  );
}
