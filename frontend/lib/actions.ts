"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fillCoverPage, fillStandardTerms } from "./ndaTemplate";
import type {
  ConfidentialityTermType,
  MndaTermType,
  NdaFormData,
  NdaResult,
} from "./types";

// The frontend app is a subdirectory of the prelegal repo; the shared
// legal-agreement templates (curated in KAN-4) live at the repo root.
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

function field(formData: FormData, key: keyof NdaFormData): string {
  return String(formData.get(key) ?? "").trim();
}

function parseFormData(formData: FormData): NdaFormData {
  return {
    party1Name: field(formData, "party1Name"),
    party1Title: field(formData, "party1Title"),
    party1Company: field(formData, "party1Company"),
    party1NoticeAddress: field(formData, "party1NoticeAddress"),
    party2Name: field(formData, "party2Name"),
    party2Title: field(formData, "party2Title"),
    party2Company: field(formData, "party2Company"),
    party2NoticeAddress: field(formData, "party2NoticeAddress"),
    purpose: field(formData, "purpose"),
    effectiveDate: field(formData, "effectiveDate"),
    mndaTermType: (field(formData, "mndaTermType") || "expires") as MndaTermType,
    mndaTermYears: field(formData, "mndaTermYears") || "1",
    confidentialityTermType:
      (field(formData, "confidentialityTermType") || "years") as ConfidentialityTermType,
    confidentialityYears: field(formData, "confidentialityYears") || "1",
    governingLaw: field(formData, "governingLaw"),
    jurisdiction: field(formData, "jurisdiction"),
    modifications: field(formData, "modifications"),
  };
}

const REQUIRED_FIELDS: Array<[keyof NdaFormData, string]> = [
  ["party1Name", "Party 1 signatory name"],
  ["party1Company", "Party 1 company"],
  ["party2Name", "Party 2 signatory name"],
  ["party2Company", "Party 2 company"],
  ["purpose", "Purpose"],
  ["effectiveDate", "Effective date"],
  ["governingLaw", "Governing law"],
  ["jurisdiction", "Jurisdiction"],
];

export async function generateNda(
  _prevState: NdaResult,
  formData: FormData
): Promise<NdaResult> {
  const data = parseFormData(formData);

  const missing = REQUIRED_FIELDS.filter(([key]) => !data[key]).map(([, label]) => label);
  if (missing.length > 0) {
    return {
      coverPage: "",
      standardTerms: "",
      error: `Please fill in: ${missing.join(", ")}.`,
    };
  }

  let rawCoverPage: string;
  let rawStandardTerms: string;
  try {
    [rawCoverPage, rawStandardTerms] = await Promise.all([
      readFile(path.join(TEMPLATES_DIR, "Mutual-NDA-coverpage.md"), "utf-8"),
      readFile(path.join(TEMPLATES_DIR, "Mutual-NDA.md"), "utf-8"),
    ]);
  } catch {
    return {
      coverPage: "",
      standardTerms: "",
      error: "Could not load the Mutual NDA template. Make sure the templates/ directory exists at the project root.",
    };
  }

  return {
    coverPage: fillCoverPage(rawCoverPage, data),
    standardTerms: fillStandardTerms(rawStandardTerms, data),
  };
}
