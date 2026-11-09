# 10. Implementation Plan (Vibe-Coding Playbook)

Work phase by phase. In each phase: paste the prompt, review the diff, run the checks, commit. If the agent drifts, point it back at the referenced doc. Tag phases: **[R2]** required for Round 2, **[R3]** Round 3, **[WOW]** differentiator.

Suggested split: **Padminish** = phases 1, 2, 5, 6, 9, 11 (backend/AI/data). **Panav** = phases 3, 4, 7, 8, 10, 12 (frontend/auth UX/design). Merge via short-lived branches and PRs; the API contract (`/openapi.json`) is the handshake.

Time plan (adjust to your Round 2 window): Day 1 phases 0-4 · Day 2 phases 5-7 · Day 3 phases 8-10 · Day 4 phase 11 (deploy early!) and polish · Day 5 stretch + demo. **Deploy by the end of phase 7 and redeploy after every phase.**

---
## Phase 0. Bootstrap and tooling [R2]
Goal: empty folder to running skeleton (web + api + local Supabase) with CI.
Prompt:
```
Read CLAUDE.md and docs/03-TECH-STACK-AND-SETUP.md. Bootstrap the monorepo exactly as section 3 describes:
pnpm workspace, apps/web (Next 14, Tailwind, shadcn init + the listed components), apps/api (uv project, FastAPI app factory with /healthz and /readyz, config via pydantic-settings, structlog), supabase init, root scripts, .env.example files, .gitignore, ruff/mypy/prettier configs, and a GitHub Actions workflow (lint, typecheck, test for web and api). Do not implement features yet. Show me the file tree and the commands to run it.
```
Acceptance: `pnpm dev` serves the Next default page on :3000 and `curl localhost:8000/healthz` returns ok; `pnpm lint && pnpm typecheck && pnpm test` pass; CI green on push.
Commit: `chore: bootstrap monorepo`.

## Phase 1. Database schema, RLS, DB tests [R2]
Prompt:
```
Read docs/04-DATABASE.md and docs/05-AUTH-AND-RBAC.md sections 1-3. Create the migrations in supabase/migrations in the documented order (0001-0008) using the SQL in the doc, fixing syntax if the Supabase CLI complains but preserving behaviour. Then write apps/api/tests/db/ pytest tests covering the five cases listed at the end of docs/04. Provide a fixture that creates auth users, projects, memberships, sources of each sensitivity, and a helper `as_user(conn, user_id)` that does SET LOCAL ROLE authenticated + request.jwt.claims.
```
Acceptance: `supabase db reset` applies cleanly; `uv run pytest tests/db -q` passes including the audit immutability and cross-project isolation tests.
Commit: `feat(db): schema, rls, audit chain`.

## Phase 2. API foundation: auth, DB paths, projects, members [R2]
Prompt:
```
Read docs/05 sections 4 and 1, and docs/07 (Health, Me and projects). Implement in apps/api/app: config.py, db.py (psycopg async pool; prepare_threshold=None), deps.py (get_current_user supporting HS256 secret OR JWKS, db_user, db_admin, require_role, resolve_preview), services/audit.py (append_audit, verify_chain), routers: health, me, projects, members, invitations. Add the global error handler producing the documented error shape and request-id middleware. Write pytest tests with a real DB: unauthenticated 401, wrong role 403, cross-project 404, invitation accept flow.
```
Acceptance: tests pass; `/docs` shows the endpoints; a project created by user A is invisible to user B.
Commit: `feat(api): auth, rls connections, projects`.

## Phase 3. Web foundation, design system, auth pages [R2]
Prompt:
```
Read docs/08-UI-UX-DESIGN-SYSTEM.md and docs/09 sections 1-2. Set up in apps/web: tokens in globals.css and tailwind.config.ts (including status colours), fonts via next/font (Fraunces, Inter, JetBrains Mono), next-themes dark mode, the app shell (sidebar, topbar, project switcher placeholder, theme toggle), middleware.ts for Supabase SSR sessions, /login (magic link + Google), /auth/callback (also accepts a pending invitation token), typed API client (openapi-fetch) and a script `pnpm gen:api-types`. Build the components StatusBadge, ConfidenceMeter, EmptyState, RedactionNotice with a /dev/components page showing all variants in light and dark.
```
Acceptance: log in with a magic link locally; protected routes redirect; component gallery renders both themes; Lighthouse accessibility >= 95 on gallery.
Commit: `feat(web): design system, auth, shell`.

## Phase 4. Projects UI, members, invitations, landing page [R2]
Prompt:
```
Implement /app (project list), /app/new, /app/p/[pid] overview skeleton (empty states only), /app/p/[pid]/settings (members table, invite dialog that returns a copyable link, role/scope editing for admins). Implement the landing page per docs/08 section 10 including the animated Inferred->Verified stamp demo (framer-motion; respects prefers-reduced-motion). Use real API calls; all states (loading/empty/error/denied) must exist.
```
Acceptance: create a project, invite a second user, accept the link in another browser profile, role chip shows correctly.
Commit: `feat(web): projects, members, landing`.

## Phase 5. Ingestion pipeline: uploads, GitHub, chunk, embed, jobs [R2]
Prompt:
```
Read docs/06 sections 1-3 and docs/07 (Sources, Jobs). Implement: services/ingest/{github.py,uploads.py,normalize.py,chunker.py}, ai/embeddings.py (fastembed singleton, batch embed in a thread), services/pipeline.py (stage runner updating jobs.stage/progress, idempotent by content_hash, resumable), routers/sources.py and jobs.py. Enforce the mandatory label (422 label_required). Respect GitHub rate limits and caps from the doc. Add the search endpoint (tsv + vector). Write tests using recorded GitHub fixtures (no live network in tests) and unit tests for the chunker (offsets must reproduce document.content[start:end] == chunk.text).
```
Acceptance: ingest the public fixture repo (docs/13) or a small public repo; documents and chunks exist with embeddings; job reaches 100%; label-less upload is rejected; re-ingest skips unchanged files.
Commit: `feat(api): ingestion, chunking, embeddings, jobs`.

## Phase 6. Claim extraction and the verifier [R2, critical]
Prompt:
```
Read docs/06 sections 4-6 carefully. Implement ai/client.py (Anthropic async wrapper: timeouts, retries with jitter, concurrency limit 3, llm_calls logging, project token budget, prompt caching), ai/prompts.py (EXTRACT_PROMPT_V1 verbatim from the doc), ai/schemas.py (record_claims tool), services/verifier.py (1:1 normalisation + index map, verify_quote, decision table, secret-pattern guard, confidence formulas), services/claims.py (persist claims, citations, claim_versions, claim_rejections, recompute nothing else), dedupe per section 6, and the extract job in pipeline.py with the proposed/verified/downgraded/rejected counters stored in jobs.detail. Write exhaustive unit tests for the verifier (whitespace, curly quotes, quote not found, too short, quote spanning newline, secret in quote) and a test using a mocked Claude response containing one fabricated quote that MUST be rejected.
```
Acceptance: run on fixtures; ledger rows have offsets where `doc.content[start:end]` normalises equal to the quote; fabricated quote test passes; job detail shows counts.
Commit: `feat(ai): claim extraction with verified citations`.

## Phase 7. Ledger UI + Evidence Lens + sources page [R2]
Prompt:
```
Read docs/09 sections 3.1-3.3 and docs/08 sections 5-7. Implement the Sources page (label panel with mandatory choice, GitHub + upload, sources table, JobProgress with Realtime), the Ledger page (filters, table/cards toggle, status counts), and the Evidence Lens (side sheet + full page) using document content and citation offsets with the animated highlight. Regenerate API types first. Add data-testid hooks listed in section 5. Handle every state.
```
Acceptance: from the UI, ingest the fixture, watch live progress, see claims with badges, click a citation and see the exact span highlighted and centred. **Deploy now (docs/12) and confirm it works on production URLs.**
Commit: `feat(web): sources, ledger, evidence lens`.

## Phase 8. Review console + versioning [R2]
Prompt:
```
Read docs/07 (Claims) and docs/09 sections 3.2, 3.4. Backend: approve/reject/edit/manual-claim/bulk-approve (verified only, 400 otherwise)/versions/rejections endpoints, each writing claim_versions + audit. Server must verify any user-selected citation text via the same verifier. Frontend: keyboard review (J/K/A/R/E), confirm dialog for approving Inferred/Missing, reject-with-reason, edit form with "Cite selection", history drawer with field diffs, undo toast, "Rejected by verifier" admin tab. Tests: bulk-approve rejects non-verified; edit creates a version; manual claim without verifiable quote is labelled Inferred/manual.
```
Acceptance: review 10 claims with keyboard only; version history shows diffs; audit log rows exist.
Commit: `feat: review console and version history`.

## Phase 9. Releases, roadmap, single-role export [R2]
Prompt:
```
Read docs/06 section 10, docs/07 (Releases), docs/09 sections 3.6-3.7. Backend: releases CRUD, release_claims snapshot with claim_version, services/roadmap.py (heuristic horizon + create_plan tool + validation that every claim_id belongs to the release), publish validation, export (md/json) built strictly from rows read via db_user of the TARGET successor (so redaction is inherent), file naming without sensitive data. Frontend: releases list/create dialog with withheld count, PlanBoard (drag, edit), publish checklist modal, successor home /h/[rid] (mobile-first), print view. Tests: a coordinator-scope export contains none of the core-dev-only canary strings.
```
Acceptance: lead creates a release for a successor, generates a plan, publishes; successor sees `/h/[rid]` with only their scope; Markdown export downloads with footnoted quotes.
Commit: `feat: releases, plan, single-role export`.

## Phase 10. Overview, readiness, constellation, command palette [WOW]
Prompt:
```
Read docs/06 sections 11-12 and docs/08 section 6. Implement services/readiness.py and graph.py with endpoints, ReadinessGauge (animated), "Fix next" cards, the Constellation page (React Flow, custom nodes, orphan pulse, filters, side panel), and the Cmd/Ctrl+K command palette (navigate, jump to claim, run extraction, toggle theme). Keep everything role-scoped (graph from claims fetched via db_user).
```
Acceptance: overview shows a score with transparent breakdown; constellation highlights orphaned components; palette navigates by keyboard.
Commit: `feat: readiness, constellation, command palette`.

## Phase 11. Round 3 core: conflicts, gaps, interview, attestations [R3]
Prompt:
```
Read docs/06 sections 7-8 and docs/07 (Conflicts, Interview), docs/09 sections 3.8-3.9. Implement rule-based and LLM-assisted conflict detection with both claims preserved and status=conflicting; the resolver endpoints and UI; gap rules R1-R6 with risk scoring, question phrasing via the fast model, interview endpoints, answer->document->attested claims flow (extraction on the answer, verifier applied, conflicts vs existing claims), skip-with-reason -> open_question claim. Frontend: leaver card-stack flow (mobile-first), lead view, ConflictCompare. Tests: owner-claim mismatch creates a conflict; answering a question makes the related Missing claim superseded; skip without reason rejected.
```
Acceptance: seeded fixture yields >= 3 conflicts and >= 6 questions; answering turns Missing -> attested/verified; resolving a conflict is audited.
Commit: `feat: conflicts, gaps, interview loop`.

## Phase 12. Round 3 core: multi-role redaction, View-As, canary, acknowledgement, audit [R3/WOW]
Prompt:
```
Read docs/05 sections 5-7 and 9, docs/09 sections 3.12-3.13. Implement: scopes on successors (core_dev/coordinator) honoured by RLS and release creation; View-As (X-Preview-As on GET, read-only, banner, audit); canary runner (services/canary.py) and UI grid; Ask the Ledger (docs/06 section 9) with citation validation and refusal path; acknowledgement endpoint + receipt canonicalisation + sha256 + Ed25519 signature + verify endpoint (scripts/gen_key.py to create the key); audit page with Verify chain. Tests: canary suite passes for all roles; tampering with an audit row (via a superuser SQL update attempt in a test) fails; receipt verify detects a modified receipt.
```
Acceptance: canary grid fully green on the fixture; coordinator successor cannot see core-dev-only claims in plan, export, graph, Ask; acknowledgement stores a verifiable receipt.
Commit: `feat: redaction, view-as, canary, acknowledgement`.

## Phase 13. Quality: tests, accessibility, performance [R3]
Prompt:
```
Read docs/11-TESTING-AND-QA.md. Add: the eval harness and gold set for the fixture, Playwright e2e for the golden path (login -> ingest -> review -> release -> successor view -> acknowledge), axe checks on main routes, Lighthouse CI budget, and coverage reporting. Fix issues found. Add rate limiting for /ask and uploads.
```
Acceptance: all suites green in CI; axe has no serious/critical violations; eval report committed to `docs/eval/`.
Commit: `test: e2e, a11y, eval harness`.

## Phase 14. Deployment and hardening [R2 first pass, R3 final]
Prompt:
```
Read docs/12-DEPLOYMENT.md. Create apps/api/Dockerfile (model baked in), render.yaml, vercel config notes, security headers in next.config.js, production env var checklist, keep-warm GitHub workflow, and a smoke-test script scripts/smoke.sh that hits /readyz, logs in a seeded demo user via the API, and fetches claims. Do not hardcode URLs.
```
Acceptance: production web + API + Supabase working end-to-end; smoke script passes against prod.
Commit: `chore: deployment`.

## Phase 15. Demo polish and submission [R2/R3]
Prompt:
```
Read docs/13-DEMO-AND-SEED-DATA.md. Implement scripts/seed_demo.py (creates users, project, fixtures, labels, runs pipeline, plants conflicts/canaries), a reset-demo command, README with architecture diagram and screenshots section, and a "Demo mode" banner. Then rehearse the script and list any gaps.
```
Acceptance: one command resets and reseeds production demo in < 3 minutes; demo script runs cleanly.
Commit: `docs: demo seed, readme`.

---
## Prompting tips for this project
- Start every session with: "Read CLAUDE.md and the docs named below. Summarise your plan in 8 bullets before coding."
- After the agent finishes: "Run lint, typecheck, tests. Then list what you did NOT finish."
- When something breaks: paste the exact error and the relevant file path; ask for root cause first, fix second.
- For UI polish: "Compare against docs/08 section X and list deviations, then fix them."
- Keep the agent honest: "Show me the test that proves this behaviour."
- If a library API differs from your memory, tell the agent: "Read the current official docs for <lib> before using it."

## Scope control: if time runs short
Cut in this order (last first): command palette, constellation animation polish, Ask the Ledger, Ed25519 signature (keep SHA-256), LLM-assisted conflict detection (keep rules), print view. **Never cut:** label enforcement, verifier, RLS tests, Evidence Lens, review console, release export, deployment.
