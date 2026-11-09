# 01. Product Requirements Document

## 1. One-line pitch
Handover Ledger rebuilds what a departing teammate knows into **evidence-linked, role-scoped claims** and hands the successor a **signed, prioritised 30-day plan**, with no hallucinated summaries and no confidential leaks.

## 2. Problem
When someone leaves a small team (graduation, internship end, resignation, rotation) three things go wrong:
1. **Tacit knowledge vanishes**: why decisions were made, what was tried and dropped, who the vendor contact is, which cron job nobody documented.
2. **Documentation rots**: wikis and READMEs are written once and become stale.
3. **AI summaries are untrustworthy**: they hallucinate, smooth over contradictions, lose source grounding and ignore confidentiality.

**Target users:** student clubs, research labs, seed-stage startups working in GitHub, Markdown/Docs, task boards and chat exports.

## 3. Personas
| Persona | Goal | Fear |
|---|---|---|
| **Rahul, departing member** | Leave in 5 minutes without guilt | Forgetting the one thing that breaks prod |
| **Dr. Meera, project lead** | Know what is true before release | Approving a wrong claim; leaking credentials context |
| **Ananya, successor (Core Dev)** | Know what to do on Day 1 | Drowning in 400 files |
| **Kabir, successor (Coordinator)** | See vendor contacts and deadlines, not code secrets | Being blocked from what he needs, or seeing what he shouldn't |
| **Org admin** | Proof of who saw/approved what | Silent leaks, no audit |

## 4. Feature list

### 4.1 Core product (from the Round 1 blueprint)
| ID | Feature | Scope |
|---|---|---|
| F1 | Multi-source ingestion: GitHub repo (REST), Markdown/text, task export (CSV/JSON), chat export, meeting notes, `git log` export | R2 |
| F2 | Sensitivity label + allowed roles on every source at upload (upload blocked until set) | R2 |
| F3 | Evidence-linked claim engine: atomic claims with verbatim span citations, auto string-verified | R2 |
| F4 | Status badges: Verified / Inferred / Conflicting / Missing, with confidence | R2 |
| F5 | Lead review console: approve / edit / reject / add claim; version history per claim | R2 |
| F6 | Single-role export of a handover package (Markdown, JSON, print-to-PDF) | R2 |
| F7 | Side-by-side citation viewer ("Evidence Lens") | R2 |
| F8 | Gap-driven leaver interview (5-10 questions, each says why it is asked) | R3 |
| F9 | Automated conflict detection and conflict resolver | R3 |
| F10 | Multi-role redaction (admin, lead, leaver, successor-core, successor-coordinator) | R3 |
| F11 | 30-day continuation roadmap (Day-1 / Week-1 / Month-1) | R2 basic, R3 full |
| F12 | Successor acknowledgement with signed, hash-verifiable receipt | R3 |
| F13 | Hash-chained audit log + verify button | R3 (table in R2) |

### 4.2 Differentiators [WOW]
| ID | Feature | Why it wins |
|---|---|---|
| W1 | **Evidence Lens**: click a claim, the source opens with the exact span highlighted and scrolled into view | Makes "no hallucination" visible in 2 seconds |
| W2 | **View-As**: lead previews exactly what a given successor will see (server-enforced, audited) | Proves role scoping to judges live |
| W3 | **Leak Canary**: one click runs seeded secret strings against every role and endpoint; shows a green/red matrix | Turns "zero leakage" from a claim into a test result |
| W4 | **Knowledge Constellation**: interactive graph of people, components, risks; orphaned components glow | Immediate bus-factor intuition |
| W5 | **Handover Readiness Score** (0-100) with transparent formula and "what to fix next" list | Gives the lead a goal and a progress bar |
| W6 | **Ask the Ledger**: role-scoped Q&A that only answers from visible claims, always cites, refuses otherwise | Useful, safe, and demo-friendly |
| W7 | **Tamper-evident audit chain** + signed receipts (Ed25519) | Governance story is real cryptography |
| W8 | Command palette (Cmd/Ctrl+K), keyboard-first review (J/K/A/R/E) | Feels like a pro tool |

## 5. User stories and acceptance criteria (R2 focus)
**US-1 Upload with labels.** As a lead I upload a source and must pick sensitivity + allowed roles.
- Given no label chosen, the Upload button is disabled and the API returns 422 if called directly.
- Given a valid upload, a job appears with live progress (queued, parsing, embedding, extracting, verifying, done).

**US-2 Live repo ingestion.** As a lead I paste `https://github.com/org/repo` (public or with a token).
- The system fetches the file tree (filtered), README/docs, last 100 commits, open and closed PRs and issues (capped), stores them as documents with stable offsets.
- Rate-limit and failure states are shown in the UI; partial ingestion is resumable.

**US-3 Claims with citations.** After extraction the ledger lists atomic claims.
- Every claim has type, title, statement, status, confidence and 1-3 citations.
- 100% of citations marked verified have a quote that exists verbatim (whitespace/quote-normalised) in the stored document and a computed offset range.
- Claims whose quotes fail verification are **not shown** in the ledger and appear in an admin "Rejected by verifier" list with the reason.

**US-4 Evidence Lens.** Clicking a citation opens the document at the highlighted span; the claim stays visible on the left; keyboard-navigable between citations.

**US-5 Review.** Lead can approve, edit, reject, add. Each change creates a version row (who, when, before/after). Bulk-approve works only on Verified claims.

**US-6 Single-role export.** Lead picks a successor + role scope; the export contains only claims that scope may read, with citations as footnotes. Download as `.md` and `.json`; printable view for PDF.

**US-7 Roadmap (basic).** From approved claims the system proposes Day-1/Week-1/Month-1 items; each item links to its claims; lead can edit before publish.

## 6. Non-goals (explicit)
Enterprise ERP ingestion, live Slack/Teams/Jira/Notion connectors, SSO, mobile apps, multi-tenant billing. Listed as the future roadmap only.

## 7. Success metrics (measurable in the demo)
| Metric | Target | How measured |
|---|---|---|
| Citation validity | 100% of displayed claims verified or attested | Automated check + admin report |
| Leak canary | 0 canary strings seen by any lower role on any endpoint | Canary suite (docs/11) |
| Extraction quality on gold set | Recall >= 0.70, precision >= 0.85 on the Aurora fixture | Eval harness (docs/11) |
| Time to Day-1 plan | < 90 s from repo URL to first plan on fixture | Stopwatch in demo |
| Review speed | Lead reviews 20 claims in < 5 min using keyboard | Demo |

Do not publish numbers in the submission that you did not measure. State "target" for anything unmeasured.

## 8. Risks
| Risk | Mitigation |
|---|---|
| LLM invents quotes | Mandatory span quoting + string verifier + reject |
| Prompt injection inside repo content | Untrusted-data wrapping, tool-only output, schema validation, no tool that can act |
| Render cold start during judging | Keep-warm ping, Docker image with model baked in, warm before demo |
| API cost | Haiku for cheap tasks, prompt caching, per-project token budget, cache by content hash |
| Scope creep | Strict R2/R3/WOW ordering in docs/10 |
