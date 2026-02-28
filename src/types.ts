export type Ecosystem = "npm" | "pypi" | "cargo" | "maven";
export type Verdict = "safe" | "suspicious" | "malicious";
export type Severity = "critical" | "high" | "medium" | "low";
export type ScanStatus = "pending" | "running" | "completed" | "failed";

export interface CreateScanRequest {
  package: string;
  version?: string;
  ecosystem?: Ecosystem;
  force?: boolean;
}

export interface ScanCreatedResponse {
  id: string;
  package: string;
  version: string;
  ecosystem: Ecosystem;
  status: ScanStatus;
  message: string;
}

export interface ScanDetails {
  id: string;
  package: string;
  version: string;
  ecosystem: Ecosystem;
  status: ScanStatus;
  verdict?: Verdict;
  confidence?: number;
  started_at?: string;
  finished_at?: string;
  findings_count?: number;
  dependencies_count?: number;
  token_usage?: number;
  error_message?: string;
}

export interface Finding {
  id: string;
  file_path: string;
  start_line: number;
  end_line: number;
  severity: Severity;
  confidence: number;
  rationale: string;
  agent_name: string;
  rule_id?: string;
  ai_summary?: string;
  created_at: string;
}

export interface FindingsResponse {
  scan_id: string;
  findings: Finding[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
}

export interface ScanToolResult {
  scanId: string;
  package: string;
  version: string;
  ecosystem: Ecosystem;
  status: ScanStatus;
  verdict?: Verdict;
  confidence?: number;
  findingsCount?: number;
  summary: string;
  findings?: FindingSummary[];
}

export interface FindingSummary {
  severity: Severity;
  file: string;
  line: number;
  rationale: string;
  agent: string;
}
