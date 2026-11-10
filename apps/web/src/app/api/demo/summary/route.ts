import { NextResponse } from "next/server";
import { Store } from "@/lib/store";
import { filterClaimsForPersona } from "@/lib/access";
import { PersonaRole } from "@/lib/personas";

export const dynamic = "force-dynamic";

export async function GET() {
  const allClaims = Store.getClaims();
  const roles: PersonaRole[] = ["lead", "leaver", "core", "coord"];
  const counts: Record<string, { visibleCount: number; withheldCount: number }> = {};

  for (const r of roles) {
    const res = filterClaimsForPersona(allClaims, r);
    counts[r] = {
      visibleCount: res.visibleClaims.length,
      withheldCount: res.withheldCount,
    };
  }

  return NextResponse.json({
    totalClaims: allClaims.length,
    counts,
    attestation: Store.getAttestation(),
  });
}
