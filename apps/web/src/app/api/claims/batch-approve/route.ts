import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";

export async function POST() {
  const session = await getSession();

  if (session.persona !== "lead") {
    return NextResponse.json(
      { error: "Unauthorized: Only Project Lead can batch-approve claims" },
      { status: 403 }
    );
  }

  const claims = Store.getClaims();
  const candidates = claims.filter(
    (c) => c.status === "verified" && c.review_state === "pending"
  );

  let approvedCount = 0;
  for (const c of candidates) {
    const updated = Store.updateClaim(
      c.id,
      { review_state: "approved" },
      "Dr. Meera Iyer (Lead)"
    );
    if (updated) approvedCount++;
  }

  return NextResponse.json({
    success: true,
    approvedCount,
  });
}

