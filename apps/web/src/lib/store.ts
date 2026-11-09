/**
 * Handover Ledger: In-Memory / Supabase Store Adapter
 * Provides local caching and seeded synthetic fixtures for the "Aurora Robotics Club".
 * Ensures 100% reliable, zero-latency execution in demo and hackathon judging environments.
 */

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
} from "./types";
import { computeRecordHash, GENESIS_PREV_HASH } from "./audit";

// The Pre-Seeded Aurora Robotics Synthetic Dataset
function createInitialStore() {
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
      origin_url: "https://github.com/aurora-robotics/aurora-rover-demo",
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
      allowed_scopes: ["core_dev"], // Only visible to lead & core_dev!
      created_by: "Rahul Mehta",
      created_at: "2025-02-05T14:00:00Z",
    },
    {
      id: "src-coordinator",
      workspace_id: workspace.id,
      name: "Sponsor Terms & Vendor Logistics",
      type: "notes",
      sensitivity: "restricted",
      allowed_scopes: ["coordinator"], // Only visible to lead & coordinator!
      created_by: "Kabir Shah",
      created_at: "2025-02-06T11:00:00Z",
    },
    {
      id: "src-confidential",
      workspace_id: workspace.id,
      name: "Club Financials & Faculty Advisory Notes",
      type: "notes",
      sensitivity: "confidential",
      allowed_scopes: [], // Only visible to lead!
      created_by: "Dr. Meera Iyer",
      created_at: "2025-02-07T16:00:00Z",
    },
  ];

  const documents: Document[] = [
    {
      id: "doc-arch",
      workspace_id: workspace.id,
      source_id: "src-repo",
      path: "docs/architecture.md",
      kind: "file",
      content: `# Aurora Rover Architecture Decision Record\n\nDate: 2025-02-14\nAuthor: Rahul Mehta\n\nWe evaluated multiple protocols for ground-to-rover telemetry.\nAfter rigorous lab testing, we decided to adopt MQTT over TLS for all telemetry streams due to high reliability over lossy 900MHz RF links.\nKafka was evaluated and explicitly discarded due to extreme RAM constraints on the Jetson Nano (4GB).\n\nMotor controller firmware primary maintainer is Rahul Mehta.\nServoWorks vendor contact: Priya Sharma (support@servoworks.example), motor controller lead time is 6 weeks.`,
      content_hash: "hash-arch-001",
      meta: { title: "Architecture ADR" },
      extract_state: "done",
      created_at: "2025-02-01T09:35:00Z",
    },
    {
      id: "doc-ops",
      workspace_id: workspace.id,
      source_id: "src-repo",
      path: "ops/crontab.txt",
      kind: "file",
      content: `# Nightly telemetry backup cron\n0 2 * * * /opt/aurora/scripts/nightly_backup.sh\n# Note: If disk fills on lab-vm, backups silently fail without an alert.\n# Telemetry API key is stored in vault 'rover-ops'. Rotated manually every 90 days.`,
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
      content: `Task-101: Freeze firmware at v1.4 until competition | Status: Done | Assignee: Rahul Mehta\nTask-102: Motor controller replacement order | Status: Blocked | Assignee: Priya Sharma | Note: 6 week lead time\nTask-103: Domain renewal for aurora-rover.example | Status: Overdue | Due: 2025-06-30 | Assignee: Unassigned`,
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
      content: `# Internal Core Dev Notes & Test Bench IP\n\nCANARY-RESTRICTED-CORE-FIRMWARE-SECRET: 91B2-ROVER-CORE-TOKEN\nTest bench internal IP: 192.168.12.44\nFlashing instructions: Always hold Boot0 pin down before power cycling STM32.`,
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
      content: `# Sponsor & Logistics Information\n\nCANARY-FINANCIAL-SPONSOR-VENDOR-KEY: 44E8-SPONSOR-COORD-TOKEN\nLead sponsor: AeroTech Dynamics (POC: David Vance, grant agreement #AT-2025-4)\nDeliverable milestone: Final competition trial video due April 20, 2025.`,
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
      content: `# Faculty Confidential\n\nCANARY-CONFIDENTIAL-CHIP-KEY: 7F3A-FACULTY-CHIP-TOKEN\nUniversity lab account #8841-AURORA-FUNDS. Grant renewal scheduled for November 2025.`,
      content_hash: "hash-conf-006",
      meta: { title: "Faculty Confidential" },
      extract_state: "done",
      created_at: "2025-02-07T16:05:00Z",
    },
  ];

  const claims: Claim[] = [
    {
      id: "claim-01",
      workspace_id: workspace.id,
      type: "decision",
      title: "Telemetry Protocol: MQTT over TLS Adopted",
      statement: "The team selected MQTT over TLS for all ground telemetry streams over lossy 900MHz RF links rather than ROS 2 topics.",
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
      statement: "Apache Kafka was evaluated and explicitly discarded due to severe 4GB RAM constraints on the Jetson Nano.",
      subject_key: "component:telemetry",
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
      statement: "Rahul Mehta is the primary owner and maintainer of the low-level motor controller firmware.",
      subject_key: "component:firmware",
      assertion_value: "Rahul Mehta",
      status: "conflicting", // Conflict with Ananya's claim
      basis: "explicit",
      confidence: 0.92,
      review_state: "pending",
      origin: "extracted",
      captured_by: "Rahul Mehta",
      version: 1,
      created_at: "2025-02-14T10:10:00Z",
      updated_at: "2025-02-14T10:10:00Z",
    },
    {
      id: "claim-04",
      workspace_id: workspace.id,
      type: "contact",
      title: "ServoWorks Motor Controller Vendor Contact",
      statement: "Priya Sharma is the primary contact at ServoWorks with a standard replacement lead time of 6 weeks.",
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
      statement: "If disk space fills on lab-vm, cron backups fail silently without alerting the team.",
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
      statement: "Replacement motor controller order is blocked pending 6-week vendor fulfillment time.",
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
      statement: "Project domain expires on 2025-06-30 and currently has no assigned renewer.",
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
      statement: "Always hold Boot0 pin down before power cycling STM32 microcontroller to enter DFU flashing mode.",
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
      statement: "Final competition trial video for sponsor AeroTech Dynamics is due April 20, 2025.",
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
      statement: "Architecture doc states CANbus runs at 115200 baud, but motor controller firmware header defines CAN_BAUD_RATE as 57600.",
      subject_key: "hardware:canbus_baud",
      assertion_value: "115200 vs 57600 Conflict",
      status: "conflicting",
      basis: "inferred",
      inference_note: "Contradiction detected: architecture.md specifies 115200 baud, while firmware asserts 57600 baud.",
      confidence: 0.91,
      review_state: "pending",
      origin: "extracted",
      captured_by: "System Conflict Detector",
      version: 1,
      created_at: "2025-02-14T10:45:00Z",
      updated_at: "2025-02-14T10:45:00Z",
    },
  ];

  const citations: Citation[] = [
    {
      id: "cit-01",
      claim_id: "claim-01",
      document_id: "doc-arch",
      quote: "we decided to adopt MQTT over TLS for all telemetry streams",
      start_offset: 147,
      end_offset: 206,
      verified: true,
      support_score: 0.98,
      document_path: "docs/architecture.md",
      source_name: "aurora-rover/firmware-and-docs (GitHub)",
      source_sensitivity: "team",
      source_allowed_scopes: [],
      created_at: "2025-02-14T10:00:00Z",
    },
    {
      id: "cit-02",
      claim_id: "claim-02",
      document_id: "doc-arch",
      quote: "Kafka was evaluated and explicitly discarded due to extreme RAM constraints on the Jetson Nano (4GB).",
      start_offset: 247,
      end_offset: 350,
      verified: true,
      support_score: 0.95,
      document_path: "docs/architecture.md",
      source_name: "aurora-rover/firmware-and-docs (GitHub)",
      source_sensitivity: "team",
      source_allowed_scopes: [],
      created_at: "2025-02-14T10:05:00Z",
    },
    {
      id: "cit-03",
      claim_id: "claim-03",
      document_id: "doc-arch",
      quote: "Motor controller firmware primary maintainer is Rahul Mehta.",
      start_offset: 352,
      end_offset: 412,
      verified: true,
      support_score: 0.92,
      document_path: "docs/architecture.md",
      source_name: "aurora-rover/firmware-and-docs (GitHub)",
      source_sensitivity: "team",
      source_allowed_scopes: [],
      created_at: "2025-02-14T10:10:00Z",
    },
    {
      id: "cit-04",
      claim_id: "claim-04",
      document_id: "doc-arch",
      quote: "Priya Sharma (support@servoworks.example), motor controller lead time is 6 weeks.",
      start_offset: 439,
      end_offset: 520,
      verified: true,
      support_score: 0.99,
      document_path: "docs/architecture.md",
      source_name: "aurora-rover/firmware-and-docs (GitHub)",
      source_sensitivity: "team",
      source_allowed_scopes: [],
      created_at: "2025-02-14T10:15:00Z",
    },
    {
      id: "cit-05",
      claim_id: "claim-05",
      document_id: "doc-ops",
      quote: "If disk fills on lab-vm, backups silently fail without an alert.",
      start_offset: 89,
      end_offset: 153,
      verified: true,
      support_score: 0.94,
      document_path: "ops/crontab.txt",
      source_name: "aurora-rover/firmware-and-docs (GitHub)",
      source_sensitivity: "team",
      source_allowed_scopes: [],
      created_at: "2025-02-14T10:20:00Z",
    },
    {
      id: "cit-06",
      claim_id: "claim-06",
      document_id: "doc-tasks",
      quote: "Task-102: Motor controller replacement order | Status: Blocked | Assignee: Priya Sharma | Note: 6 week lead time",
      start_offset: 81,
      end_offset: 194,
      verified: true,
      support_score: 0.96,
      document_path: "tasks/board-export.csv",
      source_name: "Sprint & Issue Board Export",
      source_sensitivity: "team",
      source_allowed_scopes: [],
      created_at: "2025-02-14T10:25:00Z",
    },
    {
      id: "cit-07",
      claim_id: "claim-07",
      document_id: "doc-tasks",
      quote: "Task-103: Domain renewal for aurora-rover.example | Status: Overdue | Due: 2025-06-30 | Assignee: Unassigned",
      start_offset: 195,
      end_offset: 303,
      verified: true,
      support_score: 0.97,
      document_path: "tasks/board-export.csv",
      source_name: "Sprint & Issue Board Export",
      source_sensitivity: "team",
      source_allowed_scopes: [],
      created_at: "2025-02-14T10:30:00Z",
    },
    {
      id: "cit-08",
      claim_id: "claim-08",
      document_id: "doc-core-dev",
      quote: "Always hold Boot0 pin down before power cycling STM32.",
      start_offset: 147,
      end_offset: 201,
      verified: true,
      support_score: 0.99,
      document_path: "private/core-dev-notes.md",
      source_name: "Core Dev Test Bench & IP Configurations",
      source_sensitivity: "restricted",
      source_allowed_scopes: ["core_dev"],
      created_at: "2025-02-14T10:35:00Z",
    },
    {
      id: "cit-09",
      claim_id: "claim-09",
      document_id: "doc-coord",
      quote: "Deliverable milestone: Final competition trial video due April 20, 2025.",
      start_offset: 153,
      end_offset: 225,
      verified: true,
      support_score: 0.95,
      document_path: "private/coordinator-notes.md",
      source_name: "Sponsor Terms & Vendor Logistics",
      source_sensitivity: "restricted",
      source_allowed_scopes: ["coordinator"],
      created_at: "2025-02-14T10:40:00Z",
    },
    {
      id: "cit-10",
      claim_id: "claim-10",
      document_id: "doc-arch",
      quote: "we decided to adopt MQTT over TLS for all telemetry streams",
      start_offset: 147,
      end_offset: 206,
      verified: true,
      support_score: 0.95,
      document_path: "docs/architecture.md",
      source_name: "aurora-rover/firmware-and-docs (GitHub)",
      source_sensitivity: "team",
      source_allowed_scopes: [],
      created_at: "2025-02-14T10:45:00Z",
    },
  ];

  // Pre-seed cryptographic audit records
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
        statement: "We decided to migrate our entire rover telemetry stack to multi-node Kubernetes cluster.",
        quote: "We decided to adopt Kafka over AWS cloud and multi-node Kubernetes cluster for our telemetry",
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
    versions: [] as ClaimVersion[],
    rejections,
    auditRecords,
    headAnchor,
  };
}

// Global in-memory singleton
let store = createInitialStore();

export const Store = {
  reset() {
    store = createInitialStore();
    return store;
  },

  getWorkspace() {
    return store.workspace;
  },

  getSources() {
    return store.sources;
  },

  getSource(id: string) {
    return store.sources.find((s) => s.id === id);
  },

  addSource(source: Source) {
    store.sources.push(source);
    return source;
  },

  getDocuments() {
    return store.documents;
  },

  getDocument(id: string) {
    return store.documents.find((d) => d.id === id);
  },

  addDocument(doc: Document) {
    store.documents.push(doc);
    return doc;
  },

  getClaims() {
    return store.claims.map((claim) => {
      const claimCitations = store.citations.filter((c) => c.claim_id === claim.id);
      return {
        ...claim,
        citations: claimCitations,
      };
    });
  },

  getClaim(id: string) {
    const claim = store.claims.find((c) => c.id === id);
    if (!claim) return null;
    const claimCitations = store.citations.filter((c) => c.claim_id === claim.id);
    return {
      ...claim,
      citations: claimCitations,
    };
  },

  addClaim(claim: Claim, newCitations: Citation[]) {
    store.claims.push(claim);
    store.citations.push(...newCitations);
    return {
      ...claim,
      citations: newCitations,
    };
  },

  updateClaim(id: string, updates: Partial<Claim>, actor: string) {
    const index = store.claims.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const oldClaim = store.claims[index];
    const newVersion = oldClaim.version + 1;

    // Record version
    store.versions.push({
      id: Date.now(),
      claim_id: id,
      version: oldClaim.version,
      snapshot: oldClaim,
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

    store.claims[index] = updatedClaim;

    // Append to audit log
    this.appendAudit(
      actor,
      `claim_${updates.review_state || "updated"}`,
      `claim:${id}`,
      { title: updatedClaim.title, version: newVersion, updates }
    );

    return updatedClaim;
  },

  getRejections() {
    return store.rejections;
  },

  addRejection(rejection: ClaimRejection) {
    store.rejections.push(rejection);
  },

  getAuditLog() {
    return store.auditRecords;
  },

  getHeadAnchor() {
    return store.headAnchor;
  },

  appendAudit(actor: string, action: string, entity?: string, payload: any = {}) {
    const seq = store.auditRecords.length + 1;
    const prevHash =
      store.auditRecords.length > 0
        ? store.auditRecords[store.auditRecords.length - 1].record_hash
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
      workspace_id: store.workspace.id,
      prev_hash: prevHash,
      record_hash: recordHash,
      ...entry,
    };

    store.auditRecords.push(record);
    store.headAnchor = {
      workspace_id: store.workspace.id,
      expected_count: store.auditRecords.length,
      expected_head_hash: recordHash,
      updated_at: record.created_at,
    };

    return record;
  },
};
