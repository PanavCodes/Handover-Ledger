import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { filterClaimsForPersona } from "@/lib/access";
import { Claim } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const claim = Store.getClaim(params.id);

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  // Check visibility through access choke point
  const { visibleClaims } = filterClaimsForPersona([claim], session.persona);
  if (visibleClaims.length === 0) {
    return NextResponse.json(
      { error: "Access Denied: This claim cites restricted sources not visible in your role." },
      { status: 403 }
    );
  }

  const versions = Store.getClaimVersions(params.id);
  return NextResponse.json({ claim, versions });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  // Only lead or leaver can edit
  if (session.persona !== "lead" && session.persona !== "leaver") {
    return NextResponse.json(
      { error: "Unauthorized: Only Lead or Departing Member can edit claims" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const safeUpdates: Partial<Claim> = {};

    if (typeof body.title === "string" && body.title.trim().length > 0) {
      safeUpdates.title = body.title.trim();
    }
    if (typeof body.statement === "string" && body.statement.trim().length > 0) {
      safeUpdates.statement = body.statement.trim();
    }
    if (
      typeof body.type === "string" &&
      [
        "decision",
        "owner",
        "blocker",
        "open_question",
        "risk",
        "contact",
        "milestone",
        "credential_ref",
        "process",
      ].includes(body.type)
    ) {
      safeUpdates.type = body.type;
    }
    if (
      typeof body.status === "string" &&
      ["verified", "inferred", "conflicting", "missing"].includes(body.status)
    ) {
      safeUpdates.status = body.status;
    }
    if (typeof body.assertion_value === "string") {
      safeUpdates.assertion_value = body.assertion_value;
    }
    if (typeof body.inference_note === "string") {
      safeUpdates.inference_note = body.inference_note;
    }
    if (
      session.persona === "lead" &&
      typeof body.review_state === "string" &&
      ["pending", "approved", "rejected"].includes(body.review_state)
    ) {
      safeUpdates.review_state = body.review_state;
    }

    const updated = Store.updateClaim(
      params.id,
      safeUpdates,
      session.persona === "lead" ? "Dr. Meera Iyer (Lead)" : "Rahul Mehta (Leaver)"
    );

    if (!updated) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const versions = Store.getClaimVersions(params.id);
    return NextResponse.json({ claim: updated, versions });
  } catch {
    return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
  }
}
