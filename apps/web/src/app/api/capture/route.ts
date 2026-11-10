import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { extractClaimsFromDocuments } from "@/lib/ai/extract";
import { Source, Document, Claim, Citation, ClaimType, ClaimRejection, SensitivityLevel } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (session.persona !== "lead" && session.persona !== "leaver") {
    return NextResponse.json(
      {
        error:
          "Role Restricted: Only Project Lead (Dr. Meera) or Departing Member (Rahul Mehta) can capture new knowledge.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const rawText = (body.text ?? body.content ?? "").toString();
    const title = (body.title ?? "").toString().trim();
    const typeHint = body.typeHint as ClaimType | undefined;
    const sensitivity = (body.sensitivity || "team") as SensitivityLevel;
    const allowed_scopes: string[] = Array.isArray(body.allowed_scopes) ? body.allowed_scopes : [];

    if (!["team", "restricted", "confidential"].includes(sensitivity)) {
      return NextResponse.json(
        { error: "label_required: Sensitivity must be team, restricted, or confidential." },
        { status: 422 }
      );
    }

    if (sensitivity === "restricted" && allowed_scopes.length === 0) {
      return NextResponse.json(
        { error: "scope_required: Select at least one target role scope for restricted documents." },
        { status: 422 }
      );
    }

    if (!rawText || rawText.trim().length < 12) {
      return NextResponse.json(
        { error: "Text must be at least 12 characters to extract verifiable claims." },
        { status: 400 }
      );
    }

    const workspace = Store.getWorkspace();
    const now = new Date().toISOString();
    const ts = Date.now();
    const sourceId = `src-capture-${ts}`;
    const author =
      session.persona === "leaver" ? "Rahul Mehta (Leaver)" : "Dr. Meera Iyer (Lead)";

    const newSource: Source = {
      id: sourceId,
      workspace_id: workspace.id,
      name: title ? `Capture: ${title.slice(0, 48)}` : `Quick Capture: ${rawText.trim().slice(0, 32)}...`,
      type: "capture",
      sensitivity,
      allowed_scopes: sensitivity === "restricted" ? allowed_scopes : [],
      created_by: author,
      created_at: now,
    };
    Store.addSource(newSource);

    const docId = `doc-capture-${ts}`;
    const newDoc: Document = {
      id: docId,
      workspace_id: workspace.id,
      source_id: sourceId,
      path: `captures/${title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32) : "note"}-${ts}.txt`,
      kind: "quick_capture",
      content: rawText,
      content_hash: crypto.createHash("sha256").update(rawText).digest("hex").slice(0, 16),
      meta: { title, typeHint, author },
      extract_state: "done",
      created_at: now,
    };
    Store.addDocument(newDoc);

    // Run deterministic / AI extraction pipeline
    const extractRes = await extractClaimsFromDocuments([newDoc]);

    const savedRejections: ClaimRejection[] = [];
    for (const rej of extractRes.rejectedClaims) {
      const rejectionRecord: ClaimRejection = {
        id: `rej-${ts}-${Math.random().toString(36).substring(2, 6)}`,
        workspace_id: workspace.id,
        document_id: rej.proposed.citations[0]?.document_id || docId,
        proposed: rej.proposed,
        reason: rej.reason,
        diff_analysis: rej.diff_analysis,
        created_at: now,
      };
      Store.addRejection(rejectionRecord);
      savedRejections.push(rejectionRecord);
    }

    if (savedRejections.length > 0) {
      Store.appendAudit(author, "verifier_blocked_claims", `source:${sourceId}`, {
        rejectedCount: savedRejections.length,
        reasons: savedRejections.map((r) => r.reason),
      });
    }

    const savedClaims: Claim[] = [];

    if (extractRes.verifiedClaims.length > 0) {
      extractRes.verifiedClaims.forEach((item, idx) => {
        const claimId = `claim-cap-${ts}-${idx + 1}`;
        const newClaim: Claim = {
          id: claimId,
          workspace_id: workspace.id,
          type: item.claim.type,
          title: item.claim.title,
          statement: item.claim.statement,
          subject_key: item.claim.subject_key,
          assertion_value: item.claim.assertion_value,
          status: item.claim.status,
          basis: item.claim.basis || "explicit",
          inference_note: item.claim.inference_note,
          confidence: item.claim.confidence,
          review_state: session.persona === "lead" ? "approved" : "pending",
          origin: "extracted",
          captured_by: author,
          version: 1,
          created_at: now,
          updated_at: now,
        };

        const citations: Citation[] = item.citations.map((c, cIdx) => ({
          id: `cit-${ts}-${idx + 1}-${cIdx + 1}`,
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
          created_at: now,
        }));

        const added = Store.addClaim(newClaim, citations);
        savedClaims.push(added);
      });

      Store.appendAudit(author, "quick_capture_extracted", `source:${sourceId}`, {
        claimCount: savedClaims.length,
        rejectedCount: savedRejections.length,
      });

      return NextResponse.json({
        success: true,
        claim: savedClaims[0],
        claims: savedClaims,
        proposedCount: extractRes.proposedCount,
        verifiedCount: savedClaims.length,
        rejectedCount: savedRejections.length,
        rejections: savedRejections,
      });
    }

    // If secret guard / hallucination check rejected everything, do NOT silently turn raw secret/garbage into an attested claim
    if (savedRejections.length > 0) {
      return NextResponse.json({
        success: true,
        blocked: true,
        claim: null,
        claims: [],
        proposedCount: extractRes.proposedCount,
        verifiedCount: 0,
        rejectedCount: savedRejections.length,
        rejections: savedRejections,
      });
    }

    // Direct attested claim fallback when plain prose note didn't match typed patterns
    const claimId = `claim-attest-${ts}`;
    const fallbackType: ClaimType = typeHint || "decision";
    const trimmed = rawText.trim();
    const fallbackClaim: Claim = {
      id: claimId,
      workspace_id: workspace.id,
      type: fallbackType,
      title: title || trimmed.slice(0, 64),
      statement: trimmed,
      subject_key: `capture:${ts}`,
      status: "verified",
      basis: "attested",
      confidence: 0.95,
      review_state: session.persona === "lead" ? "approved" : "pending",
      origin: "attested",
      captured_by: author,
      attested_by: author,
      version: 1,
      created_at: now,
      updated_at: now,
    };

    const quoteStart = rawText.indexOf(trimmed);
    const citation: Citation = {
      id: `cit-${ts}`,
      claim_id: claimId,
      document_id: docId,
      quote: trimmed,
      start_offset: Math.max(0, quoteStart),
      end_offset: Math.max(0, quoteStart) + trimmed.length,
      verified: true,
      support_score: 1.0,
      document_path: newDoc.path,
      source_name: newSource.name,
      source_sensitivity: newSource.sensitivity,
      source_allowed_scopes: newSource.allowed_scopes,
      created_at: now,
    };

    const added = Store.addClaim(fallbackClaim, [citation]);
    Store.appendAudit(author, "attested_claim_created", `claim:${claimId}`, {
      title: fallbackClaim.title,
    });

    return NextResponse.json({
      success: true,
      claim: added,
      claims: [added],
      proposedCount: 1,
      verifiedCount: 1,
      rejectedCount: 0,
      rejections: [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process quick capture" },
      { status: 500 }
    );
  }
}
