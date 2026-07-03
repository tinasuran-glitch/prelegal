"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NdaResult } from "@/lib/types";

export function NdaDocument({ result, isComplete }: { result: NdaResult; isComplete: boolean }) {
  return (
    <div className="flex flex-col gap-4 p-6 lg:h-screen lg:min-h-0">
      <div className="no-print flex items-center justify-between gap-4">
        <span className="text-sm font-medium" style={{ color: isComplete ? "#753991" : "#888888" }}>
          {isComplete ? "✓ Ready to download" : "Draft — still gathering details"}
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Download PDF
        </button>
      </div>

      {result.error ? (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {result.error}
        </p>
      ) : (
        <article className="nda-document prose prose-zinc max-w-none flex-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-8 shadow-sm dark:prose-invert dark:border-zinc-800 dark:bg-zinc-950">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.coverPage}</ReactMarkdown>
          <hr />
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.standardTerms}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}
