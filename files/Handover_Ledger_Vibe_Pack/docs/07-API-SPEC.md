# 07. API Specification

Base: `/api/v1`. JSON unless stated. Auth: `Authorization: Bearer <Supabase access token>`. All bodies and responses are pydantic models; the OpenAPI schema is the contract (`pnpm gen:api-types`).

**Errors:** `{ "error": { "code": "forbidden", "message": "…", "details": {} } }` with HTTP 400/401/403/404/409/422/429/500. Common codes: `unauthorized`, `forbidden`, `not_found`, `validation_error`, `label_required`, `preview_read_only`, `budget_exceeded`, `rate_limited`, `github_rate_limited`.

**Pagination:** `?limit=50&cursor=<opaque>`; response `{ items: [], next_cursor }`.

Legend: **R** = role needed (A admin, L lead, V leaver, S successor, M any member). Reads use `db_user` (RLS); writes use `db_admin` after the role check and write an audit row.

## Health
| Method | Path | Notes |
|---|---|---|
| GET | `/healthz` | liveness, no auth |
| GET | `/readyz` | DB ping + embedding model loaded; used by Render health check |

## Me and projects
| Method | Path | R | Body / Notes |
|---|---|---|---|
| GET | `/me` | any | `{id,email,display_name,memberships:[{project_id,role,scope}]}` |
| POST | `/projects` | any | `{name,description}`; creator becomes `admin` |
| GET | `/projects` | M | list user's projects |
| GET | `/projects/{id}` | M | project + caller role/scope + counts |
| GET | `/projects/{id}/members` | A,L | list |
| POST | `/projects/{id}/invitations` | A,L | `{email,role,scope}`; lead cannot invite `admin`; returns invite link |
| POST | `/invitations/accept` | any | `{token}` |
| PATCH | `/projects/{id}/members/{user_id}` | A | `{role?,scope?}` |
| DELETE | `/projects/{id}/members/{user_id}` | A | |

## Sources and ingestion
| Method | Path | R | Body / Notes |
|---|---|---|---|
| POST | `/projects/{id}/sources` | A,L | multipart: `file`, `type`, `name`, **`sensitivity`**, **`allowed_roles[]`**, `allowed_scopes[]`; 422 `label_required` if missing; returns `{source, job}` (202) |
| POST | `/projects/{id}/sources/github` | A,L | `{repo_url, token?, include_globs?, exclude_globs?, sensitivity, allowed_roles, allowed_scopes}` -> 202 `{source, job}` |
| GET | `/projects/{id}/sources` | M | only sources the caller can read |
| PATCH | `/sources/{id}` | A,L | change label (rules in docs/05), audited with `reason` |
| POST | `/sources/{id}/grants` | A | `{user_id}` grant for confidential sources |
| DELETE | `/sources/{id}` | A | cascades documents/chunks; claims citing it are re-evaluated (orphaned claims flagged) |
| GET | `/sources/{id}/documents` | M* | list (path, kind, size) *RLS |
| GET | `/documents/{id}` | M* | `{id,path,kind,content,meta}` for the Evidence Lens |
| GET | `/projects/{id}/search?q=` | M | hybrid (tsv + vector) over visible chunks |

## Jobs
| Method | Path | R | Notes |
|---|---|---|---|
| GET | `/projects/{id}/jobs` | A,L,V | recent jobs |
| GET | `/jobs/{id}` | A,L,V | `{status,stage,progress,detail:{proposed,verified,rejected,...},error}` |
| POST | `/projects/{id}/extract` | A,L | `{source_ids?, force?}` -> 202 `{job}` re-run extraction |
| POST | `/jobs/{id}/retry` | A,L | resumes from the failed stage |

## Claims
| Method | Path | R | Notes |
|---|---|---|---|
| GET | `/projects/{id}/claims` | M | filters: `type,status,review_state,subject_key,q,origin`; sort: `risk,confidence,updated` |
| GET | `/claims/{id}` | M* | claim + citations (with offsets) + versions (lead/admin only) |
| POST | `/projects/{id}/claims` | A,L | manual claim `{type,title,statement,subject_key,assertion_value?, citations?}`; `origin=manual`, `status=inferred` unless it has a verifiable quote |
| PATCH | `/claims/{id}` | A,L | edit fields; `review_state=edited`; new version |
| POST | `/claims/{id}/approve` | A,L | `review_state=approved` |
| POST | `/claims/{id}/reject` | A,L | `{reason}` |
| POST | `/projects/{id}/claims/bulk-approve` | A,L | `{claim_ids}`; **400 if any is not `status=verified`** |
| GET | `/claims/{id}/versions` | A,L | immutable history |
| GET | `/projects/{id}/rejections` | A,L | verifier-rejected proposals with reasons |

## Conflicts [R3]
| GET | `/projects/{id}/conflicts` | A,L | with both claims and their citations |
| POST | `/conflicts/{id}/resolve` | A,L | `{resolution: keep_a|keep_b|keep_both|reconciled, note, reconciled_claim?}` |

## Interview [R3]
| POST | `/projects/{id}/interview/generate` | A,L | `{leaver_id}` runs gap detection, returns 5-10 questions |
| GET | `/projects/{id}/interview` | A,L,V | leaver sees own questions only |
| POST | `/interview/{qid}/answer` | V | `{answer}` -> creates answer document, attested claims, conflicts if any |
| POST | `/interview/{qid}/skip` | V | `{reason}` required |

## Ask the Ledger [WOW]
| POST | `/projects/{id}/ask` | M | `{question}` -> `{answerable, segments:[{text,cites:[{kind:'claim'|'chunk',id,label}]}]}`; rate-limited 10/min/user |

## Releases, plan, export, acknowledgement
| Method | Path | R | Notes |
|---|---|---|---|
| POST | `/projects/{id}/releases` | A,L | `{successor_id, role_scope, claim_ids?}` default = all approved claims readable by that scope; status `draft` |
| GET | `/projects/{id}/releases` | A,L | |
| POST | `/releases/{id}/plan/generate` | A,L | create/replace plan items (job) |
| PATCH | `/plan-items/{id}` | A,L (edit), S (done) | |
| POST | `/releases/{id}/publish` | A,L | validates: no pending conflicts involving included claims, plan has items; sets `published`; audit |
| GET | `/releases/{id}` | A,L,S* | release + claims + plan, scoped; successor must be addressee |
| GET | `/releases/{id}/export?format=md|json` | A,L,S* | file download; filename contains no sensitive data (`handover-<project-slug>-<scope>.md`) |
| POST | `/releases/{id}/acknowledge` | S | `{statements:{reviewed_risks,ownership,scope_notice}}` all true |
| GET | `/releases/{id}/receipt` | A,L,S | receipt + hash + signature |
| GET | `/releases/{id}/receipt/verify` | A,L,S | `{hash_ok, signature_ok, newer_versions_exist}` |

### Export format (Markdown)
```
# Handover: <Project> -> <Successor> (<Scope>)
Generated <iso> · Release <id> · <n> claims · Readiness at release: <score>
## Day 1
- [ ] <title> [^c3][^c7]
...
## Owners / Risks / Decisions / Contacts / Open questions
- **<title>** (Verified, 0.93): <statement> [^c3]
...
[^c3]: README.md · "<verbatim quote>" 
```
JSON export mirrors this with `claims[]`, `citations[]` (document path, quote, offsets) and `plan_items[]`.

## Insights
| GET | `/projects/{id}/readiness` | A,L | score + components + fix-next |
| GET | `/projects/{id}/graph` | M | `{nodes,edges}` from claims visible to caller |
| GET | `/projects/{id}/bus-factor` | A,L | components with concentration data |

## Governance
| GET | `/projects/{id}/audit` | A,L | filter by `action,actor,entity`; pagination |
| GET | `/projects/{id}/audit/verify` | A | recompute chain -> `{ok, checked, first_bad_id?}` |
| POST | `/projects/{id}/canary/run` | A | -> matrix `{members:[{user,role,scope,results:[{surface,canary,seen,expected}]}], passed}` |
| (header) | `X-Preview-As: <user_id>` | A,L | GET only; see docs/05 |

## Streaming and realtime
Job progress is delivered through Supabase Realtime on `jobs` (client subscribes with the user's token; RLS limits rows). `/ask` may later stream via SSE; the R2 version returns JSON.

## Rate limits
Per user token bucket: `/ask` 10/min, uploads 6/min, GitHub ingest 3/hour/project. Return 429 with `Retry-After`.
