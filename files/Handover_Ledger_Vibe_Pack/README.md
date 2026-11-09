# Handover Ledger: Vibe-Coding Pack

An evidence-linked, role-scoped knowledge reconstruction platform for team handovers.
Team: Padminish Bakshi (Backend & AI) and Panav Khungar (Product & Frontend).

This pack contains every Markdown file an AI coding agent (Claude Code, Cursor, Windsurf, Copilot Agent) needs to build the whole project from an empty folder to a deployed, demo-ready product.

## How to use this pack

1. Create an empty repo `handover-ledger` and copy this pack in: `CLAUDE.md` at the repo root and everything else under `docs/`.
2. Open the repo in Claude Code (or your agent of choice). `CLAUDE.md` is auto-loaded and tells the agent how to behave.
3. **For Round 2 follow `docs/15-ROUND2-48H-PLAN.md`** (48-hour scope). `docs/10-IMPLEMENTATION-PLAN.md` is the fuller plan for Round 3. Work one phase at a time. Each phase has a copy-paste prompt, expected files, and an acceptance check.
4. Commit after every phase. Never ask the agent to "build everything" in one prompt.
5. Before submitting, tick `docs/14-ROUND2-CRITERIA.md` and run the demo script in `docs/13-DEMO-AND-SEED-DATA.md`.

## File index

| File | Purpose |
|---|---|
| `CLAUDE.md` | Master rules and project memory for the AI agent |
| `docs/01-PRD.md` | Product requirements, personas, features, acceptance criteria |
| `docs/02-ARCHITECTURE.md` | System design, data flow, folder structure |
| `docs/03-TECH-STACK-AND-SETUP.md` | Versions, package management, scaffolding, env vars |
| `docs/04-DATABASE.md` | Full Postgres schema, RLS, hash-chained audit log |
| `docs/05-AUTH-AND-RBAC.md` | Auth flow, roles, permission matrix, RLS-aware API |
| `docs/06-AI-PIPELINE.md` | Ingestion, extraction prompts, citation verifier, conflicts, gaps |
| `docs/07-API-SPEC.md` | Every REST endpoint |
| `docs/08-UI-UX-DESIGN-SYSTEM.md` | Visual identity, tokens, components, motion |
| `docs/09-FRONTEND-SPEC.md` | Routes, components, state, screen-by-screen detail |
| `docs/10-IMPLEMENTATION-PLAN.md` | Phased build plan with prompts |
| `docs/11-TESTING-AND-QA.md` | Tests, leak canaries, eval harness, CI |
| `docs/12-DEPLOYMENT.md` | Supabase + Render + Vercel deployment and operations |
| `docs/13-DEMO-AND-SEED-DATA.md` | Synthetic dataset, demo script, submission checklist |
| `docs/14-ROUND2-CRITERIA.md` | Official Round 2 criteria, mapping, self-scoring sheet |
| `docs/15-ROUND2-48H-PLAN.md` | **START HERE for Round 2**: 48-hour cut-down plan, no-sign-in demo access, prompts |
| `docs/16-ROUND2-SUBMISSION-DRAFT.md` | Draft answers for the 7 required submission items (verify before sending) |

## Scope labels used throughout

- **[R2]** Required for Round 2 (Functional MVP): upload pipeline, claim extraction with citation linking, status badges, review console, single-role export, deployable app demonstrating end-to-end extraction from a live repository.
- **[R3]** Round 3 hardening: leaver interview loop, multi-role redaction, automated conflict detection, successor acknowledgement, tests, accessibility, video.
- **[WOW]** Differentiators that make the demo memorable. Build only after the matching [R2] items work.
