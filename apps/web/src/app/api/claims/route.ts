import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { filterClaimsForPersona } from "@/lib/access";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const searchParams = req.nextUrl.searchParams;
  const typeFilter = searchParams.get("type");
  const statusFilter = searchParams.get("status");
  const searchQuery = searchParams.get("q")?.toLowerCase();

  const allClaims = Store.getClaims();

  // Apply access choke point
  const { visibleClaims, withheldCount } = filterClaimsForPersona(allClaims, session.persona);
  let claims = visibleClaims;

  if (typeFilter && typeFilter !== "all") {
    claims = claims.filter((c) => c.type === typeFilter);
  }

  if (statusFilter && statusFilter !== "all") {
    claims = claims.filter((c) => c.status === statusFilter);
  }

  if (searchQuery) {
    claims = claims.filter(
      (c) =>
        c.title.toLowerCase().includes(searchQuery) ||
        c.statement.toLowerCase().includes(searchQuery) ||
        c.subject_key.toLowerCase().includes(searchQuery)
    );
  }

  return NextResponse.json({
    claims,
    totalVisible: claims.length,
    withheldCount,
    persona: session.persona,
  });
}
