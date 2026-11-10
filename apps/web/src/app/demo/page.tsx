"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "@/components/shell/SessionContext";
import { PersonaRole } from "@/lib/personas";
import {
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

export default function DemoPage() {
  const { persona, switchPersona, resetDemo, loading } = useSession();
  const [liveCounts, setLiveCounts] = useState<
    Record<string, { visibleCount: number; withheldCount: number }>
  >({});

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/demo/summary");
      if (res.ok) {
        const data = await res.json();
        setLiveCounts(data.counts || {});
      }
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    window.addEventListener("demo-reset", fetchSummary);
    window.addEventListener("persona-changed", fetchSummary);
    return () => {
      window.removeEventListener("demo-reset", fetchSummary);
      window.removeEventListener("persona-changed", fetchSummary);
    };
  }, [fetchSummary]);

  const personas = [
    {
      role: "lead" as PersonaRole,
      name: "Dr. Meera Iyer",
      title: "Project Lead & Faculty Advisor",
      badge: "Lead & Reviewer",
      accent: "border-emerald-500/40 bg-emerald-500/5",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      description:
        "Full unredacted access across all 3 sensitivity tiers (team, restricted, confidential). Reviews claims, resolves planted conflicts, previews role scopes, and verifies the SHA-256 audit chain.",
      permissions: [
        "Unrestricted visibility across all sources",
        "Approve, edit, or reject reconstructed claims",
        "Batch-approve verified ledger items",
        "Verify tamper-evident SHA-256 audit chain",
      ],
      nextHref: "/ledger",
      nextLabel: "Review Conflicts in Ledger",
    },
    {
      role: "leaver" as PersonaRole,
      name: "Rahul Mehta",
      title: "Departing Project Owner (Firmware & Ops)",
      badge: "Departing Member",
      accent: "border-amber-500/40 bg-amber-500/5",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      description:
        "Answers gap-driven interview prompts, captures quick tacit notes, uploads docs with mandatory labels, and formally attests to the ledger before exit.",
      permissions: [
        "Answer Gap-Driven Exit Interview questions",
        "Create quick captures & upload labeled sources",
        "Sign the Leaver Attestation approval gate",
        "Confidential faculty & siloed notes remain withheld",
      ],
      nextHref: "/interview",
      nextLabel: "Open Exit Interview",
    },
    {
      role: "core" as PersonaRole,
      name: "Ananya Rao",
      title: "Successor (Core Dev)",
      badge: "Successor: Core Dev",
      accent: "border-blue-500/40 bg-blue-500/5",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      description:
        "Technical successor inheriting firmware and RF telemetry. Sees STM32 flashing docs & hardware claims, while Coordinator sponsor contracts & faculty grants are withheld.",
      permissions: [
        "Access to firmware, CANbus, and bench IP docs",
        "View Core Dev 30-day technical transition plan",
        "Export HANDOVER.md / Markdown for AI coding agents",
        "Sign Core Dev Successor Acknowledgement receipt",
      ],
      nextHref: "/brief",
      nextLabel: "Inspect Core Dev Brief",
    },
    {
      role: "coord" as PersonaRole,
      name: "Kabir Shah",
      title: "Operations Coordinator",
      badge: "Successor: Coordinator",
      accent: "border-purple-500/40 bg-purple-500/5",
      badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
      description:
        "Operations coordinator inheriting AeroTech sponsor milestones, vendor leads, and logistics. Core Dev bench IP & firmware instructions are absent from API payloads.",
      permissions: [
        "Access to vendor contacts, sponsors & logistics",
        "View Coordinator 30-day transition tasks",
        "Export role-scoped operations brief",
        "Core firmware & confidential faculty files withheld",
      ],
      nextHref: "/brief",
      nextLabel: "Inspect Coordinator Brief",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
              Role Simulation Hub
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
              No Sign-In Required
            </span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Simulate Personas &amp; Role-Scoped Access
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl mt-1 leading-relaxed">
            Switch between all 4 campaign personas with one click to verify server-side data withholding enforced by our strictest-source choke point (`lib/access.ts`).
          </p>
        </div>

        <button
          onClick={() => resetDemo()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted font-semibold text-xs text-foreground transition shadow-sm disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 text-rose-500 ${loading ? "animate-spin" : ""}`} />
          <span>Reset Demo Store</span>
        </button>
      </div>

      {/* 4 Persona Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {personas.map((p) => {
          const isActive = persona.role === p.role;
          const stats = liveCounts[p.role];
          const withheldCount = stats?.withheldCount ?? 0;
          const visibleCount = stats?.visibleCount ?? 0;

          return (
            <div
              key={p.role}
              className={`p-6 rounded-2xl border transition-all shadow-sm flex flex-col justify-between space-y-4 ${
                p.accent
              } ${isActive ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase border ${p.badgeColor}`}
                  >
                    {p.badge}
                  </span>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      <CheckCircle2 className="w-4 h-4" />
                      Active Role
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-xl font-bold text-foreground">{p.name}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">{p.title}</p>

                <p className="mt-3 text-xs text-foreground/90 leading-relaxed">
                  {p.description}
                </p>

                {/* Permissions List */}
                <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block font-semibold">
                    Access Scope &amp; Boundaries:
                  </span>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {p.permissions.map((perm, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary font-bold shrink-0">•</span>
                        <span>{perm}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {withheldCount > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      {visibleCount} visible / {withheldCount} withheld
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Unrestricted ({visibleCount} claims)
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  {isActive ? (
                    <Link
                      href={p.nextHref}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition"
                    >
                      <span>{p.nextLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <button
                      disabled={loading}
                      onClick={() => switchPersona(p.role)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm bg-card hover:bg-muted text-foreground border border-border"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Switch to This Persona</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
