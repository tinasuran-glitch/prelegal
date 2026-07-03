import type { NdaResult } from "./types";

const SPAN_RE = /<span class="[a-z_]+_link">([^<]+)<\/span>/g;
const POSSESSIVE_RE = /[’']s$/;

function normalizeLabel(label: string): string {
  return label.replace(POSSESSIVE_RE, "").trim();
}

/** Replaces every `<span class="..._link">Label</span>` with its resolved value,
 * preserving a possessive suffix (Customer's -> Acme Corp's) if the span had one. */
function fillSpans(text: string, fields: Record<string, string | null>): string {
  return text.replace(SPAN_RE, (_match, innerText: string) => {
    const isPossessive = POSSESSIVE_RE.test(innerText);
    const baseLabel = normalizeLabel(innerText);
    const value = fields[baseLabel];
    const resolved = value || `[${baseLabel}]`;
    return isPossessive ? `${resolved}'s` : resolved;
  });
}

/** The full set of fields this template needs, scraped from its own spans — not just
 * whatever keys happen to be in `fields`, so the Key Terms section still shows the
 * right structure (with placeholders) before any of them have been gathered. */
function extractFieldLabels(text: string): string[] {
  const labels: string[] = [];
  for (const match of text.matchAll(SPAN_RE)) {
    const label = normalizeLabel(match[1]);
    if (!labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels;
}

function buildKeyTermsSection(labels: string[], fields: Record<string, string | null>): string {
  const lines = labels.map((label) => `- **${label}:** ${fields[label] || `[${label}]`}`);
  return `## Key Terms\n\n${lines.join("\n")}`;
}

/** Fills a Standard Terms document that has no fillable Cover Page of its own —
 * synthesizes a Key Terms summary from the gathered fields and resolves every
 * matching span in the prose, instead of a bespoke per-document fill function. */
export function fillGenericDocument(
  rawStandardTerms: string,
  fields: Record<string, string | null>,
  appendNote?: string
): NdaResult {
  const labels = extractFieldLabels(rawStandardTerms);
  const standardTerms = appendNote
    ? `${fillSpans(rawStandardTerms, fields)}\n\n---\n\n${appendNote}`
    : fillSpans(rawStandardTerms, fields);

  return {
    coverPage: buildKeyTermsSection(labels, fields),
    standardTerms,
  };
}
