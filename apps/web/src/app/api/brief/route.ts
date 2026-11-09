import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { filterClaimsForPersona } from "@/lib/access";
import { Claim, RoadmapItem } from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const searchParams = req.nextUrl.searchParams;
  const targetScope = searchParams.get("scope") || (session.persona === "core" ? "core_dev" : session.persona === "coord" ? "coordinator" : "all");

  const allClaims = Store.getClaims();
  const { visibleClaims, withheldCount } = filterClaimsForPersona(allClaims, session.persona);

  // 1. Decisions
  const decisions = visibleClaims.filter((c) => c.type === "decision");

  // 2. Unfinished
  const unfinished = visibleClaims.filter(
    (c) => c.type === "blocker" || c.type === "open_question" || (c.type === "milestone" && c.assertion_value !== "done")
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
  const risks = visibleClaims.filter((c) => c.type === "risk" || c.type === "credential_ref" || c.status === "conflicting");

  // 5. 30-Day Plan (Day 1 / Week 1 / Month 1)
  const day1: RoadmapItem[] = [
    {
      id: "rm-1",
      title: "Inspect low-level motor controller firmware and DFU boot procedure",
      description: "Review STM32 pin flashing process and test telemetry over local RF connection.",
      timeframe: "day1",
      linked_claim_ids: visibleClaims.filter((c) => c.type === "process" || c.subject_key.includes("firmware")).map((c) => c.id),
      done: false,
    },
    {
      id: "rm-2",
      title: "Verify lab-vm disk space and cron log paths",
      description: "Ensure nightly backup script has write permissions and disk has >10GB buffer.",
      timeframe: "day1",
      linked_claim_ids: visibleClaims.filter((c) => c.subject_key.includes("backup")).map((c) => c.id),
      done: false,
    },
  ];

  const week1: RoadmapItem[] = [
    {
      id: "rm-3",
      title: "Sync with ServoWorks vendor contact regarding replacement lead time",
      description: "Follow up with Priya Sharma on motor controller stock availability for competition readiness.",
      timeframe: "week1",
      linked_claim_ids: visibleClaims.filter((c) => c.type === "contact").map((c) => c.id),
      done: false,
    },
    {
      id: "rm-4",
      title: "Resolve firmware ownership conflict with Dr. Meera",
      description: "Align test team coverage and update README maintainer documentation.",
      timeframe: "week1",
      linked_claim_ids: visibleClaims.filter((c) => c.status === "conflicting").map((c) => c.id),
      done: false,
    },
  ];

  const month1: RoadmapItem[] = [
    {
      id: "rm-5",
      title: "Rotate telemetry vault credentials and document automated rotation script",
      description: "Eliminate 90-day manual rotation fragility before the departing lead exits.",
      timeframe: "month1",
      linked_claim_ids: visibleClaims.filter((c) => c.subject_key.includes("vault") || c.type === "credential_ref").map((c) => c.id),
      done: false,
    },
    {
      id: "rm-6",
      title: "Renew project domain aurora-rover.example before June deadline",
      description: "Prevent public telemetry outage by assigning club credit card for registrar auto-renewal.",
      timeframe: "month1",
      linked_claim_ids: visibleClaims.filter((c) => c.subject_key.includes("domain")).map((c) => c.id),
      done: false,
    },
  ];

  // Calculate Handover Readiness Score (0-100)
  const totalClaims = visibleClaims.length;
  const verifiedCount = visibleClaims.filter((c) => c.status === "verified").length;
  const approvedCount = visibleClaims.filter((c) => c.review_state === "approved").length;
  const conflictCount = visibleClaims.filter((c) => c.status === "conflicting").length;

  const verificationRatio = totalClaims > 0 ? (verifiedCount / totalClaims) * 40 : 0;
  const reviewProgress = totalClaims > 0 ? (approvedCount / totalClaims) * 35 : 0;
  const coreCoverage = (decisions.length > 0 ? 10 : 0) + (ownership.length > 0 ? 10 : 0) + (risks.length > 0 ? 5 : 0);
  const conflictDeduction = conflictCount * 10;

  const readinessScore = Math.max(0, Math.min(100, Math.round(verificationRatio + reviewProgress + coreCoverage - conflictDeduction)));

  return NextResponse.json({
    persona: session.persona,
    scope: targetScope,
    withheldCount,
    readinessScore,
    scoreBreakdown: {
      verificationRatio: Math.round(verificationRatio),
      reviewProgress: Math.round(reviewProgress),
      coreCoverage,
      conflictDeduction,
    },
    brief: {
      decisions,
      unfinished,
      ownership,
      risks,
      roadmap: {
        day1,
        week1,
        month1,
      },
    },
  });
}

