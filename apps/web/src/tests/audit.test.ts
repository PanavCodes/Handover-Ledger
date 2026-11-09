import { describe, it, expect } from "vitest";
import {
  computeRecordHash,
  verifyAuditChain,
  GENESIS_PREV_HASH,
} from "../lib/audit";
import { AuditRecord, AuditHeadAnchor } from "../lib/types";

describe("Head-Anchored Cryptographic Audit Log", () => {
  it("computes reproducible hash chains from sequential entries", () => {
    const record1 = {
      seq: 1,
      actor: "Dr. Meera Iyer",
      action: "claim_approved",
      entity: "claim-101",
      payload: { title: "Adopt MQTT telemetry" },
      created_at: "2025-03-01T10:00:00.000Z",
    };

    const hash1 = computeRecordHash(GENESIS_PREV_HASH, record1);
    expect(hash1).toHaveLength(64);

    const record2 = {
      seq: 2,
      actor: "Rahul Mehta",
      action: "claim_attested",
      entity: "claim-102",
      payload: { title: "Firmware owner attested" },
      created_at: "2025-03-01T10:05:00.000Z",
    };

    const hash2 = computeRecordHash(hash1, record2);
    expect(hash2).toHaveLength(64);
    expect(hash2).not.toBe(hash1);

    const records: AuditRecord[] = [
      {
        id: 1,
        workspace_id: "ws-1",
        seq: 1,
        prev_hash: GENESIS_PREV_HASH,
        record_hash: hash1,
        ...record1,
      },
      {
        id: 2,
        workspace_id: "ws-1",
        seq: 2,
        prev_hash: hash1,
        record_hash: hash2,
        ...record2,
      },
    ];

    const headAnchor: AuditHeadAnchor = {
      workspace_id: "ws-1",
      expected_count: 2,
      expected_head_hash: hash2,
      updated_at: "2025-03-01T10:05:00.000Z",
    };

    const verification = verifyAuditChain(records, headAnchor);
    expect(verification.valid).toBe(true);
    expect(verification.recordCount).toBe(2);
  });

  it("detects payload tampering on an interior record", () => {
    const record1 = {
      seq: 1,
      actor: "Dr. Meera Iyer",
      action: "claim_approved",
      entity: "claim-101",
      payload: { title: "Adopt MQTT telemetry" },
      created_at: "2025-03-01T10:00:00.000Z",
    };
    const hash1 = computeRecordHash(GENESIS_PREV_HASH, record1);

    const records: AuditRecord[] = [
      {
        id: 1,
        workspace_id: "ws-1",
        seq: 1,
        prev_hash: GENESIS_PREV_HASH,
        record_hash: hash1,
        ...record1,
        payload: { title: "TAMPERED_CONTENT_UNAUTHORIZED" }, // Tampered
      },
    ];

    const verification = verifyAuditChain(records);
    expect(verification.valid).toBe(false);
    expect(verification.message).toContain("Tampering detected");
  });

  it("detects tail truncation when records are dropped from the end", () => {
    const record1 = {
      seq: 1,
      actor: "Dr. Meera Iyer",
      action: "claim_approved",
      entity: "claim-101",
      payload: { title: "Adopt MQTT telemetry" },
      created_at: "2025-03-01T10:00:00.000Z",
    };
    const hash1 = computeRecordHash(GENESIS_PREV_HASH, record1);

    const record2 = {
      seq: 2,
      actor: "Rahul Mehta",
      action: "claim_attested",
      entity: "claim-102",
      payload: { title: "Secret key rotated" },
      created_at: "2025-03-01T10:05:00.000Z",
    };
    const hash2 = computeRecordHash(hash1, record2);

    // Attacker drops record2 from database
    const survivingRecords: AuditRecord[] = [
      {
        id: 1,
        workspace_id: "ws-1",
        seq: 1,
        prev_hash: GENESIS_PREV_HASH,
        record_hash: hash1,
        ...record1,
      },
    ];

    // External head anchor records that we should have 2 records with hash2
    const headAnchor: AuditHeadAnchor = {
      workspace_id: "ws-1",
      expected_count: 2,
      expected_head_hash: hash2,
      updated_at: "2025-03-01T10:05:00.000Z",
    };

    const verification = verifyAuditChain(survivingRecords, headAnchor);
    expect(verification.valid).toBe(false);
    expect(verification.message).toContain("Tail truncation detected");
  });
});
