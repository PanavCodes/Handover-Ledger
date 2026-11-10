/**
 * Handover Ledger: Deterministic Citation Verifier & Quote Snapping Engine
 * Architectural Lineage: juricode-verifier, spancheck, docinsight_ai
 *
 * Core Guarantee:
 * Zero hallucination. Every citation displayed in the ledger must match
 * canonical document text with verifiable character offsets.
 */

export interface VerificationResult {
  verified: boolean;
  start_offset: number;
  end_offset: number;
  snapped_quote: string;
  support_score: number;
  method: "exact_normalised" | "anchor_snapped" | "failed";
  reason?: string;
}

// 1:1 Character replacement map for normalization
const SMART_CHAR_MAP: Record<string, string> = {
  "\u2018": "'", // Left single quote
  "\u2019": "'", // Right single quote / apostrophe
  "\u201C": '"', // Left double quote
  "\u201D": '"', // Right double quote
  "\u2013": "-", // En dash
  "\u2014": "-", // Em dash
  "\u00A0": " ", // Non-breaking space
  "\u2026": "...", // Ellipsis
};

// Secret patterns to prevent exposing raw credentials in citations
const SECRET_PATTERNS = [
  /ghp_[A-Za-z0-9_]{20,}/i,
  /AKIA[0-9A-Z]{16}/,
  /sk-ant-[A-Za-z0-9_\-]{20,}/i,
  /sk-[A-Za-z0-9]{20,}/,
  /Bearer\s+[A-Za-z0-9_\-\.]{20,}/i,
  /-----BEGIN\s+(RSA|OPENSSH|EC|PRIVATE)\s+KEY-----/i,
  /xox[baprs]-[A-Za-z0-9\-]{20,}/i,
];

/**
 * Normalizes text while maintaining a strict index map from normalized positions
 * back to the original document's raw character indices.
 */
export function normaliseWithMap(text: string): { normalized: string; indexMap: number[] } {
  const normChars: string[] = [];
  const indexMap: number[] = [];
  let prevSpace = false;

  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    char = SMART_CHAR_MAP[char] || char;

    if (/\s/.test(char)) {
      if (prevSpace) {
        continue; // Collapse consecutive whitespaces
      }
      normChars.push(" ");
      indexMap.push(i);
      prevSpace = true;
    } else {
      normChars.push(char);
      indexMap.push(i);
      prevSpace = false;
    }
  }

  return {
    normalized: normChars.join(""),
    indexMap,
  };
}

/**
 * Computes lexical content-word support between claim and citation (spancheck proxy).
 */
export function computeLexicalSupport(claim: string, quote: string): number {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "and", "or", "in", "on", "at",
    "to", "for", "with", "that", "this", "by", "from", "be", "as", "it", "of",
  ]);

  const extractWords = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

  const claimWords = extractWords(claim);
  if (claimWords.length === 0) return 1.0;

  const quoteWordSet = new Set(extractWords(quote));
  const matched = claimWords.filter((w) => quoteWordSet.has(w));

  return Math.round((matched.length / claimWords.length) * 100) / 100;
}

/**
 * Verifies that a quote candidate exists in the document text, checks secret hygiene,
 * computes exact character offsets, and performs quote snapping if near-match occurs.
 */
export function verifyQuote(
  documentText: string,
  candidateQuote: string,
  claimStatement: string = ""
): VerificationResult {
  const trimmed = candidateQuote.trim();

  // Guard 1: Minimum quote length
  if (trimmed.length < 12) {
    return {
      verified: false,
      start_offset: 0,
      end_offset: 0,
      snapped_quote: trimmed,
      support_score: 0,
      method: "failed",
      reason: "Quote length is below minimum required 12 characters",
    };
  }

  // Guard 2: Secret pattern guard (reject quotes exposing raw tokens)
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        verified: false,
        start_offset: 0,
        end_offset: 0,
        snapped_quote: trimmed,
        support_score: 0,
        method: "failed",
        reason: "Quote contains confidential credentials or API tokens (rejected by secret guard)",
      };
    }
  }

  const { normalized: normDoc, indexMap: docMap } = normaliseWithMap(documentText);
  const { normalized: normQuote } = normaliseWithMap(trimmed);

  // 1. Direct exact normalized match
  const exactPos = normDoc.indexOf(normQuote);
  if (exactPos >= 0) {
    const startOffset = docMap[exactPos];
    const endOffset = docMap[exactPos + normQuote.length - 1] + 1;
    const rawSnapped = documentText.slice(startOffset, endOffset);
    const supportScore = computeLexicalSupport(claimStatement, rawSnapped);

    return {
      verified: true,
      start_offset: startOffset,
      end_offset: endOffset,
      snapped_quote: rawSnapped,
      support_score: supportScore,
      method: "exact_normalised",
    };
  }

  // 2. Quote Snapping (juricode pattern): Anchor-based boundary snapping
  // If exact quote failed due to minor prefix/suffix LLM hallucinations, search for anchor span
  const anchorLength = Math.min(24, Math.floor(normQuote.length * 0.6));
  const startAnchor = normQuote.slice(0, anchorLength);
  const anchorPos = normDoc.indexOf(startAnchor);

  if (anchorPos >= 0) {
    // Found anchor, check similarity in document window
    const targetLength = normQuote.length;
    const candidateNorm = normDoc.slice(anchorPos, anchorPos + targetLength);

    // Compute simple character overlap
    let matches = 0;
    for (let i = 0; i < Math.min(normQuote.length, candidateNorm.length); i++) {
      if (normQuote[i] === candidateNorm[i]) matches++;
    }
    const similarity = matches / normQuote.length;

    if (similarity >= 0.85) {
      const startOffset = docMap[anchorPos];
      const endPosInMap = anchorPos + candidateNorm.length - 1;
      const endOffset = docMap[Math.min(endPosInMap, docMap.length - 1)] + 1;
      const rawSnapped = documentText.slice(startOffset, endOffset);
      const supportScore = computeLexicalSupport(claimStatement, rawSnapped);

      return {
        verified: true,
        start_offset: startOffset,
        end_offset: endOffset,
        snapped_quote: rawSnapped,
        support_score: supportScore,
        method: "anchor_snapped",
      };
    }
  }

  // Verification failed: fabricated quote
  return {
    verified: false,
    start_offset: 0,
    end_offset: 0,
    snapped_quote: trimmed,
    support_score: 0,
    method: "failed",
    reason: "Quote could not be located verbatim in the source document (rejected by verifier)",
  };
}

