export interface GuardrailRule {
  id: number;
  rule_name: string;
  rule_type: 'pre_hook' | 'post_hook';
  action: 'block' | 'mask' | 'filter' | 'require_approval';
  enabled: boolean;
  priority: number;
  target_roles: string[];
}