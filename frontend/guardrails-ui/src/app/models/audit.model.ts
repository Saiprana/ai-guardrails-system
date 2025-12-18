export interface AuditLog {
  id: number;
  username: string;
  query: string;
  tool_invoked: string;
  hooks_triggered: string[];
  blocked: boolean;
  data_masked: boolean;
  risk_score: number;
  timestamp: string;
}