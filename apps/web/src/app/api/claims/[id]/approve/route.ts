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
      { error: "Unauthorized: Only Project Lead can approve claims" },
      { status: 403 }
    );
  }

  const claim = Store.getClaim(params.id);
  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  const updated = Store.updateClaim(
    params.id,
    { review_state: "approved" },
    "Dr. Meera Iyer (Lead)"
  );

  return NextResponse.json({ success: true, claim: updated });
}
