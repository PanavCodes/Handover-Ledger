import { NextResponse } from "next/server";
import { Store } from "@/lib/store";
import { verifyAuditChain } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const records = Store.getAuditLog();
  const headAnchor = Store.getHeadAnchor();
  const verification = verifyAuditChain(records, headAnchor);

  return NextResponse.json({
    records,
    headAnchor,
    verification,
  });
}

