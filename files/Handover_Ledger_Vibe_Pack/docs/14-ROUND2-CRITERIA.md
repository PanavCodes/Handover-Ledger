# 14. Round 2 Criteria Mapping

> **Round 2 is a 48-hour sprint. Follow `docs/15-ROUND2-48H-PLAN.md`, which supersedes `docs/10` for Round 2. Draft submission answers are in `docs/16`.**

## 1. Official Round 2 criteria (from the organiser emails, We Code Coders / HackWithPune)
- **Window:** opens Sun 8 Nov 10:00 AM IST, **closes Wed 11 Nov 10:00 AM IST. Strict: late submissions are not evaluated.**
- **Goal:** turn the Round 1 plan into a functional project. The main workflow must work **end to end**. It need not be polished or complete.
- **Judge test:** a judge must be able to **open the link and use the core product without assistance or a walkthrough.**
- **What is scored:** the central workflow. For this team (knowledge handover): *what a person knows and has decided is captured while the work is happening; when they move on, the next person can pick it up (decisions taken, what is unfinished, who owned what, where the risk sits) without chasing anyone.* A login screen, settings page or empty dashboard alone does not count.
- **Submit (7 items, team leader only, one submission per team):**
  1. Working project link
  2. Source-code repository link
  3. Updated project PDF
  4. List of completed features
  5. Technology and implementation details
  6. Explanation of changes made to the original plan
  7. Three major improvements for Round 3 (meaningful, not cosmetic)
- **Links:** every link must open **without sign-in**; test in an incognito window. Teams were eliminated in Round 1 for inaccessible links.
- **Submission form:** https://forms.gle/gyRiHtQT3AnC3MdV6 (the official group may also post a link; keep checking). Event page: https://wecodecoders.in/events/codefrontier
- **Field:** reported as 59 teams (one email) or 300 teams with 100 advancing (another email). Either way, only the best-working end-to-end flows will stand out.
- **Prizes (top 3):** Rs 30,000 pool, USD 1,000 Adaption AI credits, USD 1,000 Inkloom AI credits, PPO and incubation opportunities from Inkloom AI.
- **Email discrepancy to resolve:** one email says "knowledge-handover product", another sent 8 minutes later says "brand-governance product". The team's Round 1 idea is knowledge handover and the first email matches it, so build that. Confirm in the WhatsApp group or by replying to the email, and keep the reply as proof.

## 2. Working criteria derived from the Round 1 blueprint (Round 2: Functional MVP)
Blueprint deliverable: "Complete upload pipeline, claim extraction with citation linking, status badges, review console, and single-role export" and "Deployable web application demonstrating end-to-end extraction from a live repository."

| # | Requirement | Where built | Evidence to show | Status |
|---|---|---|---|---|
| 1 | Upload pipeline (files + repo) with sensitivity labels | Phase 5, 7 | Screen recording; label-less upload rejected | [ ] |
| 2 | Live repository ingestion (GitHub) | Phase 5 | Ingest a real public repo on camera | [ ] |
| 3 | Claim extraction with citation linking | Phase 6, 7 | Lens highlight; verifier counters; fabricated-quote test | [ ] |
| 4 | Status badges (Verified/Inferred/Conflicting/Missing) | Phase 3, 7 | Ledger screenshot; at least Verified + Inferred live, others R3 | [ ] |
| 5 | Review console (approve/edit/reject/add, version log) | Phase 8 | Keyboard review clip; history drawer | [ ] |
| 6 | Single-role export | Phase 9 | Downloaded `.md` with footnoted quotes | [ ] |
| 7 | Deployable web app | Phase 14 | Public URLs; smoke test output | [ ] |
| 8 | Role-based access foundations (auth + RLS) | Phase 1-2 | RLS test report | [ ] |

## 3. Typical hackathon/judging dimensions (assumed; replace with official weights)
| Dimension | How this project scores | What to prepare |
|---|---|---|
| Problem and impact | Clear pain, defined users | One-slide problem story; user quotes only if real |
| Innovation | Verified claims, canary, View-As, tamper-evident audit | Demo proof moments |
| Technical depth | RLS-first design, verifier, structured outputs | Architecture diagram; test reports |
| Working demo | End-to-end on live repo | Warm servers; seeded fallback |
| UX/UI | Design system, accessibility | Screenshots dark/light; axe report |
| Code quality and docs | Monorepo, CI, typed contracts, these docs | Clean README; CI badge |
| Feasibility and roadmap | Scoped to small teams; R3 plan | Roadmap slide |

## 4. Self-scoring sheet (fill before submitting)
| Item | Done (Y/N) | Link / proof |
|---|---|---|
| Public repo and README | | |
| Live web URL | | |
| Live API URL (`/docs` or `/readyz`) | | |
| Demo video or recording | | |
| Test report (RLS, canary, verifier) | | |
| Eval report with measured numbers | | |
| Screenshots (ledger, lens, plan, redaction) | | |
| Declarations (synthetic data, AI assistance) | | |

## 5. Gap review prompt
```
Read docs/14-ROUND2-CRITERIA.md. The official criteria are in section 1. For each criterion: state whether the current codebase satisfies it (cite files/tests), what is missing, and the smallest change to close the gap. Output a prioritised list and update docs/10 if the plan must change. Do not implement anything yet.
```
