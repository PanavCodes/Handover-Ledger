"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "@/components/shell/SessionContext";
import { ReadinessGauge } from "@/components/dashboard/ReadinessGauge";
import { LeaverAttestation } from "@/components/dashboard/LeaverAttestation";
import { ClaimCard } from "@/components/ledger/ClaimCard";
import { EvidenceLens } from "@/components/ledger/EvidenceLens";
import { Claim } from "@/lib/types";
import {
  Layers,
  ShieldCheck,
  AlertTriangle,
  Network,
  FileText,
  ArrowRight,
  Eye,
  Lock,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { persona, setWithheldCount } = useSession();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspectingClaim, setInspectingClaim] = useState<Claim | null>(null);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/claims");
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
  }, [setWithheldCount]);

  useEffect(() => {
    fetchClaims();
    const handlePersonaChange = () => fetchClaims();
    window.addEventListener("persona-changed", handlePersonaChange);
    return () => window.removeEventListener("persona-changed", handlePersonaChange);
  }, [fetchClaims]);

  const verifiedCount = claims.filter((c) => c.status === "verified").length;
  const conflictCount = claims.filter((c) => c.status === "conflicting").length;
  const verifiedRate = claims.length > 0 ? Math.round((verifiedCount / claims.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Hero Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-br from-card via-card/90 to-muted/40 border border-border shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
                Active Handover Campaign
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
                ⏳ 14 Days to Departure
              </span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Aurora Rover Subsystem Handover
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Departing Owner: <strong className="text-foreground">Rahul Mehta</strong> (Firmware & RF) → Successor:{" "}
              <strong className="text-foreground">Ananya Rao</strong> (Core Dev). Reconstructing undocumented tacit knowledge into machine-verified claims.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/brief"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow"
            >
              <FileText className="w-4 h-4" />
              <span>View Handover Brief</span>
            </Link>
            <Link
              href="/constellation"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-muted font-semibold text-xs text-foreground transition shadow-sm"
            >
              <Network className="w-4 h-4 text-primary" />
              <span>Constellation Graph</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase">Reconstructed Claims</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-extrabold text-foreground">
              {claims.length}
            </span>
            <span className="text-xs text-emerald-500 font-mono font-semibold">
              {verifiedRate}% Verified
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Exact character-offset match to git repo & docs
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase">Planted Conflicts</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {conflictCount}
            </span>
            <span className="text-xs text-rose-500 font-mono font-semibold">
              Action Required
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Contradictions detected between code and docs
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase">Bus Factor Risk</span>
            <Network className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              1 Alert
            </span>
            <span className="text-xs text-amber-500 font-mono font-semibold">
              Telemetry Silo
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Rahul is sole contributor on 2 core repos
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase">Security Boundary</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              0 Leaks
            </span>
            <span className="text-xs text-emerald-500 font-mono font-semibold">
              Canary Clean
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Strictest-source rule active across all APIs
          </p>
        </div>
      </div>

      {/* Handover Readiness Score Dial */}
      <ReadinessGauge />

      {/* Leaver Attestation Approval Gate */}
      <LeaverAttestation />

      {/* Claims Preview Table / Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-lg text-foreground">
              Reconstructed Knowledge Claims ({claims.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Click any claim to open the 1:1 Evidence Lens and inspect verbatim document quotes.
            </p>
          </div>
          <Link
            href="/ledger"
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <span>Open Full Evidence Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs font-mono">
            Loading evidence ledger...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {claims.slice(0, 6).map((c) => (
              <ClaimCard
                key={c.id}
                claim={c}
                onInspect={(cl) => setInspectingClaim(cl)}
                isLead={persona.role === "lead"}
              />
            ))}
          </div>
        )}
      </div>

      {/* Evidence Lens Drawer / Modal */}
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
