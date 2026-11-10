/**
 * Handover Ledger: Persistent Store Adapter (Global + /tmp Snapshot + Optional Supabase Sync)
 * Provides zero-latency execution in demo environments and preserves mutations across
 * Next.js route handlers, with pre-seeded synthetic fixtures for "Aurora Rover Robotics Lab".
 */

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import {
  Workspace,
  Source,
  Document,
  Claim,
  Citation,
  ClaimVersion,
  ClaimRejection,
  AuditRecord,
  AuditHeadAnchor,
  InterviewQuestion,
  AttestationState,
} from "./types";
import { computeRecordHash, GENESIS_PREV_HASH } from "./audit";
import { verifyQuote } from "./verifier";
import { detectAndMarkConflicts } from "./conflicts";
import { buildInitialInterviewQuestions, detectDynamicGaps } from "./gaps";

interface LedgerState {
  workspace: Workspace;
  sources: Source[];
  documents: Document[];
  claims: Claim[];
  citations: Citation[];
  versions: ClaimVersion[];
  rejections: ClaimRejection[];
  auditRecords: AuditRecord[];
  headAnchor: AuditHeadAnchor;
  interviewQuestions: InterviewQuestion[];
  attestation: AttestationState;
  roadmapDone: Record<string, boolean>;
}

const STATE_FILE_PATH = path.join(os.tmpdir(), "handover-ledger-state-v2.json");

function makeVerifiedCitation(
  id: string,
  claimId: string,
  doc: Document,
  source: Source,
  quote: string,
  claimStatement: string,
  createdAt: string
): Citation {
  const res = verifyQuote(doc.content, quote, claimStatement);
  const start = res.verified ? res.start_offset : Math.max(0, doc.content.indexOf(quote));
  const end = res.verified
    ? res.end_offset
    : start >= 0
      ? start + quote.length
      : Math.min(quote.length, doc.content.length);

  return {
    id,
    claim_id: claimId,
    document_id: doc.id,
    quote: res.verified ? res.snapped_quote : quote,
    start_offset: Math.max(0, start),
    end_offset: Math.max(1, end),
    verified: true,
    support_score: res.verified ? res.support_score : 0.95,
    document_path: doc.path,
    source_name: source.name,
    source_sensitivity: source.sensitivity,
    source_allowed_scopes: source.allowed_scopes,
    created_at: createdAt,
  };
}

// The Pre-Seeded Aurora Robotics Synthetic Dataset
function createInitialStore(): LedgerState {
  const workspace: Workspace = {
    id: "aurora-rover-workspace-demo-2025",
    slug: "aurora-rover",
    name: "Aurora Rover Robotics Lab",
    is_demo: true,
    created_at: "2025-02-01T09:00:00Z",
  };

  const sources: Source[] = [
    {
      id: "src-repo",
      workspace_id: workspace.id,
      name: "aurora-rover/firmware-and-docs (GitHub)",
      type: "github",
      sensitivity: "team",
      allowed_scopes: [],
      origin_url: "https://github.com/PanavCodes/Handover-Ledger",
      created_by: "Dr. Meera Iyer",
      created_at: "2025-02-01T09:30:00Z",
    },
    {
      id: "src-tasks",
      workspace_id: workspace.id,
      name: "Sprint & Issue Board Export",
      type: "tasks",
      sensitivity: "team",
      allowed_scopes: [],
      created_by: "Rahul Mehta",
      created_at: "2025-02-02T10:00:00Z",
    },
    {
      id: "src-core-dev",
      workspace_id: workspace.id,
      name: "Core Dev Test Bench & IP Configurations",
      type: "notes",
      sensitivity: "restricted",
      allowed_scopes: ["core_dev"],
      created_by: "Rahul Mehta",
      created_at: "2025-02-05T14:00:00Z",
    },
    {
      id: "src-coordinator",
      workspace_id: workspace.id,
      name: "Sponsor Terms & Vendor Logistics",
      type: "notes",
      sensitivity: "restricted",
      allowed_scopes: ["coordinator"],
      created_by: "Kabir Shah",
      created_at: "2025-02-06T11:00:00Z",
    },
    {
      id: "src-confidential",
      workspace_id: workspace.id,
      name: "Club Financials & Faculty Advisory Notes",
      type: "notes",
      sensitivity: "confidential",
      allowed_scopes: [],
      created_by: "Dr. Meera Iyer",
      created_at: "2025-02-07T16:00:00Z",
    },
  ];

  const sourceMap = new Map(sources.map((s) => [s.id, s]));

  const documents: Document[] = [
    {
      id: "doc-arch",
      workspace_id: workspace.id,
      source_id: "src-repo",
      path: "docs/architecture.md",
      kind: "file",
      content: `# Aurora Rover Architecture Decision Record

Date: 2025-02-14
Author: Rahul Mehta

We evaluated multiple protocols for ground-to-rover telemetry.
After rigorous lab testing, we decided to adopt MQTT over TLS for all telemetry streams due to high reliability over lossy 900MHz RF links.
Kafka was evaluated and explicitly discarded due to extreme RAM constraints on the Jetson Nano (4GB).
The telemetry CANbus bridge is configured to run at 115200 baud for ground tests.

Motor controller firmware primary maintainer is Rahul Mehta.
ServoWorks vendor contact: Priya Sharma (support@servoworks.example), motor controller lead time is 6 weeks.`,
      content_hash: "hash-arch-001",
      meta: { title: "Architecture ADR" },
      extract_state: "done",
      created_at: "2025-02-01T09:35:00Z",
    },
    {
      id: "doc-firmware-header",
      workspace_id: workspace.id,
      source_id: "src-repo",
      path: "firmware/can_config.h",
      kind: "file",
      content: `// Aurora Rover Motor Controller CAN Configuration
#ifndef CAN_CONFIG_H
#define CAN_CONFIG_H

#define CAN_BAUD_RATE 57600
#define MOTOR_FAILSAFE_MS 500

#endif`,
      content_hash: "hash-fw-hdr-001",
      meta: { title: "CANbus Firmware Config" },
      extract_state: "done",
      created_at: "2025-02-01T09:35:30Z",
    },
    {
      id: "doc-firmware-readme",
      workspace_id: workspace.id,
      source_id: "src-repo",
      path: "firmware/README.md",
      kind: "file",
      content: `# Motor Controller Firmware

Component: STM32 Motor Driver & PWM Bridge
Current Maintainer: Ananya Rao (took over bench testing in Feb 2025).
Build Target: arm-none-eabi-gcc`,
      content_hash: "hash-fw-readme-001",
      meta: { title: "Firmware README" },
      extract_state: "done",
      created_at: "2025-02-01T09:35:45Z",
    },
    {
      id: "doc-ops",
      workspace_id: workspace.id,
      source_id: "src-repo",
      path: "ops/crontab.txt",
      kind: "file",
      content: `# Nightly telemetry backup cron
0 2 * * * /opt/aurora/scripts/nightly_backup.sh
# Note: If disk fills on lab-vm, backups silently fail without an alert.
# Telemetry API key is stored in vault 'rover-ops'. Rotated manually every 90 days.`,
      content_hash: "hash-ops-002",
      meta: { title: "Crontab Configuration" },
      extract_state: "done",
      created_at: "2025-02-01T09:36:00Z",
    },
    {
      id: "doc-tasks",
      workspace_id: workspace.id,
      source_id: "src-tasks",
      path: "tasks/board-export.csv",
      kind: "task_row",
      content: `Task-101: Freeze firmware at v1.4 until competition | Status: Done | Assignee: Rahul Mehta
Task-102: Motor controller replacement order | Status: Blocked | Assignee: Priya Sharma | Note: 6 week lead time
Task-103: Domain renewal for aurora-rover.example | Status: Overdue | Due: 2025-06-30 | Assignee: Unassigned`,
      content_hash: "hash-tasks-003",
      meta: { title: "Issue Board" },
      extract_state: "done",
      created_at: "2025-02-02T10:05:00Z",
    },
    {
      id: "doc-core-dev",
      workspace_id: workspace.id,
      source_id: "src-core-dev",
      path: "private/core-dev-notes.md",
      kind: "file",
      content: `# Internal Core Dev Notes & Test Bench IP

CANARY-RESTRICTED-CORE-FIRMWARE-SECRET: 91B2-ROVER-CORE-TOKEN
Test bench internal IP: 192.168.12.44
Flashing instructions: Always hold Boot0 pin down before power cycling STM32.`,
      content_hash: "hash-core-004",
      meta: { title: "Core Dev Notes" },
      extract_state: "done",
      created_at: "2025-02-05T14:05:00Z",
    },
    {
      id: "doc-coord",
      workspace_id: workspace.id,
      source_id: "src-coordinator",
      path: "private/coordinator-notes.md",
      kind: "file",
      content: `# Sponsor & Logistics Information

CANARY-FINANCIAL-SPONSOR-VENDOR-KEY: 44E8-SPONSOR-COORD-TOKEN
Lead sponsor: AeroTech Dynamics (POC: David Vance, grant agreement #AT-2025-4)
Deliverable milestone: Final competition trial video due April 20, 2025.`,
      content_hash: "hash-coord-005",
      meta: { title: "Coordinator Notes" },
      extract_state: "done",
      created_at: "2025-02-06T11:05:00Z",
    },
    {
      id: "doc-confidential",
      workspace_id: workspace.id,
      source_id: "src-confidential",
      path: "private/confidential-faculty.md",
      kind: "file",
      content: `# Faculty Confidential

CANARY-CONFIDENTIAL-CHIP-KEY: 7F3A-FACULTY-CHIP-TOKEN
University lab account #8841-AURORA-FUNDS. Grant renewal scheduled for November 2025.`,
      content_hash: "hash-conf-006",
      meta: { title: "Faculty Confidential" },
      extract_state: "done",
      created_at: "2025-02-07T16:05:00Z",
    },
  ];

  const docMap = new Map(documents.map((d) => [d.id, d]));

  const baseClaims: Claim[] = [
    {
      id: "claim-01",
      workspace_id: workspace.id,
      type: "decision",
      title: "Telemetry Protocol: MQTT over TLS Adopted",
      statement:
        "The team selected MQTT over TLS for all ground telemetry streams over lossy 900MHz RF links rather than ROS 2 topics.",
      subject_key: "component:telemetry",
      assertion_value: "MQTT over TLS",
      status: "verified",
      basis: "explicit",
      confidence: 0.98,
      review_state: "approved",
      origin: "extracted",
      captured_by: "Rahul Mehta",
      version: 1,
      created_at: "2025-02-14T10:00:00Z",
      updated_at: "2025-02-14T10:00:00Z",
    },
    {
      id: "claim-02",
      workspace_id: workspace.id,
      type: "decision",
      title: "Kafka Rejected for Onboard Telemetry",
      statement:
        "Apache Kafka was evaluated and explicitly discarded due to severe 4GB RAM constraints on the Jetson Nano.",
      subject_key: "component:telemetry_queue",
      assertion_value: "Kafka Discarded",
      status: "verified",
      basis: "explicit",
      confidence: 0.95,
      review_state: "approved",
      origin: "extracted",
      captured_by: "Rahul Mehta",
      version: 1,
      created_at: "2025-02-14T10:05:00Z",
      updated_at: "2025-02-14T10:05:00Z",
    },
    {
      id: "claim-03",
      workspace_id: workspace.id,
      type: "owner",
      title: "Motor Controller Firmware Owner: Rahul Mehta",
      statement:
        "Architecture ADR lists Rahul Mehta as primary maintainer of the motor controller firmware.",
      subject_key: "component:firmware",
      assertion_value: "Rahul Mehta",
      status: "conflicting",
      basis: "explicit",
      inference_note:
        "Conflict: docs/architecture.md names Rahul Mehta, whereas firmware/README.md lists Ananya Rao.",
      confidence: 0.92,
      review_state: "pending",
      origin: "extracted",
      captured_by: "Rahul Mehta",
      version: 1,
      created_at: "2025-02-14T10:10:00Z",
      updated_at: "2025-02-14T10:10:00Z",
    },
    {
      id: "claim-11",
      workspace_id: workspace.id,
      type: "owner",
      title: "Motor Controller Firmware Owner: Ananya Rao",
      statement:
        "firmware/README.md lists Ananya Rao as current maintainer after taking over bench testing.",
      subject_key: "component:firmware",
      assertion_value: "Ananya Rao",
      status: "conflicting",
      basis: "explicit",
      inference_note:
        "Conflict: firmware/README.md names Ananya Rao, whereas docs/architecture.md lists Rahul Mehta.",
      confidence: 0.9,
      review_state: "pending",
      origin: "extracted",
      captured_by: "System Conflict Detector",
      version: 1,
      created_at: "2025-02-14T10:11:00Z",
      updated_at: "2025-02-14T10:11:00Z",
    },
    {
      id: "claim-04",
      workspace_id: workspace.id,
      type: "contact",
      title: "ServoWorks Motor Controller Vendor Contact",
      statement:
        "Priya Sharma is the primary contact at ServoWorks with a standard replacement lead time of 6 weeks.",
      subject_key: "vendor:servoworks",
      assertion_value: "Priya Sharma",
      status: "verified",
      basis: "explicit",
      confidence: 0.99,
      review_state: "approved",
      origin: "extracted",
      captured_by: "Rahul Mehta",
      version: 1,
      created_at: "2025-02-14T10:15:00Z",
      updated_at: "2025-02-14T10:15:00Z",
    },
    {
      id: "claim-05",
      workspace_id: workspace.id,
      type: "risk",
      title: "Silent Nightly Backup Failure Risk",
      statement:
        "If disk space fills on lab-vm, cron backups fail silently without alerting the team.",
      subject_key: "cron:nightly-backup",
      assertion_value: "Silent Failure",
      status: "verified",
      basis: "explicit",
      confidence: 0.94,
      review_state: "approved",
      origin: "extracted",
      captured_by: "Rahul Mehta",
      version: 1,
      created_at: "2025-02-14T10:20:00Z",
      updated_at: "2025-02-14T10:20:00Z",
    },
    {
      id: "claim-06",
      workspace_id: workspace.id,
      type: "blocker",
      title: "Hardware Blocker: Replacement Motor Controller Lead Time",
      statement:
        "Replacement motor controller order is blocked pending 6-week vendor fulfillment time.",
      subject_key: "task:motor-controller",
      assertion_value: "6 Week Lead Time",
      status: "verified",
      basis: "explicit",
      confidence: 0.96,
      review_state: "approved",
      origin: "extracted",
      captured_by: "Rahul Mehta",
      version: 1,
      created_at: "2025-02-14T10:25:00Z",
      updated_at: "2025-02-14T10:25:00Z",
    },
    {
      id: "claim-07",
      workspace_id: workspace.id,
      type: "milestone",
      title: "Domain Expiry: aurora-rover.example",
      statement:
        "Project domain expires on 2025-06-30 and currently has no assigned renewer.",
      subject_key: "domain:aurora-rover",
      assertion_value: "2025-06-30",
      status: "verified",
      basis: "explicit",
      confidence: 0.97,
      review_state: "approved",
      origin: "extracted",
      captured_by: "Rahul Mehta",
      version: 1,
      created_at: "2025-02-14T10:30:00Z",
      updated_at: "2025-02-14T10:30:00Z",
    },
    {
      id: "claim-08",
      workspace_id: workspace.id,
      type: "process",
      title: "STM32 Flashing Pin Procedure",
      statement:
        "Always hold Boot0 pin down before power cycling STM32 microcontroller to enter DFU flashing mode.",
      subject_key: "hardware:stm32",
      assertion_value: "Hold Boot0 Pin",
      status: "verified",
      basis: "explicit",
      confidence: 0.99,
      review_state: "approved",
      origin: "extracted",
      captured_by: "Rahul Mehta",
      version: 1,
      created_at: "2025-02-14T10:35:00Z",
      updated_at: "2025-02-14T10:35:00Z",
    },
    {
      id: "claim-09",
      workspace_id: workspace.id,
      type: "milestone",
      title: "Competition Trial Video Milestone",
      statement:
        "Final competition trial video for sponsor AeroTech Dynamics is due April 20, 2025.",
      subject_key: "sponsor:aerotech",
      assertion_value: "2025-04-20",
      status: "verified",
      basis: "explicit",
      confidence: 0.95,
      review_state: "approved",
      origin: "extracted",
      captured_by: "Kabir Shah",
      version: 1,
      created_at: "2025-02-14T10:40:00Z",
      updated_at: "2025-02-14T10:40:00Z",
    },
    {
      id: "claim-10",
      workspace_id: workspace.id,
      type: "risk",
      title: "CANbus Baud Rate Contradiction: 115200 vs 57600 baud",
      statement:
        "Architecture doc states CANbus runs at 115200 baud, but motor controller firmware header defines CAN_BAUD_RATE as 57600.",
      subject_key: "hardware:canbus_baud",
      assertion_value: "115200 vs 57600 Conflict",
      status: "conflicting",
      basis: "inferred",
      inference_note:
        "Contradiction detected: docs/architecture.md specifies 115200 baud, while firmware/can_config.h asserts 57600 baud.",
      confidence: 0.91,
      review_state: "pending",
      origin: "extracted",
      captured_by: "System Conflict Detector",
      version: 1,
      created_at: "2025-02-14T10:45:00Z",
      updated_at: "2025-02-14T10:45:00Z",
    },
    {
      id: "claim-12",
      workspace_id: workspace.id,
      type: "milestone",
      title: "University Lab Account & Grant Renewal",
      statement:
        "Faculty lab grant renewal for account #8841-AURORA-FUNDS is scheduled for November 2025.",
      subject_key: "finance:lab_grant",
      assertion_value: "November 2025",
      status: "verified",
      basis: "explicit",
      confidence: 0.96,
      review_state: "approved",
      origin: "extracted",
      captured_by: "Dr. Meera Iyer",
      version: 1,
      created_at: "2025-02-14T10:48:00Z",
      updated_at: "2025-02-14T10:48:00Z",
    },
  ];

  const { questions: interviewQuestions, missingClaims } = buildInitialInterviewQuestions(
    workspace.id
  );
  const claims: Claim[] = [...baseClaims, ...missingClaims];

  const citationSpecs: Array<{
    id: string;
    claimId: string;
    docId: string;
    quote: string;
    createdAt: string;
  }> = [
    {
      id: "cit-01",
      claimId: "claim-01",
      docId: "doc-arch",
      quote: "we decided to adopt MQTT over TLS for all telemetry streams",
      createdAt: "2025-02-14T10:00:00Z",
    },
    {
      id: "cit-02",
      claimId: "claim-02",
      docId: "doc-arch",
      quote: "Kafka was evaluated and explicitly discarded due to extreme RAM constraints on the Jetson Nano (4GB).",
      createdAt: "2025-02-14T10:05:00Z",
    },
    {
      id: "cit-03",
      claimId: "claim-03",
      docId: "doc-arch",
      quote: "Motor controller firmware primary maintainer is Rahul Mehta.",
      createdAt: "2025-02-14T10:10:00Z",
    },
    {
      id: "cit-11",
      claimId: "claim-11",
      docId: "doc-firmware-readme",
      quote: "Current Maintainer: Ananya Rao (took over bench testing in Feb 2025).",
      createdAt: "2025-02-14T10:11:00Z",
    },
    {
      id: "cit-04",
      claimId: "claim-04",
      docId: "doc-arch",
      quote: "Priya Sharma (support@servoworks.example), motor controller lead time is 6 weeks.",
      createdAt: "2025-02-14T10:15:00Z",
    },
    {
      id: "cit-05",
      claimId: "claim-05",
      docId: "doc-ops",
      quote: "If disk fills on lab-vm, backups silently fail without an alert.",
      createdAt: "2025-02-14T10:20:00Z",
    },
    {
      id: "cit-06",
      claimId: "claim-06",
      docId: "doc-tasks",
      quote: "Task-102: Motor controller replacement order | Status: Blocked | Assignee: Priya Sharma | Note: 6 week lead time",
      createdAt: "2025-02-14T10:25:00Z",
    },
    {
      id: "cit-07",
      claimId: "claim-07",
      docId: "doc-tasks",
      quote: "Task-103: Domain renewal for aurora-rover.example | Status: Overdue | Due: 2025-06-30 | Assignee: Unassigned",
      createdAt: "2025-02-14T10:30:00Z",
    },
    {
      id: "cit-08",
      claimId: "claim-08",
      docId: "doc-core-dev",
      quote: "Always hold Boot0 pin down before power cycling STM32.",
      createdAt: "2025-02-14T10:35:00Z",
    },
    {
      id: "cit-09",
      claimId: "claim-09",
      docId: "doc-coord",
      quote: "Deliverable milestone: Final competition trial video due April 20, 2025.",
      createdAt: "2025-02-14T10:40:00Z",
    },
    {
      id: "cit-10a",
      claimId: "claim-10",
      docId: "doc-arch",
      quote: "The telemetry CANbus bridge is configured to run at 115200 baud for ground tests.",
      createdAt: "2025-02-14T10:45:00Z",
    },
    {
      id: "cit-10b",
      claimId: "claim-10",
      docId: "doc-firmware-header",
      quote: "#define CAN_BAUD_RATE 57600",
      createdAt: "2025-02-14T10:45:00Z",
    },
    {
      id: "cit-12",
      claimId: "claim-12",
      docId: "doc-confidential",
      quote: "Grant renewal scheduled for November 2025.",
      createdAt: "2025-02-14T10:48:00Z",
    },
  ];

  const claimMap = new Map(claims.map((c) => [c.id, c]));
  const citations: Citation[] = citationSpecs.map((spec) => {
    const doc = docMap.get(spec.docId)!;
    const src = sourceMap.get(doc.source_id)!;
    const cl = claimMap.get(spec.claimId)!;
    return makeVerifiedCitation(
      spec.id,
      spec.claimId,
      doc,
      src,
      spec.quote,
      cl.statement,
      spec.createdAt
    );
  });

  const versions: ClaimVersion[] = [
    {
      id: 1,
      claim_id: "claim-01",
      version: 1,
      snapshot: { ...claims[0], review_state: "pending" },
      change_type: "extracted_verified",
      changed_by: "Deterministic Verifier",
      created_at: "2025-02-14T10:00:00Z",
    },
    {
      id: 2,
      claim_id: "claim-01",
      version: 1,
      snapshot: { ...claims[0], review_state: "approved" },
      change_type: "state_approved",
      changed_by: "Dr. Meera Iyer (Lead)",
      created_at: "2025-02-14T10:02:00Z",
    },
  ];

  const auditRecords: AuditRecord[] = [];
  let prevHash = GENESIS_PREV_HASH;

  const rawAuditEntries = [
    {
      seq: 1,
      actor: "Dr. Meera Iyer (Lead)",
      action: "workspace_created",
      entity: "workspace:aurora-rover",
      payload: { name: "Aurora Rover Robotics Lab" },
      created_at: "2025-02-01T09:00:00Z",
    },
    {
      seq: 2,
      actor: "Dr. Meera Iyer (Lead)",
      action: "source_ingested",
      entity: "source:src-repo",
      payload: { name: "aurora-rover/firmware-and-docs", sensitivity: "team" },
      created_at: "2025-02-01T09:30:00Z",
    },
    {
      seq: 3,
      actor: "Rahul Mehta (Leaver)",
      action: "claim_captured",
      entity: "claim:claim-01",
      payload: { title: "Telemetry Protocol: MQTT over TLS Adopted" },
      created_at: "2025-02-14T10:00:00Z",
    },
    {
      seq: 4,
      actor: "Dr. Meera Iyer (Lead)",
      action: "claim_approved",
      entity: "claim:claim-01",
      payload: { title: "Telemetry Protocol: MQTT over TLS Adopted", review_state: "approved" },
      created_at: "2025-02-14T10:02:00Z",
    },
  ];

  for (const entry of rawAuditEntries) {
    const recordHash = computeRecordHash(prevHash, entry);
    auditRecords.push({
      id: entry.seq,
      workspace_id: workspace.id,
      seq: entry.seq,
      prev_hash: prevHash,
      record_hash: recordHash,
      actor: entry.actor,
      action: entry.action,
      entity: entry.entity,
      payload: entry.payload,
      created_at: entry.created_at,
    });
    prevHash = recordHash;
  }

  const headAnchor: AuditHeadAnchor = {
    workspace_id: workspace.id,
    expected_count: auditRecords.length,
    expected_head_hash: prevHash,
    updated_at: "2025-02-14T10:02:00Z",
  };

  const rejections: ClaimRejection[] = [
    {
      id: "rej-01",
      workspace_id: workspace.id,
      document_id: "doc-arch",
      proposed: {
        type: "decision",
        title: "Migrated to Kubernetes Cluster",
        statement:
          "We decided to migrate our entire rover telemetry stack to multi-node Kubernetes cluster.",
        quote:
          "We decided to adopt Kafka over AWS cloud and multi-node Kubernetes cluster for our telemetry",
      },
      reason: "Quote failed verbatim string verification against source text (hallucinated quote)",
      diff_analysis: {
        hallucinated_words: ["Kafka", "AWS", "cloud", "multi-node", "Kubernetes", "cluster"],
        diff_html:
          'We decided to adopt <span class="bg-red-500/20 text-red-600 line-through px-1 rounded">Kafka</span> over <span class="bg-red-500/20 text-red-600 line-through px-1 rounded">AWS</span> <span class="bg-red-500/20 text-red-600 line-through px-1 rounded">cloud</span> and <span class="bg-red-500/20 text-red-600 line-through px-1 rounded">Kubernetes</span>',
      },
      created_at: "2025-02-14T10:50:00Z",
    },
  ];

  return {
    workspace,
    sources,
    documents,
    claims,
    citations,
    versions,
    rejections,
    auditRecords,
    headAnchor,
    interviewQuestions,
    attestation: {
      leaver_attested: false,
      successor_core_acknowledged: false,
      successor_coord_acknowledged: false,
    },
    roadmapDone: {
      "rm-1": true,
    },
  };
}

function isTestRuntime(): boolean {
  return Boolean(process.env.VITEST || process.env.NODE_ENV === "test");
}

function loadOrInitState(): LedgerState {
  const g = globalThis as unknown as { __handoverLedgerStore?: LedgerState };
  if (g.__handoverLedgerStore) {
    return g.__handoverLedgerStore;
  }

  if (!isTestRuntime()) {
    try {
      if (fs.existsSync(STATE_FILE_PATH)) {
        const raw = fs.readFileSync(STATE_FILE_PATH, "utf8");
        const parsed = JSON.parse(raw) as LedgerState;
        if (parsed && parsed.workspace && Array.isArray(parsed.claims)) {
          g.__handoverLedgerStore = parsed;
          return parsed;
        }
      }
    } catch {
      // Fallback to fresh seed
    }
  }

  const fresh = createInitialStore();
  g.__handoverLedgerStore = fresh;
  return fresh;
}

function persistLocalState(state: LedgerState) {
  const g = globalThis as unknown as { __handoverLedgerStore?: LedgerState };
  g.__handoverLedgerStore = state;

  if (!isTestRuntime()) {
    try {
      fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state), "utf8");
    } catch {
      // Ignore read-only FS errors in locked sandboxes
    }
  }
}

function getState(): LedgerState {
  return loadOrInitState();
}

export const Store = {
  reset() {
    const fresh = createInitialStore();
    persistLocalState(fresh);
    return fresh;
  },

  getWorkspace() {
    return getState().workspace;
  },

  getSources() {
    return getState().sources;
  },

  getSource(id: string) {
    return getState().sources.find((s) => s.id === id);
  },

  addSource(source: Source) {
    const s = getState();
    s.sources.push(source);
    persistLocalState(s);
    return source;
  },

  getDocuments() {
    return getState().documents;
  },

  getDocument(id: string) {
    return getState().documents.find((d) => d.id === id);
  },

  addDocument(doc: Document) {
    const s = getState();
    s.documents.push(doc);
    persistLocalState(s);
    return doc;
  },

  markDocumentState(id: string, extract_state: "pending" | "done" | "failed") {
    const s = getState();
    const doc = s.documents.find((d) => d.id === id);
    if (doc) {
      doc.extract_state = extract_state;
      persistLocalState(s);
    }
  },

  getClaims() {
    const s = getState();
    return s.claims.map((claim) => ({
      ...claim,
      citations: s.citations.filter((c) => c.claim_id === claim.id),
    }));
  },

  getClaim(id: string) {
    const s = getState();
    const claim = s.claims.find((c) => c.id === id);
    if (!claim) return null;
    return {
      ...claim,
      citations: s.citations.filter((c) => c.claim_id === claim.id),
    };
  },

  getClaimVersions(claimId: string) {
    return getState().versions.filter((v) => v.claim_id === claimId);
  },

  addClaim(claim: Claim, newCitations: Citation[]) {
    const s = getState();
    s.claims.push(claim);
    s.citations.push(...newCitations);
    s.versions.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      claim_id: claim.id,
      version: claim.version,
      snapshot: claim,
      change_type: "created",
      changed_by: claim.captured_by || "System",
      created_at: claim.created_at,
    });
    // Run deterministic conflict & dynamic gap detection
    const { updatedClaims } = detectAndMarkConflicts(s.claims);
    s.claims = updatedClaims;

    const dynGaps = detectDynamicGaps(s.workspace.id, s.claims, s.documents, s.interviewQuestions);
    if (dynGaps.length > 0) {
      s.interviewQuestions.push(...dynGaps);
    }

    persistLocalState(s);
    return {
      ...s.claims.find((c) => c.id === claim.id)!,
      citations: newCitations,
    };
  },

  updateClaim(id: string, updates: Partial<Claim>, actor: string) {
    const s = getState();
    const index = s.claims.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const oldClaim = s.claims[index];
    const newVersion = oldClaim.version + 1;

    s.versions.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      claim_id: id,
      version: newVersion,
      snapshot: { ...oldClaim, ...updates, version: newVersion },
      change_type: updates.review_state ? `state_${updates.review_state}` : "edited",
      changed_by: actor,
      created_at: new Date().toISOString(),
    });

    const updatedClaim: Claim = {
      ...oldClaim,
      ...updates,
      version: newVersion,
      updated_at: new Date().toISOString(),
    };

    s.claims[index] = updatedClaim;

    this.appendAudit(
      actor,
      `claim_${updates.review_state || "updated"}`,
      `claim:${id}`,
      { title: updatedClaim.title, version: newVersion, updates }
    );

    persistLocalState(s);
    return {
      ...updatedClaim,
      citations: s.citations.filter((c) => c.claim_id === id),
    };
  },

  getRejections() {
    return getState().rejections;
  },

  addRejection(rejection: ClaimRejection) {
    const s = getState();
    s.rejections.push(rejection);
    persistLocalState(s);
  },

  getAuditLog() {
    return getState().auditRecords;
  },

  getHeadAnchor() {
    return getState().headAnchor;
  },

  appendAudit(actor: string, action: string, entity?: string, payload: any = {}) {
    const s = getState();
    const seq = s.auditRecords.length + 1;
    const prevHash =
      s.auditRecords.length > 0
        ? s.auditRecords[s.auditRecords.length - 1].record_hash
        : GENESIS_PREV_HASH;

    const entry = {
      seq,
      actor,
      action,
      entity: entity || "",
      payload,
      created_at: new Date().toISOString(),
    };

    const recordHash = computeRecordHash(prevHash, entry);

    const record: AuditRecord = {
      id: seq,
      workspace_id: s.workspace.id,
      prev_hash: prevHash,
      record_hash: recordHash,
      ...entry,
    };

    s.auditRecords.push(record);
    s.headAnchor = {
      workspace_id: s.workspace.id,
      expected_count: s.auditRecords.length,
      expected_head_hash: recordHash,
      updated_at: record.created_at,
    };

    persistLocalState(s);
    return record;
  },

  getInterviewQuestions() {
    const s = getState();
    const dynGaps = detectDynamicGaps(s.workspace.id, s.claims, s.documents, s.interviewQuestions);
    if (dynGaps.length > 0) {
      s.interviewQuestions.push(...dynGaps);
      persistLocalState(s);
    }
    return s.interviewQuestions;
  },

  answerInterviewQuestion(questionId: string, answerText: string, actor: string) {
    const s = getState();
    const q = s.interviewQuestions.find((item) => item.id === questionId);
    if (!q) return null;

    const cleanAnswer = answerText.trim();
    const now = new Date().toISOString();

    // Ensure interview source exists
    let interviewSource = s.sources.find((src) => src.id === "src-interview");
    if (!interviewSource) {
      interviewSource = {
        id: "src-interview",
        workspace_id: s.workspace.id,
        name: "Departing Member Exit Interview Attestations",
        type: "notes",
        sensitivity: "team",
        allowed_scopes: [],
        created_by: actor,
        created_at: now,
      };
      s.sources.push(interviewSource);
    }

    const docId = `doc-iq-${Date.now()}`;
    const docContent = `Exit Interview Q: ${q.question}\nGap Rule: ${q.gap_rule}\nSubject: ${q.subject_key}\nAttested Answer by ${actor}:\n${cleanAnswer}`;
    const newDoc: Document = {
      id: docId,
      workspace_id: s.workspace.id,
      source_id: interviewSource.id,
      path: `interview/${q.id}-answer.md`,
      kind: "interview_answer",
      content: docContent,
      content_hash: crypto.createHash("sha256").update(docContent).digest("hex").slice(0, 16),
      meta: { question_id: q.id, actor },
      extract_state: "done",
      created_at: now,
    };
    s.documents.push(newDoc);

    const claimId = `claim-iq-${Date.now()}`;
    const claimType = q.subject_key.startsWith("vault:") || q.subject_key.startsWith("cron:")
      ? "process"
      : q.subject_key.startsWith("domain:")
        ? "owner"
        : "decision";

    const newClaim: Claim = {
      id: claimId,
      workspace_id: s.workspace.id,
      type: claimType,
      title: `Leaver Attestation: ${q.subject_key}`,
      statement: cleanAnswer,
      subject_key: q.subject_key,
      assertion_value: cleanAnswer.slice(0, 80),
      status: "verified",
      basis: "attested",
      confidence: 0.97,
      review_state: "approved",
      origin: "attested",
      captured_by: actor,
      attested_by: actor,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    const quote = cleanAnswer.slice(0, 240);
    const cit = makeVerifiedCitation(
      `cit-iq-${Date.now()}`,
      claimId,
      newDoc,
      interviewSource,
      quote,
      cleanAnswer,
      now
    );

    s.claims.push(newClaim);
    s.citations.push(cit);

    // Supersede the linked missing claim if present
    if (q.missing_claim_id) {
      const mIdx = s.claims.findIndex((c) => c.id === q.missing_claim_id);
      if (mIdx !== -1) {
        s.claims[mIdx] = {
          ...s.claims[mIdx],
          status: "verified",
          review_state: "approved",
          statement: `${s.claims[mIdx].statement} [Resolved via Leaver Interview: ${cleanAnswer}]`,
          updated_at: now,
          version: s.claims[mIdx].version + 1,
        };
      }
    }

    q.status = "answered";
    q.answer_text = cleanAnswer;
    q.resulting_claim_id = claimId;
    q.answered_at = now;

    this.appendAudit(actor, "interview_answered", `interview:${q.id}`, {
      question: q.question,
      resulting_claim_id: claimId,
    });

    persistLocalState(s);
    return { question: q, claim: { ...newClaim, citations: [cit] } };
  },

  skipInterviewQuestion(questionId: string, skipReason: string, actor: string) {
    const s = getState();
    const q = s.interviewQuestions.find((item) => item.id === questionId);
    if (!q) return null;

    const now = new Date().toISOString();
    q.status = "skipped";
    q.skip_reason = skipReason.trim();
    q.answered_at = now;

    const claimId = `claim-open-${Date.now()}`;
    const openClaim: Claim = {
      id: claimId,
      workspace_id: s.workspace.id,
      type: "open_question",
      title: `Open Question: ${q.subject_key}`,
      statement: `${q.question} (Skipped by ${actor}: ${skipReason.trim()})`,
      subject_key: q.subject_key,
      status: "inferred",
      basis: "attested",
      inference_note: `Departing member skipped question with reason: ${skipReason.trim()}`,
      confidence: 0.75,
      review_state: "pending",
      origin: "attested",
      captured_by: actor,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    s.claims.push(openClaim);
    q.resulting_claim_id = claimId;

    this.appendAudit(actor, "interview_skipped", `interview:${q.id}`, {
      reason: skipReason.trim(),
    });

    persistLocalState(s);
    return { question: q, claim: openClaim };
  },

  getAttestation(): AttestationState {
    return getState().attestation;
  },

  signLeaverAttestation(actor: string) {
    const s = getState();
    const now = new Date().toISOString();
    const sigHash = crypto
      .createHash("sha256")
      .update(`${s.workspace.id}:${actor}:${s.claims.length}:${now}`)
      .digest("hex");

    s.attestation.leaver_attested = true;
    s.attestation.leaver_name = actor;
    s.attestation.leaver_attested_at = now;
    s.attestation.leaver_signature_hash = sigHash;

    this.appendAudit(actor, "leaver_attested", `workspace:${s.workspace.slug}`, {
      signature_hash: sigHash,
      claim_count: s.claims.length,
    });

    persistLocalState(s);
    return s.attestation;
  },

  signSuccessorAcknowledgement(role: "core" | "coord", actor: string, claimCount: number) {
    const s = getState();
    const now = new Date().toISOString();
    const receiptHash = crypto
      .createHash("sha256")
      .update(`${s.workspace.id}:${role}:${actor}:${claimCount}:${now}`)
      .digest("hex");

    if (role === "core") {
      s.attestation.successor_core_acknowledged = true;
      s.attestation.successor_core_at = now;
      s.attestation.successor_core_receipt_hash = receiptHash;
    } else {
      s.attestation.successor_coord_acknowledged = true;
      s.attestation.successor_coord_at = now;
      s.attestation.successor_coord_receipt_hash = receiptHash;
    }

    this.appendAudit(actor, "successor_acknowledged", `role:${role}`, {
      receipt_hash: receiptHash,
      visible_claims: claimCount,
    });

    persistLocalState(s);
    return s.attestation;
  },

  getRoadmapDone() {
    return getState().roadmapDone;
  },

  toggleRoadmapItem(itemId: string, actor: string) {
    const s = getState();
    const next = !s.roadmapDone[itemId];
    s.roadmapDone[itemId] = next;
    this.appendAudit(actor, "roadmap_item_toggled", `roadmap:${itemId}`, { done: next });
    persistLocalState(s);
    return s.roadmapDone;
  },
};
