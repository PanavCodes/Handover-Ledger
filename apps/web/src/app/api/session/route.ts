import { NextRequest, NextResponse } from "next/server";
import { DEMO_PERSONAS, PersonaRole, setSessionCookie, clearSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { persona, workspaceId } = body;

    if (!persona || !(persona in DEMO_PERSONAS)) {
      return NextResponse.json(
        { error: "Invalid persona. Valid options: lead, leaver, core, coord" },
        { status: 400 }
      );
    }

    await setSessionCookie(persona as PersonaRole, workspaceId);

    return NextResponse.json({
      success: true,
      persona: DEMO_PERSONAS[persona as PersonaRole],
      workspaceId: workspaceId || "aurora-rover-workspace-demo-2025",
    });
  } catch (err) {
    console.error("Session route error:", err);
    return NextResponse.json({ error: "Failed to set session" }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true, message: "Session cleared" });
}
