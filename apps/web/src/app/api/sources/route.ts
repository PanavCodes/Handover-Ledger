import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { isSourceVisibleToPersona } from "@/lib/access";
import { Source, Document } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  const allSources = Store.getSources();
  const visible = allSources.filter((s) => isSourceVisibleToPersona(s, session.persona));

  return NextResponse.json({ sources: visible });
}

export async function POST(req: NextRequest) {
  const session = await getSession();

  // Only Lead or Leaver can add sources
  if (session.persona !== "lead" && session.persona !== "leaver") {
    return NextResponse.json(
      { error: "Unauthorized: Only Lead or Departing Member can upload sources" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, type, content, sensitivity, allowed_scopes = [] } = body;

    // US-1 Mandate: Mandatory sensitivity label on every upload!
    if (!sensitivity || !["team", "restricted", "confidential"].includes(sensitivity)) {
      return NextResponse.json(
        {
          error:
            "label_required: A sensitivity level (team, restricted, or confidential) must be explicitly selected.",
        },
        { status: 422 }
      );
    }

    if (sensitivity === "restricted" && (!Array.isArray(allowed_scopes) || allowed_scopes.length === 0)) {
      return NextResponse.json(
        {
          error:
            "scope_required: Select at least one target role scope (Core Dev or Coordinator) for restricted uploads.",
        },
        { status: 422 }
      );
    }

    if (!name || !content || !content.toString().trim()) {
      return NextResponse.json(
        { error: "name and content are required fields." },
        { status: 400 }
      );
    }

    const workspace = Store.getWorkspace();
    const ts = Date.now();
    const now = new Date().toISOString();
    const sourceId = `src-upload-${ts}`;
    const cleanScopes = sensitivity === "restricted" ? allowed_scopes : [];

    const newSource: Source = {
      id: sourceId,
      workspace_id: workspace.id,
      name: name.toString().trim(),
      type: type || "notes",
      sensitivity,
      allowed_scopes: cleanScopes,
      created_by: session.persona === "lead" ? "Dr. Meera Iyer (Lead)" : "Rahul Mehta (Leaver)",
      created_at: now,
    };

    Store.addSource(newSource);

    // Create corresponding document
    const rawContent = content.toString();
    const docId = `doc-upload-${ts}`;
    const safeFileName = name.toString().trim().replace(/[^a-zA-Z0-9._-]+/g, "_");
    const newDoc: Document = {
      id: docId,
      workspace_id: workspace.id,
      source_id: sourceId,
      path: safeFileName.includes(".") ? `uploads/${safeFileName}` : `uploads/${safeFileName}.md`,
      kind: "file",
      content: rawContent,
      content_hash: crypto.createHash("sha256").update(rawContent).digest("hex").slice(0, 16),
      meta: { title: name },
      extract_state: "pending",
      created_at: now,
    };

    Store.addDocument(newDoc);

    // Append to audit log
    Store.appendAudit(newSource.created_by || "User", "source_uploaded", `source:${sourceId}`, {
      name: newSource.name,
      sensitivity,
      allowed_scopes: cleanScopes,
    });

    return NextResponse.json({
      success: true,
      source: newSource,
      document: newDoc,
    });
  } catch {
    return NextResponse.json({ error: "Failed to upload source" }, { status: 500 });
  }
}
