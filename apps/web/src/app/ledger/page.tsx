"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/shell/SessionContext";
import { ClaimCard } from "@/components/ledger/ClaimCard";
import { EvidenceLens } from "@/components/ledger/EvidenceLens";
import { Claim } from "@/lib/types";
import {
  Layers,
  Search,
  Filter,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Lock,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  List,
} from "lucide-react";

export default function LedgerPage() {
  const { persona, setWithheldCount } = useSession();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectingClaim, setInspectingClaim] = useState<Claim | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (typeFilter !== "all") query.set("type", typeFilter);
      if (statusFilter !== "all") query.set("status", statusFilter);
      if (search.trim()) query.set("q", search.trim());

      const res = await fetch(`/api/claims?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
        if (data.withheldCount !== undefined) {
          setWithheldCount(data.withheldCount);
        }
      }
    } catch (err) {
      console.error("Failed to load claims:", err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search, setWithheldCount]);

  useEffect(() => {
    fetchClaims();
    const handlePersonaChange = () => fetchClaims();
    window.addEventListener("persona-changed", handlePersonaChange);
    return () => window.removeEventListener("persona-changed", handlePersonaChange);
  }, [fetchClaims]);

  const verifiedCount = claims.filter((c) => c.status === "verified").length;
  const conflictCount = claims.filter((c) => c.status === "conflicting").length;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
              Truth Engine
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
              Zero Hallucinations
            </span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Evidence Ledger & Verification Console
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl mt-1 leading-relaxed">
            Every claim is linked to source documents via exact character offsets. Inspect verbatim quotes,
            triage planted contradictions, and approve knowledge handover records.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg text-xs font-medium transition ${
              viewMode === "grid"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 rounded-lg text-xs font-medium transition ${
              viewMode === "table"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search claims, keys, or statements..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="verified">Verified (Exact Match)</option>
            <option value="inferred">Inferred</option>
            <option value="conflicting">Planted Conflicts</option>
            <option value="missing">Missing</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            <option value="decision">Decisions</option>
            <option value="owner">Ownership</option>
            <option value="blocker">Blockers</option>
            <option value="risk">Risks</option>
            <option value="open_question">Open Questions</option>
            <option value="milestone">Milestones</option>
            <option value="process">Processes</option>
            <option value="credential_ref">Credentials</option>
          </select>
        </div>
      </div>

      {/* Claims Content Area */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground text-xs font-mono">
          Loading claims from ledger store...
        </div>
      ) : claims.length === 0 ? (
        <div className="p-16 text-center space-y-2 rounded-2xl bg-card border border-border">
          <p className="text-sm font-semibold text-foreground">No claims match the selected filters.</p>
          <p className="text-xs text-muted-foreground">Try clearing search terms or changing status filters.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {claims.map((c) => (
            <ClaimCard
              key={c.id}
              claim={c}
              onInspect={(cl) => setInspectingClaim(cl)}
              isLead={persona.role === "lead"}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground uppercase font-mono text-[11px] border-b border-border">
                <tr>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Claim Statement</th>
                  <th className="px-6 py-3">Source Citation</th>
                  <th className="px-6 py-3">Confidence</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {claims.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setInspectingClaim(c)}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase border ${
                          c.status === "verified"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : c.status === "conflicting"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground uppercase">
                      {c.type}
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <div className="font-semibold text-foreground truncate">{c.title}</div>
                      <div className="text-muted-foreground text-[11px] truncate mt-0.5">
                        {c.statement}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                      {c.citations && c.citations.length > 0 ? (
                        <span>{c.citations[0].document_path}</span>
                      ) : (
                        <span>No citation</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-foreground">
                      {Math.round(c.confidence * 100)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingClaim(c);
                        }}
                        className="text-primary hover:underline font-semibold"
                      >
                        Evidence Lens
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Evidence Lens Modal / Drawer */}
      <EvidenceLens
        claim={inspectingClaim}
        onClose={() => setInspectingClaim(null)}
        onClaimUpdated={(updated) => {
          setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setInspectingClaim(updated);
        }}
      />
    </div>
  );
}
