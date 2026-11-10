"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/shell/SessionContext";
import {
  UploadCloud,
  FileText,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RotateCw,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

type SensitivityInput = "" | "team" | "restricted" | "confidential";

export default function CapturePage() {
  const router = useRouter();
  const { persona, switchPersona } = useSession();
  const [activeTab, setActiveTab] = useState<"quick" | "upload" | "github">("quick");

  // Quick Capture State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sensitivity, setSensitivity] = useState<"team" | "restricted" | "confidential">("team");
  const [allowedScopes, setAllowedScopes] = useState<string[]>(["core_dev"]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickResult, setQuickResult] = useState<any | null>(null);

  // Upload Tab State (Mandatory unselected sensitivity label guard)
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState("notes");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadSensitivity, setUploadSensitivity] = useState<SensitivityInput>("");
  const [uploadScopes, setUploadScopes] = useState<string[]>(["core_dev"]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any | null>(null);

  // GitHub Sync State (real public repo pre-filled)
  const [repoUrl, setRepoUrl] = useState("https://github.com/PanavCodes/Handover-Ledger");
  const [branch, setBranch] = useState("main");
  const [ghSensitivity, setGhSensitivity] = useState<"team" | "restricted" | "confidential">("team");
  const [ghScopes, setGhScopes] = useState<string[]>(["core_dev"]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghStage, setGhStage] = useState<string | null>(null);
  const [ghError, setGhError] = useState<string | null>(null);
  const [ghResult, setGhResult] = useState<any | null>(null);

  const canWrite = persona.role === "lead" || persona.role === "leaver";

  const toggleScopeItem = (
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    val: string
  ) => {
    setter(list.includes(val) ? list.filter((v) => v !== val) : [...list, val]);
  };

  const loadSampleNote = () => {
    setTitle("Field Failure Incident & Recovery Procedure");
    setContent(
      "Decision: Switch telemetry retry backoff from 100ms to exponential 500ms after RF brownouts.\n" +
        "Owner: Ananya Rao is now responsible for field telemetry diagnostics.\n" +
        "Blocker: Weatherproof enclosure seal replacement is waiting on vendor confirmation.\n" +
        "Note: Always restart CAN bridge daemon before launching autonomous nav."
    );
    setQuickError(null);
    setQuickResult(null);
  };

  const loadHallucinationTest = () => {
    setTitle("Verifier Rejection & Secret Scrubbing Demo");
    setContent(
      "[HALLUCINATE_TEST] Temporary debug note containing secret token sk-liveDemoSecretKey99999999999999999 that the Secret Guard must block."
    );
    setQuickError(null);
    setQuickResult(null);
  };

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);
    setQuickResult(null);

    if (content.trim().length < 12) {
      setQuickError("Enter at least 12 characters so the verifier can ground claims.");
      return;
    }

    if (sensitivity === "restricted" && allowedScopes.length === 0) {
      setQuickError("Select at least one role scope (Core Dev or Coordinator) for restricted notes.");
      return;
    }

    setQuickLoading(true);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Tacit Knowledge Quick Capture",
          text: content,
          sensitivity,
          allowed_scopes: sensitivity === "restricted" ? allowedScopes : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuickError(data.error || `Capture failed (HTTP ${res.status})`);
        return;
      }
      setQuickResult(data);
      if (!data.blocked) {
        setTitle("");
        setContent("");
      }
    } catch (err: any) {
      setQuickError(err?.message || "Network error during quick capture.");
    } finally {
      setQuickLoading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUploadContent(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const runExtractionBatches = async (
    targetDocId?: string,
    onProgress?: (msg: string) => void
  ) => {
    let totalProposed = 0;
    let totalVerified = 0;
    let totalRejected = 0;
    let remaining = 1;
    let loops = 0;

    while (remaining > 0 && loops < 6) {
      loops++;
      onProgress?.(`Running deterministic extraction pass #${loops}...`);
      const extRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(targetDocId && loops === 1 ? { documentId: targetDocId } : {}),
      });
      if (!extRes.ok) break;
      const extJson = await extRes.json();
      totalProposed += extJson.proposed || 0;
      totalVerified += extJson.verified || 0;
      totalRejected += extJson.rejected || 0;
      remaining = extJson.remaining || 0;
      if ((extJson.processedDocs || 0) === 0) break;
    }

    return { totalProposed, totalVerified, totalRejected, remaining };
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadResult(null);

    if (!uploadSensitivity) {
      setUploadError("Mandatory label required: Please select a sensitivity classification before ingesting.");
      return;
    }

    if (uploadSensitivity === "restricted" && uploadScopes.length === 0) {
      setUploadError("Select at least one allowed role scope for restricted documents.");
      return;
    }

    if (!uploadName.trim() || !uploadContent.trim()) {
      setUploadError("Provide a document filename/title and non-empty content.");
      return;
    }

    setUploadLoading(true);
    setUploadStatus("Uploading labeled source & computing SHA-256 hash...");

    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadName.trim(),
          type: uploadType,
          content: uploadContent,
          sensitivity: uploadSensitivity,
          allowed_scopes: uploadSensitivity === "restricted" ? uploadScopes : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || `Upload failed (HTTP ${res.status})`);
        return;
      }

      const extStats = await runExtractionBatches(data.document?.id, setUploadStatus);
      setUploadResult({
        source: data.source,
        document: data.document,
        ...extStats,
      });
      setUploadName("");
      setUploadContent("");
      setUploadSensitivity("");
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload and extract source.");
    } finally {
      setUploadLoading(false);
      setUploadStatus(null);
    }
  };

  const handleGitHubSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setGhError(null);
    setGhResult(null);

    if (ghSensitivity === "restricted" && ghScopes.length === 0) {
      setGhError("Select at least one role scope when ingesting a restricted repository.");
      return;
    }

    setGhLoading(true);
    setGhStage("Fetching repository tree, docs & recent commit history from GitHub...");

    try {
      const res = await fetch("/api/sources/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          branch,
          sensitivity: ghSensitivity,
          allowed_scopes: ghSensitivity === "restricted" ? ghScopes : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGhError(data.error || `GitHub sync failed (HTTP ${res.status})`);
        return;
      }

      const extStats = await runExtractionBatches(undefined, setGhStage);
      setGhResult({
        ...data,
        ...extStats,
      });
    } catch (err: any) {
      setGhError(err?.message || "Failed to sync GitHub repository.");
    } finally {
      setGhLoading(false);
      setGhStage(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
            Ingestion Pipeline
          </span>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
            Mandatory Sensitivity Labels &amp; Offset Verifier
          </span>
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1">
          Knowledge Capture &amp; Repository Ingest
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground max-w-2xl mt-1 leading-relaxed">
          Ingest quick notes, upload project documents with mandatory sensitivity labels, or sync a live public GitHub repository. Every extracted claim is grounded via 1:1 character offsets before entering the ledger.
        </p>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 mt-6">
          <button
            onClick={() => setActiveTab("quick")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "quick"
                ? "bg-primary text-primary-foreground shadow"
                : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Quick Note &amp; Rejection Demo</span>
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "upload"
                ? "bg-primary text-primary-foreground shadow"
                : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload File / Document</span>
          </button>
          <button
            onClick={() => setActiveTab("github")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "github"
                ? "bg-primary text-primary-foreground shadow"
                : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>GitHub Repository Sync</span>
          </button>
        </div>
      </div>

      {/* Role Write-Protection Banner for Successors */}
      {!canWrite && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Read-Only Role ({persona.name}):</strong> Only Project Lead or Departing Owner can ingest new sources.
            </span>
          </div>
          <button
            onClick={() => switchPersona("leaver")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold transition"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Switch to Rahul Mehta (Leaver)</span>
          </button>
        </div>
      )}

      {/* TAB 1: QUICK CAPTURE */}
      {activeTab === "quick" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleQuickCapture}
            className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
              <span className="text-xs font-mono text-muted-foreground uppercase font-semibold">
                Capture Form
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadSampleNote}
                  className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[11px] font-semibold transition"
                >
                  Load Sample Incident Note
                </button>
                <button
                  type="button"
                  onClick={loadHallucinationTest}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-[11px] font-semibold transition"
                >
                  Test Verifier &amp; Secret Rejection
                </button>
              </div>
            </div>

            {quickError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
                {quickError}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Source Note Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Rahul Exit Note — Motor Firmware & Telemetry Dropouts"
                className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                  Sensitivity Classification
                </label>
                <select
                  value={sensitivity}
                  onChange={(e: any) => setSensitivity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="team">Team (Visible to all roles)</option>
                  <option value="restricted">Restricted (Scoped roles only)</option>
                  <option value="confidential">Confidential (Lead only)</option>
                </select>
              </div>

              {sensitivity === "restricted" && (
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                    Allowed Successor Scopes
                  </label>
                  <div className="flex items-center gap-4 pt-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowedScopes.includes("core_dev")}
                        onChange={() => toggleScopeItem(allowedScopes, setAllowedScopes, "core_dev")}
                      />
                      <span>Core Dev</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowedScopes.includes("coordinator")}
                        onChange={() => toggleScopeItem(allowedScopes, setAllowedScopes, "coordinator")}
                      />
                      <span>Coordinator</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Raw Notes / Transcript / Incident Log
              </label>
              <textarea
                rows={7}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste decisions, owners, blockers, open questions, or runbooks..."
                className="w-full p-3.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                required
              />
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Every extracted claim is offset-verified and conflict-checked on ingest.
              </span>
              <button
                type="submit"
                disabled={quickLoading || !canWrite}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow disabled:opacity-50"
              >
                {quickLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract &amp; Verify Claims</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Result / Protocol Sidebar */}
          <div className="space-y-4">
            {quickResult && (
              <div
                className={`p-6 rounded-2xl border space-y-3 ${
                  quickResult.rejectedCount > 0 && quickResult.verifiedCount === 0
                    ? "bg-rose-500/10 border-rose-500/30"
                    : "bg-emerald-500/10 border-emerald-500/30"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {quickResult.rejectedCount > 0 && quickResult.verifiedCount === 0 ? (
                    <>
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                      <span className="text-rose-600 dark:text-rose-400">
                        Blocked by Deterministic Verifier
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Capture Verified &amp; Logged!
                      </span>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="block font-bold text-foreground">
                      {quickResult.proposedCount ?? quickResult.verifiedCount ?? 1}
                    </span>
                    <span className="text-muted-foreground">Proposed</span>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="block font-bold text-emerald-500">
                      {quickResult.verifiedCount ?? 0}
                    </span>
                    <span className="text-muted-foreground">Verified</span>
                  </div>
                  <div className="p-2 rounded bg-card border border-border">
                    <span className="block font-bold text-rose-500">
                      {quickResult.rejectedCount ?? 0}
                    </span>
                    <span className="text-muted-foreground">Rejected</span>
                  </div>
                </div>
                {quickResult.rejections?.length > 0 && (
                  <p className="text-[11px] text-rose-500 font-mono">
                    {quickResult.rejections[0].reason}
                  </p>
                )}
                <button
                  onClick={() => router.push("/ledger")}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition"
                >
                  <span>Inspect in Evidence Ledger</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
              <h4 className="font-serif font-bold text-sm text-foreground">
                Zero-Hallucination Extraction Rules
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <strong className="text-foreground">1:1 Offset Map:</strong> Smart quotes and line breaks are mapped back to canonical document character offsets.
                </li>
                <li>
                  <strong className="text-foreground">Prompt Injection Filter:</strong> Lines beginning with `SYSTEM:` or `Assistant:` are ignored cleanly.
                </li>
                <li>
                  <strong className="text-foreground">Secret Guard:</strong> High-risk token prefixes (`ghp_`, `sk-`, `AKIA`, PEM keys) are automatically rejected from claims.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FILE UPLOAD (MANDATORY SENSITIVITY LABEL) */}
      {activeTab === "upload" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleUploadSubmit}
            className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4"
          >
            {uploadError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 font-medium">
                {uploadError}
              </div>
            )}

            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
              <label className="block text-xs font-mono text-muted-foreground uppercase">
                Choose Text / Markdown / Log File (.md, .txt, .csv, .h, .json)
              </label>
              <input
                type="file"
                accept=".md,.txt,.csv,.log,.json,.h,.c,.py,.ts,.tsx"
                onChange={handleFileInput}
                className="block w-full text-xs text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-border file:text-xs file:font-semibold file:bg-card file:text-foreground hover:file:bg-muted cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                  Document Name / Filename *
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. rf-calibration-notes.md"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                  Source Category
                </label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground"
                >
                  <option value="notes">Architecture / Ops Notes</option>
                  <option value="docs">Runbook / Documentation</option>
                  <option value="tasks">Tasks / Issue CSV</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-rose-500 dark:text-amber-400 uppercase mb-1 font-semibold">
                  Mandatory Sensitivity Label (Unselected by Default) *
                </label>
                <select
                  value={uploadSensitivity}
                  onChange={(e) => setUploadSensitivity(e.target.value as SensitivityInput)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground"
                >
                  <option value="">-- Select mandatory sensitivity level --</option>
                  <option value="team">Team (Visible to all roles)</option>
                  <option value="restricted">Restricted (Scoped roles only)</option>
                  <option value="confidential">Confidential (Lead advisor only)</option>
                </select>
              </div>

              {uploadSensitivity === "restricted" && (
                <div>
                  <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                    Allowed Role Scopes *
                  </label>
                  <div className="flex items-center gap-4 pt-2 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadScopes.includes("core_dev")}
                        onChange={() => toggleScopeItem(uploadScopes, setUploadScopes, "core_dev")}
                      />
                      <span>Core Dev</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadScopes.includes("coordinator")}
                        onChange={() => toggleScopeItem(uploadScopes, setUploadScopes, "coordinator")}
                      />
                      <span>Coordinator</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Document Content *
              </label>
              <textarea
                rows={7}
                value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)}
                placeholder="Upload a file above or paste markdown/CSV/log text here..."
                className="w-full p-3.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground leading-relaxed"
                required
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <span className="text-[11px] text-muted-foreground">
                {uploadSensitivity === ""
                  ? "Ingest blocked until sensitivity label is chosen (HTTP 422 guard)."
                  : uploadStatus || "Ready for SHA-256 hashing & extraction."}
              </span>
              <button
                type="submit"
                disabled={uploadLoading || !canWrite || !uploadSensitivity}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 ${uploadLoading ? "animate-spin" : "hidden"}`} />
                <UploadCloud className={`w-4 h-4 ${uploadLoading ? "hidden" : ""}`} />
                <span>{uploadLoading ? "Uploading & Extracting..." : "Upload & Extract Claims"}</span>
              </button>
            </div>
          </form>

          <div className="space-y-4">
            {uploadResult && (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Document Ingested &amp; Extracted</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Source <strong>{uploadResult.source?.name}</strong> stored ({uploadResult.source?.sensitivity}). Extracted{" "}
                  <strong>{uploadResult.totalVerified} verified claims</strong> ({uploadResult.totalRejected} rejected).
                </p>
                <button
                  onClick={() => router.push("/ledger")}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                >
                  <span>View in Evidence Ledger</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-2 text-xs text-muted-foreground">
              <h4 className="font-serif font-bold text-sm text-foreground">
                Fail-Closed Labeling Policy
              </h4>
              <p>
                Every file upload starts unselected so contributors never accidentally expose restricted firmware notes or vendor contracts under a default public team label.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GITHUB REPOSITORY SYNC */}
      {activeTab === "github" && (
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm max-w-2xl space-y-6">
          <form onSubmit={handleGitHubSync} className="space-y-4">
            {ghError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
                {ghError}
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Public GitHub Repository URL
              </label>
              <div className="relative">
                <GitBranch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                  Branch
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                  Repository Sensitivity Label
                </label>
                <select
                  value={ghSensitivity}
                  onChange={(e: any) => setGhSensitivity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground"
                >
                  <option value="team">Team (Visible to all roles)</option>
                  <option value="restricted">Restricted (Scoped roles)</option>
                  <option value="confidential">Confidential (Lead only)</option>
                </select>
              </div>
            </div>

            {ghSensitivity === "restricted" && (
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                  Allowed Scopes
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ghScopes.includes("core_dev")}
                      onChange={() => toggleScopeItem(ghScopes, setGhScopes, "core_dev")}
                    />
                    <span>Core Dev</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ghScopes.includes("coordinator")}
                      onChange={() => toggleScopeItem(ghScopes, setGhScopes, "coordinator")}
                    />
                    <span>Coordinator</span>
                  </label>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-1 font-mono">
              <span className="font-semibold block text-foreground">
                Live GitHub Tree + Ownership + Extraction Pipeline:
              </span>
              <p className="text-[11px]">
                Filters lockfiles/binaries (repomix ignores), analyzes subsystem ownership &amp; bus-factor risk from real commit file paths, and runs deterministic claim extraction.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">{ghStage}</span>
              <button
                type="submit"
                disabled={ghLoading || !canWrite}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 ${ghLoading ? "animate-spin" : ""}`} />
                <span>{ghLoading ? "Syncing & Extracting..." : "Sync & Extract Repository"}</span>
              </button>
            </div>
          </form>

          {ghResult && (
            <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-3">
              <div className="font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Repository Synced &amp; Extracted ({ghResult.branch})</span>
              </div>
              <p className="text-muted-foreground">
                Indexed <strong>{ghResult.ingestedDocumentsCount}</strong> files &amp; commits from{" "}
                <code>{repoUrl}</code>, derived <strong>{ghResult.gitClaimsCount}</strong> git ownership claims, and verified{" "}
                <strong>{ghResult.totalVerified || 0}</strong> document claims ({ghResult.totalRejected || 0} rejected).
              </p>
              <button
                onClick={() => router.push("/ledger")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
              >
                <span>Open Evidence Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
