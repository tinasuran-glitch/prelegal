"use client";

import { useEffect, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { NdaDocument } from "@/components/NdaDocument";
import { renderNda } from "@/lib/actions";
import { toFormData, type PartialNdaFields } from "@/lib/chat";
import type { NdaResult } from "@/lib/types";

const EMPTY_FIELDS: PartialNdaFields = {
  party1Name: null,
  party1Title: null,
  party1Company: null,
  party1NoticeAddress: null,
  party2Name: null,
  party2Title: null,
  party2Company: null,
  party2NoticeAddress: null,
  purpose: null,
  effectiveDate: null,
  mndaTermType: null,
  mndaTermYears: null,
  confidentialityTermType: null,
  confidentialityYears: null,
  governingLaw: null,
  jurisdiction: null,
  modifications: null,
};

export default function Home() {
  const [fields, setFields] = useState<PartialNdaFields>(EMPTY_FIELDS);
  const [isComplete, setIsComplete] = useState(false);
  const [preview, setPreview] = useState<NdaResult | null>(null);

  useEffect(() => {
    renderNda(toFormData(fields)).then(setPreview);
  }, [fields]);

  return (
    <main className="flex flex-1 flex-col divide-y divide-zinc-200 bg-zinc-50 dark:divide-zinc-800 dark:bg-black lg:grid lg:grid-cols-2 lg:divide-x lg:divide-y-0">
      <ChatPanel
        onFieldsChange={(nextFields, nextIsComplete) => {
          setFields(nextFields);
          setIsComplete(nextIsComplete);
        }}
      />
      {preview && <NdaDocument result={preview} isComplete={isComplete} />}
    </main>
  );
}
