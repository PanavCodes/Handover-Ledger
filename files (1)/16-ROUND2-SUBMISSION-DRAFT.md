# 16. Round 2 Submission Draft

**Read this first.** These are drafts for the seven required items. Nothing here may be submitted until you have verified it against the deployed product. Every `[VERIFY]` marker must be replaced or deleted. Claim only what a judge can see working in an incognito window. Only the **team leader** files the form: https://forms.gle/gyRiHtQT3AnC3MdV6 (also watch the official WhatsApp group for the posted link).

Deadline: **Wed 11 Nov, 10:00 AM IST, strict.** Submit at least 3 hours early.

## Pre-flight
- [ ] Web link opens in incognito, no sign-in, no Vercel protection page.
- [ ] Repo is **public**; README explains how to run the demo in 3 lines.
- [ ] PDF link set to "Anyone with the link can view" and opens in incognito.
- [ ] Demo opens straight to a working flow (`/demo`), instructions on the page are one line.
- [ ] Seeded demo reset recently; Anthropic key has credit; Supabase not paused.

---
## 1. Working project link
`https://<your-app>.vercel.app/demo` [VERIFY] (give the `/demo` URL so judges land inside the product, not on a login page).
Add one line: "Click any persona to start. No sign-in needed. Suggested path: Dr. Meera -> Capture -> Ledger -> Handover Brief -> switch to Kabir."

## 2. Source-code repository link
`https://github.com/<org>/handover-ledger` [VERIFY public]

## 3. Updated project PDF
Link: `<Google Drive / repo /docs link, view-only public>` [VERIFY].
Suggested structure (5-6 pages, same formal black-text style as the Round 1 PDF; ask Claude to generate it once the product works, and give it real screenshots):
1. Cover: name, team, live link, repo link, one-line pitch.
2. Problem and the scored workflow in one diagram: Capture -> Verified claims -> Review -> Handover Brief -> Export.
3. What works today (screenshots of ledger, Evidence Lens, brief, role difference).
4. Architecture and trust model (verifier, labels, access choke point).
5. Changes from the Round 1 plan (section 6 below) and honest limitations.
6. Round 3 roadmap (section 7 below), team contributions.

## 4. List of completed features (tick only what you have verified live)
Core workflow
- [ ] Public no-sign-in demo with four personas (Lead, Departing member, Successor-Core, Successor-Coordinator) [VERIFY]
- [ ] Capture sources: paste/upload (Markdown, text, task CSV, chat export) [VERIFY which types]
- [ ] Live ingestion of a public GitHub repository (files, commits, PRs/issues as implemented) [VERIFY scope]
- [ ] Quick Capture: log a decision, blocker, owner or risk as it happens [VERIFY]
- [ ] Mandatory sensitivity label and allowed scopes on every source (server rejects unlabeled uploads) [VERIFY]
- [ ] AI claim extraction (Claude, structured tool output) into atomic claims: decisions, owners, blockers, risks, open questions, contacts, milestones, processes [VERIFY types]
- [ ] **Citation verifier:** each claim cites an exact quote; quotes are string-verified against the stored source and unverifiable claims are rejected [VERIFY; report measured counts from a real run]
- [ ] Status badges: Verified / Inferred (Conflicting / Missing: say which are live) [VERIFY]
- [ ] Evidence Lens: click a citation to see the exact highlighted passage in the source [VERIFY]
- [ ] Review console: approve, reject, edit, version history [VERIFY]
- [ ] **Handover Brief** for a successor: Decisions, Unfinished work, Who owned what, Risks, plus Day-1 / Week-1 / Month-1 plan, each item linked to evidence [VERIFY]
- [ ] Role-scoped views: Coordinator does not see Core-Dev-only restricted material; enforced server-side [VERIFY + automated canary test result]
- [ ] Export of the role-scoped brief as Markdown and JSON, plus print view [VERIFY]
Extras (list only if working)
- [ ] Rule-based conflict detection (e.g., two different owners)  [VERIFY]
- [ ] Gap flags (e.g., scheduled job with no runbook)  [VERIFY]
- [ ] Handover readiness score  [VERIFY]
- [ ] Per-visitor sandbox for a visitor's own public repo  [VERIFY]

## 5. Technology and implementation details (edit to match what shipped)
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui. Deployed on Vercel.
- **Backend:** Next.js route handlers (serverless). Server-side access layer `lib/access.ts` is the single place that decides what each persona can read; all claim, document, brief and export reads go through it.
- **Database:** Supabase Postgres. Row-Level Security is enabled on every table with no public policies, so the public anon key exposes nothing; only server code with the service key reads or writes.
- **AI:** Claude (Anthropic API) with forced tool use for schema-valid claim output. Source text is wrapped as untrusted data to resist prompt injection. Model identifiers: [VERIFY: actual strings used].
- **Verification:** the model must return a verbatim quote per claim; a deterministic verifier normalises whitespace and quote characters and checks the quote exists in the stored document, computing exact character offsets for highlighting. Claims whose quotes are not found are discarded and logged. [VERIFY: measured numbers, for example "N proposed, M verified, K rejected on the demo corpus".]
- **Serverless pipeline:** the client drives extraction in small batches (1-3 documents per request) with a progress bar, so long ingestions fit serverless time limits without a worker.
- **Access model:** signed httpOnly persona cookie for the public demo; sources carry a sensitivity label and allowed scopes; a claim is visible only if every source it cites is visible to the persona (strictest source wins).
- **Testing:** unit tests for the verifier, canary-string tests for role scoping, [VERIFY others]. CI: [VERIFY].
- **Data:** all demo content is synthetic (fictional robotics club "Aurora Rover").
- **Limitations (state honestly):** demo personas replace real authentication in Round 2; accuracy numbers come from a small synthetic corpus; verification proves a quote exists in the source, not that the source is correct.

## 6. Changes made to the original plan
Use only the changes that are true.
| Original plan (Round 1) | Round 2 reality | Reason |
|---|---|---|
| FastAPI backend on Render | Next.js route handlers on Vercel | Single deployment with no cold start; fastest way to deliver an end-to-end workflow within the 48-hour window. Python services return in Round 3. |
| Supabase Auth + RLS as the access boundary | Signed demo persona sessions + server-side access layer; RLS locked down (deny-all to public) | Round 2 requires judges to use the product without sign-in. Real auth and RLS-based enforcement planned for Round 3. |
| pgvector retrieval | Not used; per-document extraction and Postgres full-text search | Not required for the core workflow; adds latency and complexity. |
| Background workers | Client-driven batched extraction | Serverless-friendly. |
| Added: Quick Capture | New | The scored story requires capturing knowledge while work happens, not only after the fact. |
| Added: Handover Brief (Decisions / Unfinished / Owners / Risks) | New primary screen | Directly answers what the next person needs. |
| Deferred: interview loop, automated conflict classifier, multi-role redaction hardening, signed acknowledgement | Round 3 | Scoped out to make the core workflow reliable. |

## 7. Three major improvements for Round 3 (meaningful, not cosmetic)
1. **Gap-driven departing-person interview loop.** The system detects undocumented areas (for example, a scheduled job with an owner but no runbook, a credential with no rotation procedure, a component where one person made most of the commits) and asks the departing member 5-10 targeted questions, each with a "why am I being asked" explanation. Answers become attested claims with citations to the answer text, replacing `Missing` placeholders, and anything that contradicts existing claims is flagged.
2. **Automated conflict detection and resolution.** Rule-based and model-assisted detection of contradictory claims across sources (owners, decisions, dates), with both versions preserved, a side-by-side resolver for the lead, a required resolution note, and a full version history, so contradictions are surfaced instead of silently merged.
3. **Cryptographically verifiable, role-hardened handover.** Real authentication with Postgres Row-Level Security as the access boundary, multi-role redaction with a View-As preview and an in-app Leak Canary test, successor acknowledgement producing a hashed and signed receipt, and a tamper-evident hash-chained audit log.
(If you prefer a product-reach improvement instead of #3's governance focus: live Slack/Jira connectors that capture decisions continuously as work happens.)

## 8. Reply drafts
**To the organisers about the two different emails (send from the registered address and keep the reply):**
> Hi team, we received two Round 2 emails for team THE TRAVELLING SALESMAN. One describes a knowledge-handover product (our Round 1 idea: Handover Ledger) and the other describes a brand-governance product. We are building the knowledge-handover product. Please confirm this is correct. Thank you.

## 9. Final submit checklist
- [ ] All 7 items filled, no `[VERIFY]` left.
- [ ] Every link tested in incognito **and** on a phone.
- [ ] Only the team leader submits; teammate confirms they did not submit separately.
- [ ] Screenshot of the submission confirmation saved.
