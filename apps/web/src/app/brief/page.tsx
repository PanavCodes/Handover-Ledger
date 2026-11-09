"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/shell/SessionContext";
import { TransitionBoard } from "@/components/brief/TransitionBoard";
import { EvidenceLens } from "@/components/ledger/EvidenceLens";
import { Claim } from "@/lib/types";
import {
  FileText,
  Download,
  Bot,
  Printer,
  ShieldCheck,
  AlertTriangle,
  GitBranch,
  Lock,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";

export default function BriefPage() {
  const { persona } = useSession();
  const [briefData, setBriefData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectingClaim, setInspectingClaim] = useState<Claim | null>(null);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brief");
      if (res.ok) {
        const json = await res.json();
        setBriefData(json);
      }
    } catch (err) {
      console.error("Failed to load brief:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrief();
    const handlePersonaChange = () => fetchBrief();
    window.addEventListener("persona-changed", handlePersonaChange);
    return () => window.removeEventListener("persona-changed", handlePersonaChange);
  }, [fetchBrief]);

  const handleExport = (format: string) => {
    window.open(`/api/export?format=${format}`, "_blank");
  };

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header & Export Toolbar */}
      <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
              Role-Scoped Handover Brief
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
              Scope: {persona.badge}
            </span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Aurora Rover Knowledge Brief
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl mt-1 leading-relaxed">
            Reconstructed tacit knowledge, architecture decisions, and git ownership mapped into a
            zero-hallucination 4-part brief with role-scoped filtering.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export for AI Agent */}
          <button
            onClick={() => handleExport("agent")}
            title="Download structured context for Claude Code, Cursor, or Antigravity"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-500/30 transition shadow-sm"
          >
            <Bot className="w-4 h-4 text-amber-500" />
            <span>Agent Context (HANDOVER.md)</span>
          </button>

          {/* Export Markdown */}
          <button
            onClick={() => handleExport("md")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-semibold text-xs transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Markdown</span>
          </button>

          {/* Print / Save PDF */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-semibold text-xs transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-muted-foreground text-xs font-mono">
          Generating role-scoped handover brief...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Architectural & System Decisions */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-lg text-foreground">
                  1. Key System & Architectural Decisions
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {briefData?.plan?.decisions?.length || 0} Machine-Verified Decisions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {briefData?.plan?.decisions?.map((d: Claim) => (
                <div
                  key={d.id}
                  onClick={() => setInspectingClaim(d)}
                  className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground font-serif">{d.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.statement}</p>
                  {d.citations && d.citations[0] && (
                    <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 pt-1">
                      <FileText className="w-3 h-3 text-primary shrink-0" />
                      <span className="truncate">{d.citations[0].document_path}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Unfinished Work & Technical Debt */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-lg text-foreground">
                  2. Unfinished Work & Technical Debt
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {briefData?.plan?.unfinished?.length || 0} Open Items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {briefData?.plan?.unfinished?.map((u: Claim) => (
                <div
                  key={u.id}
                  onClick={() => setInspectingClaim(u)}
                  className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground font-serif">{u.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase">
                      {u.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{u.statement}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Who Owned What (Git-Derived Ownership) */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <GitBranch className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-lg text-foreground">
                  3. Subsystem Ownership & Knowledge Footprint
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Git Blame & Log Derivation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {briefData?.plan?.ownership?.map((ownerGroup: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
                  <h4 className="font-serif font-bold text-sm text-foreground">
                    {ownerGroup.person}
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {ownerGroup.claims.map((oc: Claim) => (
                      <li
                        key={oc.id}
                        onClick={() => setInspectingClaim(oc)}
                        className="p-2 rounded bg-card border border-border hover:border-primary/50 cursor-pointer transition"
                      >
                        <span className="font-medium text-foreground block truncate">{oc.title}</span>
                        <span className="text-[10px] font-mono opacity-80 block truncate">
                          {oc.subject_key}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Operational Risks & Credentials */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-lg text-foreground">
                  4. Operational Risks & Single Points of Failure
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {briefData?.plan?.risks?.length || 0} Risk Factors
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {briefData?.plan?.risks?.map((r: Claim) => (
                <div
                  key={r.id}
                  onClick={() => setInspectingClaim(r)}
                  className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                    r.status === "conflicting"
                      ? "border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10"
                      : "border-border bg-muted/20 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground font-serif">{r.title}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        r.status === "conflicting"
                          ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{r.statement}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 30-Day Transition Plan Board */}
          <TransitionBoard />
        </div>
      )}

      {/* Evidence Lens Modal / Drawer */}
      <EvidenceLens
        claim={inspectingClaim}
        onClose={() => setInspectingClaim(null)}
      />
    </div>
  );
}
