# 09. Frontend Specification

Next.js 14 App Router, TypeScript strict. Server components fetch data; client components handle interaction. Follow docs/08 for visuals.

## 1. Routes
```
/                                   landing (public)
/login                              magic link + Google
/auth/callback                      exchange code, accept pending invitation, redirect
/app                                project list (+ "New project")
/app/new                            create project
/app/p/[pid]                        overview: readiness, pipeline, fix-next, activity
/app/p/[pid]/sources                upload + GitHub ingest + labels + jobs
/app/p/[pid]/claims                 ledger (filters, bulk approve, keyboard review)
/app/p/[pid]/claims/[cid]           Evidence Lens (full page; also opens as sheet from the ledger)
/app/p/[pid]/conflicts              [R3] conflict resolver
/app/p/[pid]/interview              [R3] lead view of questions; leaver sees /app/p/[pid]/interview/answer
/app/p/[pid]/constellation          [WOW] graph
/app/p/[pid]/ask                    [WOW] Ask the Ledger
/app/p/[pid]/releases               list + create
/app/p/[pid]/releases/[rid]         edit plan, preview, publish, export
/app/p/[pid]/audit                  audit log + verify chain + canary
/app/p/[pid]/settings               members, invitations, roles, grants, View-As
/h/[rid]                            successor home (plan, evidence)
/h/[rid]/claims/[cid]               successor evidence view
/h/[rid]/acknowledge                [R3] acknowledgement
/h/[rid]/print                      print-optimised handover (PDF via browser)
```
`middleware.ts`: refresh Supabase session cookies; redirect unauthenticated users; keep `/`, `/login`, `/auth/*` public.

## 2. Data layer
- `lib/supabase/server.ts` and `client.ts` via `@supabase/ssr`.
- `lib/api/client.ts`: `openapi-fetch` with a typed client; server variant injects the session access token; browser variant gets the token from the Supabase client. Base URL from `NEXT_PUBLIC_API_URL`.
- TanStack Query for client-side lists with mutations and optimistic updates (approve/reject). Query keys `['claims', pid, filters]`.
- `useJobProgress(jobId)`: subscribes to Supabase Realtime `postgres_changes` on `jobs` filtered by id; falls back to polling every 2 s.
- View-As: a small React context stores `previewUserId`; the API client adds `X-Preview-As` for GET requests while it is set and shows the banner. Writes are disabled in the UI while active.
- All API data validated at the boundary with zod only where the OpenAPI types are insufficient (forms).

## 3. Screen specs

### 3.1 Sources page [R2]
- Two cards: **Connect GitHub** (URL, optional token, include/exclude) and **Upload files** (drag-drop, multi-file).
- **Label step is mandatory:** a right-hand panel "Who may see this?" with sensitivity radio (Team / Restricted / Confidential), role checkboxes (disabled for confidential except admins), scope checkboxes when restricted. Default selection: none. The primary button stays disabled until chosen; helper text explains each level in one line.
- Sources table: name, type icon, label pill, status, doc count, last ingested, actions (re-ingest, change label, delete).
- Below: `JobProgress` for the active job with stage stepper: Fetch -> Parse -> Embed -> Extract -> Verify -> Link. Live counters: documents, chunks, claims proposed / verified / rejected.
- States: empty (illustrated, "Connect your first source"), GitHub rate-limited (retry time), partial failure (retry button).

### 3.2 Ledger [R2]
- Header: counts by status (Verified 41 · Inferred 9 · Conflicting 3 · Missing 6), Readiness mini gauge.
- Filters: type chips, status chips, review state, owner/subject search, "needs my review" toggle. View toggle: Table / Cards.
- Row: type icon, title, status badge, confidence meter, citations count, review pill, actions.
- Bulk bar appears when rows are selected: "Approve N verified claims" (disabled and explained if any selected is not verified).
- Keyboard review mode (`J/K/A/R/E`), toast with Undo (revert via a new version).
- Clicking a row opens the **Evidence Lens** in a side sheet; `Enter` goes full page.

### 3.3 Evidence Lens [R2]
```
+----------------------------+--------------------------------------------+
| Claim                      | Source: runbooks/backup.md        [open ↗] |
| [Verified] [Approved]      |  1  # Nightly backup                       |
| Title / statement          |  2  Runs at 02:00 IST via cron on lab-vm   |
| Confidence ▮▮▮▮▯ 0.88      |  3  ▒▒ Owner: Rahul Mehta ▒▒  <-- highlight |
| Citations:  [1][2][3]      |  4  Restore: see TODO                      |
| Version history (lead)     |                                            |
| [Approve][Edit][Reject]    |  [Copy quote]  [Prev ‹] [Next ›] citation  |
+----------------------------+--------------------------------------------+
```
- Document viewer renders `content` in mono with line numbers; the highlight uses `start_offset/end_offset` (wrap in `<mark>` with a marker-stroke animation), then `scrollIntoView({block:'center'})`.
- If the document is not readable for the viewer, the API returns 404 and the lens shows the `RedactionNotice` instead of the source (claim itself would already be hidden by RLS; this covers direct URL access).
- Edit mode: inline form for title/statement/type/subject/value with a "Add citation" tool: select text in the viewer, click "Cite selection", the client sends the selected substring; the **server verifies** it before accepting.

### 3.4 Review/edit rules
- Approve: allowed for any non-rejected claim; Inferred and Missing show a confirm dialog ("No source states this directly. Approve anyway?").
- Reject requires a short reason.
- History drawer lists versions with who/when and a field-level diff.

### 3.5 Overview [R2]
- Readiness gauge with 5 sub-scores and "Fix next" cards (each links to the relevant filtered view).
- Pipeline panel (last job), review progress bar, top risks (3), orphaned components, recent audit events.
- Quick actions: Add source, Review next claim, Create release.

### 3.6 Releases and plan [R2 basic]
- Create release dialog: choose successor (members with role successor), scope auto-filled from membership, claim selection default "all approved readable by that scope", with a live counter "42 claims · 6 withheld from this scope" (count only, no titles).
- **PlanBoard**: generate plan (job), edit items inline, drag between horizons, claim chips per item. Lead preview tab = View-As that successor.
- Publish checklist modal: unresolved conflicts included? pending claims excluded? plan has Day-1 items? Confirm.
- Export menu: Markdown, JSON, Print view.

### 3.7 Successor home `/h/[rid]` [R2/R3]
- Mobile-first. Greeting + 1-sentence summary, progress ring (items done), **Day 1 checklist** at top, then Week 1, Month 1 as collapsible sections.
- Each item: title, description, "Why" chips linking to evidence (opens lens), owner chip.
- Tabs: Plan · Owners · Risks · Decisions · Contacts · Open questions.
- Footer: `RedactionNotice`, Ask the Ledger, Acknowledge button (enabled when Day-1 items viewed).

### 3.8 Interview [R3]
- Leaver view: one question per screen (card stack), progress `3 / 8`, "Why am I being asked?" expander, text area with voice dictation optional (browser API), Save & resume, Skip with required reason. Finish screen: "Thank you. 6 answers became verified attestations."
- Lead view: table of questions and states with the resulting claims.

### 3.9 Conflict resolver [R3]
- `ConflictCompare` with both claims, their citations, and diff of values. Actions: Keep A, Keep B, Keep both flagged, Write reconciled claim. Required note. Pulsing ring disappears when resolved.

### 3.10 Constellation [WOW]
- React Flow, auto layout with d3-force or a simple radial layout computed on the client.
- Node types: Person (avatar initials), Component (rounded square), Risk (triangle badge). Status colour from worst claim; orphaned = pulsing dashed ring.
- Click node: right panel lists claims (opens lens). Filters: Orphaned only / Risks only / Person. Lens indicator: "Showing what Core Dev can see" in View-As.

### 3.11 Ask the Ledger [WOW]
- Chat-like single-turn Q&A; answer segments with inline citation chips; "Not in the ledger for your role" empty answer state; suggested questions generated from top risks ("Who restores the backup?").

### 3.12 Audit and Canary [R3]
- Audit timeline with filters, hash prefix per row, **Verify chain** button -> green "Chain intact, 214 entries verified" or red with the first broken id.
- **Canary:** Run button, progress, `CanaryGrid`, pass/fail banner, export JSON result.

### 3.13 Settings
- Members table with role/scope editing, invitations (copy link), source grants for confidential sources, View-As launcher.

## 4. Quality bar for every screen
Loading skeleton · empty state · error state with retry · permission-denied state · responsive at 360px · dark and light · keyboard operable · no layout shift · no secrets in the DOM · page `<title>` without sensitive info.

## 5. Testing hooks
Add `data-testid` on: upload submit, label radios, job progress, claim rows, status badges, approve/reject buttons, lens document viewer, highlighted span, plan items, acknowledge button, canary cells.
