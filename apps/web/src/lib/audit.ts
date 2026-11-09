import crypto from "crypto";
import { AuditRecord, AuditHeadAnchor } from "./types";

export const GENESIS_PREV_HASH = "0".repeat(64);

export interface AuditVerifyResult {
  valid: boolean;
  recordCount: number;
  brokenAtSeq?: number | null;
  message: string;
}

/**
 * Deterministic JSON stringifier with recursively sorted keys.
 * Preserves all nested fields while ensuring byte-level canonical consistency.
 */
export function deterministicStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(deterministicStringify).join(",")}]`;
  }
  const keys = Object.keys(obj).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${deterministicStringify(obj[k])}`);
  return `{${entries.join(",")}}`;
}

/**
 * Builds the canonical deterministic JSON representation of record content
 * with sorted keys and no unnecessary whitespace (Cerberus specification).
 */
export function canonicalPayload(content: {
  seq: number;
  actor: string;
  action: string;
  entity?: string;
  payload: any;
  created_at: string;
}): string {
  const contentObj = {
    action: content.action,
    actor: content.actor,
    created_at: content.created_at,
    entity: content.entity || "",
    payload: content.payload || {},
    seq: content.seq,
  };
  return deterministicStringify(contentObj);
}

/**
 * Computes the cryptographic SHA-256 record hash linked to prev_hash.
 * Formula: sha256(prev_hash + sha256(canonical_payload))
 */
export function computeRecordHash(prevHash: string, content: {
  seq: number;
  actor: string;
  action: string;
  entity?: string;
  payload: any;
  created_at: string;
}): string {
  const payloadStr = canonicalPayload(content);
  const innerHash = crypto.createHash("sha256").update(payloadStr, "utf8").digest("hex");
  return crypto.createHash("sha256").update(prevHash + innerHash, "utf8").digest("hex");
}

/**
 * Verifies the integrity of an audit chain and checks against external head anchor.
 * Catches:
 * 1. Data tampering / modified payload
 * 2. Sequence discontinuity
 * 3. Tail truncation (deleting the last N records)
 */
export function verifyAuditChain(
  records: AuditRecord[],
  headAnchor?: AuditHeadAnchor | null
): AuditVerifyResult {
  if (records.length === 0) {
    if (headAnchor && headAnchor.expected_count > 0) {
      return {
        valid: false,
        recordCount: 0,
        brokenAtSeq: 1,
        message: `Tail truncation detected: Expected ${headAnchor.expected_count} records but found 0`,
      };
    }
    return {
      valid: true,
      recordCount: 0,
      message: "Chain is empty and valid",
    };
  }

  // Sort ascending by sequence
  const ordered = [...records].sort((a, b) => a.seq - b.seq);

  // Check 1: Tail truncation check against head anchor
  if (headAnchor) {
    if (ordered.length < headAnchor.expected_count) {
      return {
        valid: false,
        recordCount: ordered.length,
        brokenAtSeq: ordered.length + 1,
        message: `Tail truncation detected: Expected ${headAnchor.expected_count} records (head seq ${headAnchor.expected_count}), found ${ordered.length}`,
      };
    }

    const lastRecord = ordered[ordered.length - 1];
    if (lastRecord.record_hash !== headAnchor.expected_head_hash) {
      return {
        valid: false,
        recordCount: ordered.length,
        brokenAtSeq: lastRecord.seq,
        message: `Head anchor mismatch: Expected head hash ${headAnchor.expected_head_hash.slice(0, 12)}... but found ${lastRecord.record_hash.slice(0, 12)}...`,
      };
    }
  }

  // Check 2: Sequential link and content hash verification
  let expectedPrevHash = GENESIS_PREV_HASH;

  for (let i = 0; i < ordered.length; i++) {
    const record = ordered[i];
    const expectedSeq = i + 1;

    if (record.seq !== expectedSeq) {
      return {
        valid: false,
        recordCount: ordered.length,
        brokenAtSeq: record.seq,
        message: `Sequence gap detected: Record ${record.id} has seq ${record.seq}, expected ${expectedSeq}`,
      };
    }

    if (record.prev_hash !== expectedPrevHash) {
      return {
        valid: false,
        recordCount: ordered.length,
        brokenAtSeq: record.seq,
        message: `Hash link broken at seq ${record.seq}: prev_hash mismatch`,
      };
    }

    const recalculatedHash = computeRecordHash(record.prev_hash, {
      seq: record.seq,
      actor: record.actor,
      action: record.action,
      entity: record.entity,
      payload: record.payload,
      created_at: record.created_at,
    });

    if (recalculatedHash !== record.record_hash) {
      return {
        valid: false,
        recordCount: ordered.length,
        brokenAtSeq: record.seq,
        message: `Tampering detected at seq ${record.seq}: Payload has been modified`,
      };
    }

    expectedPrevHash = record.record_hash;
  }

  return {
    valid: true,
    recordCount: ordered.length,
    message: `All ${ordered.length} audit records cryptographically verified. Hash chain intact.`,
  };
}
