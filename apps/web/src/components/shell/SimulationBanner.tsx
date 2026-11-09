"use client";

import React from "react";
import { useSession } from "./SessionContext";
import { ShieldAlert, ArrowRight, Eye } from "lucide-react";

export function SimulationBanner() {
  const { persona, withheldCount, switchPersona } = useSession();

  if (persona.role === "lead") {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs md:text-sm text-amber-900 dark:text-amber-200">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>View-As Simulation:</strong> Viewing as{" "}
            <span className="font-semibold underline decoration-amber-500/50">{persona.name}</span>{" "}
            ({persona.badge}).
            {withheldCount > 0 ? (
              <span className="ml-1 text-amber-700 dark:text-amber-300 font-medium">
                🔒 {withheldCount} claims/sources are cryptographically withheld from this role by RLS & strictest-source choke point.
              </span>
            ) : null}
          </span>
        </div>
        <button
          onClick={() => switchPersona("lead")}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-100 font-medium text-xs transition border border-amber-500/40"
        >
          Return to Dr. Meera (Lead)
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

