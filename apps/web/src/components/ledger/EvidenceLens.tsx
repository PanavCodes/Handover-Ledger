"use client";

import React, { useEffect, useState, useRef } from "react";
import { Claim, Citation, Document, ClaimVersion } from "@/lib/types";
import { useSession } from "@/components/shell/SessionContext";
import {
  X,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  Lock,
  Search,
  GitCompare,
  Edit3,
  History,
  Save,
} from "lucide-react";

interface EvidenceLensProps {
  claim: Claim | null;
  onClose: () => void;
  onClaimUpdated?: (claim: Claim) => void;
}

export function EvidenceLens({ claim, onClose, onClaimUpdated }: EvidenceLensProps) {
  const { persona } = useSession();
  const [activeTab, setActiveTab] = useState<"document" | "rejections" | "versions">("document");
  const [selectedCitationIndex, setSelectedCitationIndex] = useState(0);
  const [docContent, setDocContent] = useState<Document | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [rejections, setRejections] = useState<any[]>([]);
  const [versions, setVersions] = useState<ClaimVersion[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editStatement, setEditStatement] = useState("");
  const [editStatus, setEditStatus] = useState<Claim["status"]>("verified");
  const [editNote, setEditNote] = useState("");

  const highlightRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!claim) return;
    setSelectedCitationIndex(0);
    setEditing(false);
    setActionError(null);
    setEditTitle(claim.title);
    setEditStatement(claim.statement);
    setEditStatus(claim.status);
    setEditNote(claim.inference_note || "");

    fetch(`/api/claims/${claim.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.versions) setVersions(data.versions);
        else setVersions([]);
      })
      .catch(() => setVersions([]));
  }, [claim]);

  useEffect(() => {
    if (!claim || !claim.citations || claim.citations.length === 0) {
      setDocContent(null);
      setDocError(null);
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

  useEffect(() => {
    if (docContent && activeTab === "document" && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
    }
  }, [docContent, selectedCitationIndex, activeTab]);

  useEffect(() => {
    fetch("/api/rejections")
      .then((res) => res.json())
      .then((data) => setRejections(data.rejections || []))
      .catch((err) => console.error("Failed to load rejections:", err));
  }, [claim]);

  if (!claim) return null;

  const isLead = persona.role === "lead";
  const canEdit = persona.role === "lead" || persona.role === "leaver";

  const currentCitation: Citation | undefined =
    claim.citations && claim.citations.length > 0
      ? claim.citations[selectedCitationIndex] || claim.citations[0]
      : undefined;

  const handleApprove = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/claims/${claim.id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to approve claim.");
        return;
      }
      if (onClaimUpdated && data.claim) onClaimUpdated(data.claim);
    } catch {
      setActionError("Network error approving claim.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/claims/${claim.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Marked unapproved during Lead triage" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to reject claim.");
        return;
      }
      if (onClaimUpdated && data.claim) onClaimUpdated(data.claim);
    } catch {
      setActionError("Network error rejecting claim.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/claims/${claim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          statement: editStatement,
          status: editStatus,
          inference_note: editNote,
          ...(isLead && editStatus === "verified" ? { review_state: "approved" } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to update claim.");
        return;
      }
      if (data.versions) setVersions(data.versions);
      if (onClaimUpdated && data.claim) onClaimUpdated(data.claim);
      setEditing(false);
    } catch {
      setActionError("Network error saving claim edit.");
    } finally {
      setActionLoading(false);
    }
  };

  const renderDocumentWithHighlight = () => {
    if (!docContent || !docContent.content) {
      return (
        <div className="p-8 text-center text-muted-foreground font-mono text-xs">
          No source document linked to this claim yet (coverage gap or ungrounded draft).
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
    const startLine = before.split("\n").length;

    return (
      <div className="font-mono text-xs leading-relaxed p-5 select-text space-y-2">
        <div className="text-[10px] text-muted-foreground pb-2 border-b border-border flex items-center justify-between">
          <span>
            Offset Verified: chars <strong>{start}..{end}</strong> (starts line {startLine})
          </span>
          <span>SHA-256 Content Anchor: {docContent.content_hash}</span>
        </div>
        <div className="whitespace-pre-wrap">
          <span className="text-muted-foreground">{before}</span>
          <mark
            ref={highlightRef}
            className="bg-amber-300/70 dark:bg-amber-400/25 text-amber-950 dark:text-amber-100 border-y-2 border-amber-500 font-semibold px-1 py-0.5 rounded shadow-sm"
          >
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-amber-500 text-black font-bold rounded mr-1.5 select-none">
              Verified Span
            </span>
            {quote}
          </mark>
          <span className="text-muted-foreground">{after}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-card">
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
                  {claim.id}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                1:1 character-offset citation verifier &amp; claim revision ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
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
                <span>Source</span>
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
                <span>Diffs ({rejections.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("versions")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                  activeTab === "versions"
                    ? "bg-background text-primary shadow-sm font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="w-3.5 h-3.5 text-primary" />
                <span>Versions ({Math.max(versions.length, claim.version)})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Evidence Lens"
              className="p-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left Pane: Claim Details & Review */}
          <div className="w-full md:w-5/12 overflow-y-auto p-6 space-y-5 bg-card/60">
            {actionError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 font-medium">
                {actionError}
              </div>
            )}

            {/* Badges & Edit Toggle */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-1.5">
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
                    v{claim.version}
                  </span>
                </div>

                {canEdit && (
                  <button
                    onClick={() => setEditing(!editing)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{editing ? "Cancel" : "Edit / Resolve"}</span>
                  </button>
                )}
              </div>

              {editing ? (
                <form onSubmit={handleSaveEdit} className="space-y-3 p-3.5 rounded-xl bg-muted/40 border border-border">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-card border border-border text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">
                      Statement
                    </label>
                    <textarea
                      rows={3}
                      value={editStatement}
                      onChange={(e) => setEditStatement(e.target.value)}
                      className="w-full p-2.5 rounded bg-card border border-border text-xs"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">
                        Verification Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as Claim["status"])}
                        className="w-full px-2 py-1.5 rounded bg-card border border-border text-xs font-mono"
                      >
                        <option value="verified">verified (resolved)</option>
                        <option value="conflicting">conflicting</option>
                        <option value="inferred">inferred</option>
                        <option value="missing">missing</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-muted-foreground block mb-1">
                        Resolution Note
                      </label>
                      <input
                        type="text"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Optional note..."
                        className="w-full px-2.5 py-1.5 rounded bg-card border border-border text-xs"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Revision (Creates v{claim.version + 1})</span>
                  </button>
                </form>
              ) : (
                <>
                  <h3 className="font-serif text-lg font-bold text-foreground leading-snug">
                    {claim.title}
                  </h3>
                  <p className="mt-2 text-sm text-foreground/90 bg-muted/30 p-3 rounded-lg border border-border leading-relaxed">
                    {claim.statement}
                  </p>
                </>
              )}
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
              <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Source Citations ({claim.citations?.length || 0})
              </h4>
              {claim.citations && claim.citations.length > 0 ? (
                <div className="space-y-2">
                  {claim.citations.map((cit, idx) => (
                    <div
                      key={cit.id}
                      onClick={() => {
                        setSelectedCitationIndex(idx);
                        setActiveTab("document");
                      }}
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
                  No source citations recorded (missing gap awaiting interview answer).
                </div>
              )}
            </div>

            {/* Review Status & Lead Controls */}
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

              {isLead ? (
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
              ) : (
                <p className="text-[11px] font-mono text-muted-foreground text-center p-2 rounded bg-muted/30 border border-border">
                  Only Project Lead (Dr. Meera) can formally approve or reject ledger claims.
                </p>
              )}
            </div>
          </div>

          {/* Right Pane: Source Viewer OR Diffs OR Version History */}
          <div className="w-full md:w-7/12 flex flex-col bg-background/50 overflow-hidden">
            {activeTab === "document" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-card/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-mono font-medium truncate text-foreground">
                      {docContent?.path || currentCitation?.document_path || "No linked document"}
                    </span>
                  </div>
                  {docContent?.source_id && (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase border border-border">
                      Source: {docContent.source_id}
                    </span>
                  )}
                </div>

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
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">{docError}</p>
                    </div>
                  ) : (
                    renderDocumentWithHighlight()
                  )}
                </div>
              </div>
            )}

            {activeTab === "rejections" && (
              <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-4">
                <div>
                  <h4 className="font-serif font-bold text-base text-foreground">
                    Deterministic Rejection Engine (Word-Level Diffs)
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Candidate AI claims whose quotes fail exact character verification or contain secret tokens are quarantined here rather than entering the ledger.
                  </p>
                </div>

                {rejections.length > 0 ? (
                  <div className="space-y-4">
                    {rejections.map((rej) => (
                      <div
                        key={rej.id}
                        className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-mono font-bold text-rose-500 uppercase flex items-center gap-1.5">
                            <XCircle className="w-4 h-4 shrink-0" />
                            {rej.reason}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">
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

                        {rej.diff_analysis?.diff_html && (
                          <div className="text-xs space-y-1">
                            <span className="text-muted-foreground font-mono text-[11px] block">
                              Word-Level Diff Analysis:
                            </span>
                            <div
                              className="font-mono text-xs p-3 rounded bg-card/90 border border-border leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: rej.diff_analysis.diff_html }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-xs font-mono">
                    No unverified rejections visible in this role scope.
                  </div>
                )}
              </div>
            )}

            {activeTab === "versions" && (
              <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-4">
                <div>
                  <h4 className="font-serif font-bold text-base text-foreground">
                    Non-Destructive Claim Version History
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Every edit, approval, or rejection records an immutable version snapshot linked to the audit chain.
                  </p>
                </div>

                {versions.length > 0 ? (
                  <div className="space-y-3">
                    {versions.map((v) => (
                      <div key={v.id} className="p-4 rounded-xl bg-card border border-border space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-primary">
                            v{v.version} • {v.change_type}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {v.changed_by} • {new Date(v.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground">{v.snapshot?.title}</p>
                        <p className="text-muted-foreground">{v.snapshot?.statement}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-card border border-border text-xs space-y-1">
                    <span className="font-mono font-bold text-primary">
                      v{claim.version} • initial_seed
                    </span>
                    <p className="text-muted-foreground">
                      Captured by {claim.captured_by || "System"} • Edit or approve this claim to append revision snapshots.
                    </p>
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
