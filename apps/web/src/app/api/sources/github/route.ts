import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { ingestGitHubRepo } from "@/lib/github";
import { parseGitLog, analyzeGitOwnership } from "@/lib/git-owner";
import { Source, Document, Claim, Citation } from "@/lib/types";

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (session.persona !== "lead") {
    return NextResponse.json(
      { error: "Unauthorized: Only Project Lead can connect GitHub repositories" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { repoUrl, sensitivity, allowed_scopes, githubToken } = body;

    if (!repoUrl) {
      return NextResponse.json({ error: "repoUrl is required" }, { status: 400 });
    }

    if (!sensitivity || !["team", "restricted", "confidential"].includes(sensitivity)) {
      return NextResponse.json(
        { error: "label_required: Sensitivity level must be explicitly selected" },
        { status: 422 }
      );
    }

    const { documents: ingestedDocs, repoName } = await ingestGitHubRepo(repoUrl, githubToken);
    const workspace = Store.getWorkspace();

    const sourceId = `src-gh-${Date.now()}`;
    const newSource: Source = {
      id: sourceId,
      workspace_id: workspace.id,
      name: `${repoName} (GitHub)`,
      type: "github",
      sensitivity,
      allowed_scopes: allowed_scopes || [],
      origin_url: repoUrl,
      created_by: "Dr. Meera Iyer (Lead)",
      created_at: new Date().toISOString(),
    };
    Store.addSource(newSource);

    const storedDocs: Document[] = [];
    for (const d of ingestedDocs) {
      const docId = `doc-gh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const doc: Document = {
        id: docId,
        workspace_id: workspace.id,
        source_id: sourceId,
        path: d.path,
        kind: d.kind,
        content: d.content,
        content_hash: `hash-${Date.now()}`,
        meta: d.meta,
        extract_state: "pending",
        created_at: new Date().toISOString(),
      };
      Store.addDocument(doc);
      storedDocs.push(doc);
    }

    // Deterministic Ownership Analysis via truckfactor / git-tribe algorithms
    // Find all commit documents to analyze git ownership
    const commitDocs = storedDocs.filter((d) => d.kind === "commit");
    if (commitDocs.length > 0) {
      const mockRawLog = commitDocs
        .map((c) => `COMMIT:${c.meta.sha || "0000000"}|${c.meta.author || "Unknown"}|${c.meta.date || ""}|${c.meta.title || c.path}\n${c.path}`)
        .join("\n");
      const commits = parseGitLog(mockRawLog);
      const { ownerClaims, busFactorRisks } = analyzeGitOwnership(commits);

      for (const rawClaim of [...ownerClaims, ...busFactorRisks]) {
        const claimId = `claim-git-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const citation: Citation = {
          id: `cit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          claim_id: claimId,
          document_id: commitDocs[0].id,
          quote: rawClaim.quote,
          start_offset: 0,
          end_offset: Math.min(rawClaim.quote.length, commitDocs[0].content.length),
          verified: true,
          support_score: 1.0,
          document_path: commitDocs[0].path,
          source_name: newSource.name,
          source_sensitivity: newSource.sensitivity,
          source_allowed_scopes: newSource.allowed_scopes,
          created_at: new Date().toISOString(),
        };

        Store.addClaim(claim, [citation]);
      }
    }

    Store.appendAudit(
      "Dr. Meera Iyer (Lead)",
      "github_repo_ingested",
      `source:${sourceId}`,
      { repoName, documentCount: storedDocs.length }
    );

    return NextResponse.json({
      success: true,
      source: newSource,
      ingestedDocumentsCount: storedDocs.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to ingest GitHub repository" },
      { status: 500 }
    );
  }
}
