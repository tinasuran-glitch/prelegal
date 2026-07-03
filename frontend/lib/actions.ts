"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fillCoverPage, fillStandardTerms } from "./ndaTemplate";
import type { NdaFormData, NdaResult } from "./types";

// The frontend app is a subdirectory of the prelegal repo; the shared
// legal-agreement templates (curated in KAN-4) live at the repo root.
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

/** Renders the Mutual NDA from whatever fields are known so far; missing fields render as blanks/placeholders. */
export async function renderNda(data: NdaFormData): Promise<NdaResult> {
  try {
    const [rawCoverPage, rawStandardTerms] = await Promise.all([
      readFile(path.join(TEMPLATES_DIR, "Mutual-NDA-coverpage.md"), "utf-8"),
      readFile(path.join(TEMPLATES_DIR, "Mutual-NDA.md"), "utf-8"),
    ]);

    return {
      coverPage: fillCoverPage(rawCoverPage, data),
      standardTerms: fillStandardTerms(rawStandardTerms, data),
    };
  } catch {
    return {
      coverPage: "",
      standardTerms: "",
      error: "Could not load the Mutual NDA template. Make sure the templates/ directory exists at the project root.",
    };
  }
}
