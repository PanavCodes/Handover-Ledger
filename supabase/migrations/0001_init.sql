-- ==============================================================================
-- Handover Ledger: Supabase Postgres Initial Migration
-- Security Architecture: RLS Enabled on All Tables (Deny-All to Public Anon Key)
-- Auditing: Head-Anchored SHA-256 Hash Chain with Concurrency Advisory Lock
-- ==============================================================================

-- Enable UUID and PGCrypto extensions
create extension if not exists "pgcrypto";

-- 1. Workspaces
create table workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- 2. Sources
create table sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  type text not null check (type in ('github','markdown','tasks','chat','notes','capture','git_log')),
  sensitivity text not null check (sensitivity in ('team','restricted','confidential')), -- Mandatory label, NO default
  allowed_scopes text[] not null default '{}', -- e.g. {'core_dev'}, {'coordinator'}, or empty for any
  origin_url text,
  created_by text,
  created_at timestamptz not null default now()
);
create index idx_sources_workspace on sources(workspace_id);

-- 3. Documents (Canonical text store for exact offset referencing)
create table documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_id uuid not null references sources(id) on delete cascade,
  path text not null,
  kind text not null, -- file, commit, pr, issue, chat_window, task_row, quick_capture
  content text not null, -- Canonical text; all citation offsets map to this exact string
  content_hash text not null,
  meta jsonb not null default '{}',
  extract_state text not null default 'pending', -- pending, done, failed
  created_at timestamptz not null default now(),
  unique (source_id, path, content_hash)
);
create index idx_documents_workspace on documents(workspace_id);
create index idx_documents_source on documents(source_id);

-- 4. Claims (Atomic, evidence-grounded facts)
create table claims (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  type text not null check (type in ('decision','owner','blocker','risk','open_question','contact','milestone','credential_ref','process')),
  title text not null,
  statement text not null,
  subject_key text not null, -- e.g. "component:firmware", "cron:nightly-backup"
  assertion_value text,      -- e.g. "Rahul Mehta", "MQTT over ROS"
  status text not null check (status in ('verified','inferred','conflicting','missing')),
  basis text not null default 'explicit', -- explicit, inferred, attested
  inference_note text,
  confidence numeric(3,2) not null check (confidence between 0 and 1),
  review_state text not null default 'pending' check (review_state in ('pending','approved','rejected','edited')),
  origin text not null default 'extracted' check (origin in ('extracted','attested','manual','git_derived')),
  captured_by text,
  attested_by text,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_claims_workspace on claims(workspace_id);
create index idx_claims_subject on claims(workspace_id, subject_key);
create index idx_claims_type on claims(workspace_id, type);

-- 5. Claim Citations (Verbatim quotes mapped to byte offsets)
create table claim_citations (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  quote text not null,
  start_offset int not null,
  end_offset int not null,
  verified boolean not null default true,
  support_score numeric(3,2) not null default 1.0,
  created_at timestamptz not null default now(),
  check (end_offset > start_offset)
);
create index idx_citations_claim on claim_citations(claim_id);
create index idx_citations_document on claim_citations(document_id);

-- 6. Claim Versions (Audit trail of lead edits & approvals)
create table claim_versions (
  id bigint generated always as identity primary key,
  claim_id uuid not null references claims(id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  change_type text not null, -- created, edited, approved, rejected, resolved
  changed_by text,
  created_at timestamptz not null default now()
);
create index idx_versions_claim on claim_versions(claim_id);

-- 7. Claim Rejections (Quotes that failed verbatim string verification)
create table claim_rejections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  proposed jsonb not null,
  reason text not null, -- quote_not_found, secret_detected, below_min_length, unsupported
  diff_analysis jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_rejections_workspace on claim_rejections(workspace_id);

-- 8. Briefs (Pre-computed / cached successor roadmaps)
create table briefs (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  scope text not null, -- 'all', 'core_dev', 'coordinator'
  plan jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (workspace_id, scope)
);

-- 9. Tamper-Evident Head-Anchored Audit Log
create table audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  seq int not null,
  prev_hash text not null,
  record_hash text not null,
  actor text not null,
  action text not null,
  entity text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_audit_workspace_seq on audit_log(workspace_id, seq);

-- 10. Audit Head Anchors (External anchor to prevent tail-truncation attacks)
create table audit_head_anchors (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  expected_count int not null default 0,
  expected_head_hash text not null default '0000000000000000000000000000000000000000000000000000000000000000',
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- ROW LEVEL SECURITY: DENY-ALL TO PUBLIC ANON KEY
-- The public anon key has 0 select/insert/update/delete permissions.
-- All client reads and mutations route through Next.js route handlers using
-- the server-only service_role key, which explicitly enforces lib/access.ts.
-- ==============================================================================

alter table workspaces enable row level security;
alter table sources enable row level security;
alter table documents enable row level security;
alter table claims enable row level security;
alter table claim_citations enable row level security;
alter table claim_versions enable row level security;
alter table claim_rejections enable row level security;
alter table briefs enable row level security;
alter table audit_log enable row level security;
alter table audit_head_anchors enable row level security;
