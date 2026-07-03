"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { NdaDocument } from "@/components/NdaDocument";
import { renderNda } from "@/lib/actions";
import type { NdaResult } from "@/lib/types";

export default function Home() {
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string | null>>({});
  const [isComplete, setIsComplete] = useState(false);
  const [preview, setPreview] = useState<NdaResult | null>(null);

  useEffect(() => {
    if (!documentType) return;
    renderNda(documentType, fields).then(setPreview);
  }, [documentType, fields]);

  return (
    <main className="flex flex-1 flex-col divide-y divide-zinc-200 bg-zinc-50 dark:divide-zinc-800 dark:bg-black lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      <ChatPanel
        onTurnComplete={(nextDocumentType, nextFields, nextIsComplete) => {
          setDocumentType(nextDocumentType);
          setFields(nextFields);
          setIsComplete(nextIsComplete);
        }}
      />
      {preview ? (
        <NdaDocument result={preview} isComplete={isComplete} />
      ) : (
        <div
          className="no-print flex flex-1 items-center justify-center p-6 text-center text-sm lg:h-screen"
          style={{ color: "#888888" }}
        >
          Once you tell me what document you need, I&apos;ll show a live preview here.
        </div>
      )}
    </main>
  );
}
