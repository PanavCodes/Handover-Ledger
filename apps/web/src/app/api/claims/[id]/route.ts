import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { filterClaimsForPersona } from "@/lib/access";

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

  return NextResponse.json({ claim });
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
    const updated = Store.updateClaim(
      params.id,
      body,
      session.persona === "lead" ? "Dr. Meera Iyer (Lead)" : "Rahul Mehta (Leaver)"
    );

    if (!updated) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    return NextResponse.json({ claim: updated });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
  }
}
