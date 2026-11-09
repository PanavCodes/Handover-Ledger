import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { extractClaimsFromDocuments } from "@/lib/ai/extract";
import { Source, Document, Claim, Citation, ClaimType } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getSession();

  try {
    const body = await req.json();
    const { text, typeHint, sensitivity = "team", allowed_scopes = [] } = body;

    if (!text || text.trim().length < 12) {
      return NextResponse.json(
        { error: "Text must be at least 12 characters to extract verifiable claims." },
        { status: 400 }
      );
    }

    const workspace = Store.getWorkspace();
    const sourceId = `src-capture-${Date.now()}`;
    const author =
      session.persona === "leaver"
        ? "Rahul Mehta (Leaver)"
        : session.persona === "lead"
        ? "Dr. Meera Iyer (Lead)"
        : "Successor";

    const newSource: Source = {
      id: sourceId,
      workspace_id: workspace.id,
      name: `Quick Capture: ${text.slice(0, 30)}...`,
      type: "capture",
      sensitivity,
      allowed_scopes,
      created_by: author,
      created_at: new Date().toISOString(),
    };
    Store.addSource(newSource);

    const docId = `doc-capture-${Date.now()}`;
    const newDoc: Document = {
      id: docId,
      workspace_id: workspace.id,
      source_id: sourceId,
      path: `captures/note-${Date.now()}.txt`,
      kind: "quick_capture",
      content: text,
      content_hash: `hash-${Date.now()}`,
      meta: { typeHint, author },
      extract_state: "done",
      created_at: new Date().toISOString(),
    };
    Store.addDocument(newDoc);

    // Extract claim inline
    const extractRes = await extractClaimsFromDocuments([newDoc]);

    // If AI extraction produced claims, use them; otherwise, create an attested claim directly
    if (extractRes.verifiedClaims.length > 0) {
      const item = extractRes.verifiedClaims[0];
      const claimId = `claim-cap-${Date.now()}`;
      const newClaim: Claim = {
        id: claimId,
        workspace_id: workspace.id,
        type: item.claim.type,
        title: item.claim.title,
        statement: item.claim.statement,
        subject_key: item.claim.subject_key,
        assertion_value: item.claim.assertion_value,
        status: item.claim.status,
        basis: "explicit",
        confidence: item.claim.confidence,
        review_state: session.persona === "lead" ? "approved" : "pending",
        origin: "extracted",
        captured_by: author,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const citations: Citation[] = item.citations.map((c) => ({
        id: `cit-${Date.now()}`,
        claim_id: claimId,
        document_id: docId,
        quote: c.quote,
        start_offset: c.start_offset,
        end_offset: c.end_offset,
        verified: true,
        support_score: c.support_score,
        document_path: newDoc.path,
        source_name: newSource.name,
        source_sensitivity: newSource.sensitivity,
        source_allowed_scopes: newSource.allowed_scopes,
        created_at: new Date().toISOString(),
      }));

      Store.addClaim(newClaim, citations);
      Store.appendAudit(author, "quick_capture_created", `claim:${claimId}`, { title: newClaim.title });

      return NextResponse.json({ success: true, claim: newClaim });
    } else {
      // Direct attested claim fallback
      const claimId = `claim-attest-${Date.now()}`;
      const fallbackType: ClaimType = (typeHint as ClaimType) || "decision";
      const fallbackClaim: Claim = {
        id: claimId,
        workspace_id: workspace.id,
        type: fallbackType,
        title: text.slice(0, 60),
        statement: text,
        subject_key: `capture:${Date.now()}`,
        status: "verified",
        basis: "attested",
        confidence: 0.95,
        review_state: session.persona === "lead" ? "approved" : "pending",
        origin: "attested",
        captured_by: author,
        attested_by: author,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const citation: Citation = {
        id: `cit-${Date.now()}`,
        claim_id: claimId,
        document_id: docId,
        quote: text,
        start_offset: 0,
        end_offset: text.length,
        verified: true,
        support_score: 1.0,
        document_path: newDoc.path,
        source_name: newSource.name,
        source_sensitivity: newSource.sensitivity,
        source_allowed_scopes: newSource.allowed_scopes,
        created_at: new Date().toISOString(),
      };

      Store.addClaim(fallbackClaim, [citation]);
      Store.appendAudit(author, "attested_claim_created", `claim:${claimId}`, { title: fallbackClaim.title });

      return NextResponse.json({ success: true, claim: fallbackClaim });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process quick capture" }, { status: 500 });
  }
}

