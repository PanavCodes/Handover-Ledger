"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  ShieldCheck,
  ShieldAlert,
  RotateCw,
  Lock,
  CheckCircle2,
  AlertOctagon,
  Hash,
  Database,
  Terminal,
} from "lucide-react";
import { AuditRecord, AuditHeadAnchor } from "@/lib/types";

export default function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [headAnchor, setHeadAnchor] = useState<AuditHeadAnchor | null>(null);
  const [verification, setVerification] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [tampered, setTampered] = useState(false);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit");
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        setHeadAnchor(data.headAnchor || null);
        setVerification(data.verification || null);
      }
    } catch (err) {
      console.error("Failed to load audit:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
    const handleRefresh = () => fetchAudit();
    window.addEventListener("demo-reset", handleRefresh);
    return () => window.removeEventListener("demo-reset", handleRefresh);
  }, []);

  const displayVerification = tampered
    ? {
        valid: false,
        recordCount: records.length,
        message:
          "SIMULATED ATTACK: Interior payload byte mutated in block #2! SHA-256 hash mismatch between block #2 and block #3.",
      }
    : verification;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
              Tamper-Evident Ledger
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
              Cerberus Pattern
            </span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Cryptographic Audit Chain Inspector
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl mt-1 leading-relaxed">
            Every workspace action (source ingest, claim extraction, leaver attestation, review approval)
            is appended to a head-anchored SHA-256 hash chain with external anchor to catch tail truncation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTampered(!tampered)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
              tampered
                ? "bg-rose-600 text-white border-rose-700 hover:bg-rose-700"
                : "bg-muted hover:bg-muted/80 text-foreground border-border"
            }`}
          >
            {tampered ? "Remove Simulated Tamper" : "Simulate Tamper Attack"}
          </button>

          <button
            disabled={loading}
            onClick={fetchAudit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Verify Chain</span>
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          displayVerification?.valid
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100"
            : "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {displayVerification?.valid ? (
              <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0" />
            )}
            <div>
              <h3 className="font-serif font-bold text-base">
                {displayVerification?.valid
                  ? "Audit Chain Integrity Verified: 100% Intact"
                  : "Chain Integrity Compromised / Tamper Detected!"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {displayVerification?.valid
                  ? `Verified all ${records.length} sequential blocks against head anchor ${headAnchor?.expected_head_hash?.slice(0, 12)}...`
                  : displayVerification?.message || displayVerification?.errors?.join(" | ") || "Verification pending..."}
              </p>
            </div>
          </div>

          <div className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-card/60 border border-border">
            Head Anchor: {records.length}/{headAnchor?.expected_count || records.length} Blocks
          </div>
        </div>
      </div>

      {/* Audit Blocks Timeline */}
      <div className="space-y-4">
        <h3 className="font-serif font-bold text-lg text-foreground">
          Sequential Cryptographic Chain Blocks ({records.length})
        </h3>

        <div className="space-y-3 font-mono text-xs">
          {records.map((r, idx) => {
            const isCorrupted = tampered && r.seq === 2;

            return (
              <div
                key={r.id || r.seq}
                className={`p-5 rounded-xl border transition-all bg-card shadow-sm ${
                  isCorrupted
                    ? "border-rose-500 bg-rose-500/5 ring-1 ring-rose-500"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[11px]">
                      BLOCK #{r.seq}
                    </span>
                    <span className="font-bold text-foreground font-sans text-sm">
                      {r.action}
                    </span>
                    {isCorrupted && (
                      <span className="px-2 py-0.5 rounded bg-rose-500 text-white font-bold text-[10px]">
                        TAMPERED PAYLOAD
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                    <span>Actor: {r.actor}</span>
                    <span>•</span>
                    <span>{new Date(r.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">
                      Previous Block Hash (prev_hash):
                    </span>
                    <span className="text-muted-foreground break-all">
                      {r.prev_hash || "0000000000000000000000000000000000000000000000000000000000000000"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">
                      Current Record Hash (record_hash):
                    </span>
                    <span className={`break-all font-bold ${isCorrupted ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {isCorrupted ? "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" : r.record_hash}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/40">
                  <span className="text-muted-foreground block text-[10px] uppercase mb-1">
                    Payload Data:
                  </span>
                  <pre className="p-2.5 rounded bg-muted/40 border border-border text-[11px] overflow-x-auto text-foreground/90 max-h-32">
                    {JSON.stringify(r.payload, null, 2)}
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

