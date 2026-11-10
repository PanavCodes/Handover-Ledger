import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { extractClaimsFromDocuments } from "@/lib/ai/extract";
import { Claim, Citation } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (session.persona !== "lead" && session.persona !== "leaver") {
    return NextResponse.json(
      { error: "Unauthorized: Only Lead or Leaver can trigger extraction" },
      { status: 403 }
    );
  }

  let requestedDocId: string | undefined;
  try {
    const body = await req.json();
    requestedDocId = body?.documentId;
  } catch {
    // Empty POST body allowed
  }

  const allDocs = Store.getDocuments();
  const pendingDocs = requestedDocId
    ? allDocs.filter((d) => d.id === requestedDocId && d.extract_state === "pending")
    : allDocs.filter((d) => d.extract_state === "pending");

  if (pendingDocs.length === 0) {
    return NextResponse.json({
      remaining: 0,
      proposed: 0,
      verified: 0,
      rejected: 0,
      processedDocs: 0,
      message: "No pending documents to extract",
    });
  }

  // Batch process up to 3 documents per request
  const batch = pendingDocs.slice(0, 3);
  const result = await extractClaimsFromDocuments(batch);

  const workspace = Store.getWorkspace();
  const sources = Store.getSources();
  const sourceMap = new Map(sources.map((s) => [s.id, s]));
  const actor =
    session.persona === "lead" ? "Dr. Meera Iyer (Lead)" : "Rahul Mehta (Leaver)";
  const now = new Date().toISOString();

  // Persist verified claims
  for (const item of result.verifiedClaims) {
    const claimId = `claim-ext-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newClaim: Claim = {
      id: claimId,
      workspace_id: workspace.id,
      type: item.claim.type,
      title: item.claim.title,
      statement: item.claim.statement,
      subject_key: item.claim.subject_key,
      assertion_value: item.claim.assertion_value,
      status: item.claim.status,
      basis: item.claim.basis,
      inference_note: item.claim.inference_note,
      confidence: item.claim.confidence,
      review_state: "pending",
      origin: "extracted",
      captured_by: actor,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    const newCitations: Citation[] = item.citations.map((c) => {
      const doc = batch.find((d) => d.id === c.document_id);
      const src = doc ? sourceMap.get(doc.source_id) : undefined;
      return {
        id: `cit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        claim_id: claimId,
        document_id: c.document_id,
        quote: c.quote,
        start_offset: c.start_offset,
        end_offset: c.end_offset,
        verified: c.verified,
        support_score: c.support_score,
        document_path: doc?.path,
        source_name: src?.name,
        source_sensitivity: src?.sensitivity,
        source_allowed_scopes: src?.allowed_scopes,
        created_at: now,
      };
    });

    Store.addClaim(newClaim, newCitations);
  }

  // Persist rejected claims with word-level diff
  for (const rej of result.rejectedClaims) {
    Store.addRejection({
      id: `rej-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      workspace_id: workspace.id,
      document_id: rej.proposed.citations[0]?.document_id,
      proposed: rej.proposed,
      reason: rej.reason,
      diff_analysis: rej.diff_analysis,
      created_at: now,
    });
  }

  // Mark batch as done using persisted Store mutation
  for (const doc of batch) {
    Store.markDocumentState(doc.id, "done");
  }

  Store.appendAudit(actor, "extraction_batch_completed", `batch:${batch.map((d) => d.id).join(",")}`, {
    processedDocs: batch.length,
    proposed: result.proposedCount,
    verified: result.verifiedCount,
    rejected: result.rejectedCount,
  });

  const remaining = Math.max(
    0,
    Store.getDocuments().filter((d) => d.extract_state === "pending").length
  );

  return NextResponse.json({
    remaining,
    proposed: result.proposedCount,
    verified: result.verifiedCount,
    rejected: result.rejectedCount,
    processedDocs: batch.length,
  });
}
