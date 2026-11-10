import { NextRequest, NextResponse } from "next/server";
import { getSession, PersonaRole, DEMO_PERSONAS } from "@/lib/session";
import { Store } from "@/lib/store";
import { filterClaimsForPersona } from "@/lib/access";
import { Claim, RoadmapItem } from "@/lib/types";

interface RoadmapBlueprint {
  id: string;
  title: string;
  description: string;
  timeframe: "day1" | "week1" | "month1";
  required_scope: "all" | "core_dev" | "coordinator";
  filterIds: (claims: Claim[]) => string[];
}

const ROADMAP_BLUEPRINTS: RoadmapBlueprint[] = [
  {
    id: "rm-1",
    title: "Verify STM32 DFU Boot0 pin flashing & bench test IP telemetry",
    description:
      "Perform physical Boot0 pin flashing check under supervision and confirm 900MHz MQTT over TLS telemetry link.",
    timeframe: "day1",
    required_scope: "core_dev",
    filterIds: (claims) =>
      claims
        .filter((c) => c.type === "process" || c.subject_key.includes("telemetry") || c.subject_key.includes("stm32"))
        .map((c) => c.id),
  },
  {
    id: "rm-2",
    title: "Inspect lab-vm disk buffer & nightly backup cron restore path",
    description:
      "Confirm nightly_backup.sh cron output directory has >10GB headroom and validate latest encrypted tarball restore.",
    timeframe: "day1",
    required_scope: "all",
    filterIds: (claims) => claims.filter((c) => c.subject_key.includes("backup")).map((c) => c.id),
  },
  {
    id: "rm-3",
    title: "Follow up with ServoWorks (Priya Sharma) on replacement controller",
    description:
      "Confirm 6-week lead time delivery window and align vendor PO reference for competition rover chassis.",
    timeframe: "week1",
    required_scope: "all",
    filterIds: (claims) => claims.filter((c) => c.type === "contact" || c.subject_key.includes("motor")).map((c) => c.id),
  },
  {
    id: "rm-4",
    title: "Deliver AeroTech Dynamics competition trial video & grant check-in",
    description:
      "Coordinate competition video submission before April 20 deadline with sponsor POC David Vance.",
    timeframe: "week1",
    required_scope: "coordinator",
    filterIds: (claims) => claims.filter((c) => c.subject_key.includes("aerotech")).map((c) => c.id),
  },
  {
    id: "rm-5",
    title: "Resolve firmware ownership & CANbus baud (115200 vs 57600) conflicts",
    description:
      "Verify competition bench baud rate in firmware/can_config.h and align README maintainer assignment.",
    timeframe: "week1",
    required_scope: "core_dev",
    filterIds: (claims) => claims.filter((c) => c.status === "conflicting" || c.subject_key.includes("firmware")).map((c) => c.id),
  },
  {
    id: "rm-6",
    title: "Rotate 'rover-ops' vault credentials & automate 90-day expiry alert",
    description:
      "Replace manual 90-day rotation dependency in ops/crontab.txt before departing owner exit.",
    timeframe: "month1",
    required_scope: "all",
    filterIds: (claims) =>
      claims
        .filter((c) => c.subject_key.includes("vault") || c.type === "credential_ref")
        .map((c) => c.id),
  },
  {
    id: "rm-7",
    title: "Assign registrar owner & renew aurora-rover.example domain",
    description:
      "Transfer domain billing before 2025-06-30 expiry so telemetry DNS and public portal stay live.",
    timeframe: "month1",
    required_scope: "all",
    filterIds: (claims) => claims.filter((c) => c.subject_key.includes("domain")).map((c) => c.id),
  },
];

function buildScopedRoadmap(
  visibleClaims: Claim[],
  role: PersonaRole,
  doneMap: Record<string, boolean>
) {
  const filtered = ROADMAP_BLUEPRINTS.filter((item) => {
    if (role === "lead" || role === "leaver") return true;
    if (role === "core") return item.required_scope === "all" || item.required_scope === "core_dev";
    if (role === "coord") return item.required_scope === "all" || item.required_scope === "coordinator";
    return item.required_scope === "all";
  });

  const toItem = (bp: RoadmapBlueprint): RoadmapItem => ({
    id: bp.id,
    title: bp.title,
    description: bp.description,
    timeframe: bp.timeframe,
    required_scope: bp.required_scope,
    linked_claim_ids: bp.filterIds(visibleClaims),
    done: Boolean(doneMap[bp.id]),
  });

  return {
    day1: filtered.filter((b) => b.timeframe === "day1").map(toItem),
    week1: filtered.filter((b) => b.timeframe === "week1").map(toItem),
    month1: filtered.filter((b) => b.timeframe === "month1").map(toItem),
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const searchParams = req.nextUrl.searchParams;
  const requestedPreview = searchParams.get("preview_role") as PersonaRole | null;

  // Strictly enforce that ONLY Lead can preview other role briefs
  const effectivePersona: PersonaRole =
    session.persona === "lead" && requestedPreview && requestedPreview in DEMO_PERSONAS
      ? requestedPreview
      : session.persona;

  const targetScope =
    effectivePersona === "core"
      ? "core_dev"
      : effectivePersona === "coord"
        ? "coordinator"
        : "all";

  const allClaims = Store.getClaims();
  const { visibleClaims, withheldCount } = filterClaimsForPersona(allClaims, effectivePersona);

  // 1. Decisions
  const decisions = visibleClaims.filter((c) => c.type === "decision");

  // 2. Unfinished Work & Coverage Gaps
  const unfinished = visibleClaims.filter(
    (c) =>
      c.type === "blocker" ||
      c.type === "open_question" ||
      c.status === "missing" ||
      (c.type === "milestone" && c.assertion_value !== "done")
  );

  // 3. Who Owned What (grouped by person)
  const ownerClaims = visibleClaims.filter((c) => c.type === "owner" || c.type === "contact");
  const ownershipMap: Record<string, Claim[]> = {};
  for (const oc of ownerClaims) {
    const person = oc.assertion_value || "Unassigned";
    if (!ownershipMap[person]) ownershipMap[person] = [];
    ownershipMap[person].push(oc);
  }
  const ownership = Object.entries(ownershipMap).map(([person, pClaims]) => ({
    person,
    claims: pClaims,
  }));

  // 4. Risks & Fragilities
  const risks = visibleClaims.filter(
    (c) => c.type === "risk" || c.type === "credential_ref" || c.status === "conflicting"
  );

  // 5. Role-Scoped 30-Day Roadmap
  const doneMap = Store.getRoadmapDone();
  const roadmap = buildScopedRoadmap(visibleClaims, effectivePersona, doneMap);
  const allRoadmapItems = [...roadmap.day1, ...roadmap.week1, ...roadmap.month1];
  const roadmapDoneCount = allRoadmapItems.filter((r) => r.done).length;

  // Interview & Attestation state
  const interviewQuestions = Store.getInterviewQuestions();
  const interviewAnsweredCount = interviewQuestions.filter((q) => q.status !== "pending").length;
  const attestation = Store.getAttestation();

  // Dynamic Handover Readiness Score (0-100 across 4 transparent weights)
  const totalClaims = visibleClaims.length;
  const verifiedCount = visibleClaims.filter((c) => c.status === "verified").length;
  const conflictCount = visibleClaims.filter((c) => c.status === "conflicting").length;
  const approvedCount = visibleClaims.filter((c) => c.review_state === "approved").length;

  const verifiedClaimsPct = totalClaims > 0 ? Math.round((verifiedCount / totalClaims) * 100) : 0;

  const interviewRatio =
    interviewQuestions.length > 0 ? interviewAnsweredCount / interviewQuestions.length : 1;
  const roadmapRatio = allRoadmapItems.length > 0 ? roadmapDoneCount / allRoadmapItems.length : 1;
  const unfinishedScopedPct = Math.round(((interviewRatio * 0.65) + (roadmapRatio * 0.35)) * 100);

  const criticalItems = visibleClaims.filter(
    (c) => c.type === "risk" || c.type === "owner" || c.status === "conflicting"
  );
  const mitigatedCritical = criticalItems.filter(
    (c) => c.status !== "conflicting" && (c.review_state === "approved" || c.origin === "attested")
  ).length;
  const spofMitigatedPct =
    criticalItems.length > 0
      ? Math.max(0, Math.round((mitigatedCritical / criticalItems.length) * 100) - conflictCount * 8)
      : 100;

  let successorSignoffPct = 0;
  if (attestation.leaver_attested) successorSignoffPct += 50;
  if (attestation.successor_core_acknowledged) successorSignoffPct += 25;
  if (attestation.successor_coord_acknowledged) successorSignoffPct += 25;

  const readinessScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        verifiedClaimsPct * 0.4 +
          unfinishedScopedPct * 0.25 +
          spofMitigatedPct * 0.2 +
          successorSignoffPct * 0.15
      )
    )
  );

  // Next actionable blocker suggestion
  let nextBlocker = "All core gaps and conflicts resolved. Ready for formal sign-off.";
  const firstPendingGap = interviewQuestions.find((q) => q.status === "pending");
  if (conflictCount > 0) {
    nextBlocker = `${conflictCount} document contradiction(s) need Lead resolution in Evidence Ledger.`;
  } else if (firstPendingGap) {
    nextBlocker = `${interviewQuestions.length - interviewAnsweredCount} gap interview question(s) awaiting departing owner attestation.`;
  } else if (!attestation.leaver_attested) {
    nextBlocker = "Awaiting Rahul Mehta (Leaver) digital attestation sign-off on Dashboard.";
  } else if (!attestation.successor_core_acknowledged || !attestation.successor_coord_acknowledged) {
    nextBlocker = "Awaiting Successor receipt acknowledgement in Handover Brief.";
  }

  return NextResponse.json({
    persona: effectivePersona,
    actualPersona: session.persona,
    scope: targetScope,
    withheldCount,
    readinessScore,
    nextBlocker,
    scoreBreakdown: {
      verified_claims_pct: verifiedClaimsPct,
      unfinished_tasks_scoped_pct: unfinishedScopedPct,
      spof_mitigated_pct: spofMitigatedPct,
      successor_signoff_pct: successorSignoffPct,
      approvedCount,
      totalClaims,
      conflictCount,
    },
    attestation,
    interviewSummary: {
      total: interviewQuestions.length,
      answered: interviewAnsweredCount,
      pending: interviewQuestions.length - interviewAnsweredCount,
    },
    brief: {
      decisions,
      unfinished,
      ownership,
      risks,
      roadmap,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  try {
    const body = await req.json();
    const itemId = body?.itemId;
    if (!itemId || typeof itemId !== "string") {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }
    const profile = DEMO_PERSONAS[session.persona];
    const roadmapDone = Store.toggleRoadmapItem(itemId, `${profile.name} (${profile.badge})`);
    return NextResponse.json({ success: true, roadmapDone });
  } catch {
    return NextResponse.json({ error: "Failed to toggle roadmap item" }, { status: 500 });
  }
}
