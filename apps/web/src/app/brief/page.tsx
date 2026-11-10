"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/shell/SessionContext";
import { TransitionBoard } from "@/components/brief/TransitionBoard";
import { EvidenceLens } from "@/components/ledger/EvidenceLens";
import { Claim, AttestationState } from "@/lib/types";
import { PersonaRole } from "@/lib/personas";
import {
  FileText,
  Download,
  Bot,
  Printer,
  ShieldCheck,
  AlertTriangle,
  GitBranch,
  Lock,
  CheckCircle2,
  Eye,
  Braces,
  PenTool,
} from "lucide-react";

export default function BriefPage() {
  const { persona, setWithheldCount, switchPersona } = useSession();
  const [briefData, setBriefData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewRole, setPreviewRole] = useState<PersonaRole | null>(null);
  const [inspectingClaim, setInspectingClaim] = useState<Claim | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);

  const fetchBrief = useCallback(async () => {
    setLoading(true);
    try {
      const qs =
        persona.role === "lead" && previewRole ? `?preview_role=${previewRole}` : "";
      const res = await fetch(`/api/brief${qs}`);
      if (res.ok) {
        const json = await res.json();
        setBriefData(json);
        if (persona.role !== "lead" && typeof json.withheldCount === "number") {
          setWithheldCount(json.withheldCount);
        } else if (persona.role === "lead" && !previewRole) {
          setWithheldCount(0);
        }
      }
    } catch (err) {
      console.error("Failed to load brief:", err);
    } finally {
      setLoading(false);
    }
  }, [persona.role, previewRole, setWithheldCount]);

  useEffect(() => {
    if (persona.role !== "lead") {
      setPreviewRole(null);
    }
  }, [persona.role]);

  useEffect(() => {
    fetchBrief();
    const handleRefresh = () => fetchBrief();
    window.addEventListener("persona-changed", handleRefresh);
    window.addEventListener("demo-reset", handleRefresh);
    return () => {
      window.removeEventListener("persona-changed", handleRefresh);
      window.removeEventListener("demo-reset", handleRefresh);
    };
  }, [fetchBrief]);

  const handleExport = (format: string) => {
    window.open(`/api/export?format=${format}`, "_blank");
  };

  const handleToggleRoadmap = async (itemId: string) => {
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (res.ok) {
        fetchBrief();
      }
    } catch (err) {
      console.error("Toggle roadmap error:", err);
    }
  };

  const handleSuccessorAck = async (kind: "successor_core" | "successor_coord") => {
    setAcknowledging(true);
    setAckError(null);
    try {
      const res = await fetch("/api/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAckError(data.error || "Failed to sign acknowledgement");
        return;
      }
      fetchBrief();
    } catch {
      setAckError("Network error recording acknowledgement");
    } finally {
      setAcknowledging(false);
    }
  };

  const brief = briefData?.brief || {
    decisions: [],
    unfinished: [],
    ownership: [],
    risks: [],
    roadmap: { day1: [], week1: [], month1: [] },
  };

  const allVisibleClaims: Claim[] = [
    ...(brief.decisions || []),
    ...(brief.unfinished || []),
    ...((brief.ownership || []).flatMap((o: any) => o.claims || [])),
    ...(brief.risks || []),
  ];

  const attestation: AttestationState | undefined = briefData?.attestation;
  const activeBriefRole = briefData?.persona || persona.role;
  const withheldCount = briefData?.withheldCount ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header & Export Toolbar */}
      <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
                Role-Scoped Handover Brief
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                Scope: {activeBriefRole.toUpperCase()}
              </span>
              {withheldCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold">
                  <Lock className="w-3 h-3" />
                  Withheld from this scope: {withheldCount} claims
                </span>
              )}
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1.5">
              Aurora Rover Knowledge Brief
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-2xl mt-1 leading-relaxed">
              Verified 4-section handover brief plus a role-filtered 30-day transition plan. Click any claim card to inspect its exact verbatim source quote.
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExport("agent")}
              title="Download structured context for Antigravity, Claude Code, or Cursor"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-500/30 transition shadow-sm"
            >
              <Bot className="w-4 h-4 text-amber-500" />
              <span>Agent Context (HANDOVER.md)</span>
            </button>

            <button
              onClick={() => handleExport("md")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-semibold text-xs transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Markdown</span>
            </button>

            <button
              onClick={() => handleExport("json")}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-semibold text-xs transition shadow-sm"
            >
              <Braces className="w-4 h-4" />
              <span>JSON</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-semibold text-xs transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Lead Preview Role Selector */}
        {persona.role === "lead" && (
          <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="w-4 h-4 text-primary" />
              <span>
                <strong className="text-foreground">Lead Preview Mode:</strong> Inspect what each successor actually receives after strictest-source redaction:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { role: null, label: "All Sources (Lead)" },
                { role: "core" as PersonaRole, label: "Ananya (Core Dev)" },
                { role: "coord" as PersonaRole, label: "Kabir (Coordinator)" },
                { role: "leaver" as PersonaRole, label: "Rahul (Leaver)" },
              ].map((opt) => {
                const selected = previewRole === opt.role;
                return (
                  <button
                    key={opt.label}
                    onClick={() => setPreviewRole(opt.role)}
                    className={`px-3 py-1 rounded-lg font-mono text-[11px] transition border ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-muted/50 text-muted-foreground hover:text-foreground border-border"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
                  1. Key System &amp; Architectural Decisions
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {brief.decisions?.length || 0} Verified Decisions
              </span>
            </div>

            {brief.decisions?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brief.decisions.map((d: Claim) => (
                  <div
                    key={d.id}
                    onClick={() => setInspectingClaim(d)}
                    className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-foreground font-serif">{d.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0 uppercase">
                        {d.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{d.statement}</p>
                    {d.citations && d.citations[0] && (
                      <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 pt-1">
                        <FileText className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">
                          {d.citations[0].document_path} (chars {d.citations[0].start_offset}..
                          {d.citations[0].end_offset})
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No visible decisions in this role scope.</p>
            )}
          </div>

          {/* Section 2: Unfinished Work & Technical Debt */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-lg text-foreground">
                  2. Unfinished Work, Milestones &amp; Open Gaps
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {brief.unfinished?.length || 0} Open Items
              </span>
            </div>

            {brief.unfinished?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {brief.unfinished.map((u: Claim) => (
                  <div
                    key={u.id}
                    onClick={() => setInspectingClaim(u)}
                    className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 cursor-pointer transition space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-foreground font-serif">{u.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 uppercase shrink-0">
                        {u.status === "missing" ? "missing gap" : u.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{u.statement}</p>
                    {u.citations && dHasCitation(u) && (
                      <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5 pt-1">
                        <FileText className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">{u.citations![0].document_path}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No unfinished items in this role scope.</p>
            )}
          </div>

          {/* Section 3: Who Owned What (Subsystem Ownership & Contacts) */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <GitBranch className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-lg text-foreground">
                  3. Who Owned What &amp; External Contacts
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {brief.ownership?.length || 0} Owners / Contacts
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {brief.ownership?.map((ownerGroup: any, idx: number) => (
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
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-medium text-foreground truncate">{oc.title}</span>
                          {oc.status === "conflicting" && (
                            <span className="text-[9px] font-mono px-1 rounded bg-rose-500/15 text-rose-500 uppercase shrink-0">
                              conflict
                            </span>
                          )}
                        </div>
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
                  4. Operational Risks, Credentials &amp; Fragilities
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {brief.risks?.length || 0} Risk Factors
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {brief.risks?.map((r: Claim) => (
                <div
                  key={r.id}
                  onClick={() => setInspectingClaim(r)}
                  className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                    r.status === "conflicting"
                      ? "border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10"
                      : "border-border bg-muted/20 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-foreground font-serif">{r.title}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
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

          {/* 30-Day Role-Scoped Transition Plan Board */}
          <TransitionBoard
            roadmap={brief.roadmap}
            claims={allVisibleClaims}
            scopeLabel={activeBriefRole.toUpperCase()}
            onToggleItem={handleToggleRoadmap}
            onInspectClaim={(c) => setInspectingClaim(c)}
          />

          {/* Successor Formal Acknowledgement Gate */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-foreground">
                  Formal Successor Receipt &amp; Handover Sign-Off
                </h3>
                <p className="text-xs text-muted-foreground">
                  Both incoming successors formally acknowledge receipt of their role-scoped brief and Day-1 plan, creating SHA-256 audit receipts.
                </p>
              </div>
            </div>

            {ackError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
                {ackError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ananya Core Dev Receipt */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-foreground">
                      Ananya Rao — Successor (Core Dev)
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-semibold ${
                        attestation?.successor_core_acknowledged
                          ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                      }`}
                    >
                      {attestation?.successor_core_acknowledged ? "Acknowledged" : "Pending"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {attestation?.successor_core_acknowledged
                      ? `Receipt SHA-256: ${attestation.successor_core_receipt_hash?.slice(0, 20)}...`
                      : "Covers Core Dev technical subsystem & 30-day engineering transition plan."}
                  </p>
                </div>

                {!attestation?.successor_core_acknowledged && (
                  persona.role === "core" ? (
                    <button
                      disabled={acknowledging}
                      onClick={() => handleSuccessorAck("successor_core")}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>{acknowledging ? "Sealing Receipt..." : "Acknowledge Core Dev Brief"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => switchPersona("core")}
                      className="px-3 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-xs font-medium text-foreground transition self-start"
                    >
                      Switch to Ananya Rao to Acknowledge
                    </button>
                  )
                )}
              </div>

              {/* Kabir Coordinator Receipt */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm text-foreground">
                      Kabir Shah — Operations Coordinator
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-semibold ${
                        attestation?.successor_coord_acknowledged
                          ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-500 border-amber-500/30"
                      }`}
                    >
                      {attestation?.successor_coord_acknowledged ? "Acknowledged" : "Pending"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {attestation?.successor_coord_acknowledged
                      ? `Receipt SHA-256: ${attestation.successor_coord_receipt_hash?.slice(0, 20)}...`
                      : "Covers AeroTech sponsor deliverables, vendor contacts & logistics plan."}
                  </p>
                </div>

                {!attestation?.successor_coord_acknowledged && (
                  persona.role === "coord" ? (
                    <button
                      disabled={acknowledging}
                      onClick={() => handleSuccessorAck("successor_coord")}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>{acknowledging ? "Sealing Receipt..." : "Acknowledge Coordinator Brief"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => switchPersona("coord")}
                      className="px-3 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-xs font-medium text-foreground transition self-start"
                    >
                      Switch to Kabir Shah to Acknowledge
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Lens Modal */}
      <EvidenceLens
        claim={inspectingClaim}
        onClose={() => setInspectingClaim(null)}
        onClaimUpdated={(updated) => {
          setInspectingClaim(updated);
          fetchBrief();
        }}
      />
    </div>
  );
}

function dHasCitation(c: Claim) {
  return Boolean(c.citations && c.citations.length > 0);
}
