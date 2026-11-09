# 15. Round 2: 48-Hour Plan (supersedes docs/10 for Round 2)

**Deadline: Wednesday 11 Nov, 10:00 AM IST. Strict.** Treat **Wed 07:00 IST** as your real deadline and **Tue night** as feature freeze. Only the team leader submits.

## 1. What is actually scored
> Knowledge is captured while work happens. When a person moves on, the next person can pick it up (decisions already taken, what is unfinished, who owned what, where the risk sits) without chasing anyone.

A judge opens a link, with **no sign-in and no walkthrough**, and must be able to run that story. So the product is judged on four questions the successor's screen must answer instantly:
1. **Decisions:** what was decided, and why? (cited)
2. **Unfinished:** what is still open, blocked or overdue?
3. **Who owned what:** components, jobs, vendors, accounts, by person.
4. **Where the risk sits:** fragile things, expiries, single points of failure, missing runbooks.

Everything in the build either feeds those four answers, proves they can be trusted (citations, verifier, role scoping), or gets cut.

## 2. Scope: Must / Should / Cut
| Priority | Item | Notes |
|---|---|---|
| **MUST** | **Public demo entry** (`/demo`), persona switcher, seeded synthetic workspace | No sign-in anywhere on the judge path |
| **MUST** | **Capture:** paste/upload notes, docs, task CSV, chat export; GitHub public repo URL; **Quick Capture** box ("log a decision / blocker / owner / risk now") | Mandatory sensitivity label on each source |
| **MUST** | **Extraction -> verified claims** with exact-quote citations and the verifier gate (docs/06 sections 4-5) | Show "proposed / verified / rejected by verifier" counters |
| **MUST** | **Ledger** with status badges (Verified, Inferred; Conflicting/Missing shown if produced) + **Evidence Lens** (highlighted source span) | The "trust" proof |
| **MUST** | **Review:** approve / reject / edit, version history | Basic, keyboard shortcuts optional |
| **MUST** | **Handover Brief** for a successor: the four sections above + Day-1/Week-1/Month-1 plan, each item linked to claims | The scored outcome |
| **MUST** | **Role scoping (2 successor scopes):** coordinator does not see core-dev-only restricted source; lead sees both | Enforced server-side in one choke point; canary test |
| **MUST** | **Export** the brief as Markdown (footnoted quotes) + JSON; print-friendly page | "Single-role export" |
| **MUST** | Deployed on public URLs, links tested in incognito | See section 6 |
| SHOULD | Rule-based **conflict** flag (two different owners for the same subject) shown as Conflicting | Cheap, deterministic, high demo value |
| SHOULD | Simple **gap list** ("cron job with no runbook") as `Missing` placeholders, no interview yet | Teaser for Round 3 interview loop |
| SHOULD | Readiness score (simple formula) | docs/06 section 11 |
| SHOULD | "Try with your own public repo" in a per-visitor sandbox workspace | Rate-limited, capped |
| CUT to R3 | Leaver interview loop, LLM conflict classifier, View-As, Leak Canary UI, acknowledgement with signed receipt, hash-chained audit, real Supabase Auth, RLS, pgvector, Ask the Ledger, constellation, command palette | List these as the Round 3 plan |

## 3. Round 2 architecture (changes vs the pack)
```
Browser (Next.js 14 App Router, Tailwind, shadcn)
   │   cookie: signed persona session (no sign-in)
   ▼
Next.js route handlers (Vercel serverless)  ── lib/access.ts (single visibility choke point)
   │        │                        │
   │        ├─ lib/ai (Anthropic TS SDK, tool use) ── Claude
   │        ├─ lib/github (REST)      
   │        └─ lib/verifier (TS)
   ▼
Supabase Postgres (service role, server-side only)
```
| Pack said | Round 2 does | Why (use in "changes to plan") |
|---|---|---|
| FastAPI backend on Render | Next.js route handlers on Vercel | One deploy, no cold start or CORS, ships in 48 h; Python/FastAPI + workers return in Round 3 |
| Supabase Auth + RLS as boundary | Signed demo persona cookie + app-level choke point `lib/access.ts` | Judges cannot sign in; RLS and real auth return in Round 3 |
| pgvector retrieval | Not used; extraction is per document, search via Postgres full-text | Not needed for the core workflow |
| Background jobs + Realtime | **Client-driven batched extraction** (client calls `/api/extract` repeatedly; each call handles 1-3 docs within the serverless time limit; progress bar) | Serverless-friendly, no worker |
| Interview loop, conflict LLM, acknowledgement | Deferred | Round 3 |

Vercel function duration: set `export const maxDuration = 60` on extraction routes and **check the current limits in Vercel docs** for your plan. Keep each extract call small enough to finish in about 30 s.

## 4. No-sign-in access design (critical)
- `/` landing with one big button: **"Open the live demo"** -> `/demo`.
- `/demo` shows four persona cards: *Dr. Meera (Lead)*, *Rahul (Departing)*, *Ananya (Successor, Core Dev)*, *Kabir (Successor, Coordinator)*. Clicking one sets the cookie and redirects to that persona's home. A persistent **persona switcher** in the top bar lets the judge change in one click. A one-line banner: "Demo with synthetic data. Real sign-in ships in Round 3."
- Session cookie: `persona` + `workspaceId`, HMAC-signed with `SESSION_SECRET`, httpOnly, SameSite=Lax. The server trusts only the verified cookie.
- Persona visibility (R2):
  | Persona | Sees |
  |---|---|
  | lead | team + restricted(any) |
  | leaver | team (read) + can Quick Capture |
  | core | team + restricted where `allowed_scopes` contains `core` |
  | coord | team + restricted where `allowed_scopes` contains `coord` |
- Claim visibility = visible only if **every** cited source is visible to the persona. Successors additionally see only claims that are approved (or verified, if the lead has not reviewed yet in the seeded demo; choose one rule and document it).
- **Sandbox workspaces** (optional): "Try your own repo" creates a workspace tied to a random token cookie; caps: 1 public repo, max 40 files, 150 KB each, 1 ingest per 10 minutes per IP; auto-delete after 24 h. Seeded demo workspace is read-mostly: edits allowed but a "Reset demo" button restores it.
- **Public-link gotchas:** disable Vercel **Deployment Protection / Vercel Authentication** for the production domain (preview URLs are protected by default); GitHub repo must be **public**; the PDF link must be "Anyone with the link can view"; test everything in incognito and on a phone.

## 5. Core screens (R2 minimum)
1. **Landing + `/demo`**: persona cards.
2. **Capture** (`/w/[id]/capture`): tabs: *Quick note* (textarea + type hint + label) · *Upload* · *GitHub repo*. Mandatory label panel. Live progress and verifier counters after submit.
3. **Ledger** (`/w/[id]/claims`): filters by type/status; badges; click opens **Evidence Lens** (side sheet: claim left, source right with highlighted span).
4. **Review**: approve/reject/edit; history drawer.
5. **Handover Brief** (`/w/[id]/brief`): header "Handover for Ananya (Core Dev)", four cards (Decisions · Unfinished · Who owned what · Risks), then **30-day plan** (Day 1 / Week 1 / Month 1). Each row has citation chips. Lead sees a "Withheld from this scope: N items" counter. Buttons: **Export .md**, **Export .json**, **Print**.
6. Persona switcher on every page.

Type mapping for the brief: `decision` -> Decisions; `blocker`, `open_question`, `milestone` (not done) -> Unfinished; `owner`, `contact` -> Who owned what (grouped by person); `risk`, `credential_ref`, `missing` placeholders -> Risks; `process` -> plan items.

## 6. Data model (R2 subset, Postgres via Supabase)
```sql
create table workspaces (id uuid primary key default gen_random_uuid(), name text not null,
  is_demo boolean not null default false, created_at timestamptz not null default now(), expires_at timestamptz);
create table sources (id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null, type text not null check (type in ('github','markdown','tasks','chat','notes','capture')),
  sensitivity text not null check (sensitivity in ('team','restricted')),        -- NO default
  allowed_scopes text[] not null default '{}',                                    -- restricted: subset of {core,coord}; lead always sees
  origin_url text, created_by text, created_at timestamptz not null default now());
create table documents (id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  source_id uuid not null references sources on delete cascade,
  path text not null, kind text not null, content text not null, content_hash text not null,
  meta jsonb not null default '{}', extract_state text not null default 'pending',  -- pending|done|failed
  unique (source_id, path, content_hash));
create table claims (id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  type text not null, title text not null, statement text not null,
  subject_key text not null, assertion_value text,
  status text not null check (status in ('verified','inferred','conflicting','missing')),
  basis text not null default 'explicit', inference_note text,
  confidence numeric(3,2) not null, review_state text not null default 'pending',
  origin text not null default 'extracted', captured_by text,
  version int not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table claim_citations (id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims on delete cascade,
  document_id uuid not null references documents on delete cascade,
  quote text not null, start_offset int not null, end_offset int not null);
create table claim_versions (id bigint generated always as identity primary key,
  claim_id uuid not null references claims on delete cascade, version int not null,
  snapshot jsonb not null, change_type text not null, changed_by text, created_at timestamptz not null default now());
create table claim_rejections (id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  document_id uuid references documents on delete set null, proposed jsonb not null, reason text not null,
  created_at timestamptz not null default now());
create table briefs (workspace_id uuid references workspaces on delete cascade, scope text not null,
  plan jsonb not null, generated_at timestamptz not null default now(), primary key (workspace_id, scope));
create table audit_log (id bigint generated always as identity primary key, workspace_id uuid not null,
  actor text, action text not null, entity text, payload jsonb not null default '{}', created_at timestamptz not null default now());
alter table workspaces enable row level security;  -- enable RLS on all tables with NO policies:
-- the anon key can read nothing; only the server (service role) touches data. Repeat for every table.
```
Do the "RLS on, no policies" step for every table so a leaked anon key exposes nothing. The service role key lives only in Vercel server env vars.

## 7. Routes (Next.js route handlers)
```
POST /api/session            {persona, workspaceId?} -> sets signed cookie
GET  /api/me                 -> persona, workspace
POST /api/sources            multipart or JSON {name,type,content|file, sensitivity, allowed_scopes}  (422 if label missing)
POST /api/sources/github     {repoUrl, sensitivity, allowed_scopes}  (public repos; caps)
POST /api/extract            {workspaceId} -> processes next 1-3 pending docs; returns {remaining, proposed, verified, rejected}
POST /api/capture            {text, hint?, sensitivity, allowed_scopes} -> creates 'capture' source+doc, runs extraction inline
GET  /api/claims             ?type&status&q   (via lib/access.ts)
GET  /api/claims/[id]        claim + citations (+ versions for lead)
PATCH /api/claims/[id]       edit (lead)       POST /api/claims/[id]/approve | /reject
GET  /api/documents/[id]     content for the lens (visibility checked)
GET  /api/brief?scope=core|coord        POST regenerate (lead)
GET  /api/export?scope=core&format=md|json
POST /api/demo/reset         restore seeded workspace (guarded)
GET  /api/canary             (SHOULD) per persona: does any canary string appear? returns matrix
```
Every route: read persona from cookie, call `lib/access.ts`, return typed JSON, write `audit_log` on mutations, rate-limit LLM routes (in-memory token bucket per IP is fine).

## 8. Hour-by-hour (H0 = now). Split: P = Padminish (data/AI), N = Panav (UI/auth UX)
| Hours | P: backend / AI | N: frontend / UX |
|---|---|---|
| H0-3 | Repo, Supabase project, schema (section 6), env vars, deploy hello-world to Vercel | Design tokens, app shell, landing, `/demo` persona cards, cookie session |
| H3-9 | `lib/ai`, extraction prompt + tool (docs/06), **verifier + unit tests**, `/api/extract` batching, GitHub ingest | Capture page, label panel, progress UI, ledger list with badges |
| H9-15 | Seed fixtures + seed script (docs/13 trimmed to ~12 files), Quick Capture route, `lib/access.ts` + canary test | Evidence Lens (highlight by offsets), review actions, version drawer |
| H15-24 | Brief generation (mapping + plan tool + validation), export md/json | Handover Brief page, persona switcher, withheld counter, print view |
| **Checkpoint C (about H24)** | **Full story works on production in incognito** | |
| H24-32 | Conflict rule, gap placeholders, rate limits, caps, sandbox workspace (optional) | Polish states: loading/empty/error/denied, mobile layout, dark mode optional |
| H32-36 | Bug bash with 3 people on real devices; fix | Screenshots / short screen recording for PDF |
| **H36 FEATURE FREEZE** | | |
| H36-42 | README, architecture diagram, final eval numbers (measured only) | Updated PDF (see docs/16), submission text |
| H42-45 | Incognito test of every link, dry-run the form | Submit. Aim >= 3 hours before deadline. |

Rule: if a checkpoint slips by more than 2 hours, cut from the SHOULD list, never from MUST.

## 9. Claude Code prompts (Round 2)
Start every session with: *"Read CLAUDE.md (Round 2 mode) and docs/15. Summarise your plan in 8 bullets before coding."*

**R2-0 Bootstrap + deploy early**
```
Create a Next.js 14 (App Router, TypeScript strict, Tailwind, shadcn/ui) project with pnpm. Add Supabase server client (service role, server-only), Anthropic SDK, zod. Implement signed-cookie persona sessions (HMAC with SESSION_SECRET), /, /demo with four persona cards, and a top bar persona switcher. Add .env.example. Deploy target is Vercel. Do not add auth libraries.
```
**R2-1 Schema + seed**
```
Create supabase/migrations/0001_r2.sql from docs/15 section 6 (RLS enabled on every table, no policies). Write scripts/seed.ts that creates the demo workspace and loads fixtures from fixtures/aurora-robotics (docs/13, trimmed): sources with labels (team; restricted core; restricted coord), documents with canonical text. Include canary strings. Idempotent.
```
**R2-2 Verifier + extraction**
```
Implement lib/verifier.ts per docs/06 section 5 (1:1 normalisation with index map, min length 12, decision table, secret-pattern guard) with vitest tests including a fabricated quote that must be rejected. Implement lib/ai/extract.ts using the Anthropic SDK with forced tool use (record_claims schema and EXTRACT_PROMPT_V1 from docs/06), wrapping documents in <document> tags as untrusted data, validating output with zod, persisting claims/citations/versions/rejections, and returning counters. Implement POST /api/extract that processes at most 3 pending documents per call (maxDuration 60).
```
**R2-3 Access choke point**
```
Implement lib/access.ts: visibleSourceIds(persona, workspace), visibleClaims(...) where a claim is visible only if all cited sources are visible, and getDocument(...). All routes must use it. Write tests with the canary fixtures: coord persona never receives CANARY-RESTRICTED-CORE strings from claims, documents, brief or export; core persona never gets the coord canary; lead sees both.
```
**R2-4 Capture UI + progress**
```
Build /w/[id]/capture with tabs (Quick note, Upload, GitHub). Mandatory label panel (sensitivity + scopes) with no default for uploads; the submit button is disabled until chosen; the server returns 422 label_required. After submit, loop POST /api/extract until remaining is 0, showing a stepper and live counters (documents, proposed, verified, rejected by verifier). Quick note preselects Team but shows the choice.
```
**R2-5 Ledger + Evidence Lens + review**
```
Build the ledger (filters, status badges with icon+text, confidence meter) and the Evidence Lens side sheet: claim on the left; source on the right in monospace with line numbers, <mark> from start/end offsets, scrollIntoView centre, tabs for multiple citations. Add approve/reject (reason)/edit with version history. Include every state: loading, empty, error, denied.
```
**R2-6 Brief + export**
```
Implement /api/brief and /w/[id]/brief per docs/15 section 5: group claims into Decisions / Unfinished / Who owned what / Risks, generate Day-1/Week-1/Month-1 plan items via a create_plan tool call (every item must reference claim ids visible in this scope; drop others), cache in briefs. Add export md/json (Markdown with footnoted verbatim quotes) and a print page. Lead sees a 'withheld from this scope: N items' counter (count only).
```
**R2-7 SHOULD items**
```
Add the rule-based conflict detection (same type+subject_key, different normalised assertion_value -> both claims status=conflicting, shown side by side), gap placeholders for owner-with-no-process, rate limiting for LLM routes, caps for GitHub ingestion, and the readiness score from docs/06 section 11.
```
**R2-8 Hardening**
```
Run lint, typecheck, tests. Test the golden path as each persona. Add error boundaries and friendly messages. Check mobile at 360px. Verify no secrets in the client bundle (grep for the service role key and Anthropic key). Write README with architecture, quick start, env vars, limitations.
```

## 10. Cost and abuse controls (judges and bots will click everything)
- Seeded demo workspace is **pre-extracted**; nothing in the judge's first 2 minutes needs a live LLM call.
- Live LLM calls only for: Quick Capture, Upload, Sandbox repo. Per-IP bucket (for example 10 LLM calls per 10 min), global daily cap in code, and a **spend limit in the Anthropic console**.
- Keep a `LLM_MODE=replay` fallback that serves recorded tool responses for the fixtures if the API fails during judging.
- Size caps: upload 1 MB, repo files 40, quick note 4,000 characters.

## 11. Incognito test script (run before submitting, on desktop and phone)
- [ ] Open the live URL in an incognito window: landing loads, no sign-in prompt.
- [ ] `/demo` -> pick Ananya (Core Dev) -> Brief shows the four sections with data within 3 seconds.
- [ ] Click a citation: lens opens with highlighted span.
- [ ] Switch to Kabir (Coordinator): a core-only item is absent; no canary text anywhere (use browser find).
- [ ] As Lead: Quick Capture "We decided to freeze the firmware at v1.4 until the competition" with a label -> a verified decision claim appears; approve it.
- [ ] Export the brief as Markdown: file downloads; footnotes present.
- [ ] Repo link opens while logged out; README renders; no secrets in history (gitleaks).
- [ ] PDF link opens in incognito.
- [ ] A friend who has never seen the project completes the story without help (this is the real judge test).

## 12. Risks (48-hour edition)
| Risk | Mitigation |
|---|---|
| Time overrun | Checkpoints; cut SHOULD items; never cut MUST |
| Link requires sign-in (Vercel protection, private repo, PDF permissions) | Section 4 gotchas; incognito test |
| LLM latency or outage during judging | Pre-extracted demo data; replay mode; client-driven batching with retries |
| Serverless timeouts | 1-3 docs per call; small prompts; `maxDuration` |
| Judges abuse live extraction (cost) | Caps, rate limits, Anthropic spend limit |
| Supabase project paused or misconfigured | Check dashboard daily; keep a seed script to rebuild in minutes |
| Wrong product built (brand-governance email) | Confirm in the WhatsApp group; keep proof |
