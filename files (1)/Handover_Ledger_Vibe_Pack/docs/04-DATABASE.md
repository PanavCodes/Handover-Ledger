# 04. Database: Schema, RLS, Audit Chain

Split into migration files under `supabase/migrations/` in this order. The SQL below is the reference; adapt syntax if the CLI complains, but keep the behaviour.

Supabase gotchas the agent must respect:
- Extensions live in the `extensions` schema: use `extensions.vector(384)` and `extensions.digest(...)`.
- Functions that use pgvector operators (`<=>`) or `digest` need `set search_path = public, extensions`.
- `auth.uid()` reads `request.jwt.claims`. The API sets it with `set_config` (docs/05).

## 0001_extensions_enums.sql
```sql
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type app_role         as enum ('admin','lead','leaver','successor');
create type sensitivity_level as enum ('team','restricted','confidential');
create type source_type      as enum ('github_repo','markdown','task_export','chat_export','meeting_notes','git_log','interview');
create type claim_type       as enum ('decision','owner','blocker','risk','open_question','contact','milestone','credential_ref','process');
create type claim_status     as enum ('verified','inferred','conflicting','missing');
create type review_state     as enum ('pending','approved','rejected','edited');
create type claim_origin     as enum ('extracted','attested','manual');
create type job_status       as enum ('queued','running','succeeded','failed');
create type release_status   as enum ('draft','published','acknowledged','superseded');
```

## 0002_core_tables.sql
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role app_role not null,
  scope text,                      -- e.g. 'core_dev', 'coordinator' (successor lenses)
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index on project_members (user_id);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  email text not null,
  role app_role not null,
  scope text,
  token text not null unique default encode(extensions.gen_random_bytes(24),'hex'),
  invited_by uuid not null references profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  type source_type not null,
  sensitivity sensitivity_level not null,                 -- NO default: label is mandatory
  allowed_roles app_role[] not null,                      -- NO default
  allowed_scopes text[] not null default '{}',            -- empty = any scope within allowed roles
  origin_url text,
  storage_path text,
  status text not null default 'pending',                 -- pending|ingesting|ready|failed
  meta jsonb not null default '{}',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create index on sources (project_id);

create table source_grants (            -- explicit per-user access to confidential sources
  source_id uuid references sources(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  granted_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  primary key (source_id, user_id)
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  path text not null,                    -- e.g. 'README.md', 'commits/abc123', 'chat/2024-03.json#c12'
  title text,
  kind text not null,                    -- file|commit|pull_request|issue|chat_window|task_row|interview_answer
  content text not null,                 -- canonical text; ALL offsets refer to this string
  content_hash text not null,
  meta jsonb not null default '{}',      -- author, date, url, sha...
  created_at timestamptz not null default now(),
  unique (source_id, path, content_hash)
);
create index on documents (project_id);
create index on documents (source_id);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  ordinal int not null,
  start_offset int not null,
  end_offset int not null,
  text text not null,
  embedding extensions.vector(384),
  tsv tsvector generated always as (to_tsvector('english', text)) stored
);
create index on chunks (project_id);
create index on chunks (document_id);
create index chunks_tsv_idx on chunks using gin (tsv);
-- Exact scan at demo scale. Optional later: hnsw (embedding vector_cosine_ops)
```

## 0003_claims.sql
```sql
create table claims (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type claim_type not null,
  title text not null,
  statement text not null,
  subject_key text not null,             -- normalised entity, e.g. 'cron:nightly-backup'
  assertion_value text,                  -- e.g. owner name for 'owner' claims
  status claim_status not null,
  basis text not null default 'explicit',-- explicit|inferred
  inference_note text,
  confidence numeric(3,2) not null check (confidence between 0 and 1),
  review_state review_state not null default 'pending',
  origin claim_origin not null default 'extracted',
  embedding extensions.vector(384),
  version int not null default 1,
  created_by uuid references profiles(id),   -- null for pipeline
  attested_by uuid references profiles(id),  -- leaver for attested claims
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on claims (project_id, type);
create index on claims (project_id, subject_key);

create table claim_citations (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  quote text not null,
  start_offset int not null,
  end_offset int not null,
  verified boolean not null default true,
  verification_method text not null default 'exact_normalised',
  created_at timestamptz not null default now(),
  check (end_offset > start_offset)
);
create index on claim_citations (claim_id);

create table claim_rejections (          -- what the verifier threw away (admin view)
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  proposed jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table claim_versions (            -- append-only snapshots
  id bigint generated always as identity primary key,
  claim_id uuid not null references claims(id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  change_type text not null,             -- created|edited|approved|rejected|status_changed|resolved
  changed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table claim_conflicts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  claim_a uuid not null references claims(id) on delete cascade,
  claim_b uuid not null references claims(id) on delete cascade,
  reason text not null,
  detected_by text not null,             -- rule|llm|leaver
  state text not null default 'open',    -- open|resolved
  resolution text,                       -- keep_a|keep_b|keep_both|reconciled
  resolution_note text,
  resolved_claim uuid references claims(id),
  resolved_by uuid references profiles(id),
  resolved_at timestamptz,
  unique (claim_a, claim_b)
);

create table interview_questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  leaver_id uuid not null references profiles(id),
  gap_type text not null,                -- no_runbook|no_owner|credential_no_rotation|unresolved_question|bus_factor|conflict
  question text not null,
  reason text not null,                  -- shown to the leaver: "Why am I being asked?"
  risk_score numeric(4,2) not null default 0,
  related_claim_id uuid references claims(id) on delete set null,
  state text not null default 'open',    -- open|answered|skipped
  answer text,
  skip_reason text,
  answer_document_id uuid references documents(id),
  answered_at timestamptz
);
```

## 0004_releases_audit_jobs.sql
```sql
create table releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  successor_id uuid not null references profiles(id),
  role_scope text not null,              -- 'core_dev'|'coordinator'|...
  status release_status not null default 'draft',
  summary text,
  created_by uuid not null references profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create table release_claims (
  release_id uuid references releases(id) on delete cascade,
  claim_id uuid references claims(id) on delete cascade,
  claim_version int not null,
  primary key (release_id, claim_id)
);
create table plan_items (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references releases(id) on delete cascade,
  horizon text not null check (horizon in ('day1','week1','month1')),
  position int not null default 0,
  title text not null,
  description text,
  claim_ids uuid[] not null default '{}',
  priority int not null default 2,
  done boolean not null default false,
  done_at timestamptz
);
create table acknowledgements (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null unique references releases(id) on delete cascade,
  user_id uuid not null references profiles(id),
  statements jsonb not null,
  receipt jsonb not null,                -- canonical receipt payload
  receipt_hash text not null,            -- sha256 hex of canonical JSON
  signature text,                        -- base64 Ed25519 over receipt_hash
  signed_at timestamptz not null default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null,                    -- ingest|extract|conflicts|gaps|plan
  source_id uuid references sources(id) on delete cascade,
  status job_status not null default 'queued',
  stage text,
  progress int not null default 0,       -- 0..100
  detail jsonb not null default '{}',
  error text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table llm_calls (
  id bigint generated always as identity primary key,
  project_id uuid references projects(id) on delete cascade,
  purpose text not null, model text not null,
  input_tokens int, output_tokens int, cache_read_tokens int,
  latency_ms int, created_at timestamptz not null default now()
);

-- ===== audit log: append-only, hash chained per project =====
create table audit_log (
  id bigint generated always as identity primary key,
  project_id uuid not null references projects(id) on delete cascade,
  actor_id uuid,
  action text not null,                  -- e.g. source.uploaded, claim.approved, release.published, view_as.started
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}',
  prev_hash text,
  hash text,
  created_at timestamptz not null default now()
);
create index on audit_log (project_id, id);

create or replace function audit_chain() returns trigger
language plpgsql set search_path = public, extensions as $$
declare last_hash text;
begin
  perform pg_advisory_xact_lock(hashtext(new.project_id::text));
  select hash into last_hash from audit_log where project_id = new.project_id order by id desc limit 1;
  new.prev_hash := coalesce(last_hash, repeat('0',64));
  new.created_at := now();
  new.hash := encode(digest(
      new.prev_hash || '|' || new.project_id::text || '|' || coalesce(new.actor_id::text,'') || '|' ||
      new.action || '|' || coalesce(new.entity_type,'') || '|' || coalesce(new.entity_id::text,'') || '|' ||
      new.payload::text || '|' || new.created_at::text, 'sha256'), 'hex');
  return new;
end $$;
create trigger audit_chain_bi before insert on audit_log for each row execute function audit_chain();

create or replace function audit_immutable() returns trigger language plpgsql as $$
begin raise exception 'audit_log is append-only'; end $$;
create trigger audit_no_mutate before update or delete on audit_log for each row execute function audit_immutable();

create or replace function claim_versions_immutable() returns trigger language plpgsql as $$
begin raise exception 'claim_versions is append-only'; end $$;
create trigger cv_no_mutate before update or delete on claim_versions for each row execute function claim_versions_immutable();

alter publication supabase_realtime add table jobs, interview_questions;
```
`verify_audit_chain(project_id)` is implemented in Python (`services/audit.py`): iterate rows in id order, recompute each hash, compare. Return the first broken id or `ok`.

## 0005_rls_functions.sql
```sql
create or replace function member_role(p_project uuid) returns app_role
language sql stable security definer set search_path = public as $$
  select role from project_members where project_id = p_project and user_id = auth.uid()
$$;
create or replace function member_scope(p_project uuid) returns text
language sql stable security definer set search_path = public as $$
  select scope from project_members where project_id = p_project and user_id = auth.uid()
$$;
create or replace function is_member(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = p_project and user_id = auth.uid())
$$;

-- Core access rule for a source. Everything else derives from this.
create or replace function can_read_source(p_source uuid) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare s record; r app_role; sc text;
begin
  select project_id, sensitivity, allowed_roles, allowed_scopes into s from sources where id = p_source;
  if not found then return false; end if;
  r := member_role(s.project_id);
  if r is null then return false; end if;
  if r = 'admin' then return true; end if;
  if exists (select 1 from source_grants g where g.source_id = p_source and g.user_id = auth.uid()) then
    return true;
  end if;
  if s.sensitivity = 'confidential' then return false; end if;
  if not (r = any (s.allowed_roles)) then return false; end if;
  if s.sensitivity = 'restricted' and coalesce(array_length(s.allowed_scopes,1),0) > 0 then
    sc := member_scope(s.project_id);
    return sc is not null and sc = any (s.allowed_scopes);
  end if;
  return true;
end $$;

-- A claim is readable only if the viewer may read EVERY source it cites (most restrictive wins),
-- plus a role-based visibility rule on the claim itself.
create or replace function can_read_claim(p_claim uuid) returns boolean
language plpgsql stable security definer set search_path = public, extensions as $$
declare c record; r app_role;
begin
  select id, project_id, review_state, created_by, attested_by into c from claims where id = p_claim;
  if not found then return false; end if;
  r := member_role(c.project_id);
  if r is null then return false; end if;
  if exists (
    select 1 from claim_citations cc join documents d on d.id = cc.document_id
    where cc.claim_id = p_claim and not can_read_source(d.source_id)
  ) then return false; end if;
  if r in ('admin','lead') then return true; end if;
  if r = 'leaver' then
    return c.attested_by = auth.uid() or c.created_by = auth.uid() or c.review_state in ('approved','edited');
  end if;
  -- successor: only claims inside a published release addressed to them
  return exists (
    select 1 from release_claims rc join releases rel on rel.id = rc.release_id
    where rc.claim_id = p_claim and rel.successor_id = auth.uid()
      and rel.status in ('published','acknowledged')
  );
end $$;

create or replace function can_read_release(p_release uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from releases r where r.id = p_release and (
      member_role(r.project_id) in ('admin','lead')
      or (r.successor_id = auth.uid() and r.status in ('published','acknowledged')))
  )
$$;
```

## 0006_rls_policies.sql
```sql
alter table profiles            enable row level security;
alter table projects            enable row level security;
alter table project_members     enable row level security;
alter table invitations         enable row level security;
alter table sources             enable row level security;
alter table source_grants       enable row level security;
alter table documents           enable row level security;
alter table chunks              enable row level security;
alter table claims              enable row level security;
alter table claim_citations     enable row level security;
alter table claim_rejections    enable row level security;
alter table claim_versions      enable row level security;
alter table claim_conflicts     enable row level security;
alter table interview_questions enable row level security;
alter table releases            enable row level security;
alter table release_claims      enable row level security;
alter table plan_items          enable row level security;
alter table acknowledgements    enable row level security;
alter table jobs                enable row level security;
alter table llm_calls           enable row level security;
alter table audit_log           enable row level security;

-- Read policies. Writes happen only through the API's admin connection (no INSERT/UPDATE policies for `authenticated`).
create policy profiles_read on profiles for select using (
  id = auth.uid() or exists (select 1 from project_members a join project_members b
    on a.project_id = b.project_id where a.user_id = auth.uid() and b.user_id = profiles.id));
create policy projects_read on projects for select using (is_member(id));
create policy members_read  on project_members for select using (is_member(project_id));
create policy invites_read  on invitations for select using (member_role(project_id) in ('admin','lead'));

create policy sources_read   on sources   for select using (can_read_source(id));
create policy documents_read on documents for select using (can_read_source(source_id));
create policy chunks_read    on chunks    for select using (can_read_source(source_id));
create policy grants_read    on source_grants for select using (member_role((select project_id from sources s where s.id = source_id)) in ('admin','lead'));

create policy claims_read    on claims for select using (can_read_claim(id));
create policy citations_read on claim_citations for select using (can_read_claim(claim_id));
create policy versions_read  on claim_versions for select using (member_role((select project_id from claims c where c.id = claim_id)) in ('admin','lead'));
create policy rejections_read on claim_rejections for select using (member_role(project_id) in ('admin','lead'));
create policy conflicts_read on claim_conflicts for select using (
  member_role(project_id) in ('admin','lead') and can_read_claim(claim_a) and can_read_claim(claim_b));
create policy interview_read on interview_questions for select using (
  member_role(project_id) in ('admin','lead') or leaver_id = auth.uid());

create policy releases_read  on releases for select using (can_read_release(id));
create policy rc_read        on release_claims for select using (can_read_release(release_id) and can_read_claim(claim_id));
create policy plan_read      on plan_items for select using (can_read_release(release_id));
create policy ack_read       on acknowledgements for select using (user_id = auth.uid() or can_read_release(release_id));
create policy jobs_read      on jobs for select using (member_role(project_id) in ('admin','lead','leaver'));
create policy llm_read       on llm_calls for select using (member_role(project_id) = 'admin');
create policy audit_read     on audit_log for select using (member_role(project_id) in ('admin','lead'));

grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
```
Plan items: a successor marks an item done through `PATCH /plan-items/{id}` (API checks ownership; admin connection writes). Everything else is read-only for `authenticated`.

## 0007_helpers.sql
- `search_chunks(p_project uuid, p_query vector(384), p_k int)`: **SECURITY INVOKER** (so RLS applies) returning top-k chunks by `embedding <=> p_query`. Because it is invoker, the caller must be inside a `db_user` transaction.
- `claim_search(p_project uuid, p_query vector(384), p_k int)` analogous for claims.
- Trigger `claims_touch_updated_at`.
- Realtime publication already set in 0004.

## Seed
`supabase/seed.sql` is minimal (nothing sensitive). The demo cast, project and fixture sources are created by `scripts/seed_demo.py` (docs/13), which uses the Supabase Admin API to create auth users, then inserts memberships, then runs the pipeline on the fixtures.

## Database tests (`apps/api/tests/db/`)
Write pytest tests that connect as `postgres`, create users and memberships, then `SET LOCAL ROLE authenticated` + claims and assert:
1. A member of project A cannot see any row of project B in any table.
2. `successor` sees no claims until a release is published to them; after publish, sees only released claims.
3. A claim citing both a `team` source and a `confidential` source is invisible to lead without a grant, visible to admin.
4. `audit_log` UPDATE/DELETE raises, including from the admin connection.
5. `sources` insert without sensitivity/allowed_roles fails (NOT NULL).
