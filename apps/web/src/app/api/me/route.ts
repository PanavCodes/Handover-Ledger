import { NextResponse } from "next/server";
import { getSession, DEMO_PERSONAS } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  const profile = DEMO_PERSONAS[session.persona];

  return NextResponse.json({
    persona: profile,
    workspaceId: session.workspaceId,
    allPersonas: Object.values(DEMO_PERSONAS),
  });
}
