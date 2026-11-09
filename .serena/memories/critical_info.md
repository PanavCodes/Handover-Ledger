# Handover Ledger: Architectural Invariants & Memory

## 1. Core Principles & Non-Negotiables
1. **No Claim Without Evidence:** Every claim displayed in the ledger MUST have at least one verbatim citation string-verified against the stored document content, or be an explicit leaver attestation.
2. **Restricted Means Absent:** Data that a persona's role cannot read is never fetched, never passed to an LLM, and never sent in an API response. The single server-side visibility choke point is `lib/access.ts`.
3. **No-Sign-In Hackathon Path:** Judges access `/demo` and select a persona (Dr. Meera [Lead], Rahul [Leaver], Ananya [Core Dev], Kabir [Coordinator]). This sets a signed, httpOnly session cookie. Real auth and full RLS policies return in Round 3.
4. **Deny-All Anon Key:** Postgres RLS is enabled on all tables with NO public policies. The client anon key can read zero rows. Only server route handlers using the service role key can access data.
5. **Deterministic Quote Snapping:** LLM outputs anchor text; `lib/verifier.ts` snaps to the exact character substring and computes canonical offsets.
6. **Head-Anchored Tamper-Evident Audit:** Every mutation appends to a running SHA-256 hash chain with Postgres advisory locking to serialize writes and an external anchor table to prevent tail truncation.
7. **Synthetic Data Only:** All fixtures and demo content are based on the fictional "Aurora Robotics Club".

## 2. Technology Stack
- **Framework:** Next.js 14 App Router, TypeScript strict mode.
- **Styling:** Tailwind CSS, shadcn/ui, Framer Motion.
- **Typography:** Fraunces (serif display), Inter (UI), JetBrains Mono (code/evidence).
- **Database:** Supabase Postgres 15.
- **AI Engine:** Anthropic Claude 3.5 Sonnet with forced tool-use (`record_claims`).

## 3. Directory Layout
- `apps/web`: Next.js 14 App Router fullstack application.
- `apps/web/src/lib/verifier.ts`: Deterministic quote snapping & verification engine.
- `apps/web/src/lib/access.ts`: Single authorization and role-scoping choke point.
- `apps/web/src/lib/git-owner.ts`: Deterministic git-ownership analyzer.
- `apps/web/src/lib/audit.ts`: Head-anchored cryptographic audit log.
- `supabase/migrations`: SQL migrations (0001_init.sql).
- `fixtures/aurora-robotics`: Synthetic demo corpus and canary fixtures.

