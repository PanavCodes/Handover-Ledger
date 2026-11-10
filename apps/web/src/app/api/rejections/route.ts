import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { filterRejectionsForPersona } from "@/lib/access";

export async function GET() {
  const session = await getSession();
  const rejections = filterRejectionsForPersona(Store.getRejections(), session.persona);
  return NextResponse.json({ rejections });
}
