import { NextResponse } from "next/server";
import { runLeakCanaryAudit } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = runLeakCanaryAudit();
  return NextResponse.json(result);
}

