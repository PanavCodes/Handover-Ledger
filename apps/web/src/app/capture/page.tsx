"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  GitBranch,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCw,
} from "lucide-react";

export default function CapturePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"quick" | "github">("quick");

  // Quick Capture Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sensitivity, setSensitivity] = useState<"team" | "restricted" | "confidential">("team");
  const [scope, setScope] = useState<"all" | "core_dev" | "coordinator">("all");
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // GitHub Form State
  const [repoUrl, setRepoUrl] = useState("https://github.com/aurora-robotics/rover-firmware");
  const [branch, setBranch] = useState("main");
  const [ghSensitivity, setGhSensitivity] = useState<"team" | "restricted" | "confidential">("team");
  const [ghLoading, setGhLoading] = useState(false);
  const [ghResult, setGhResult] = useState<any | null>(null);

  const handleQuickCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setSuccessResult(null);

    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Tacit Knowledge Quick Capture",
          content,
          sensitivity,
          allowed_scopes: scope === "all" ? [] : [scope],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessResult(data);
        setTitle("");
        setContent("");
      }
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setGhLoading(true);
    setGhResult(null);

    try {
      const res = await fetch("/api/sources/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl,
          branch,
          sensitivity: ghSensitivity,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGhResult(data);
      }
    } catch (err) {
      console.error("GitHub sync failed:", err);
    } finally {
      setGhLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
            Ingestion Pipeline
          </span>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
            Deterministic Verification
          </span>
        </div>
        <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1">
          Knowledge Capture & Repository Ingest
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground max-w-2xl mt-1 leading-relaxed">
          Ingest raw meeting transcripts, slack threads, or GitHub repositories. Every document is
          content-hashed, filtered with repomix-style exclusion patterns, and indexed with 1:1 character offsets.
        </p>

        {/* Tab Switcher */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setActiveTab("quick")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "quick"
                ? "bg-primary text-primary-foreground shadow"
                : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Quick Note & Interview Capture</span>
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

      {/* Main Content Area */}
      {activeTab === "quick" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <form
            onSubmit={handleQuickCapture}
            className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4"
          >
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Source Document Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Rahul Exit Interview — Motor Firmware & Telemetry Dropouts"
                className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                  Mandatory Sensitivity Label
                </label>
                <select
                  value={sensitivity}
                  onChange={(e: any) => setSensitivity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="team">Team (Public to all members)</option>
                  <option value="restricted">Restricted (Scoped to Core Devs)</option>
                  <option value="confidential">Confidential (Lead & Advisor only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                  Target Scope Filter
                </label>
                <select
                  value={scope}
                  onChange={(e: any) => setScope(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">All Roles</option>
                  <option value="core_dev">Core Dev Successor</option>
                  <option value="coordinator">Operations Coordinator</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                Raw Interview / Tacit Notes Content
              </label>
              <textarea
                rows={9}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste interview transcript, undocumented workarounds, credentials, or code comments..."
                className="w-full p-3.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Deterministic verifier string-matches all quotes before ledger insertion.
              </span>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Extracting Claims...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Extract & Ingest</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Capture Success / Info Sidebar */}
          <div className="space-y-4">
            {successResult ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Ingestion & Extraction Successful!</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Document stored with SHA-256 hash. Reconstructed{" "}
                  <strong>{successResult.claims?.length || 0} machine-verified claims</strong>.
                </p>
                <button
                  onClick={() => router.push("/ledger")}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition"
                >
                  <span>Inspect in Ledger</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}

            <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-3">
              <h4 className="font-serif font-bold text-sm text-foreground">
                Deterministic Extraction Protocol
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>
                    <strong>1:1 Index Map:</strong> Normalizes whitespace while preserving exact
                    character indices into source files.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>
                    <strong>Quote Snapping:</strong> Juricode pattern cuts verbatim spans server-side
                    to eliminate LLM distortion.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>
                    <strong>Secret Guard:</strong> Trufflehog/gitleaks regex patterns scrub live API
                    keys and tokens.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* GitHub Sync Form */
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm max-w-2xl space-y-6">
          <form onSubmit={handleGitHubSync} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                GitHub Repository URL
              </label>
              <div className="relative">
                <GitBranch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo"
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
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase mb-1">
                  Default Sensitivity Label
                </label>
                <select
                  value={ghSensitivity}
                  onChange={(e: any) => setGhSensitivity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="team">Team</option>
                  <option value="restricted">Restricted (Core Devs)</option>
                  <option value="confidential">Confidential</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-1 font-mono">
              <span className="font-semibold block text-foreground">
                Repomix Exclusion Patterns Applied:
              </span>
              <p className="text-[11px]">
                Filters out node_modules, .git, *.bin, *.hex, vendor, dist, test fixtures, and lockfiles.
              </p>
            </div>

            <button
              type="submit"
              disabled={ghLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${ghLoading ? "animate-spin" : ""}`} />
              <span>{ghLoading ? "Syncing Repository..." : "Sync & Ingest Repository"}</span>
            </button>
          </form>

          {ghResult && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 dark:text-emerald-100 text-xs space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Repository Synced Successfully</span>
              </div>
              <p className="text-muted-foreground">
                Fetched and indexed {ghResult.filesIngested || "all"} files from {repoUrl}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
