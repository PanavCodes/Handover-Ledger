export type SensitivityLevel = "team" | "restricted" | "confidential";
export type SourceType = "github" | "markdown" | "tasks" | "chat" | "notes" | "capture" | "git_log";
export type ClaimType =
  | "decision"
  | "owner"
  | "blocker"
  | "risk"
  | "open_question"
  | "contact"
  | "milestone"
  | "credential_ref"
  | "process";
export type ClaimStatus = "verified" | "inferred" | "conflicting" | "missing";
export type ReviewState = "pending" | "approved" | "rejected" | "edited";
export type ClaimOrigin = "extracted" | "attested" | "manual" | "git_derived";

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  is_demo: boolean;
  created_at: string;
  expires_at?: string;
}

export interface Source {
  id: string;
  workspace_id: string;
  name: string;
  type: SourceType;
  sensitivity: SensitivityLevel;
  allowed_scopes: string[]; // e.g. ['core_dev'], ['coordinator'], or [] for all
  origin_url?: string;
  created_by?: string;
  created_at: string;
}

export interface Document {
  id: string;
  workspace_id: string;
  source_id: string;
  path: string;
  kind: string;
  content: string;
  content_hash: string;
  meta: Record<string, any>;
  extract_state: "pending" | "done" | "failed";
  created_at: string;
}

export interface Citation {
  id: string;
  claim_id: string;
  document_id: string;
  quote: string;
  start_offset: number;
  end_offset: number;
  verified: boolean;
  support_score: number;
  document_path?: string;
  source_name?: string;
  source_sensitivity?: SensitivityLevel;
  source_allowed_scopes?: string[];
  created_at: string;
}

export interface Claim {
  id: string;
  workspace_id: string;
  type: ClaimType;
  title: string;
  statement: string;
  subject_key: string;
  assertion_value?: string;
  status: ClaimStatus;
  basis: "explicit" | "inferred" | "attested";
  inference_note?: string;
  confidence: number;
  review_state: ReviewState;
  origin: ClaimOrigin;
  captured_by?: string;
  attested_by?: string;
  version: number;
  citations?: Citation[];
  created_at: string;
  updated_at: string;
}

export interface ClaimVersion {
  id: number;
  claim_id: string;
  version: number;
  snapshot: any;
  change_type: string;
  changed_by?: string;
  created_at: string;
}

export interface ClaimRejection {
  id: string;
  workspace_id: string;
  document_id?: string;
  proposed: any;
  reason: string;
  diff_analysis?: {
    hallucinated_words?: string[];
    found_similar_words?: string[];
    diff_html?: string;
  };
  created_at: string;
}

export interface AuditRecord {
  id: number;
  workspace_id: string;
  seq: number;
  prev_hash: string;
  record_hash: string;
  actor: string;
  action: string;
  entity?: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface AuditHeadAnchor {
  workspace_id: string;
  expected_count: number;
  expected_head_hash: string;
  updated_at: string;
}

export interface HandoverBrief {
  workspace_id: string;
  scope: string;
  plan: {
    decisions: Claim[];
    unfinished: Claim[];
    ownership: {
      person: string;
      claims: Claim[];
    }[];
    risks: Claim[];
    roadmap: {
      day1: RoadmapItem[];
      week1: RoadmapItem[];
      month1: RoadmapItem[];
    };
  };
  generated_at: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  timeframe: "day1" | "week1" | "month1";
  linked_claim_ids: string[];
  required_scope?: "all" | "core_dev" | "coordinator";
  done?: boolean;
}

export interface InterviewQuestion {
  id: string;
  workspace_id: string;
  gap_rule: string;
  subject_key: string;
  question: string;
  why_asked: string;
  status: "pending" | "answered" | "skipped";
  answer_text?: string;
  skip_reason?: string;
  resulting_claim_id?: string;
  missing_claim_id?: string;
  created_at: string;
  answered_at?: string;
}

export interface AttestationState {
  leaver_attested: boolean;
  leaver_name?: string;
  leaver_attested_at?: string;
  leaver_signature_hash?: string;
  successor_core_acknowledged: boolean;
  successor_core_at?: string;
  successor_core_receipt_hash?: string;
  successor_coord_acknowledged: boolean;
  successor_coord_at?: string;
  successor_coord_receipt_hash?: string;
}

