import { NextResponse } from "next/server";
import { Store } from "@/lib/store";

export async function POST() {
  Store.reset();
  return NextResponse.json({
    success: true,
    message: "Aurora Rover demo workspace successfully restored to pristine state.",
  });
}
