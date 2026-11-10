"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "../shell/SessionContext";
import { AttestationState } from "@/lib/types";
import { CheckCircle2, ShieldCheck, PenTool, UserCheck } from "lucide-react";

interface LeaverAttestationProps {
  onUpdated?: () => void;
}

export function LeaverAttestation({ onUpdated }: LeaverAttestationProps) {
  const { persona, switchPersona } = useSession();
  const [attestation, setAttestation] = useState<AttestationState | null>(null);
  const [signing, setSigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAttestation = useCallback(async () => {
    try {
      const res = await fetch("/api/attest");
      if (res.ok) {
        const data = await res.json();
        setAttestation(data.attestation || null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadAttestation();
    const refresh = () => loadAttestation();
    window.addEventListener("persona-changed", refresh);
    window.addEventListener("demo-reset", refresh);
    return () => {
      window.removeEventListener("persona-changed", refresh);
      window.removeEventListener("demo-reset", refresh);
    };
  }, [loadAttestation]);

  const handleAttest = async () => {
    setSigning(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "leaver" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to record attestation.");
        return;
      }
      setAttestation(data.attestation);
      if (onUpdated) onUpdated();
    } catch {
      setErrorMsg("Network error signing attestation.");
    } finally {
      setSigning(false);
    }
  };

  const attested = Boolean(attestation?.leaver_attested);
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
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif font-bold text-base text-foreground">
              Leaver Approval Gate (Attestation Receipt)
            </h3>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                attested
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              {attested ? "Attested & SHA-256 Sealed" : "Pending Leaver Signature"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            {attested
              ? `Rahul Mehta signed this snapshot (${attestation?.leaver_signature_hash?.slice(0, 14)}...) and appended a cryptographic block to the Audit Chain.`
              : "The departing owner (Rahul Mehta) must review extracted claims and formally attest before final sign-off."}
          </p>
          {errorMsg && <p className="text-xs text-rose-500 font-medium mt-1">{errorMsg}</p>}
        </div>
      </div>

      <div className="shrink-0">
        {attested ? (
          <div className="text-left md:text-right text-xs">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
              Signed by {attestation?.leaver_name || "Rahul Mehta"}
            </span>
            <span className="block text-[10px] font-mono text-muted-foreground mt-1">
              Hash: {attestation?.leaver_signature_hash?.slice(0, 16)}...
            </span>
          </div>
        ) : isLeaver ? (
          <button
            disabled={signing}
            onClick={handleAttest}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition shadow bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
          >
            <PenTool className={`w-4 h-4 ${signing ? "animate-spin" : ""}`} />
            <span>{signing ? "Sealing Audit Block..." : "Attest & Sign Ledger"}</span>
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
              Awaiting Rahul Mehta
            </span>
            <button
              onClick={() => switchPersona("leaver")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-xs font-semibold text-foreground transition"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Switch to Rahul to Sign</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
