"use client";

import { useActionState, useEffect, useState } from "react";
import { generateNda } from "@/lib/actions";
import type { NdaResult } from "@/lib/types";

const initialState: NdaResult = { coverPage: "", standardTerms: "" };

const DEFAULT_PURPOSE =
  "Evaluating whether to enter into a business relationship with the other party.";

function TextField({
  label,
  name,
  type = "text",
  required = false,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  required = false,
  defaultValue,
  placeholder,
  rows = 3,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}

function PartyFields({ party }: { party: 1 | 2 }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Party {party}
      </legend>
      <TextField label="Signatory name" name={`party${party}Name`} required />
      <TextField label="Signatory title" name={`party${party}Title`} placeholder="e.g. CEO" />
      <TextField label="Company" name={`party${party}Company`} required />
      <TextField
        label="Notice address"
        name={`party${party}NoticeAddress`}
        placeholder="Email or postal address"
      />
    </fieldset>
  );
}

export function NdaForm({ onGenerated }: { onGenerated: (result: NdaResult) => void }) {
  const [state, formAction, isPending] = useActionState(generateNda, initialState);
  const [mndaTermType, setMndaTermType] = useState<"expires" | "continues">("expires");
  const [confidentialityTermType, setConfidentialityTermType] = useState<
    "years" | "perpetuity"
  >("years");

  useEffect(() => {
    if (state.coverPage && state.standardTerms && !state.error) {
      onGenerated(state);
    }
  }, [state, onGenerated]);

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Mutual NDA Creator
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Fill in the details below to generate a Common Paper Mutual Non-Disclosure
          Agreement, ready to review and download.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <PartyFields party={1} />
        <PartyFields party={2} />
      </div>

      <fieldset className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <legend className="px-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Agreement details
        </legend>

        <TextAreaField
          label="Purpose"
          name="purpose"
          required
          defaultValue={DEFAULT_PURPOSE}
        />

        <TextField label="Effective date" name="effectiveDate" type="date" required />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            MNDA term
          </span>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mndaTermType"
              value="expires"
              checked={mndaTermType === "expires"}
              onChange={() => setMndaTermType("expires")}
            />
            Expires
            <input
              type="number"
              name="mndaTermYears"
              min={1}
              defaultValue={1}
              disabled={mndaTermType !== "expires"}
              className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
            />
            year(s) from the effective date
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="mndaTermType"
              value="continues"
              checked={mndaTermType === "continues"}
              onChange={() => setMndaTermType("continues")}
            />
            Continues until terminated
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Term of confidentiality
          </span>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="confidentialityTermType"
              value="years"
              checked={confidentialityTermType === "years"}
              onChange={() => setConfidentialityTermType("years")}
            />
            <input
              type="number"
              name="confidentialityYears"
              min={1}
              defaultValue={1}
              disabled={confidentialityTermType !== "years"}
              className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
            />
            year(s) from the effective date (trade secrets protected until no longer a
            trade secret)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="confidentialityTermType"
              value="perpetuity"
              checked={confidentialityTermType === "perpetuity"}
              onChange={() => setConfidentialityTermType("perpetuity")}
            />
            In perpetuity
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Governing law"
            name="governingLaw"
            required
            placeholder="e.g. Delaware"
          />
          <TextField
            label="Jurisdiction"
            name="jurisdiction"
            required
            placeholder="e.g. New Castle, DE"
          />
        </div>

        <TextAreaField
          label="MNDA modifications (optional)"
          name="modifications"
          placeholder="List any modifications to the MNDA"
        />
      </fieldset>

      {state.error && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? "Generating…" : "Generate Mutual NDA"}
      </button>
    </form>
  );
}
