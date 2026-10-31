export interface Project {
  id: string
  name: string
  domain: string
  description: string
  template: string
  created_at?: string
  sources_count?: number
  requirements_count?: number
  open_questions_count?: number
  artifacts_count?: number
}

export interface ProjectDetail {
  project: Project
  metrics: {
    sources_total: number
    sources_parsed: number
    sources_partial_or_failed: number
    requirements_total: number
    requirements_confirmed: number
    requirements_conflict: number
    questions_open: number
    artifacts_total: number
    artifacts_approved: number
    artifacts_draft: number
  }
  recent_activity: Array<{
    id: string
    actor: string
    action: string
    target_type: string
    target_id: string
    timestamp: string
    details: any
  }>
}

export interface SourceDocument {
  id: string
  project_id: string
  filename: string
  role: string
  mime_type: string
  file_size: number
  parse_state: 'queued' | 'parsing' | 'parsed' | 'partial' | 'failed' | 'requires_review'
  page_count: number
  worksheet_count: number
  parse_report: {
    readable_units: number
    total_units: number
    unit_label: string
    unreadable_units: number
    warnings: string[]
    errors: string[]
    metadata: any
    is_partial: boolean
  }
  warnings: string[]
  created_at: string
}

export interface SourceSpan {
  id: string
  source_id: string
  locator: string
  span_type: string
  excerpt: string
  metadata_json?: any
}

export interface Requirement {
  id: string
  project_id: string
  kind: 'business_rule' | 'workflow_step' | 'field_validation' | 'dependency' | 'unresolved_question'
  statement: string
  original_text: string
  structured_rule: any
  source_span_ids: string[]
  status: 'extracted' | 'confirmed' | 'corrected' | 'rejected' | 'conflict'
  has_conflict: boolean
  conflict_details?: {
    type: string
    sources: Array<{ doc: string; locator: string; claimed_value: any }>
    explanation: string
  }
  unresolved_question_ids: string[]
}

export interface Question {
  id: string
  project_id: string
  question_text: string
  impact: string
  is_blocking: boolean
  competing_evidence: Array<{
    source: string
    locator: string
    excerpt: string
    claim: string
  }>
  suggested_options: Array<{
    label: string
    value: string
  }>
  status: 'open' | 'answered' | 'waived'
  affected_requirement_ids: string[]
  affected_artifact_types: string[]
  answer?: string
  decision_id?: string
  created_at: string
}

export interface Artifact {
  id: string
  project_id: string
  name: string
  artifact_type: 'configuration' | 'workflow' | 'mapping' | 'test_suite'
  current_version: number
  status: 'draft' | 'validated' | 'review_needed' | 'approved'
  created_at: string
  updated_at: string
}

export interface ArtifactVersion {
  id: string
  artifact_id: string
  version_number: number
  content_json: any
  schema_version: string
  status: 'draft' | 'validated' | 'review_needed' | 'approved'
  validation_summary: {
    is_valid: boolean
    schema_valid: boolean
    citation_coverage_pct: number
    unresolved_questions_count: number
    rule_checks_passed: boolean
    errors: Array<{ severity: string; code: string; path: string; message: string; action: string }>
    warnings: Array<{ severity: string; code: string; path: string; message: string; action: string }>
    readiness_signals: {
      target_schema: string
      citation_coverage: string
      unresolved_questions: string
      semantic_rule_checks: string
    }
  }
  author: string
  model_used: string
  change_summary: string
  is_approved: boolean
  approved_by?: string
  approved_at?: string
  created_at: string
}

export interface ArtifactEvidenceLink {
  id: string
  artifact_version_id: string
  target_pointer: string
  requirement_id?: string
  source_span_id?: string
  provenance_kind: 'source_grounded' | 'human_decision' | 'manual_unverified'
  note?: string
}

export interface ProviderStatus {
  groq: {
    configured: boolean
    masked_key: string
    primary_model: string
    complex_model: string
    reasoning_effort: string
    available_models: Array<{ id: string; name: string; context_window: number; tier: string }>
  }
  llama_cloud: {
    configured: boolean
    masked_key: string
    tier: string
    enabled: boolean
  }
  demo_mode: boolean
  offline_mode_active: boolean
}
