import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getDocumentForPersona } from "@/lib/access";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  const doc = getDocumentForPersona(params.id, session.persona);

  if (!doc) {
    return NextResponse.json(
      { error: "Access Denied: You do not have permission to view this source document in your current role." },
      { status: 403 }
    );
  }

  return NextResponse.json({ document: doc });
}

