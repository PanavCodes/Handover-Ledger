"use client";

import React, { useEffect, useState } from "react";
import { Claim, Citation, Document } from "@/lib/types";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  ExternalLink,
  Lock,
  Search,
  Sparkles,
  GitCompare,
} from "lucide-react";

interface EvidenceLensProps {
  claim: Claim | null;
  onClose: () => void;
  onClaimUpdated?: (claim: Claim) => void;
}

export function EvidenceLens({ claim, onClose, onClaimUpdated }: EvidenceLensProps) {
  const [activeTab, setActiveTab] = useState<"document" | "rejections">("document");
  const [selectedCitationIndex, setSelectedCitationIndex] = useState(0);
  const [docContent, setDocContent] = useState<Document | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [rejections, setRejections] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch document when claim citation changes
  useEffect(() => {
    if (!claim || !claim.citations || claim.citations.length === 0) {
      setDocContent(null);
      return;
    }

    const citation = claim.citations[selectedCitationIndex] || claim.citations[0];
    if (!citation || !citation.document_id) return;

    setDocLoading(true);
    setDocError(null);

    fetch(`/api/documents/${citation.document_id}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("Access Denied: This document is restricted in your current role.");
          }
          throw new Error("Document could not be retrieved.");
        }
        return res.json();
      })
      .then((data) => {
        setDocContent(data.document);
      })
      .catch((err) => {
        setDocError(err.message);
        setDocContent(null);
      })
      .finally(() => {
        setDocLoading(false);
      });
  }, [claim, selectedCitationIndex]);

  // Fetch rejections for the diff viewer tab
  useEffect(() => {
    fetch("/api/rejections")
      .then((res) => res.json())
      .then((data) => setRejections(data.rejections || []))
      .catch((err) => console.error("Failed to load rejections:", err));
  }, []);

  if (!claim) return null;

  const currentCitation: Citation | undefined =
    claim.citations && claim.citations.length > 0
      ? claim.citations[selectedCitationIndex] || claim.citations[0]
      : undefined;

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}/approve`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (onClaimUpdated) onClaimUpdated(data.claim);
      }
    } catch (err) {
      console.error("Failed to approve claim:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}/reject`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (onClaimUpdated) onClaimUpdated(data.claim);
      }
    } catch (err) {
      console.error("Failed to reject claim:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Render document text with glowing highlight over exact character offsets
  const renderDocumentWithHighlight = () => {
    if (!docContent || !docContent.content) {
      return (
        <div className="p-8 text-center text-muted-foreground font-mono text-xs">
          No document content loaded.
        </div>
      );
    }

    if (!currentCitation || currentCitation.start_offset < 0) {
      return (
        <pre className="font-mono text-xs p-4 leading-relaxed whitespace-pre-wrap select-text">
          {docContent.content}
        </pre>
      );
    }

    const start = Math.max(0, currentCitation.start_offset);
    const end = Math.min(docContent.content.length, currentCitation.end_offset);

    const before = docContent.content.slice(0, start);
    const quote = docContent.content.slice(start, end);
    const after = docContent.content.slice(end);

    return (
      <div className="font-mono text-xs leading-relaxed p-4 select-text">
        <span className="text-muted-foreground whitespace-pre-wrap">{before}</span>
        <mark className="bg-amber-400/30 text-amber-200 border-y border-amber-500 font-semibold px-1 rounded shadow-sm inline-block">
          <span className="text-[10px] uppercase font-mono px-1 py-0.2 bg-amber-500/80 text-black font-bold rounded mr-1">
            Verified Quote
          </span>
          {quote}
        </mark>
        <span className="text-muted-foreground whitespace-pre-wrap">{after}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-6xl h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base md:text-lg">
                  Evidence Lens
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                  ID: {claim.id}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Deterministic 1:1 character-offset citation verification engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-muted p-0.5 rounded-lg border border-border text-xs">
              <button
                onClick={() => setActiveTab("document")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                  activeTab === "document"
                    ? "bg-background text-foreground shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Verified Source</span>
              </button>
              <button
                onClick={() => setActiveTab("rejections")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                  activeTab === "rejections"
                    ? "bg-background text-rose-500 shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GitCompare className="w-3.5 h-3.5 text-rose-500" />
                <span>Hallucination Diff ({rejections.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left Pane: Claim Details & Citations (42% width) */}
          <div className="w-full md:w-5/12 overflow-y-auto p-6 space-y-6 bg-card/60">
            {/* Claim Title & Status */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span
                  className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-medium uppercase border ${
                    claim.status === "verified"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : claim.status === "conflicting"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  }`}
                >
                  {claim.status}
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border uppercase">
                  {claim.type}
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  v{claim.version} • {claim.origin}
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground leading-snug">
                {claim.title}
              </h3>
              <p className="mt-2 text-sm text-foreground/90 bg-muted/30 p-3 rounded-lg border border-border leading-relaxed">
                {claim.statement}
              </p>
            </div>

            {/* Confidence Meter */}
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Verifier Confidence Score:</span>
                <span className="font-mono font-bold text-foreground">
                  {Math.round(claim.confidence * 100)}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    claim.confidence >= 0.8
                      ? "bg-emerald-500"
                      : claim.confidence >= 0.5
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${Math.round(claim.confidence * 100)}%` }}
                />
              </div>
              {claim.inference_note && (
                <p className="text-[11px] text-muted-foreground italic mt-1">
                  Note: {claim.inference_note}
                </p>
              )}
            </div>

            {/* Citations List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                  Source Citations ({claim.citations?.length || 0})
                </h4>
              </div>
              {claim.citations && claim.citations.length > 0 ? (
                <div className="space-y-2">
                  {claim.citations.map((cit, idx) => (
                    <div
                      key={cit.id}
                      onClick={() => setSelectedCitationIndex(idx)}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        selectedCitationIndex === idx
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-card border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-mono font-medium truncate max-w-[200px] text-foreground">
                          {cit.document_path || "source.md"}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          chars {cit.start_offset}..{cit.end_offset}
                        </span>
                      </div>
                      <blockquote className="text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-2 line-clamp-2">
                        &ldquo;{cit.quote}&rdquo;
                      </blockquote>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-mono">Support: {Math.round(cit.support_score * 100)}%</span>
                        {cit.verified ? (
                          <span className="text-emerald-500 flex items-center gap-1 font-mono text-[10px]">
                            <ShieldCheck className="w-3 h-3" /> Exact Match
                          </span>
                        ) : (
                          <span className="text-amber-500 flex items-center gap-1 font-mono text-[10px]">
                            <AlertTriangle className="w-3 h-3" /> Unverified
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground text-center">
                  No source citations recorded for this claim.
                </div>
              )}
            </div>

            {/* Review Status & Approval Controls */}
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Review State:</span>
                <span
                  className={`font-mono font-semibold uppercase px-2 py-0.5 rounded text-[11px] ${
                    claim.review_state === "approved"
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : claim.review_state === "rejected"
                      ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {claim.review_state}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={actionLoading || claim.review_state === "approved"}
                  onClick={handleApprove}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Approve Claim
                </button>
                <button
                  disabled={actionLoading || claim.review_state === "rejected"}
                  onClick={handleReject}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject Claim
                </button>
              </div>
            </div>
          </div>

          {/* Right Pane: Document Viewer OR Rejections Diff (58% width) */}
          <div className="w-full md:w-7/12 flex flex-col bg-background/50 overflow-hidden">
            {activeTab === "document" ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Document Metadata Bar */}
                <div className="px-4 py-2.5 border-b border-border bg-card/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-mono font-medium truncate text-foreground">
                      {docContent?.path || currentCitation?.document_path || "Loading document..."}
                    </span>
                  </div>
                  {docContent?.source_id && (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase border border-border">
                      Source: {docContent.source_id}
                    </span>
                  )}
                </div>

                {/* Document Content Scroll Area */}
                <div className="flex-1 overflow-y-auto">
                  {docLoading ? (
                    <div className="p-12 text-center text-muted-foreground space-y-2">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-mono">Loading source document from storage...</p>
                    </div>
                  ) : docError ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
                        <Lock className="w-5 h-5" />
                      </div>
                      <h4 className="font-serif font-bold text-sm text-foreground">
                        Document Access Restricted
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {docError}
                      </p>
                    </div>
                  ) : (
                    renderDocumentWithHighlight()
                  )}
                </div>
              </div>
            ) : (
              /* Hallucination Diff Viewer (citefact pattern) */
              <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4 overflow-y-auto">
                <div>
                  <h4 className="font-serif font-bold text-base text-foreground">
                    Deterministic Rejection Engine (citefact & juricode pattern)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    When the extraction LLM attempts to fabricate, distort, or hallucinate quotes, the
                    deterministic verifier rejects the claim with word-level strike-through diffs.
                  </p>
                </div>

                {rejections.length > 0 ? (
                  <div className="space-y-4">
                    {rejections.map((rej) => (
                      <div
                        key={rej.id}
                        className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-rose-500 uppercase flex items-center gap-1.5">
                            <XCircle className="w-4 h-4" />
                            {rej.reason}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(rej.created_at).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="text-xs space-y-1">
                          <span className="text-muted-foreground font-mono text-[11px] block">
                            Candidate Claim Statement:
                          </span>
                          <p className="font-medium text-foreground bg-card/80 p-2.5 rounded border border-border">
                            {rej.proposed?.statement || "No statement text"}
                          </p>
                        </div>

                        {rej.diff_analysis?.diff_html ? (
                          <div className="text-xs space-y-1">
                            <span className="text-muted-foreground font-mono text-[11px] block">
                              Word-Level Diff Analysis:
                            </span>
                            <div
                              className="font-mono text-xs p-3 rounded bg-card/90 border border-border leading-relaxed [&_del]:bg-rose-500/20 [&_del]:text-rose-400 [&_del]:line-through [&_ins]:bg-emerald-500/20 [&_ins]:text-emerald-400 [&_ins]:no-underline"
                              dangerouslySetInnerHTML={{ __html: rej.diff_analysis.diff_html }}
                            />
                          </div>
                        ) : null}

                        {rej.diff_analysis?.hallucinated_words &&
                        rej.diff_analysis.hallucinated_words.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Hallucinated tokens:
                            </span>
                            {rej.diff_analysis.hallucinated_words.map((w: string, i: number) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-mono text-[10px] line-through"
                              >
                                {w}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-xs font-mono">
                    No unverified rejections recorded yet.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

