import { Claim, Document, InterviewQuestion } from "./types";

/**
 * Deterministic Gap Detector
 * Identifies undocumented runbooks, missing rotation procedures, unassigned overdue tasks,
 * and sole-maintainer bus-factor silos to generate targeted departing-member interview prompts.
 */
export function buildInitialInterviewQuestions(workspaceId: string): {
  questions: InterviewQuestion[];
  missingClaims: Claim[];
} {
  const now = "2025-02-14T11:00:00Z";

  const missingClaims: Claim[] = [
    {
      id: "claim-gap-01",
      workspace_id: workspaceId,
      type: "process",
      title: "MISSING RUNBOOK: Nightly Backup Restoration Steps",
      statement: "ops/crontab.txt runs /opt/aurora/scripts/nightly_backup.sh at 02:00 daily, but no restore verification or alert runbook exists.",
      subject_key: "cron:nightly-backup",
      status: "missing",
      basis: "inferred",
      inference_note: "Rule R1 Gap: Scheduled cron detected with silent failure risk and zero restore documentation.",
      confidence: 0.9,
      review_state: "pending",
      origin: "extracted",
      captured_by: "Gap Detector (Rule R1)",
      version: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: "claim-gap-02",
      workspace_id: workspaceId,
      type: "credential_ref",
      title: "MISSING PROCEDURE: Telemetry Vault 'rover-ops' Key Rotation",
      statement: "Telemetry API key stored in vault 'rover-ops' requires manual 90-day rotation, but vault location and rotation steps are undocumented.",
      subject_key: "vault:rover-ops",
      status: "missing",
      basis: "inferred",
      inference_note: "Rule R2 Gap: Credential reference exists with no rotation or access handoff procedure.",
      confidence: 0.92,
      review_state: "pending",
      origin: "extracted",
      captured_by: "Gap Detector (Rule R2)",
      version: 1,
      created_at: now,
      updated_at: now,
    },
    {
      id: "claim-gap-03",
      workspace_id: workspaceId,
      type: "owner",
      title: "UNASSIGNED ASSET: aurora-rover.example Domain Registrar",
      statement: "Task-103 flags domain aurora-rover.example renewal as overdue with no assigned owner or registrar billing account documented.",
      subject_key: "domain:aurora-rover",
      status: "missing",
      basis: "inferred",
      inference_note: "Rule R3 Gap: Expiring external asset has Assignee: Unassigned.",
      confidence: 0.88,
      review_state: "pending",
      origin: "extracted",
      captured_by: "Gap Detector (Rule R3)",
      version: 1,
      created_at: now,
      updated_at: now,
    },
  ];

  const questions: InterviewQuestion[] = [
    {
      id: "iq-01",
      workspace_id: workspaceId,
      gap_rule: "R1: Cron Without Restore Runbook",
      subject_key: "cron:nightly-backup",
      question:
        "The nightly backup cron (`0 2 * * * /opt/aurora/scripts/nightly_backup.sh`) on lab-vm fails silently when disk fills, and there is no restore runbook. Where are backups stored and how does Ananya verify or restore a snapshot?",
      why_asked:
        "Detected cron schedule and silent-failure warning in ops/crontab.txt, but 0 `process` claims explain restore steps.",
      status: "pending",
      missing_claim_id: "claim-gap-01",
      created_at: now,
    },
    {
      id: "iq-02",
      workspace_id: workspaceId,
      gap_rule: "R2: Credential With No Rotation Guide",
      subject_key: "vault:rover-ops",
      question:
        "ops/crontab.txt states the Telemetry API key lives in vault 'rover-ops' and rotates manually every 90 days. Where is the 'rover-ops' vault hosted and what is the exact command/dashboard to rotate the key without dropping live rover telemetry?",
      why_asked:
        "Found manual 90-day credential rotation requirement in ops/crontab.txt with no documented rotation procedure.",
      status: "pending",
      missing_claim_id: "claim-gap-02",
      created_at: now,
    },
    {
      id: "iq-03",
      workspace_id: workspaceId,
      gap_rule: "R3: Expiring Asset With No Owner",
      subject_key: "domain:aurora-rover",
      question:
        "Task-103 shows domain aurora-rover.example is overdue for renewal and unassigned. Which registrar (Namecheap/Cloudflare/etc.) holds the domain and who should inherit billing control?",
      why_asked:
        "Task-103 in tasks/board-export.csv has Status: Overdue and Assignee: Unassigned.",
      status: "pending",
      missing_claim_id: "claim-gap-03",
      created_at: now,
    },
    {
      id: "iq-04",
      workspace_id: workspaceId,
      gap_rule: "R4: Unresolved Contradiction",
      subject_key: "hardware:canbus_baud",
      question:
        "docs/architecture.md specifies CANbus at 115200 baud, whereas firmware/can_config.h defines CAN_BAUD_RATE as 57600. Which baud rate is actually flashed onto the competition rover hardware?",
      why_asked:
        "Automatic conflict detector flagged two opposing baud rate assertions across documentation and firmware headers.",
      status: "pending",
      created_at: now,
    },
  ];

  return { questions, missingClaims };
}

/**
 * Generates dynamic interview questions whenever new documents/claims introduce uncovered gaps.
 */
export function detectDynamicGaps(
  workspaceId: string,
  claims: Claim[],
  docs: Document[],
  existingQuestions: InterviewQuestion[]
): InterviewQuestion[] {
  const existingKeys = new Set(existingQuestions.map((q) => q.subject_key.toLowerCase()));
  const newQuestions: InterviewQuestion[] = [];
  const now = new Date().toISOString();

  // Check for bus-factor or owner without process claim
  const processSubjects = new Set(
    claims.filter((c) => c.type === "process").map((c) => c.subject_key.toLowerCase())
  );

  for (const c of claims) {
    const key = c.subject_key.toLowerCase();
    if (existingKeys.has(key)) continue;

    if (
      c.origin === "git_derived" &&
      c.type === "risk" &&
      c.title.toLowerCase().includes("bus-factor")
    ) {
      existingKeys.add(key);
      newQuestions.push({
        id: `iq-dyn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        workspace_id: workspaceId,
        gap_rule: "R5: Bus-Factor Silo",
        subject_key: c.subject_key,
        question: `Git commit analysis shows a sole-maintainer silo on '${c.subject_key}'. What undocumented gotchas, local build flags, or setup steps does a successor need first?`,
        why_asked: `${c.statement}`,
        status: "pending",
        created_at: now,
      });
    } else if (
      c.type === "credential_ref" &&
      !processSubjects.has(key)
    ) {
      existingKeys.add(key);
      newQuestions.push({
        id: `iq-dyn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        workspace_id: workspaceId,
        gap_rule: "R2: Credential With No Rotation Guide",
        subject_key: c.subject_key,
        question: `A credential reference (${c.title}) was detected without a rotation or access-grant runbook. Who holds admin access and how should it be rotated?`,
        why_asked: `Claim "${c.title}" exists with no corresponding rotation process claim.`,
        status: "pending",
        created_at: now,
      });
    }
  }

  // Also check docs containing TODO or FIXME without a question
  for (const doc of docs) {
    if (/(TODO|FIXME)\b/i.test(doc.content)) {
      const subj = `doc:${doc.path}`;
      if (!existingKeys.has(subj.toLowerCase())) {
        const match = doc.content.match(/.*(?:TODO|FIXME)[^\n]*/i);
        if (match) {
          existingKeys.add(subj.toLowerCase());
          newQuestions.push({
            id: `iq-todo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            workspace_id: workspaceId,
            gap_rule: "R6: Unresolved TODO/FIXME",
            subject_key: subj,
            question: `${doc.path} contains an unfinished note ("${match[0].trim().slice(0, 120)}"). Is this still required before handover, or can it be closed?`,
            why_asked: `Detected unresolved TODO/FIXME marker in ${doc.path}.`,
            status: "pending",
            created_at: now,
          });
        }
      }
    }
  }

  return newQuestions;
}

