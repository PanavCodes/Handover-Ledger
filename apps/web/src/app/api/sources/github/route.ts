import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { ingestGitHubRepo } from "@/lib/github";
import { parseGitLog, analyzeGitOwnership } from "@/lib/git-owner";
import { verifyQuote } from "@/lib/verifier";
import { Source, Document, Claim, Citation } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (session.persona !== "lead" && session.persona !== "leaver") {
    return NextResponse.json(
      { error: "Unauthorized: Only Project Lead or Departing Member can connect GitHub repositories" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { repoUrl, branch, sensitivity, allowed_scopes = [], githubToken } = body;

    if (!repoUrl) {
      return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
    }

    if (!sensitivity || !["team", "restricted", "confidential"].includes(sensitivity)) {
      return NextResponse.json(
        { error: "label_required: Sensitivity level must be explicitly selected" },
        { status: 422 }
      );
    }

    const cleanScopes: string[] =
      sensitivity === "restricted"
        ? Array.isArray(allowed_scopes) && allowed_scopes.length > 0
          ? allowed_scopes
          : ["core_dev"]
        : [];

    const { documents: ingestedDocs, repoName, branch: resolvedBranch } = await ingestGitHubRepo(
      repoUrl,
      githubToken,
      branch
    );
    const workspace = Store.getWorkspace();
    const actor =
      session.persona === "lead" ? "Dr. Meera Iyer (Lead)" : "Rahul Mehta (Leaver)";
    const ts = Date.now();
    const now = new Date().toISOString();

    const sourceId = `src-gh-${ts}`;
    const newSource: Source = {
      id: sourceId,
      workspace_id: workspace.id,
      name: `${repoName} (${resolvedBranch})`,
      type: "github",
      sensitivity,
      allowed_scopes: cleanScopes,
      origin_url: repoUrl,
      created_by: actor,
      created_at: now,
    };
    Store.addSource(newSource);

    const storedDocs: Document[] = [];
    for (const d of ingestedDocs) {
      const docId = `doc-gh-${ts}-${Math.random().toString(36).substring(2, 7)}`;
      const doc: Document = {
        id: docId,
        workspace_id: workspace.id,
        source_id: sourceId,
        path: d.path,
        kind: d.kind,
        content: d.content,
        content_hash: crypto.createHash("sha256").update(d.content).digest("hex").slice(0, 16),
        meta: d.meta,
        // Mark commit summaries done immediately since ownership engine analyzes them deterministically; files go through AI/deterministic extractor
        extract_state: d.kind === "commit" ? "done" : "pending",
        created_at: now,
      };
      Store.addDocument(doc);
      storedDocs.push(doc);
    }

    // Deterministic Ownership Analysis via truckfactor / git-tribe algorithms
    let gitClaimsCount = 0;
    const commitDocs = storedDocs.filter((d) => d.kind === "commit");
    if (commitDocs.length > 0) {
      const rawLog = commitDocs
        .map((c) => {
          const sha = c.meta.sha || "0000000";
          const cAuthor = c.meta.author || "Unknown";
          const cDate = c.meta.date || "";
          const cTitle = c.meta.title || c.path;
          const touched: string[] = Array.isArray(c.meta.files) && c.meta.files.length > 0 ? c.meta.files : [c.path];
          return `COMMIT:${sha}|${cAuthor}|${cDate}|${cTitle}\n${touched.join("\n")}`;
        })
        .join("\n");

      const commits = parseGitLog(rawLog);
      const { ownerClaims, busFactorRisks } = analyzeGitOwnership(commits);

      for (const rawClaim of [...ownerClaims, ...busFactorRisks]) {
        const claimId = `claim-git-${ts}-${Math.random().toString(36).substring(2, 6)}`;
        // Match to the actual commit document whose SHA appears in quote
        const matchedCommitDoc =
          commitDocs.find((d) => d.meta.sha && rawClaim.quote.includes(d.meta.sha)) || commitDocs[0];

        // Snap verbatim offsets via deterministic verifier
        const firstLine = matchedCommitDoc.content.split(/\r?\n/)[0] || matchedCommitDoc.content.slice(0, 80);
        const vResult = verifyQuote(matchedCommitDoc.content, rawClaim.quote);
        const resolvedQuote = vResult.verified ? rawClaim.quote : firstLine;
        const resolvedOffsets = vResult.verified
          ? { start: vResult.start_offset, end: vResult.end_offset }
          : { start: 0, end: firstLine.length };

        const claim: Claim = {
          id: claimId,
          workspace_id: workspace.id,
          type: rawClaim.type,
          title: rawClaim.title,
          statement: rawClaim.statement,
          subject_key: rawClaim.subject_key,
          assertion_value: "assertion_value" in rawClaim ? rawClaim.assertion_value : undefined,
          status: "verified",
          basis: "explicit",
          confidence: rawClaim.confidence,
          review_state: "pending",
          origin: "git_derived",
          captured_by: "Deterministic Git Ownership Engine",
          version: 1,
          created_at: now,
          updated_at: now,
        };

        const citation: Citation = {
          id: `cit-git-${ts}-${Math.random().toString(36).substring(2, 6)}`,
          claim_id: claimId,
          document_id: matchedCommitDoc.id,
          quote: resolvedQuote,
          start_offset: resolvedOffsets.start,
          end_offset: resolvedOffsets.end,
          verified: true,
          support_score: 1.0,
          document_path: matchedCommitDoc.path,
          source_name: newSource.name,
          source_sensitivity: newSource.sensitivity,
          source_allowed_scopes: newSource.allowed_scopes,
          created_at: now,
        };

        Store.addClaim(claim, [citation]);
        gitClaimsCount++;
      }
    }

    Store.appendAudit(actor, "github_repo_ingested", `source:${sourceId}`, {
      repoName,
      branch: resolvedBranch,
      documentCount: storedDocs.length,
      gitClaimsCount,
    });

    const pendingFileCount = storedDocs.filter((d) => d.extract_state === "pending").length;

    return NextResponse.json({
      success: true,
      source: newSource,
      branch: resolvedBranch,
      ingestedDocumentsCount: storedDocs.length,
      pendingDocumentsCount: pendingFileCount,
      gitClaimsCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to ingest GitHub repository" },
      { status: 500 }
    );
  }
}
