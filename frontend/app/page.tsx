"use client";

import { useState } from "react";
import { NdaForm } from "@/components/NdaForm";
import { NdaDocument } from "@/components/NdaDocument";
import type { NdaResult } from "@/lib/types";

export default function Home() {
  const [result, setResult] = useState<NdaResult | null>(null);

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      {result ? (
        <NdaDocument result={result} onEdit={() => setResult(null)} />
      ) : (
        <NdaForm onGenerated={setResult} />
      )}
    </main>
  );
}
