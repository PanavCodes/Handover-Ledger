# 16. Round 2 Submission Draft (Updated & Verified)

**Pre-submission verification rule:** Local build (`28/28` Vitest suites + Playwright 17-step E2E suite on Next.js 14 `next start`) has been verified cleanly with `0` console/page/5xx errors. Only the `[VERIFY DEPLOYED URL]` placeholders below need your final live Vercel / Google Drive public links once you deploy before submitting the Google Form (`https://forms.gle/gyRiHtQT3AnC3MdV6`).

Deadline: **Wed 11 Nov, 10:00 AM IST, strict.** Submit at least 3 hours early.

## Pre-flight Checklist
- [x] Incognito entry works with zero login (`/demo` & `/`), default Lead session + instant 4-persona cookie persistence across page reload.
- [x] Source repository is updated cleanly; README includes 3-step Quickstart; updated Round 2 PDF generated at `docs/Handover-Ledger-Round2-Report.pdf`.
- [ ] `[VERIFY DEPLOYED URL]` Deploy `apps/web` to Vercel (disable Deployment Protection so incognito works cleanly) & set `AUTH_SECRET` env var.
- [ ] `[VERIFY PUBLIC PDF LINK]` Upload `docs/Handover-Ledger-Round2-Report.pdf` to Google Drive with **"Anyone with the link can view"** (or link GitHub blob URL if preferred) and test in incognito.

---

## 1. Working project link
`https://<your-vercel-domain>.vercel.app/demo` **[VERIFY DEPLOYED URL after `vercel --prod`]**

One-line helper note to include alongside link:
> Click any persona to start with zero login required. Suggested path: **Dr. Meera (Dashboard `/`) &rarr; Ingest (`/capture`) &rarr; Exit Interview (`/interview` as Rahul) &rarr; Evidence Lens &amp; Conflict Resolution (`/ledger`) &rarr; Handover Brief + View-As Kabir (`/brief`) &rarr; Leak Canary &amp; Audit Chain (`/canary`, `/audit`)**.

## 2. Source-code repository link
`https://github.com/PanavCodes/Handover-Ledger` **[VERIFY repo visibility = Public on GitHub]**

## 3. Updated project PDF
Generated and verified in repository at: `docs/Handover-Ledger-Round2-Report.pdf` (6-page formal technical report containing real production screenshots, 1:1 Evidence Lens diffs, Lead vs. Coordinator redaction comparison, Leak Canary &amp; Audit Chain outputs, measured test metrics, honest plan deltas, and Round 3 roadmap).
Shareable public link: `<Google Drive "Anyone with link can view" URL>` **[VERIFY in incognito]**

## 4. List of completed features (verified end-to-end in Round 2)
Core workflow:
- [x] Zero-login incognito demo (`/demo` & `/`) with 4 instant personas (`Lead: Dr. Meera`, `Departing Owner: Rahul`, `Successor Core Dev: Ananya`, `Coordinator: Kabir`) backed by HMAC-signed httpOnly session cookies.
- [x] Multi-modal source ingestion (`/capture`): Quick Capture notes, local file upload (`.md`, `.txt`, `.csv`, `.log`, `.json`, `.h`, `.ts`), and live public GitHub repository sync (tested live against `PanavCodes/Handover-Ledger` fetching files + recent commit file diffs for `git_derived` ownership claims).
- [x] Fail-closed mandatory sensitivity classification (`team`, `restricted` + required scopes, `confidential`) with unselected default on Upload and server-side HTTP 422 (`label_required` / `scope_required`) enforcement.
- [x] Claim extraction with dual mode: Claude Sonnet 4.5 (`claude-sonnet-4-5`) forced tool-use with XML untrusted-data framing + deterministic structural extractor immune to `SYSTEM:`/`Assistant:` prompt injections.
- [x] Deterministic 1:1 citation verifier (`lib/verifier.ts`): canonical character index map resolving smart quotes &amp; whitespace back to exact `start_offset..end_offset`, rejecting unverifiable quotes and raw secret tokens (`sk-`, `ghp_`, `AKIA`, PEM), and logging word-level diffs with secret masking.
- [x] Status triage badges (`Verified`, `Planted Conflict`, `Missing`, `Inferred`) and **1:1 Evidence Lens** (`EvidenceLens.tsx`) featuring verbatim amber passage highlighting, word-level hallucination diffs, inline Edit/Resolve conflict form, immutable `v1..vN` revision history, and Lead approve/reject + Batch Approve actions.
- [x] **Gap-Driven Exit Interview Loop (`/interview`):** Automatically detects missing runbooks, key rotation procedures, expiring domains, and Git single-author silos with explicit *"Why am I being asked?"* explanations; answers convert directly into grounded attested claims superseding `missing` gaps.
- [x] **Role-Scoped Handover Brief &amp; 30-Day Transition Plan (`/brief`):** Dynamically scoped 4-section brief (Decisions, Unfinished/Gaps, Ownership Matrix, Operational Risks) + interactive Day-1/Week-1/Month-1 checklists with Lead `View-As` role preview and server-enforced withholding (`Coord` sees 0 Core-Dev restricted or Confidential faculty records).
- [x] Export of scoped brief as `HANDOVER.md` (AI coding agent context), standard footnoted Markdown, JSON, and print/PDF view.
- [x] Interactive **Bus-Factor Constellation (`/constellation`)** (`@xyflow/react`), **16-check Live Leak Canary Matrix (`/canary`)**, **Head-Anchored SHA-256 Audit Chain Inspector (`/audit`)** with live tamper simulator, and **Cryptographic Leaver Attestation + Successor Acknowledgement Receipts** (`/api/attest`).

## 5. Technology and implementation details
- **Frontend:** Next.js 14.2.35 (App Router), TypeScript strict mode, Tailwind CSS, `@xyflow/react`, `lucide-react`, `cmdk`.
- **Backend:** Next.js Route Handlers (serverless API routes) sharing single access boundary choke point `lib/access.ts` enforcing the **Strictest-Source Visibility Rule** across `/api/claims`, `/api/documents/[id]`, `/api/rejections`, `/api/brief`, `/api/export`, and `/api/canary`.
- **Persistence &amp; Database:** Node `globalThis` + OS temp snapshot persistence for instant zero-config Round 2 hackathon evaluation, paired with full 12-table deny-all Postgres RLS schema in `supabase/migrations/0001_init.sql` ready for hosted Supabase credentials.
- **AI &amp; Verification:** Anthropic SDK (`claude-sonnet-4-5`) with forced `record_claims` tool schema + general offline deterministic structural extractor fallback; deterministic `verifyQuote()` normalizer (`lib/verifier.ts`) + secret guard + `computeWordDiff()` (`lib/diff.ts`).
- **Cryptographic Integrity:** Sequential SHA-256 audit hash chaining with external head anchor verification (`lib/audit.ts`) catching both interior mutations and tail truncations.
- **Testing &amp; Verified Numbers:** `28/28` automated Vitest tests passing across 5 suites (`verifier.test.ts`, `audit.test.ts`, `canary.test.ts`, `api-integration.test.ts`, `workflow-e2e.test.ts`); `16/16` live Leak Canary assertions with zero leakage; `17/17` Playwright headless browser assertions with 0 console/page/5xx errors scaling the live corpus cleanly from 15 seeded claims to 56 grounded claims and 59 intact audit blocks.
- **Data &amp; Honest Limitations:** Seeded workspace uses synthetic data (*Aurora Rover Robotics Lab*). Without configured Supabase credentials, mutations persist in process memory + temp snapshot rather than multi-tenant Postgres; demo mode simulates roles via signed session cookies instead of user passwords; verbatim verification guarantees quoted provenance rather than external factual truth.

## 6. Changes made to the original Round 1 plan
| Original plan (Round 1) | Round 2 shipped reality | Honest engineering rationale |
|---|---|---|
| FastAPI backend + Render background workers | Unified Next.js 14 App Router serverless API routes + batched extraction | Avoids multi-service CORS and Render cold-start timeouts; delivers complete workflow inside one deployable build. |
| Supabase Auth login + RLS boundary | Zero-login HMAC-signed persona session cookies + `lib/access.ts` server choke point + deny-all SQL RLS schema | Judges require immediate incognito access without login barriers while still proving server-side role containment. |
| pgvector semantic retrieval | Per-document extraction + verbatim offset normalizer &amp; full-text filtering | Eliminates vector index latency/complexity while enabling exact 1:1 character highlighting in the UI. |
| Deferred to Round 3: Interview Loop, Conflict Classifier, Multi-Role Leak Canary, Cryptographic Sign-offs | **Pulled forward and shipped in Round 2** (`/interview`, `lib/conflicts.ts`, `/canary`, `/api/attest`) | Ahead-of-schedule execution allowed us to demonstrate the complete trust loop from gap discovery to signed successor receipts today. |

## 7. Three major improvements planned for Round 3
1. **Production Dual-Connection Auth &amp; Postgres RLS + `pgvector` Search:** Replace demo persona cookies with Supabase Auth/SSO JWTs backed by separate `db_user` (strict SQL RLS across all 12 tables) and `db_admin` ingestion connections, paired with pgvector semantic search over large multi-year project archives.
2. **Continuous Passive Capture Sidecars (Slack, Jira/Linear, GitHub Webhooks):** Continuously extract architectural decisions, blocker transitions, and PR review caveats in the background as engineering work happens rather than relying solely on exit-time capture.
3. **Multi-Hop Semantic Conflict Synthesis &amp; Deep Binary/PDF Redaction:** Extend pairwise key contradiction checks to async multi-document LLM conflict synthesis across >3 scattered artifacts, plus OCR/binary PII &amp; secret scrubbing before document ingestion.
