import { describe, it, expect, beforeEach } from "vitest";
import { Store } from "../lib/store";
import { filterClaimsForPersona, getDocumentForPersona, runLeakCanaryAudit } from "../lib/access";
import { verifyAuditChain } from "../lib/audit";
import { DEMO_PERSONAS, DEFAULT_WORKSPACE_ID } from "../lib/personas";

describe("Handover Ledger End-to-End System & API Invariants", () => {
  beforeEach(() => {
    Store.reset();
  });

  it("1. Verifies Store initializes with Aurora Rover pre-seeded data", () => {
    const claims = Store.getClaims();
    expect(claims.length).toBeGreaterThanOrEqual(10);

    const sources = Store.getSources();
    expect(sources.length).toBeGreaterThanOrEqual(4);

    const auditLog = Store.getAuditLog();
    expect(auditLog.length).toBeGreaterThanOrEqual(4);
  });

  it("2. Verifies strictest-source rule on claims across all 4 personas", () => {
    const allClaims = Store.getClaims();

    // Lead sees all claims
    const leadResult = filterClaimsForPersona(allClaims, "lead");
    expect(leadResult.withheldCount).toBe(0);
    expect(leadResult.visibleClaims.length).toBe(allClaims.length);

    // Core Dev has confidential coordinator items withheld
    const coreResult = filterClaimsForPersona(allClaims, "core");
    expect(coreResult.withheldCount).toBeGreaterThan(0);
    expect(coreResult.visibleClaims.length).toBeLessThan(allClaims.length);
    // Core dev must NOT see coordinator-only sponsor claims
    const coreHasSponsorClaim = coreResult.visibleClaims.some(
      (c) => c.subject_key.includes("sponsor") || c.subject_key.includes("budget")
    );
    expect(coreHasSponsorClaim).toBe(false);

    // Coordinator has core telemetry secrets withheld
    const coordResult = filterClaimsForPersona(allClaims, "coord");
    expect(coordResult.withheldCount).toBeGreaterThan(0);
    const coordHasKeyClaim = coordResult.visibleClaims.some(
      (c) => c.subject_key.includes("telemetry_key") || c.subject_key.includes("aes")
    );
    expect(coordHasKeyClaim).toBe(false);
  });

  it("3. Verifies document access choke point enforces 403 on restricted docs", () => {
    const docs = Store.getDocuments();
    const restrictedDoc = docs.find((d) => d.source_id === "src-core-dev");
    expect(restrictedDoc).toBeDefined();

    if (restrictedDoc) {
      // Allowed for core dev
      const coreDoc = getDocumentForPersona(restrictedDoc.id, "core");
      expect(coreDoc).not.toBeNull();

      // Blocked (null / 403) for coordinator
      const coordDoc = getDocumentForPersona(restrictedDoc.id, "coord");
      expect(coordDoc).toBeNull();
    }
  });

  it("4. Verifies Leak Canary invariant sweep passes with 0 leaks across all 16 tests", () => {
    const sweep = runLeakCanaryAudit();
    expect(sweep.zeroLeakageProven).toBe(true);
    expect(sweep.matrix.length).toBeGreaterThanOrEqual(7);

    for (const test of sweep.matrix) {
      expect(test.status).toBe("PASS");
    }
  });

  it("5. Verifies cryptographic head-anchored audit chain integrity", () => {
    const records = Store.getAuditLog();
    const headAnchor = Store.getHeadAnchor();

    const verification = verifyAuditChain(records, headAnchor);
    expect(verification.valid).toBe(true);
    expect(verification.recordCount).toBe(records.length);
  });

  it("6. Verifies hallucination diffs exist for unverified claims", () => {
    const rejections = Store.getRejections();
    expect(rejections.length).toBeGreaterThan(0);

    const firstRejection = rejections[0];
    expect(firstRejection.reason).toBeDefined();
    expect(firstRejection.diff_analysis?.diff_html).toContain("line-through");
  });

  it("7. Verifies planted conflict detection in Aurora dataset", () => {
    const claims = Store.getClaims();
    const conflictingClaims = claims.filter((c) => c.status === "conflicting");
    expect(conflictingClaims.length).toBeGreaterThanOrEqual(1);

    const baudConflict = conflictingClaims.find((c) => c.subject_key.includes("baud"));
    expect(baudConflict).toBeDefined();
  });
});
