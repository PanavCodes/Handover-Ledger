"use client";

import React from "react";
import { Claim } from "@/lib/types";
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  GitBranch,
  Lock,
  ExternalLink,
} from "lucide-react";

interface ClaimCardProps {
  claim: Claim;
  onInspect: (claim: Claim) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isLead?: boolean;
}

export function ClaimCard({
  claim,
  onInspect,
  onApprove,
  onReject,
  isLead = false,
}: ClaimCardProps) {
  const getStatusBadge = () => {
    switch (claim.status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3" />
            Verified
          </span>
        );
      case "conflicting":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" />
            Planted Conflict
          </span>
        );
      case "inferred":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Inferred
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-muted text-muted-foreground border border-border">
            Missing
          </span>
        );
    }
  };

  return (
    <div
      onClick={() => onInspect(claim)}
      className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md cursor-pointer group flex flex-col justify-between space-y-4"
    >
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {getStatusBadge()}
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border uppercase">
              {claim.type}
            </span>
            {claim.origin === "git_derived" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1">
                <GitBranch className="w-2.5 h-2.5" />
                Git Derived
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-muted-foreground group-hover:text-primary transition-colors">
              {Math.round(claim.confidence * 100)}% Match
            </span>
          </div>
        </div>

        {/* Title & Statement */}
        <h4 className="font-serif font-bold text-base text-foreground group-hover:text-primary transition-colors">
          {claim.title}
        </h4>
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {claim.statement}
        </p>

        {/* Conflicting Notice */}
        {claim.status === "conflicting" && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block font-mono text-[11px]">
                CONTRADICTORY DOCUMENT EVIDENCE
              </span>
              <span>{claim.inference_note || "Multiple source documents assert opposing parameters."}</span>
            </div>
          </div>
        )}

        {/* Citations Preview */}
        {claim.citations && claim.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-mono text-[11px] truncate flex-1">
              {claim.citations[0].document_path}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">
              chars {claim.citations[0].start_offset}..{claim.citations[0].end_offset}
            </span>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="pt-2 flex items-center justify-between text-xs border-t border-border/60">
        <span className="text-muted-foreground font-mono text-[11px]">
          Review: <strong className="uppercase">{claim.review_state}</strong>
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onInspect(claim);
          }}
          className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-xs"
        >
          <Search className="w-3.5 h-3.5" />
          Evidence Lens
        </button>
      </div>
    </div>
  );
}

