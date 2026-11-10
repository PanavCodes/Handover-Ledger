import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { filterClaimsForPersona } from "@/lib/access";

export async function GET() {
  const session = await getSession();
  return NextResponse.json({
    persona: session.persona,
    attestation: Store.getAttestation(),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();

  try {
    const body = await req.json();
    const kind = body?.kind as "leaver" | "successor_core" | "successor_coord";

    if (kind === "leaver") {
      if (session.persona !== "leaver") {
        return NextResponse.json(
          {
            error:
              "Only the Departing Member (Rahul Mehta) persona can sign the Leaver Attestation Gate.",
          },
          { status: 403 }
        );
      }
      const attestation = Store.signLeaverAttestation("Rahul Mehta (Leaver)");
      return NextResponse.json({ success: true, attestation });
    }

    if (kind === "successor_core") {
      if (session.persona !== "core") {
        return NextResponse.json(
          {
            error:
              "Switch to Ananya Rao (Core Dev) to sign the Core Dev successor receipt.",
          },
          { status: 403 }
        );
      }
      const { visibleClaims } = filterClaimsForPersona(Store.getClaims(), "core");
      const attestation = Store.signSuccessorAcknowledgement(
        "core",
        "Ananya Rao (Core Dev)",
        visibleClaims.length
      );
      return NextResponse.json({ success: true, attestation });
    }

    if (kind === "successor_coord") {
      if (session.persona !== "coord") {
        return NextResponse.json(
          {
            error:
              "Switch to Kabir Shah (Coordinator) to sign the Coordinator successor receipt.",
          },
          { status: 403 }
        );
      }
      const { visibleClaims } = filterClaimsForPersona(Store.getClaims(), "coord");
      const attestation = Store.signSuccessorAcknowledgement(
        "coord",
        "Kabir Shah (Coordinator)",
        visibleClaims.length
      );
      return NextResponse.json({ success: true, attestation });
    }

    return NextResponse.json(
      { error: "Invalid attestation kind. Expected leaver, successor_core, or successor_coord." },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: "Failed to record attestation" }, { status: 500 });
  }
}

