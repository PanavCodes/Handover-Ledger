"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

interface ReadinessGaugeProps {
  score?: number;
  nextBlocker?: string;
  breakdown?: {
    verified_claims_pct: number;
    unfinished_tasks_scoped_pct: number;
    spof_mitigated_pct: number;
    successor_signoff_pct: number;
  };
}

export function ReadinessGauge({
  score = 52,
  nextBlocker = "Run interview gaps and resolve conflicting claims to boost readiness.",
  breakdown = {
    verified_claims_pct: 67,
    unfinished_tasks_scoped_pct: 10,
    spof_mitigated_pct: 50,
    successor_signoff_pct: 0,
  },
}: ReadinessGaugeProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 64;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  const getScoreColor = (val: number) => {
    if (val >= 75) return "text-emerald-500 stroke-emerald-500";
    if (val >= 50) return "text-amber-500 stroke-amber-500";
    return "text-rose-500 stroke-rose-500";
  };

  const statusBadge =
    safeScore >= 75
      ? {
          label: "Handover Ready",
          cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        }
      : safeScore >= 50
        ? {
            label: "Transition In Progress",
            cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          }
        : {
            label: "Action Required",
            cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
          };

  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-center gap-6">
      {/* Radial Dial */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg className="w-40 h-40 transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-muted"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            className={`transition-all duration-700 ease-out ${getScoreColor(safeScore)}`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-serif text-3xl font-extrabold text-foreground tracking-tight">
            {safeScore}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            / 100 Readiness
          </span>
        </div>
      </div>

      {/* Breakdown Details */}
      <div className="flex-1 w-full space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-base text-foreground">
              Handover Readiness Gauge
            </h3>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${statusBadge.cls}`}>
              {statusBadge.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live composite of verified claims, exit interview & 30-day roadmap completion, resolved conflicts, and role sign-offs.
          </p>
        </div>

        {/* Breakdown Progress Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Verified Claims (40%):</span>
              <span className="font-mono font-bold text-foreground">
                {breakdown.verified_claims_pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${breakdown.verified_claims_pct}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Interview & Plan Progress (25%):</span>
              <span className="font-mono font-bold text-foreground">
                {breakdown.unfinished_tasks_scoped_pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${breakdown.unfinished_tasks_scoped_pct}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>SPOF & Conflict Resolution (20%):</span>
              <span className="font-mono font-bold text-foreground">
                {breakdown.spof_mitigated_pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${breakdown.spof_mitigated_pct}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Leaver & Successor Sign-Off (15%):</span>
              <span className="font-mono font-bold text-foreground">
                {breakdown.successor_signoff_pct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${breakdown.successor_signoff_pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Blocker Action Hint */}
        <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
            {safeScore >= 75 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>Next Action: {nextBlocker}</span>
          </div>
          <Link
            href="/interview"
            className="flex items-center gap-1 text-primary hover:underline font-semibold"
          >
            Open Exit Interview
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
