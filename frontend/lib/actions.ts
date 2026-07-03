"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadCatalog } from "./catalog";
import { fillGenericDocument } from "./genericTemplate";
import { fillCoverPage, fillStandardTerms } from "./ndaTemplate";
import type { NdaFormData, NdaResult } from "./types";

// The frontend app is a subdirectory of the prelegal repo; the shared
// legal-agreement templates (curated in KAN-4) live at the repo root.
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

const DPA_NOTE =
  "**Note:** This DPA references the EU Standard Contractual Clauses and the UK " +
  "International Data Transfer Addendum as separate attachments. Those exhibit " +
  "documents aren't included here and should be attached separately.";

/** Fills in placeholders for fields the chat hasn't gathered yet, so the MNDA
 * live preview always renders even before every field is known. */
function toMndaFormData(fields: Record<string, string | null>): NdaFormData {
  const PLACEHOLDER = "[Not yet provided]";
  return {
    party1Name: fields.party1Name || PLACEHOLDER,
    party1Title: fields.party1Title || "",
    party1Company: fields.party1Company || PLACEHOLDER,
    party1NoticeAddress: fields.party1NoticeAddress || "",
    party2Name: fields.party2Name || PLACEHOLDER,
    party2Title: fields.party2Title || "",
    party2Company: fields.party2Company || PLACEHOLDER,
    party2NoticeAddress: fields.party2NoticeAddress || "",
    purpose: fields.purpose || PLACEHOLDER,
    effectiveDate: fields.effectiveDate || "",
    mndaTermType: (fields.mndaTermType as NdaFormData["mndaTermType"]) || "expires",
    mndaTermYears: fields.mndaTermYears || "1",
    confidentialityTermType:
      (fields.confidentialityTermType as NdaFormData["confidentialityTermType"]) || "years",
    confidentialityYears: fields.confidentialityYears || "1",
    governingLaw: fields.governingLaw || PLACEHOLDER,
    jurisdiction: fields.jurisdiction || PLACEHOLDER,
    modifications: fields.modifications || "",
  };
}

async function renderMnda(fields: Record<string, string | null>): Promise<NdaResult> {
  const data = toMndaFormData(fields);
  const [rawCoverPage, rawStandardTerms] = await Promise.all([
    readFile(path.join(TEMPLATES_DIR, "Mutual-NDA-coverpage.md"), "utf-8"),
    readFile(path.join(TEMPLATES_DIR, "Mutual-NDA.md"), "utf-8"),
  ]);
  return {
    coverPage: fillCoverPage(rawCoverPage, data),
    standardTerms: fillStandardTerms(rawStandardTerms, data),
  };
}

async function renderGeneric(documentType: string, fields: Record<string, string | null>): Promise<NdaResult> {
  const catalog = await loadCatalog();
  const entry = catalog.find((candidate) => candidate.id === documentType);
  if (!entry) {
    return { coverPage: "", standardTerms: "", error: `Unknown document type: ${documentType}` };
  }

  const rawStandardTerms = await readFile(path.join(TEMPLATES_DIR, entry.filename), "utf-8");
  return fillGenericDocument(rawStandardTerms, fields, documentType === "dpa" ? DPA_NOTE : undefined);
}

/** Maps each catalog document-type id to its display name, for past-document listings. */
export async function getDocumentTypeNames(): Promise<Record<string, string>> {
  const catalog = await loadCatalog();
  return Object.fromEntries(catalog.map((entry) => [entry.id, entry.name]));
}

/** Renders whichever document type the chat has confirmed, from whatever fields are
 * known so far; missing fields render as blanks/placeholders. */
export async function renderNda(
  documentType: string,
  fields: Record<string, string | null>
): Promise<NdaResult> {
  try {
    return documentType === "mutual-nda" ? await renderMnda(fields) : await renderGeneric(documentType, fields);
  } catch {
    return {
      coverPage: "",
      standardTerms: "",
      error: "Could not load the document template. Make sure the templates/ directory exists at the project root.",
    };
  }
}
