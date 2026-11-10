"use client";

import React from "react";
import { Claim, RoadmapItem } from "@/lib/types";
import { CheckCircle2, Circle, FileText, Lock } from "lucide-react";

interface TransitionBoardProps {
  roadmap?: {
    day1: RoadmapItem[];
    week1: RoadmapItem[];
    month1: RoadmapItem[];
  };
  claims?: Claim[];
  scopeLabel?: string;
  onToggleItem?: (itemId: string) => void;
  onInspectClaim?: (claim: Claim) => void;
}

export function TransitionBoard({
  roadmap,
  claims = [],
  scopeLabel = "All",
  onToggleItem,
  onInspectClaim,
}: TransitionBoardProps) {
  const claimMap = new Map(claims.map((c) => [c.id, c]));

  const columns: Array<{
    key: "day1" | "week1" | "month1";
    title: string;
    desc: string;
    items: RoadmapItem[];
  }> = [
    {
      key: "day1",
      title: "Day 1: Immediate Triage & Safety",
      desc: "Critical checks before departing owner offboards",
      items: roadmap?.day1 || [],
    },
    {
      key: "week1",
      title: "Week 1: Shadowing & Conflict Alignment",
      desc: "Hands-on vendor, sponsor & firmware parity checks",
      items: roadmap?.week1 || [],
    },
    {
      key: "month1",
      title: "Month 1: Rotation & Autonomous Custody",
      desc: "Key rotation, registrar transfer & steady-state ops",
      items: roadmap?.month1 || [],
    },
  ];

  const allItems = [...columns[0].items, ...columns[1].items, ...columns[2].items];
  const completedCount = allItems.filter((i) => i.done).length;
  const progressPct =
    allItems.length > 0 ? Math.round((completedCount / allItems.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif font-bold text-lg text-foreground">
              30-Day Role-Scoped Transition Plan
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold border border-primary/30">
              Scope: {scopeLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Phased checklist dynamically scoped to claims visible in your role. Checkboxes persist to the audit trail.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-48 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Plan Progress:</span>
              <span className="font-mono font-bold text-foreground">{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            {completedCount}/{allItems.length} Done
          </span>
        </div>
      </div>

      {/* 3 Time-Phased Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {columns.map((col) => {
          const doneCount = col.items.filter((i) => i.done).length;
          return (
            <div
              key={col.key}
              className="p-5 rounded-xl bg-card border border-border flex flex-col space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h4 className="font-serif font-bold text-sm text-foreground">{col.title}</h4>
                  <p className="text-[11px] text-muted-foreground">{col.desc}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                  {doneCount}/{col.items.length}
                </span>
              </div>

              {col.items.length === 0 ? (
                <div className="p-4 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Role-restricted items filtered from this timeframe.</span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {col.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onToggleItem && onToggleItem(item.id)}
                      className={`p-3.5 rounded-lg border cursor-pointer transition select-none ${
                        item.done
                          ? "bg-emerald-500/5 border-emerald-500/25 text-muted-foreground"
                          : "bg-muted/30 border-border hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          aria-label={`Toggle ${item.title}`}
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition"
                        >
                          {item.done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <p
                            className={`text-xs font-semibold leading-snug ${
                              item.done ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {item.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>

                          {item.linked_claim_ids.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {item.linked_claim_ids.slice(0, 3).map((cid) => {
                                const linked = claimMap.get(cid);
                                return (
                                  <button
                                    key={cid}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (linked && onInspectClaim) onInspectClaim(linked);
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-card border border-border hover:border-primary text-primary transition"
                                  >
                                    <FileText className="w-2.5 h-2.5" />
                                    {cid}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
