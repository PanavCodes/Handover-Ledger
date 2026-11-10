"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "@/components/shell/SessionContext";
import { InterviewQuestion } from "@/lib/types";
import {
  MessageSquareMore,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  SkipForward,
  UserCheck,
  FileCheck2,
  HelpCircle,
} from "lucide-react";

const SAMPLE_ANSWERS: Record<string, string> = {
  "cron:nightly-backup":
    "Encrypted tarballs land on /mnt/nas-aurora/rover-backups with 14-day retention. To verify or restore: SSH to lab-vm and run `/opt/aurora/scripts/restore_snapshot.sh --latest --verify`. Free disk threshold alert is pending systemd timer setup.",
  "vault:rover-ops":
    "The 'rover-ops' vault is hosted in Bitwarden Organization ('Aurora-Robotics-Ops', admin: Dr. Meera Iyer). Rotate keys by generating a new token in telemetry gateway admin UI, updating secret TELEMETRY_API_KEY in Bitwarden, and running `systemctl restart aurora-telemetry-bridge`.",
  "domain:aurora-rover":
    "aurora-rover.example is registered on Cloudflare under team email infra@aurora-rover.example (2FA TOTP held in Bitwarden 'rover-ops'). Kabir Shah is designated billing owner to attach the club card before 2025-06-30.",
  "hardware:canbus_baud":
    "Competition rover hardware uses 115200 baud after the Feb bench upgrade; firmware/can_config.h (#define CAN_BAUD_RATE 57600) is an outdated pre-competition header that must be bumped to 115200 before flashing Spare Unit #2.",
};

export default function InterviewPage() {
  const { persona, switchPersona } = useSession();
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, answered: 0, skipped: 0 });
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [skipOpen, setSkipOpen] = useState<Record<string, boolean>>({});
  const [skipReasons, setSkipReasons] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; isError?: boolean } | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/interview");
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
        setSummary(data.summary || { total: 0, pending: 0, answered: 0, skipped: 0 });
      }
    } catch (err) {
      console.error("Failed to load interview questions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
    const handleRefresh = () => fetchQuestions();
    window.addEventListener("persona-changed", handleRefresh);
    window.addEventListener("demo-reset", handleRefresh);
    return () => {
      window.removeEventListener("persona-changed", handleRefresh);
      window.removeEventListener("demo-reset", handleRefresh);
    };
  }, [fetchQuestions]);

  const canAnswer = persona.role === "leaver" || persona.role === "lead";

  const handleSubmitAnswer = async (q: InterviewQuestion) => {
    const answerText = (drafts[q.id] || "").trim();
    if (answerText.length < 12) {
      setFeedback({
        id: q.id,
        msg: "Enter at least 12 characters so a verified citation document is created.",
        isError: true,
      });
      return;
    }

    setSubmittingId(q.id);
    setFeedback(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          questionId: q.id,
          answerText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ id: q.id, msg: data.error || "Failed to save answer.", isError: true });
        return;
      }
      setFeedback({
        id: q.id,
        msg: `Saved attested claim (${data.claim?.id}) & superseded missing gap.`,
      });
      fetchQuestions();
    } catch {
      setFeedback({ id: q.id, msg: "Network error submitting answer.", isError: true });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleSkipQuestion = async (q: InterviewQuestion) => {
    const skipReason = (skipReasons[q.id] || "").trim();
    if (skipReason.length < 4) {
      setFeedback({ id: q.id, msg: "Enter a brief reason before skipping.", isError: true });
      return;
    }

    setSubmittingId(q.id);
    setFeedback(null);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "skip",
          questionId: q.id,
          skipReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ id: q.id, msg: data.error || "Failed to skip.", isError: true });
        return;
      }
      setFeedback({ id: q.id, msg: "Recorded as Open Question in Handover Brief." });
      setSkipOpen((prev) => ({ ...prev, [q.id]: false }));
      fetchQuestions();
    } catch {
      setFeedback({ id: q.id, msg: "Network error skipping question.", isError: true });
    } finally {
      setSubmittingId(null);
    }
  };

  const resolvedCount = summary.answered + summary.skipped;
  const pct = summary.total > 0 ? Math.round((resolvedCount / summary.total) * 100) : 100;

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold uppercase">
              Gap-Driven Exit Interview
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold">
              {summary.pending} Open Gaps
            </span>
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Targeted Departing-Owner Interview Loop
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl mt-1 leading-relaxed">
            Deterministic gap rules scan repositories, cron jobs, vaults, and contradictions so the departing owner only answers high-signal undocumented questions — never generic blank forms.
          </p>
        </div>

        <div className="w-full md:w-56 space-y-2 p-4 rounded-xl bg-muted/40 border border-border">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Gap Resolution:</span>
            <span className="font-mono font-bold text-foreground">
              {resolvedCount}/{summary.total} ({pct}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <Link
            href="/ledger"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-1"
          >
            <span>Inspect Attested Claims in Ledger</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Role Notice for Successors */}
      {!canAnswer && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Viewing as {persona.name}:</strong> Interview answers are restricted to Rahul Mehta (Departing Owner) or Dr. Meera (Lead).
            </span>
          </div>
          <button
            onClick={() => switchPersona("leaver")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold transition"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Switch to Rahul Mehta to Answer</span>
          </button>
        </div>
      )}

      {/* Question Cards */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground text-xs font-mono">
          Scanning workspace for undocumented runbooks and conflicting claims...
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, index) => {
            const isAnswered = q.status === "answered";
            const isSkipped = q.status === "skipped";
            const sampleText = SAMPLE_ANSWERS[q.subject_key];

            return (
              <div
                key={q.id}
                className={`p-6 rounded-2xl border shadow-sm space-y-4 ${
                  isAnswered
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : isSkipped
                      ? "bg-muted/30 border-border"
                      : "bg-card border-border"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      Q{index + 1}
                    </span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      {q.gap_rule}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      subject: {q.subject_key}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                      isAnswered
                        ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        : isSkipped
                          ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                          : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    }`}
                  >
                    {q.status}
                  </span>
                </div>

                <h3 className="font-serif text-base md:text-lg font-bold text-foreground leading-snug">
                  {q.question}
                </h3>

                {/* Why am I being asked? */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-start gap-2.5 text-xs text-muted-foreground">
                  <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground">Why am I being asked? </strong>
                    <span>{q.why_asked}</span>
                  </div>
                </div>

                {feedback?.id === q.id && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-medium ${
                      feedback.isError
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {feedback.msg}
                  </div>
                )}

                {isAnswered ? (
                  <div className="p-4 rounded-xl bg-card border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs text-emerald-500 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4" />
                        Attested Answer Converted to Verified Claim ({q.resulting_claim_id})
                      </span>
                      <Link href="/ledger" className="underline">
                        Inspect in Ledger &rarr;
                      </Link>
                    </div>
                    <p className="text-xs font-mono text-foreground leading-relaxed">
                      {q.answer_text}
                    </p>
                  </div>
                ) : isSkipped ? (
                  <div className="p-3 rounded-xl bg-card border border-border text-xs text-muted-foreground">
                    Skipped with Open Question recorded: <strong>{q.skip_reason}</strong>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      rows={3}
                      disabled={!canAnswer}
                      value={drafts[q.id] || ""}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Write the exact procedure, host/vault location, or owner name..."
                      className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                    />

                    {skipOpen[q.id] && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={skipReasons[q.id] || ""}
                          onChange={(e) =>
                            setSkipReasons((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder="Reason for skipping (e.g. Needs vendor confirmation first)..."
                          className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border text-xs"
                        />
                        <button
                          type="button"
                          disabled={submittingId === q.id || !canAnswer}
                          onClick={() => handleSkipQuestion(q)}
                          className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                        >
                          Save as Open Question
                        </button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        {sampleText && canAnswer && (
                          <button
                            type="button"
                            onClick={() =>
                              setDrafts((prev) => ({ ...prev, [q.id]: sampleText }))
                            }
                            className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[11px] font-semibold transition"
                          >
                            Fill Sample Demo Answer
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!canAnswer}
                          onClick={() =>
                            setSkipOpen((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                          }
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-xs text-muted-foreground transition disabled:opacity-50"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                          <span>Skip / Defer</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={!canAnswer || submittingId === q.id}
                        onClick={() => handleSubmitAnswer(q)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition shadow disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {submittingId === q.id ? "Creating Claim..." : "Attest & Verify Claim"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

