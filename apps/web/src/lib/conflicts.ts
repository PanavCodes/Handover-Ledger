import { Claim } from "./types";

function normalizeValue(val?: string): string {
  return (val || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministic rule-based conflict detector.
 * Preserves opposing claims instead of silently merging them:
 * Any claims of type (owner | decision | milestone | risk) sharing the same subject_key
 * with distinct non-empty assertion_values are flagged as `conflicting`.
 */
export function detectAndMarkConflicts(claims: Claim[]): {
  updatedClaims: Claim[];
  conflictPairs: Array<{ subject_key: string; values: string[] }>;
} {
  const conflictEligibleTypes = new Set(["owner", "decision", "milestone", "risk"]);
  const groups = new Map<string, Claim[]>();

  for (const claim of claims) {
    if (claim.review_state === "rejected") continue;
    if (!conflictEligibleTypes.has(claim.type)) continue;
    if (!claim.subject_key || !claim.assertion_value) continue;

    const key = `${claim.type}::${claim.subject_key.toLowerCase().trim()}`;
    const list = groups.get(key) || [];
    list.push(claim);
    groups.set(key, list);
  }

  const conflictingClaimIds = new Map<string, string>();
  const conflictPairs: Array<{ subject_key: string; values: string[] }> = [];

  for (const [key, group] of Array.from(groups.entries())) {
    const distinctValues = new Map<string, string>();
    for (const c of group) {
      const norm = normalizeValue(c.assertion_value);
      if (norm && !distinctValues.has(norm)) {
        distinctValues.set(norm, c.assertion_value || "");
      }
    }

    if (distinctValues.size > 1) {
      const valueList = Array.from(distinctValues.values());
      conflictPairs.push({
        subject_key: key.split("::")[1] || key,
        values: valueList,
      });

      const note = `Contradictory evidence detected for ${key.split("::")[1]}: opposing accounts assert ${valueList.join(" vs. ")}.`;
      for (const c of group) {
        conflictingClaimIds.set(c.id, note);
      }
    }
  }

  const updatedClaims = claims.map((claim) => {
    const note = conflictingClaimIds.get(claim.id);
    if (note && claim.review_state !== "approved") {
      return {
        ...claim,
        status: "conflicting" as const,
        inference_note: claim.inference_note || note,
      };
    }
    return claim;
  });

  return { updatedClaims, conflictPairs };
}

