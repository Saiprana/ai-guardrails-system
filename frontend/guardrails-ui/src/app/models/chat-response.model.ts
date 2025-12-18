export interface ChatResponse {
  success: boolean;
  data: {
    response: any;
    hooks_triggered: string[];
    blocked: boolean;
    data_masked: boolean;
    risk_score: number;
    audit_id: number;
    metadata?: {
      total_results?: number;
      tools_used?: string[];
      tools_blocked?: string[];
    };
  };
}
