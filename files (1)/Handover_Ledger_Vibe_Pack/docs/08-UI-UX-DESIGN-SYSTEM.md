# 08. UI/UX Design System

Owner: Panav. Goal: a tool that feels like a **trusted ledger**: calm, precise, evidence-first, with moments of delight. Not a generic AI chat UI.

## 1. Concept: "Ink & Evidence"
Paper-and-ink aesthetic with a modern interface. Warm off-white pages, deep ink text, thin rules like ledger lines, and status colours used as **stamps**. Serif display type gives gravitas; mono type signals "this is verbatim source text".

Signature moments:
1. **Stamp animation**: when a claim becomes Verified, a small stamp ("VERIFIED") presses in with a subtle rotation and settle.
2. **Evidence Lens**: the source slides in from the right; the cited span is highlighted with a marker-stroke animation and scrolled to centre.
3. **Constellation**: orphaned components pulse softly; hovering a person lights their owned components.
4. **Readiness gauge** fills with an eased sweep on load.
5. **Leak Canary grid** cells flip green one by one.

## 2. Tokens (`globals.css`, shadcn variable style, HSL)
```css
:root {
  --background: 40 33% 97%;      /* paper */
  --foreground: 222 24% 10%;     /* ink */
  --card: 0 0% 100%;
  --muted: 40 18% 92%;           --muted-foreground: 222 10% 40%;
  --border: 40 15% 85%;          --ring: 173 70% 28%;
  --primary: 173 72% 24%;        /* verdigris */  --primary-foreground: 40 33% 97%;
  --accent: 36 90% 55%;          /* marker amber, for highlights */
  --radius: 0.625rem;
  /* status */
  --verified: 152 60% 32%;   --verified-bg: 152 45% 92%;
  --inferred: 38 92% 38%;    --inferred-bg: 40 90% 90%;
  --conflict: 350 70% 42%;   --conflict-bg: 350 80% 94%;
  --missing: 222 10% 45%;    --missing-bg: 222 15% 94%;
  --highlight: 48 100% 70%;  /* evidence span */
}
.dark {
  --background: 222 22% 7%;  --foreground: 40 25% 94%;
  --card: 222 20% 10%;       --muted: 222 16% 15%; --muted-foreground: 222 10% 62%;
  --border: 222 14% 20%;     --primary: 170 60% 52%; --primary-foreground: 222 22% 7%;
  --verified: 152 55% 55%;   --verified-bg: 152 35% 14%;
  --inferred: 40 90% 62%;    --inferred-bg: 40 40% 15%;
  --conflict: 350 80% 66%;   --conflict-bg: 350 40% 16%;
  --missing: 222 10% 62%;    --missing-bg: 222 12% 16%;
  --highlight: 48 90% 45%;
}
```
Extend Tailwind (`tailwind.config.ts`) with `verified`, `inferred`, `conflict`, `missing`, `highlight` colours referencing the variables.

## 3. Typography
- Display and page titles: **Fraunces** (variable, optical size), weights 500-700.
- UI text: **Inter**, 14px base, 1.5 line height.
- Source text, quotes, IDs, hashes: **JetBrains Mono** 13px.
- Scale: 12 / 13 / 14 / 16 / 20 / 28 / 40. Tabular numerals for scores and counts.

## 4. Layout
- App shell: left sidebar (64px collapsed / 240px expanded), top bar (project switcher, search/Cmd+K, role chip, theme toggle, avatar).
- Content max width 1200px; ledger tables full width; Evidence Lens uses a 5/7 split.
- 8px spacing grid. Cards have 1px border, no heavy shadows; elevation only for overlays.
- Mobile (<=640px): sidebar becomes a bottom sheet; tables become stacked cards; successor and leaver flows are mobile-first.

## 5. Status language (never colour alone)
| Status | Icon (lucide) | Label | Style |
|---|---|---|---|
| Verified | `BadgeCheck` | Verified | solid tint, stamp animation |
| Inferred | `Sparkles` | Inferred | amber tint, tooltip: "Concluded from evidence; no source states it directly" |
| Conflicting | `GitCompareArrows` | Conflicting | rose tint, pulsing ring until resolved |
| Missing | `CircleDashed` | Missing | **dashed border**, muted tint |
Review state shown separately (small pill): Pending / Approved / Edited / Rejected.
Confidence: 5-segment meter plus numeric value in tooltip (never shown alone as "AI certainty"; label "Evidence confidence").

## 6. Core components
| Component | Details |
|---|---|
| `StatusBadge` | props: status, size; includes accessible text and tooltip |
| `ConfidenceMeter` | 5 segments, `aria-label="Evidence confidence 0.82"` |
| `ClaimCard` | type icon, title, statement (2-line clamp), badges, citation chips `README.md:12-14`, actions on hover/focus |
| `CitationChip` | opens Evidence Lens; shows path and short quote on hover |
| `EvidenceLens` | split view; left claim + all citations as tabs; right document viewer (mono, line numbers, highlighted span via offsets, "copy quote", "open source") |
| `ConflictCompare` | two ClaimCards side by side with diff-style highlights and resolution bar |
| `ReadinessGauge` | SVG ring, animated, sub-scores list, "Fix next" actions |
| `PlanBoard` | three columns (Day 1 / Week 1 / Month 1), drag to reorder (lead), checkboxes (successor), claim chips on each item |
| `Constellation` | React Flow canvas with custom nodes, minimap, filter chips, role lens indicator |
| `RoleChip` + `ViewAsBanner` | persistent banner with colour change while previewing |
| `RedactionNotice` | quiet info block "Some context is not included in your role" (no hints) |
| `JobProgress` | stepper over pipeline stages, live counts (proposed / verified / rejected) |
| `CanaryGrid` | rows = members, columns = surfaces, cells flip to green/red |
| `CommandPalette` | cmdk: navigate, jump to claim, run extraction, toggle theme, View-As |
| `EmptyState` | illustration (simple SVG line art), one sentence, one primary action |

## 7. Motion
- `framer-motion`, durations 150-300 ms, `ease-out`; spring only for stamps and lens slide.
- Respect `prefers-reduced-motion`: disable stamp rotation, pulses and sweeps; keep instant state changes.
- Skeletons for all loading states (no spinners on whole pages).

## 8. Content and microcopy
- Tone: calm, precise, plain English. No "AI magic" language.
- Always explain badges and "why am I asked" in context. Examples:
  - Inferred: "Concluded from the evidence below. Nothing states it directly. Please confirm."
  - Verified: "The quoted text was found word-for-word in the source."
  - Redaction: "Some context is not included in your role."
- Errors say what happened and what to do next. Never expose stack traces or restricted names.

## 9. Accessibility (WCAG 2.1 AA)
- Contrast >= 4.5:1 for text (check status pills in both themes with an automated tool).
- Full keyboard use: visible focus ring (`--ring`), logical tab order, `Esc` closes lens/dialogs, focus returns to trigger.
- ARIA: landmarks, `aria-live="polite"` for job progress and toasts, labelled icon buttons, `role="status"` on badges.
- Review shortcuts: `J/K` move, `A` approve, `R` reject, `E` edit, `Enter` open lens, `?` shows shortcuts. Disable when typing in inputs.
- Test with `@axe-core/playwright` on every main route (docs/11).

## 10. Page designs (summary; details in docs/09)
1. **Landing:** hero headline "Handovers you can verify." Animated demo: a claim card flips Inferred -> Verified as a quote highlights in a mock source. Three proof tiles (Evidence, Roles, Plan). CTA: "Open the demo project".
2. **Project overview:** readiness gauge, pipeline status, "Fix next" list, activity, quick actions.
3. **Ledger:** filter bar, claims table/cards toggle, bulk-approve bar for verified claims.
4. **Lens:** described above.
5. **Constellation, Plan, Ask, Audit, Canary, Settings.**
6. **Successor home (`/h/[id]`):** greeting, "Your first day" checklist at the top, progress ring, evidence on tap, "What's not included in your role" notice, acknowledge CTA when ready.

## 11. Assets
- Logo: wordmark "Handover Ledger" in Fraunces with a small ledger-line glyph (SVG). Favicon: simple "HL" monogram.
- Illustrations: minimal line SVGs (generate with code; no stock images). OG image generated statically.
