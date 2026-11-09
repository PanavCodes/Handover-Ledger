"use client";

import React from "react";
import { useSession } from "@/components/shell/SessionContext";
import { PersonaRole } from "@/lib/personas";
import {
  Users,
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export default function DemoPage() {
  const { persona, allPersonas, switchPersona, resetDemo, loading } = useSession();

  const personas = [
    {
      role: "lead" as PersonaRole,
      name: "Dr. Meera Iyer",
      title: "Project Lead & Faculty Advisor",
      badge: "Lead & Reviewer",
      accent: "border-emerald-500/40 bg-emerald-500/5",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      description:
        "Full unredacted access across all 3 sensitivity tiers (team, restricted, confidential). Reviews claims, resolves planted conflicts, approves the 30-day plan, and inspects cryptographic audit chains.",
      permissions: [
        "Unrestricted visibility across all sources",
        "Approve / Reject reconstructed claims",
        "Sign final handover certificate",
        "Verify SHA-256 audit block chain",
      ],
      withheldCount: 0,
    },
    {
      role: "leaver" as PersonaRole,
      name: "Rahul Mehta",
      title: "Departing Project Owner (Firmware & Ops)",
      badge: "Departing Member",
      accent: "border-amber-500/40 bg-amber-500/5",
      badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      description:
        "Captures knowledge, logs decisions, and attests to undocumented processes. Confirms the knowledge ledger in the ServiceNow-style Leaver Approval Gate before formal transition.",
      permissions: [
        "Create quick captures & note ingestions",
        "Sign Leaver Attestation approval gate",
        "View own ownership footprint & git history",
        "Mark transition tasks complete",
      ],
      withheldCount: 0,
    },
    {
      role: "core" as PersonaRole,
      name: "Ananya Rao",
      title: "Successor (Core Dev)",
      badge: "Successor: Core Dev",
      accent: "border-blue-500/40 bg-blue-500/5",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      description:
        "Technical successor inheriting firmware and RF telemetry. Receives role-scoped HANDOVER.md context. Confidential coordinator sponsor contracts and budget sheets are withheld by RLS.",
      permissions: [
        "Access to firmware, CANbus, and hardware docs",
        "View 30-day technical transition plan",
        "Export AGENTS.md / HANDOVER.md for Claude/Cursor",
        "Confidential financial sources redacted",
      ],
      withheldCount: 3,
    },
    {
      role: "coord" as PersonaRole,
      name: "Kabir Shah",
      title: "Operations Coordinator",
      badge: "Successor: Coordinator",
      accent: "border-purple-500/40 bg-purple-500/5",
      badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
      description:
        "Operations coordinator inheriting event schedules, vendor contacts, and team logistics. Core telemetry encryption keys and low-level firmware docs are withheld by strictest-source rule.",
      permissions: [
        "Access to logistics, schedules, and vendor contacts",
        "View operational transition milestones",
        "Export role-scoped operations brief",
        "Telemetry AES keys & firmware code redacted",
      ],
      withheldCount: 4,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
              Hackathon Evaluation Hub
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
              No Sign-In Required
            </span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Simulate Personas & Role-Scoped Access
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl mt-1 leading-relaxed">
            Click any persona card below to simulate the exact view, permissions, and cryptographic
            data withholding enforced by Supabase Row-Level Security and our strictest-source access choke point.
          </p>
        </div>

        <button
          onClick={() => resetDemo()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted font-semibold text-xs text-foreground transition shadow-sm"
        >
          <RotateCcw className="w-4 h-4 text-rose-500" />
          <span>Reset Demo Store</span>
        </button>
      </div>

      {/* 4 Persona Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {personas.map((p) => {
          const isActive = persona.role === p.role;
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

                <h3 className="font-serif text-xl font-bold text-foreground">
                  {p.name}
                </h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {p.title}
                </p>

                <p className="mt-3 text-xs text-foreground/90 leading-relaxed">
                  {p.description}
                </p>

                {/* Permissions List */}
                <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block font-semibold">
                    Access Scope & Boundaries:
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
              <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">
                  {p.withheldCount > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      {p.withheldCount} items withheld
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Unrestricted
                    </span>
                  )}
                </span>

                <button
                  disabled={loading || isActive}
                  onClick={() => switchPersona(p.role)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm ${
                    isActive
                      ? "bg-primary text-primary-foreground opacity-90 cursor-default"
                      : "bg-card hover:bg-muted text-foreground border border-border"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isActive ? "Viewing As This Persona" : "Switch to This Persona"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
