import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (session.persona !== "lead") {
    return NextResponse.json(
      { error: "Unauthorized: Only Project Lead can reject claims" },
      { status: 403 }
    );
  }

  const claim = Store.getClaim(params.id);
  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  let reason: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.reason === "string" && body.reason.trim()) {
      reason = body.reason.trim();
    }
  } catch {
    // Empty POST body is allowed
  }

  const updated = Store.updateClaim(
    params.id,
    {
      review_state: "rejected",
      ...(reason ? { inference_note: `Rejected by Lead: ${reason}` } : {}),
    },
    "Dr. Meera Iyer (Lead)"
  );

  return NextResponse.json({ success: true, claim: updated });
}
