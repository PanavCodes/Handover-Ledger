/**
 * Handover Ledger: Word-Level Hallucination Diff Engine
 * Architectural Lineage: citefact
 *
 * Compares a candidate quote against source text and generates word-level
 * strike-through diffs illustrating why an unverified claim was rejected.
 */

export interface DiffToken {
  type: "match" | "hallucinated" | "source_missing";
  text: string;
}

export interface WordDiffResult {
  tokens: DiffToken[];
  hallucinatedCount: number;
  matchRatio: number;
  diffHtml: string;
}

export function computeWordDiff(
  candidateQuote: string,
  sourceContext: string
): WordDiffResult {
  const quoteWords = candidateQuote.split(/\s+/).filter(Boolean);
  const sourceWords = sourceContext.split(/\s+/).filter(Boolean);
  const sourceWordSet = new Set(sourceWords.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, "")));

  const tokens: DiffToken[] = [];
  let hallucinatedCount = 0;
  let matchCount = 0;

  for (const word of quoteWords) {
    const clean = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (sourceWordSet.has(clean)) {
      tokens.push({ type: "match", text: word });
      matchCount++;
    } else {
      tokens.push({ type: "hallucinated", text: word });
      hallucinatedCount++;
    }
  }

  const matchRatio = quoteWords.length > 0 ? matchCount / quoteWords.length : 0;

  const diffHtml = tokens
    .map((t) => {
      if (t.type === "match") {
        return `<span class="text-foreground">${escapeHtml(t.text)}</span>`;
      } else {
        return `<span class="bg-red-500/20 text-red-600 dark:text-red-400 line-through px-1 rounded font-semibold">${escapeHtml(t.text)}</span>`;
      }
    })
    .join(" ");

  return {
    tokens,
    hallucinatedCount,
    matchRatio: Math.round(matchRatio * 100) / 100,
    diffHtml,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

