# 05. Authentication, Roles and Redaction

Owner: Panav (design + frontend enforcement), Padminish (API + DB). This is the heart of the "Permission-First" promise.

## 1. Identity
- Supabase Auth: **email magic link** and **Google OAuth**. No passwords in our code.
- Web uses `@supabase/ssr` (cookie sessions). Server components read the session; the browser never stores tokens in `localStorage`.
- On first login a DB trigger or the `/me` endpoint creates the `profiles` row from `auth.users`.
- **Invite-only membership:** a user can access a project only through `project_members`. Lead/admin creates an `invitation` (email + role + scope); on login the web app calls `POST /invitations/accept` with the token.

```sql
-- supabase/migrations/0008_profile_trigger.sql
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();
```

## 2. Roles
| Role | Purpose | Notes |
|---|---|---|
| `admin` | Org owner; sees everything; manages members, labels, grants, audit | At least one per project; created project owner |
| `lead` | Reviews and releases | Sees team + restricted by allowed_roles; confidential only by grant |
| `leaver` | Departing member | Answers interview; sees own attestations and approved claims |
| `successor` | Receives handover | Sees only claims in a published release addressed to them |

**Scopes** (successor lenses): `core_dev`, `coordinator` (extensible). A source labelled `restricted` with `allowed_scopes = {core_dev}` is invisible to `coordinator` successors. Scope is stored on `project_members.scope`; releases carry `role_scope` which must equal the successor's scope (API enforces).

## 3. Permission matrix
| Capability | admin | lead | leaver | successor |
|---|:-:|:-:|:-:|:-:|
| Create project, invite members | Yes | Invite only | No | No |
| Upload / label sources | Yes | Yes | No | No |
| Change a source label | Yes | Yes (not to lower than its current level) | No | No |
| See `team` sources/claims | Yes | Yes | Yes (approved) | Via release |
| See `restricted` | Yes | Per allowed_roles | Per allowed_roles | Per allowed_roles + scope, via release |
| See `confidential` | Yes | Grant only | Grant only | Grant only |
| Run extraction | Yes | Yes | No | No |
| Approve / edit / reject / add claims | Yes | Yes | Own attestations (edit own answer) | No |
| Resolve conflicts | Yes | Yes | No | No |
| Answer interview | No | No | Yes | No |
| Create / publish release | Yes | Yes | No | No |
| View-As preview | Yes | Yes | No | No |
| Mark plan items done | No | No | No | Yes (own release) |
| Acknowledge | No | No | No | Yes (own release) |
| Read audit / verify chain / run canary | Yes | Audit read only | No | No |

Label changes: lowering sensitivity (confidential to team) is admin-only and audited with a reason; raising is allowed to lead.

## 4. How the API enforces it (FastAPI)
```python
# deps.py (sketch; the agent implements fully)
async def get_current_user(request) -> AuthUser:
    token = bearer_token(request)
    claims = verify_supabase_jwt(token)        # HS256 secret OR JWKS (RS256/ES256); check exp, aud='authenticated'
    return AuthUser(id=UUID(claims["sub"]), email=claims.get("email"), claims=claims)

async def db_user(request, user=Depends(get_current_user)):
    """RLS-enforced connection. Use for EVERY read served to a user."""
    effective = await resolve_preview(request, user)    # see View-As
    async with pool.connection() as conn:
        async with conn.transaction():
            await conn.execute("set local role authenticated")
            await conn.execute("select set_config('request.jwt.claims', %s, true)",
                               [json.dumps({"sub": str(effective.id), "role": "authenticated"})])
            yield conn

async def db_admin():
    """Bypasses RLS. Pipeline/writes only, AFTER explicit role checks. Never serve user reads."""
    async with pool.connection() as conn:
        async with conn.transaction():
            yield conn

def require_role(*roles):          # dependency factory
    async def dep(project_id: UUID, user=Depends(get_current_user), conn=Depends(db_admin)):
        role = await fetch_role(conn, project_id, user.id)
        if role not in roles: raise HTTPException(403, "forbidden")
        return Membership(project_id, user.id, role, ...)
    return dep
```
Rules:
- The role comes from `project_members`, never from the JWT body or the client.
- With the Supabase transaction pooler (port 6543) use `prepare_threshold=None` in psycopg and keep `SET LOCAL` inside a transaction.
- Return 404 (not 403) for resources the user cannot see, to avoid existence leaks, except where the project membership itself is the issue.

## 5. Redaction model (what "restricted" looks like)
1. **Server-side removal.** RLS means restricted rows never leave the DB for that user.
2. **Aggregate placeholders, not hints.** UI shows "Some context is not included in your role" once per section. No titles, no per-item counts for confidential items. A coarse banner is allowed ("1+ restricted sources exist"), never source names.
3. **LLM context safety.** Ask-the-Ledger, roadmap generation for a release, and export run under `db_user` of the *target* viewer, so redacted text can never be summarised.
4. **Derived data respects the strictest source.** Claims, graph nodes and plan items are computed from visible rows only. Do not cache derived data across roles. Cache keys include role scope and user id.
5. **No side channels.** Search, hover cards, error messages, filenames, export file names, OpenGraph/page titles and URLs must not carry restricted info.
6. **Plan items** that depend on a hidden claim are omitted for that viewer; the lead sees a warning when previewing: "2 plan items omitted for this scope".

## 6. View-As (lead/admin preview) [WOW]
- Header `X-Preview-As: <user_id>` is honoured only on `GET` requests, only for `admin`/`lead` of that project, and only if the target is a member.
- `resolve_preview` swaps the effective user for `db_user`. Writes are rejected while previewing (403 `preview_read_only`).
- The first request in a preview session writes `view_as.started` to the audit log (target, actor); the UI shows a persistent banner "Viewing as Ananya (Core Dev)" with an Exit button.

## 7. Leak Canary [WOW]
The fixture contains unique canary strings in sources of each sensitivity (docs/13). `POST /projects/{id}/canary/run` (admin) executes, for every project member, a battery of reads (claims list, claim detail, document fetch, chunk search, Ask-the-Ledger with adversarial prompts, graph, plan, export) under that member's RLS context and reports a matrix of `member x surface x canary-seen?`. Expected: a canary is seen only by roles allowed to see its source. Results are stored in the audit log. The UI renders it as a green/red grid.

## 8. Frontend enforcement (UX layer, not the boundary)
- Route protection in `middleware.ts`: unauthenticated users are redirected to `/login`; `/app/p/[id]/*` requires membership (checked by a server `GET /projects/{id}` call; 404 page otherwise).
- Server components fetch with the user's access token (forwarded from the cookie session) so the API sees the real user.
- A `useCan(capability)` hook derives from `/me` + `/projects/{id}` role for hiding buttons. Hiding is convenience only; the API re-checks.
- Role-specific shells: lead console (`/app/p/...`) vs successor experience (`/h/[releaseId]`), so a successor never loads lead code paths.
- Every screen has a permission-denied state with an explanation and a "Request access" button (creates an audit entry and notifies the lead; stretch).

## 9. Acknowledgement and receipts [R3]
1. Successor opens `/h/[releaseId]/acknowledge`, sees a summary (counts by type, open risks, conflicts flagged), and three required confirmations: I reviewed the open risks; I understand ownership transfers; I understand what was withheld from my scope.
2. API builds the canonical receipt:
```json
{ "release_id": "...", "project_id": "...", "user_id": "...", "role_scope": "core_dev",
  "claims": [ {"id":"...","version":3,"content_sha256":"..."} ],
  "statements": {"reviewed_risks":true,"ownership":true,"scope_notice":true},
  "signed_at": "2026-..Z" }
```
3. Canonicalise (sorted keys, no whitespace, UTF-8), `receipt_hash = sha256(canonical)`, sign hash with Ed25519 server key (`RECEIPT_SIGNING_KEY`), store hash + signature, append to the audit chain.
4. `GET /releases/{id}/receipt/verify` recomputes the hash from stored claim versions and verifies the signature. If a claim version changed afterwards, the verification still passes for the original (versions are immutable) but flags that newer versions exist.
5. UI wording: "This receipt proves what was released to you and when. It does not prove you read it."

## 10. Security checklist
- [ ] RLS enabled on every table; tests prove cross-project isolation.
- [ ] No endpoint reads user-visible data through `db_admin`.
- [ ] JWT audience and expiry validated; clock skew <= 60 s.
- [ ] CORS limited to the web origin; no wildcard with credentials.
- [ ] Rate limits on `/ask` and upload (per user, in-memory token bucket is enough for the demo).
- [ ] Upload validation: size, extension allowlist, text decoding with `chardet`, no archive bombs (zip only for repo uploads, max 20 MB, max 2,000 files, path traversal blocked).
- [ ] Secrets only in env; `.env*` gitignored; scan with `gitleaks` in CI.
- [ ] Security headers on web (`next.config.js` headers: CSP basic, X-Content-Type-Options, Referrer-Policy).
