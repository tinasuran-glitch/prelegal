"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NdaResult } from "@/lib/types";

export function NdaDocument({
  result,
  onEdit,
}: {
  result: NdaResult;
  onEdit: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="no-print flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          ← Edit details
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Download PDF
        </button>
      </div>

      <article className="nda-document prose prose-zinc max-w-none rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:prose-invert dark:border-zinc-800 dark:bg-zinc-950">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.coverPage}</ReactMarkdown>
        <hr />
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.standardTerms}</ReactMarkdown>
      </article>
    </div>
  );
}
