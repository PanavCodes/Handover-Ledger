"use client";

import React, { useState } from "react";
import { useSession } from "../shell/SessionContext";
import { CheckCircle2, ShieldCheck, PenTool, Sparkles, Clock } from "lucide-react";

export function LeaverAttestation() {
  const { persona } = useSession();
  const [attested, setAttested] = useState(false);
  const [signing, setSigning] = useState(false);

  const handleAttest = async () => {
    setSigning(true);
    try {
      // Simulate cryptographic attestation write
      await new Promise((r) => setTimeout(r, 600));
      setAttested(true);
    } finally {
      setSigning(false);
    }
  };

  const isLeaver = persona.role === "leaver";

  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
            attested
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
              : "bg-amber-500/10 border-amber-500/30 text-amber-500"
          }`}
        >
          {attested ? <ShieldCheck className="w-6 h-6" /> : <PenTool className="w-6 h-6" />}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-base text-foreground">
              Leaver Approval Gate (ServiceNow & OakHive Pattern)
            </h3>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                attested
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              {attested ? "Attested & Signed" : "Pending Leaver Signature"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            {attested
              ? "Rahul Mehta verified and cryptographically signed this ledger snapshot. All claims, undocumented scripts, and bus-factor notes are attested."
              : "The departing teammate must review and attest to the reconstructed knowledge ledger before formal handover sign-off by the Project Lead."}
          </p>
        </div>
      </div>

      <div>
        {isLeaver ? (
          <button
            disabled={attested || signing}
            onClick={handleAttest}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition shadow border ${
              attested
                ? "bg-emerald-600/20 text-emerald-500 border-emerald-600/30 cursor-default"
                : "bg-primary hover:bg-primary/90 text-primary-foreground border-primary"
            }`}
          >
            {attested ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Signed by Rahul Mehta</span>
              </>
            ) : (
              <>
                <PenTool className={`w-4 h-4 ${signing ? "animate-spin" : ""}`} />
                <span>{signing ? "Signing..." : "Attest & Sign Ledger"}</span>
              </>
            )}
          </button>
        ) : (
          <div className="text-right text-xs text-muted-foreground">
            <span className="block font-mono text-[11px] text-foreground font-semibold">
              Signed by Rahul Mehta
            </span>
            <span className="text-[10px] opacity-75">SHA-256 Sig Verified</span>
          </div>
        )}
      </div>
    </div>
  );
}

