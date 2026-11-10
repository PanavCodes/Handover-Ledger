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
  MessageSquareMore,
  UploadCloud,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const { persona, setWithheldCount } = useSession();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [briefSummary, setBriefSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [inspectingClaim, setInspectingClaim] = useState<Claim | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [claimsRes, briefRes] = await Promise.all([
        fetch("/api/claims"),
        fetch("/api/brief"),
      ]);

      if (claimsRes.ok) {
        const data = await claimsRes.json();
        setClaims(data.claims || []);
        if (data.withheldCount !== undefined) {
          setWithheldCount(data.withheldCount);
        }
      }

      if (briefRes.ok) {
        const briefJson = await briefRes.json();
        setBriefSummary(briefJson);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [setWithheldCount]);

  useEffect(() => {
    fetchDashboardData();
    const handleRefresh = () => fetchDashboardData();
    window.addEventListener("persona-changed", handleRefresh);
    window.addEventListener("demo-reset", handleRefresh);
    return () => {
      window.removeEventListener("persona-changed", handleRefresh);
      window.removeEventListener("demo-reset", handleRefresh);
    };
  }, [fetchDashboardData]);

  const verifiedCount = claims.filter((c) => c.status === "verified").length;
  const conflictCount = claims.filter((c) => c.status === "conflicting").length;
  const missingCount = claims.filter((c) => c.status === "missing").length;
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
                14 Days to Departure
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                Viewing as: {persona.name}
              </span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Aurora Rover Subsystem Handover
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Departing Owner: <strong className="text-foreground">Rahul Mehta</strong> (Firmware &amp; RF) &rarr; Successors:{" "}
              <strong className="text-foreground">Ananya Rao</strong> (Core Dev) &amp;{" "}
              <strong className="text-foreground">Kabir Shah</strong> (Coordinator). Every claim is offset-verified, conflict-checked, and scoped before exit.
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
              href="/interview"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-muted font-semibold text-xs text-foreground transition shadow-sm"
            >
              <MessageSquareMore className="w-4 h-4 text-primary" />
              <span>
                Exit Interview ({briefSummary?.interviewSummary?.pending ?? 4} Gaps)
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Zero-Assistance Evaluator Walkthrough Strip */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>End-to-End Evaluator Workflow (Zero Sign-In Required)</span>
          </div>
          <Link href="/demo" className="text-xs text-primary hover:underline font-semibold">
            Simulate Personas &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          <Link
            href="/capture"
            className="p-3 rounded-xl bg-muted/40 hover:bg-muted border border-border transition flex items-start gap-2.5"
          >
            <span className="font-mono font-bold text-primary shrink-0">01</span>
            <div>
              <div className="font-semibold text-foreground flex items-center gap-1">
                Ingest Sources <UploadCloud className="w-3 h-3 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground">Note, file upload, or GitHub sync</p>
            </div>
          </Link>
          <Link
            href="/interview"
            className="p-3 rounded-xl bg-muted/40 hover:bg-muted border border-border transition flex items-start gap-2.5"
          >
            <span className="font-mono font-bold text-primary shrink-0">02</span>
            <div>
              <div className="font-semibold text-foreground">Gap Interview</div>
              <p className="text-[11px] text-muted-foreground">Close missing runbooks &amp; keys</p>
            </div>
          </Link>
          <Link
            href="/ledger"
            className="p-3 rounded-xl bg-muted/40 hover:bg-muted border border-border transition flex items-start gap-2.5"
          >
            <span className="font-mono font-bold text-primary shrink-0">03</span>
            <div>
              <div className="font-semibold text-foreground">Verify &amp; Triage</div>
              <p className="text-[11px] text-muted-foreground">Inspect Evidence Lens &amp; resolve diffs</p>
            </div>
          </Link>
          <Link
            href="/brief"
            className="p-3 rounded-xl bg-muted/40 hover:bg-muted border border-border transition flex items-start gap-2.5"
          >
            <span className="font-mono font-bold text-primary shrink-0">04</span>
            <div>
              <div className="font-semibold text-foreground">Role Brief &amp; Plan</div>
              <p className="text-[11px] text-muted-foreground">30-day board &amp; HANDOVER.md export</p>
            </div>
          </Link>
          <Link
            href="/canary"
            className="p-3 rounded-xl bg-muted/40 hover:bg-muted border border-border transition flex items-start gap-2.5"
          >
            <span className="font-mono font-bold text-primary shrink-0">05</span>
            <div>
              <div className="font-semibold text-foreground">Canary &amp; Audit</div>
              <p className="text-[11px] text-muted-foreground">16 leak tests + SHA-256 chain</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase">Visible Claims</span>
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
            Role-scoped items backed by verbatim offsets
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase">Active Conflicts</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {conflictCount}
            </span>
            <span className="text-xs text-rose-500 font-mono font-semibold">
              {conflictCount > 0 ? "Action Required" : "Resolved"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Contradictions detected across repo code &amp; ADRs
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase">Interview Gaps</span>
            <MessageSquareMore className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {briefSummary?.interviewSummary?.pending ?? missingCount} Open
            </span>
            <span className="text-xs text-amber-500 font-mono font-semibold">
              {missingCount} Missing
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Undocumented runbooks, keys &amp; unassigned assets
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-mono uppercase">Access Boundary</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {briefSummary?.withheldCount ?? 0} Withheld
            </span>
            <span className="text-xs text-emerald-500 font-mono font-semibold">
              Zero Leaks
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Strictest-source enforcement for {persona.badge}
          </p>
        </div>
      </div>

      {/* Live Handover Readiness Score Dial */}
      <ReadinessGauge
        score={briefSummary?.readinessScore ?? 52}
        nextBlocker={briefSummary?.nextBlocker}
        breakdown={briefSummary?.scoreBreakdown}
      />

      {/* Live Leaver Attestation Approval Gate */}
      <LeaverAttestation onUpdated={fetchDashboardData} />

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
          fetchDashboardData();
        }}
      />
    </div>
  );
}
