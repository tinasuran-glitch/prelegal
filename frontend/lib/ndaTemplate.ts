import type { NdaFormData } from "./types";

function mustReplace(content: string, search: string, replacement: string): string {
  if (!content.includes(search)) {
    throw new Error(
      `Mutual NDA template merge failed: expected to find ${JSON.stringify(
        search.slice(0, 60)
      )} in the source template. The template in ../templates may have changed.`
    );
  }
  return content.replace(search, replacement);
}

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function mndaTermPhrase(data: NdaFormData): string {
  return data.mndaTermType === "continues"
    ? "date on which this MNDA is terminated in accordance with its terms"
    : `${data.mndaTermYears || "1"} year(s) from the Effective Date`;
}

function confidentialityTermPhrase(data: NdaFormData): string {
  return data.confidentialityTermType === "perpetuity"
    ? "indefinite period (in perpetuity)"
    : `${data.confidentialityYears || "1"} year(s) from the Effective Date, but in the case of trade secrets until the Confidential Information is no longer considered a trade secret under applicable laws`;
}

function fillCoverPageTable(content: string, data: NdaFormData): string {
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("| Print Name")) {
        return `| Print Name | ${data.party1Name} | ${data.party2Name} |`;
      }
      if (trimmed.startsWith("| Title")) {
        return `| Title | ${data.party1Title} | ${data.party2Title} |`;
      }
      if (trimmed.startsWith("| Company")) {
        return `| Company | ${data.party1Company} | ${data.party2Company} |`;
      }
      if (trimmed.startsWith("| Notice Address")) {
        return `| Notice Address | ${data.party1NoticeAddress} | ${data.party2NoticeAddress} |`;
      }
      return line;
    })
    .join("\n");
}

/**
 * Fills the Mutual NDA cover page template with submitted form values.
 * Signature and Date rows are intentionally left blank for execution.
 */
export function fillCoverPage(rawCoverPage: string, data: NdaFormData): string {
  // The source template uses raw <label> tags as field hints (e.g. "How
  // Confidential Information may be used"). react-markdown doesn't render
  // arbitrary HTML, so convert them to an italic aside instead of leaking
  // the tags into the rendered document as literal text.
  let content = rawCoverPage.replace(/<label>(.*?)<\/label>/g, "_($1)_");

  content = mustReplace(
    content,
    "[Evaluating whether to enter into a business relationship with the other party.]",
    data.purpose
  );

  content = mustReplace(content, "[Today’s date]", formatDate(data.effectiveDate));

  const mndaTermBlock =
    data.mndaTermType === "expires"
      ? `- [x]     Expires [${data.mndaTermYears || "1"} year(s)] from Effective Date.\n- [ ]     Continues until terminated in accordance with the terms of the MNDA.`
      : `- [ ]     Expires [1 year(s)] from Effective Date.\n- [x]     Continues until terminated in accordance with the terms of the MNDA.`;
  content = mustReplace(
    content,
    "- [x]     Expires [1 year(s)] from Effective Date.\n- [ ]     Continues until terminated in accordance with the terms of the MNDA.",
    mndaTermBlock
  );

  const confidentialityBlock =
    data.confidentialityTermType === "years"
      ? `- [x]     [${data.confidentialityYears || "1"} year(s)] from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.\n- [ ]     In perpetuity.`
      : `- [ ]     [1 year(s)] from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.\n- [x]     In perpetuity.`;
  content = mustReplace(
    content,
    "- [x]     [1 year(s)] from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.\n- [ ]     In perpetuity.",
    confidentialityBlock
  );

  content = mustReplace(content, "Governing Law: [Fill in state]", `Governing Law: ${data.governingLaw}`);

  content = mustReplace(
    content,
    "Jurisdiction: [Fill in city or county and state, i.e. “courts located in New Castle, DE”]",
    `Jurisdiction: ${data.jurisdiction}`
  );

  content = mustReplace(
    content,
    "List any modifications to the MNDA",
    `List any modifications to the MNDA\n\n${data.modifications.trim() || "None."}`
  );

  content = fillCoverPageTable(content, data);

  return content;
}

/**
 * Fills every `<span class="coverpage_link">Label</span>` cross-reference in
 * the Standard Terms with the matching value submitted on the cover page.
 */
export function fillStandardTerms(rawStandardTerms: string, data: NdaFormData): string {
  const values: Record<string, string> = {
    Purpose: data.purpose,
    "Effective Date": formatDate(data.effectiveDate),
    "MNDA Term": mndaTermPhrase(data),
    "Term of Confidentiality": confidentialityTermPhrase(data),
    "Governing Law": data.governingLaw,
    Jurisdiction: data.jurisdiction,
  };

  return rawStandardTerms.replace(
    /<span class="coverpage_link">([^<]+)<\/span>/g,
    (match, label: string) => values[label] ?? match
  );
}
