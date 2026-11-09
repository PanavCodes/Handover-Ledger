import { NextResponse } from "next/server";
import { Store } from "@/lib/store";

export async function GET() {
  const rejections = Store.getRejections();
  return NextResponse.json({ rejections });
}
