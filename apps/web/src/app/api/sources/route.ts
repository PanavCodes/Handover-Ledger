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
    const { name, type, content, sensitivity, allowed_scopes } = body;

    // US-1 Mandate: Mandatory sensitivity label on every upload!
    if (!sensitivity || !["team", "restricted", "confidential"].includes(sensitivity)) {
      return NextResponse.json(
        { error: "label_required: A sensitivity level (team, restricted, or confidential) must be explicitly selected." },
        { status: 422 }
      );
    }

    if (!name || !content) {
      return NextResponse.json(
        { error: "name and content are required fields." },
        { status: 400 }
      );
    }

    const workspace = Store.getWorkspace();
    const sourceId = `src-upload-${Date.now()}`;
    const newSource: Source = {
      id: sourceId,
      workspace_id: workspace.id,
      name,
      type: type || "notes",
      sensitivity,
      allowed_scopes: allowed_scopes || [],
      created_by: session.persona === "lead" ? "Dr. Meera Iyer (Lead)" : "Rahul Mehta (Leaver)",
      created_at: new Date().toISOString(),
    };

    Store.addSource(newSource);

    // Create corresponding document
    const docId = `doc-upload-${Date.now()}`;
    const newDoc: Document = {
      id: docId,
      workspace_id: workspace.id,
      source_id: sourceId,
      path: `uploads/${name.replace(/\s+/g, "_")}.md`,
      kind: "file",
      content,
      content_hash: `hash-${Date.now()}`,
      meta: { title: name },
      extract_state: "pending",
      created_at: new Date().toISOString(),
    };

    Store.addDocument(newDoc);

    // Append to audit log
    Store.appendAudit(
      newSource.created_by || "User",
      "source_uploaded",
      `source:${sourceId}`,
      { name, sensitivity, allowed_scopes }
    );

    return NextResponse.json({
      success: true,
      source: newSource,
      document: newDoc,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to upload source" }, { status: 500 });
  }
}

