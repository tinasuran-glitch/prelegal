import type { NdaResult } from "./types";

const SPAN_RE = /<span class="[a-z_]+_link">([^<]+)<\/span>/g;
const HEADER_SPAN_RE = /<span class="header_[23]"(?:\s+id="[^"]*")?>([^<]+)<\/span>/g;
// Bare `<span id="...">...</span>` (no class) — used as either a pure anchor with no
// content (e.g. before an unlabeled numbered clause) or wrapping a defined term in a
// Definitions section. Either way, the id is irrelevant once rendered; keep whatever
// content (if any) it wraps.
const BARE_ID_SPAN_RE = /<span id="[^"]*">([^<]*)<\/span>/g;
// Safety net: strip any span tag that survived the specific passes above (malformed
// source markup, or a pattern not otherwise enumerated) so raw HTML can never leak
// into the rendered document as literal text.
const ANY_REMAINING_SPAN_TAG_RE = /<\/?span[^>]*>/g;
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

/** Strips the `header_2`/`header_3` section-heading spans down to bold markdown text —
 * react-markdown doesn't render raw HTML, so left as-is these leak into the rendered
 * document as literal `<span ...>` text. Mirrors how Mutual-NDA.md already writes its
 * own headings directly as **bold** text instead of span-wrapping them. */
function stripHeaderSpans(text: string): string {
  return text.replace(HEADER_SPAN_RE, (_match, innerText: string) => `**${innerText}**`);
}

function stripBareIdSpans(text: string): string {
  return text.replace(BARE_ID_SPAN_RE, (_match, innerText: string) => innerText);
}

function stripAnyRemainingSpanTags(text: string): string {
  return text.replace(ANY_REMAINING_SPAN_TAG_RE, "");
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
  const filled = stripAnyRemainingSpanTags(
    stripBareIdSpans(stripHeaderSpans(fillSpans(rawStandardTerms, fields)))
  );
  const standardTerms = appendNote ? `${filled}\n\n---\n\n${appendNote}` : filled;

  return {
    coverPage: buildKeyTermsSection(labels, fields),
    standardTerms,
  };
}
