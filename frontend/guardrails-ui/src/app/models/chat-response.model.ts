export interface ChatResponse {
  response: any;
  hooks_triggered: string[];
  blocked: boolean;
  data_masked: boolean;
  risk_score: number;
  audit_id: number;
}