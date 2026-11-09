import { describe, it, expect } from "vitest";
import {
  isSourceVisibleToPersona,
  filterClaimsForPersona,
  getDocumentForPersona,
  runLeakCanaryAudit,
  CANARY_TOKENS,
} from "../lib/access";
import { Store } from "../lib/store";

describe("Access Choke Point & Leak Canary Defense Matrix", () => {
  it("allows Lead persona to see all sources including restricted and confidential", () => {
    const sources = Store.getSources();
    for (const src of sources) {
      expect(isSourceVisibleToPersona(src, "lead")).toBe(true);
    }
  });

  it("blocks Coordinator from reading Core Dev restricted source", () => {
    const coreSource = Store.getSource("src-core-dev");
    expect(coreSource).toBeDefined();
    if (coreSource) {
      expect(isSourceVisibleToPersona(coreSource, "coord")).toBe(false);
    }
  });

  it("blocks Core Dev from reading Coordinator restricted source", () => {
    const coordSource = Store.getSource("src-coordinator");
    expect(coordSource).toBeDefined();
    if (coordSource) {
      expect(isSourceVisibleToPersona(coordSource, "core")).toBe(false);
    }
  });

  it("blocks non-lead roles from reading confidential sources", () => {
    const confSource = Store.getSource("src-confidential");
    expect(confSource).toBeDefined();
    if (confSource) {
      expect(isSourceVisibleToPersona(confSource, "core")).toBe(false);
      expect(isSourceVisibleToPersona(confSource, "coord")).toBe(false);
      expect(isSourceVisibleToPersona(confSource, "leaver")).toBe(false);
    }
  });

  it("proves 100% zero data leakage in automated Canary Audit Sweep", () => {
    const auditResult = runLeakCanaryAudit();

    expect(auditResult.zeroLeakageProven).toBe(true);
    expect(auditResult.passedChecks).toBe(auditResult.totalChecks);
    expect(auditResult.totalChecks).toBeGreaterThan(0);

    const failures = auditResult.matrix.filter((m) => m.status !== "PASS");
    expect(failures).toHaveLength(0);
  });
});

