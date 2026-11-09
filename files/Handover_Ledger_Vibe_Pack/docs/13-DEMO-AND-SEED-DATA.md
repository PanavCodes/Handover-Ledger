# 13. Demo, Synthetic Data and Submission

All data is **fully synthetic**. Do not use real names, repos with real secrets, or real chats.

## 1. The scenario
**Aurora Robotics Club** (university robotics lab). **Rahul Mehta** (final-year student, project owner) is leaving. **Ananya Rao** (Core Dev) and **Kabir Shah** (Project Coordinator) are taking over. **Dr. Meera Iyer** is the lead/faculty advisor. **Admin:** club secretary `admin@aurora.example`.

Cast (seed script creates Supabase auth users with demo passwords for demo only):
| Person | Email | Role | Scope |
|---|---|---|---|
| Club Secretary | admin@aurora.example | admin | |
| Dr. Meera Iyer | meera@aurora.example | lead | |
| Rahul Mehta | rahul@aurora.example | leaver | |
| Ananya Rao | ananya@aurora.example | successor | core_dev |
| Kabir Shah | kabir@aurora.example | successor | coordinator |

## 2. Fixture content (`fixtures/aurora-robotics/`)
Create realistic but small sources (aim ~35 files total; generate with the agent in Phase 15, then hand-edit to plant the items below).

```
repo/                                  <- also publishable as a real public GitHub repo "aurora-rover-demo"
  README.md                            overview, mentions rover firmware and telemetry dashboard
  docs/architecture.md                 decision: chose MQTT over ROS topics for telemetry (with reasons); discarded Kafka
  docs/deploy.md                       how to deploy dashboard; says restore steps "TODO"
  docs/vendor-contacts.md              Priya at ServoWorks (motor controllers, lead time 6 weeks)
  scripts/nightly_backup.sh            cron script, header comment: "Owner: Rahul"
  ops/crontab.txt                      0 2 * * * /opt/aurora/nightly_backup.sh  (no runbook anywhere)  <- GAP
  ops/credentials.md                   "Telemetry API key lives in the lab password manager, vault 'rover-ops'. Rotated manually every 90 days; last rotation 2025-01-12." (no rotation procedure) <- GAP / risk
  firmware/README.md                   says "owner: Ananya" for firmware  <-- CONFLICT with commits and chat below
  firmware/src/*.c (3 small files)
  .github/workflows/ci.yml
tasks/board-export.csv                 12 tasks, 3 blocked, 2 unassigned, one overdue "Renew domain aurora-rover.example (expires 2025-06-30)"
chat/slack-export.json                 3 channels, ~150 messages
  - #firmware: "Rahul still maintains firmware, Ananya only helps with tests"   <-- CONFLICT with firmware/README.md
  - #ops: "Don't touch the cron on lab-vm, if the disk fills backups silently stop"  <- risk
  - #general: contains instruction-like text for injection test
notes/meeting-2025-03-02.md            decisions: freeze firmware v1.4 until competition; open question: "who pays for cloud credits after April?"
git-log.txt                            `git log --name-only` export: 70% of firmware commits by Rahul; telemetry-dashboard 85% by Rahul <- bus factor
private/finance.md   (CONFIDENTIAL)    contains `CANARY-CONF-7F3A`, club bank info (fake), sponsorship terms
private/core-dev-notes.md (RESTRICTED, core_dev)   contains `CANARY-RESTRICTED-CORE-91B2`, debugging tips, test bench IP (fake RFC1918)
private/coordinator-notes.md (RESTRICTED, coordinator) contains `CANARY-RESTRICTED-COORD-44E8`, sponsor contact schedule
docs/team-handbook.md  (TEAM)          contains `CANARY-TEAM-3C1D`
```
Planted properties to verify: **>= 3 conflicts** (firmware owner; telemetry decision MQTT vs ROS in chat; domain expiry date mismatch between tasks and notes), **>= 6 gaps** (cron no runbook, credential rotation, bus factor x2, unowned dashboard alerting, restore steps TODO), **2 prompt-injection strings**, **4 canaries**.

Labels at upload: repo+tasks+chat+notes = `team` (all roles); `ops/credentials.md` = `restricted` (admin, lead); finance = `confidential`; the two private notes as above.

Gold labels: `fixtures/aurora-robotics/gold.json` (type, subject_key, assertion_value, file) for ~30 claims.

## 3. `scripts/seed_demo.py` (requirements)
1. Create auth users via Supabase Admin API (service role), idempotent.
2. Create project "Aurora Rover Handover", memberships with roles/scopes.
3. Upload fixture sources with the labels above (via the real API as the admin/lead, so the same code path is exercised).
4. Run pipeline and wait; print counts.
5. Optionally pre-generate interview questions for Rahul but **leave them unanswered** for the live demo; pre-answer two for a recorded fallback.
6. Output a checklist of what was planted vs detected (conflicts, gaps, canaries).
7. `scripts/reset_demo.py`: delete the demo project cascade and reseed.
Support `LLM_MODE=replay` so the seed works offline using recorded responses in `fixtures/replay/`.

## 4. Live demo script (5-6 minutes)
| Time | Action | Message to land |
|---|---|---|
| 0:00 | Landing page: "Handovers you can verify." | The problem in one sentence: knowledge walks out the door |
| 0:30 | As lead: Sources. Try to upload without a label -> button disabled. Then connect the GitHub demo repo with labels. | Permission-first from the first click |
| 1:00 | Watch live pipeline: documents, chunks, claims proposed / verified / **rejected by verifier** | The verifier throws away fabricated quotes |
| 1:45 | Ledger: badges. Open a Verified claim -> Evidence Lens highlights exact span | Evidence, not summaries |
| 2:15 | Open an Inferred claim; show explanation; approve with confirmation. Keyboard review of 3 claims | Human stays in control |
| 2:45 | Conflicts: firmware owner. Show both claims and resolve with a note | Conflicts are surfaced, not smoothed |
| 3:15 | Switch to Rahul (leaver profile): 3 questions with "Why am I being asked?"; answer one -> Missing becomes attested/verified | The interview fills what documents miss |
| 4:00 | Lead: create release for Ananya (Core Dev), generate plan, **View-As Ananya**, then View-As Kabir | Same ledger, different scoped views |
| 4:45 | Admin: Canary run -> grid turns green; show audit **Verify chain** | Zero leakage is tested, not claimed |
| 5:15 | Ananya acknowledges; show receipt hash and verify | Governance, honestly scoped |
| 5:40 | Readiness score and constellation (orphans glow) | Where to act next; close with the vision |

Fallbacks: if Claude is slow, switch to pre-seeded project; if the network fails, replay mode; if realtime fails, polling still updates.

## 5. Video outline (Round 3, 3-4 min)
Hook (problem) -> architecture in 20 s (diagram) -> golden path (above, condensed) -> proof moments (verifier rejection, canary green, hash chain) -> what is next (connectors, bus-factor monitor) -> credits and honest limitations.

## 6. README.md for the repo (final)
Sections: pitch, GIF of Evidence Lens, architecture diagram (mermaid from docs/02), features by round, quick start (docs/03), env vars, testing, deploy, security model summary, limitations, team and AI-assistance declaration, licence.

## 7. Submission checklist
- [ ] Production URLs for web and API; demo credentials in the form (demo users only).
- [ ] Public GitHub repo with README, docs, CI badge, no secrets (run gitleaks).
- [ ] Round 2 criteria mapped (docs/14) with evidence links (screenshots, test results).
- [ ] Measured numbers only (docs/11 section 5).
- [ ] Declarations: synthetic data; AI assistance disclosed accurately (coding assistants were used; designs and verification logic reviewed by the team).
- [ ] Known limitations listed (e.g., single-instance background jobs, small-corpus assumptions, no live Slack/Jira connectors).
- [ ] Backup plan: screen recording of the full demo.

## 8. Honest limitations to state
- Verification proves a quote exists in the source, not that the source is correct.
- Receipt proves what was released, not that it was read.
- Accuracy numbers come from a small synthetic gold set and will vary on real repos.
- Role scoping is enforced by Postgres RLS and tested on the fixture; it is not a formal proof.
