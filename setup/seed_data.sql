-- AI Guardrails Control System - Seed Data
-- Run this after schema.sql

-- ============================================================================
-- SEED EMPLOYEES DATA
-- ============================================================================

-- Engineering Department
INSERT INTO employees (name, email, department, role, salary, manager_id) VALUES
('Sarah Chen', 'sarah.chen@company.com', 'Engineering', 'VP Engineering', 180000.00, NULL),
('Alisha Kumar', 'alisha.kumar@company.com', 'Engineering', 'Senior Software Engineer', 145000.00, 1),
('Nelson Rodriguez', 'nelson.rodriguez@company.com', 'Engineering', 'Senior Software Engineer', 142000.00, 1),
('David Park', 'david.park@company.com', 'Engineering', 'Software Engineer', 115000.00, 2),
('Emma Watson', 'emma.watson@company.com', 'Engineering', 'Software Engineer', 108000.00, 2);

-- Sales Department
INSERT INTO employees (name, email, department, role, salary, manager_id) VALUES
('Michael Thompson', 'michael.thompson@company.com', 'Sales', 'VP Sales', 165000.00, NULL),
('Jessica Lee', 'jessica.lee@company.com', 'Sales', 'Senior Account Executive', 128000.00, 6),
('Robert Kim', 'robert.kim@company.com', 'Sales', 'Account Executive', 95000.00, 7);

-- HR Department
INSERT INTO employees (name, email, department, role, salary, manager_id) VALUES
('Linda Martinez', 'linda.martinez@company.com', 'HR', 'Director HR', 155000.00, NULL),
('James Wilson', 'james.wilson@company.com', 'HR', 'HR Manager', 105000.00, 9);

-- Finance Department
INSERT INTO employees (name, email, department, role, salary, manager_id) VALUES
('Patricia Brown', 'patricia.brown@company.com', 'Finance', 'CFO', 220000.00, NULL),
('Thomas Anderson', 'thomas.anderson@company.com', 'Finance', 'Senior Financial Analyst', 125000.00, 11);

-- ============================================================================
-- SEED USERS DATA
-- ============================================================================

-- Admin users
INSERT INTO users (username, role, department, employee_id) VALUES
('admin', 'admin', NULL, NULL),
('linda_admin', 'admin', 'HR', 9);

-- Manager users
INSERT INTO users (username, role, department, employee_id) VALUES
('sarah_manager', 'manager', 'Engineering', 1),
('michael_manager', 'manager', 'Sales', 6),
('patricia_manager', 'manager', 'Finance', 11);

-- Employee users
INSERT INTO users (username, role, department, employee_id) VALUES
('alisha_employee', 'employee', 'Engineering', 2),
('nelson_employee', 'employee', 'Engineering', 3),
('david_employee', 'employee', 'Engineering', 4),
('jessica_employee', 'employee', 'Sales', 7),
('robert_employee', 'employee', 'Sales', 8);

-- ============================================================================
-- SEED GUARDRAIL RULES
-- ============================================================================

-- Rule 1: Block direct salary queries for non-authorized users
INSERT INTO guardrail_rules (
    rule_name, 
    description,
    rule_type, 
    trigger_condition, 
    action, 
    target_roles,
    config,
    priority,
    enabled
) VALUES (
    'block_unauthorized_salary_access',
    'Prevents non-managers and non-admin users from accessing direct salary information',
    'pre_hook',
    '{"keywords": ["salary", "compensation", "pay", "wages"], "tools": ["database_query"]}',
    'block',
    ARRAY['employee'],
    '{"error_message": "You do not have permission to access salary information", "allow_own_salary": true}',
    10,
    true
);

-- Rule 2: Mask salary data in responses for managers (non-direct reports)
INSERT INTO guardrail_rules (
    rule_name,
    description,
    rule_type,
    trigger_condition,
    action,
    target_roles,
    config,
    priority,
    enabled
) VALUES (
    'mask_non_direct_report_salaries',
    'Masks exact salary values for employees not directly managed by the requesting manager',
    'post_hook',
    '{"data_fields": ["salary", "compensation"], "tools": ["database_query"]}',
    'mask',
    ARRAY['manager'],
    '{"mask_format": "range", "range_size": 20000, "show_direct_reports": true}',
    20,
    true
);

-- Rule 3: Block web search with internal data
INSERT INTO guardrail_rules (
    rule_name,
    description,
    rule_type,
    trigger_condition,
    action,
    target_roles,
    config,
    priority,
    enabled
) VALUES (
    'prevent_data_leakage_websearch',
    'Prevents web search tool from being invoked when query contains internal employee data',
    'pre_hook',
    '{"tools": ["web_search"], "context_contains": ["employee_name", "salary_data", "internal_email"]}',
    'block',
    ARRAY['employee', 'manager', 'admin'],
    '{"error_message": "Cannot use web search with internal employee data. Please rephrase your query.", "detect_patterns": ["@company.com", "salary", "compensation"]}',
    5,
    true
);

-- Rule 4: Allow department aggregates for managers
INSERT INTO guardrail_rules (
    rule_name,
    description,
    rule_type,
    trigger_condition,
    action,
    target_roles,
    config,
    priority,
    enabled
) VALUES (
    'allow_department_aggregates',
    'Allows managers to see aggregated salary data for their department',
    'post_hook',
    '{"query_type": "aggregate", "functions": ["avg", "sum", "count", "min", "max"]}',
    'filter',
    ARRAY['manager'],
    '{"allow_own_department": true, "min_aggregate_size": 3, "remove_outliers": false}',
    30,
    true
);

-- Rule 5: Filter cross-department queries
INSERT INTO guardrail_rules (
    rule_name,
    description,
    rule_type,
    trigger_condition,
    action,
    target_roles,
    config,
    priority,
    enabled
) VALUES (
    'filter_cross_department_access',
    'Filters query results to only show data from the user''s own department',
    'post_hook',
    '{"query_scope": "cross_department", "tools": ["database_query"]}',
    'filter',
    ARRAY['employee', 'manager'],
    '{"filter_by": "department", "allow_public_fields": ["name", "department", "role"]}',
    15,
    true
);

-- Rule 6: Detect PII in queries
INSERT INTO guardrail_rules (
    rule_name,
    description,
    rule_type,
    trigger_condition,
    action,
    target_roles,
    config,
    priority,
    enabled
) VALUES (
    'detect_pii_exposure',
    'Detects and masks personally identifiable information in queries and responses',
    'post_hook',
    '{"pii_types": ["email", "phone", "ssn", "address"]}',
    'mask',
    ARRAY['employee', 'manager'],
    '{"mask_char": "*", "preserve_domain": true}',
    25,
    true
);

-- Rule 7: Require approval for high-risk queries
INSERT INTO guardrail_rules (
    rule_name,
    description,
    rule_type,
    trigger_condition,
    action,
    target_roles,
    config,
    priority,
    enabled
) VALUES (
    'require_approval_high_risk',
    'Requires admin approval for queries accessing sensitive data or bulk operations',
    'pre_hook',
    '{"keywords": ["all employees", "entire company", "everyone", "bulk"], "risk_threshold": 80}',
    'require_approval',
    ARRAY['employee', 'manager'],
    '{"approval_required_from": "admin", "timeout_hours": 24}',
    1,
    true
);

-- Rule 8: Log all financial data access
INSERT INTO guardrail_rules (
    rule_name,
    description,
    rule_type,
    trigger_condition,
    action,
    target_roles,
    config,
    priority,
    enabled
) VALUES (
    'audit_financial_access',
    'Enhanced audit logging for all financial data access',
    'post_hook',
    '{"data_classification": ["financial", "compensation"], "departments": ["Finance", "HR"]}',
    'filter',
    ARRAY['employee', 'manager', 'admin'],
    '{"log_level": "detailed", "notify_admins": true}',
    50,
    true
);

-- ============================================================================
-- SEED AUDIT LOG (Sample historical data)
-- ============================================================================

INSERT INTO audit_log (user_id, username, query, tool_invoked, hooks_triggered, action_taken, data_masked, blocked, risk_score, response_summary, metadata) VALUES
(6, 'alisha_employee', 'What is my current salary?', 'database_query', ARRAY['allow_own_salary'], 'allowed', false, false, 10, 'Retrieved own salary: $145,000', '{"department": "Engineering", "duration_ms": 145}'),
(7, 'nelson_employee', 'Show me Alisha''s salary', 'database_query', ARRAY['block_unauthorized_salary_access'], 'blocked', false, true, 90, 'Access denied - insufficient permissions', '{"blocked_by": "block_unauthorized_salary_access", "department": "Engineering"}'),
(3, 'sarah_manager', 'What is the average salary in Engineering?', 'database_query', ARRAY['allow_department_aggregates'], 'filtered', false, false, 30, 'Average Engineering salary: $127,000 (5 employees)', '{"department": "Engineering", "aggregate_count": 5}'),
(4, 'michael_manager', 'Show me all employees making over $150k', 'database_query', ARRAY['filter_cross_department_access'], 'filtered', false, false, 40, 'Filtered to Sales department only', '{"original_count": 5, "filtered_count": 1, "department": "Sales"}'),
(6, 'alisha_employee', 'What is Alisha salary compared to market rates for senior software engineers?', 'database_query,web_search', ARRAY['prevent_data_leakage_websearch'], 'blocked', false, true, 95, 'Cannot use web search with internal salary data', '{"blocked_tool": "web_search", "reason": "internal_data_detected"}'),
(3, 'sarah_manager', 'Compare David and Emma''s performance', 'database_query', ARRAY['allow_department_aggregates'], 'allowed', false, false, 20, 'Retrieved direct report data', '{"direct_reports": true, "employees": 2}'),
(2, 'linda_admin', 'Generate salary report for all departments', 'database_query', ARRAY['audit_financial_access'], 'allowed', false, false, 50, 'Full salary report generated', '{"role": "admin", "departments": 4, "total_employees": 12}');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify employee count by department
SELECT department, COUNT(*) as employee_count, ROUND(AVG(salary), 2) as avg_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC;

-- Verify user roles
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;

-- Verify guardrail rules
SELECT rule_name, rule_type, action, enabled
FROM guardrail_rules
ORDER BY priority;

-- Verify reporting structure
SELECT 
    e.name as employee,
    e.role,
    m.name as manager,
    e.department
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id
ORDER BY e.department, e.salary DESC;

-- Recent audit activity
SELECT 
    username,
    query,
    action_taken,
    blocked,
    timestamp
FROM audit_log
ORDER BY timestamp DESC
LIMIT 10;

-- ============================================================================
-- TEST QUERY TEMPLATES (for reference)
-- ============================================================================

-- Test Scenario 1: Direct salary query (should be blocked for employees)
-- User: david_employee
-- Query: "What is Alisha's salary?"
-- Expected: BLOCKED by block_unauthorized_salary_access

-- Test Scenario 2: Comparative salary query (should mask for non-direct manager)
-- User: michael_manager (Sales)
-- Query: "Compare Alisha and Nelson's salaries"
-- Expected: MASKED - only shows ranges

-- Test Scenario 3: Web search with internal data (should be blocked)
-- User: alisha_employee
-- Query: "What is Alisha's salary compared to market rates?"
-- Expected: BLOCKED - prevent_data_leakage_websearch

-- Test Scenario 4: Department aggregates (should allow)
-- User: sarah_manager (Engineering)
-- Query: "What's the average salary in Engineering department?"
-- Expected: ALLOWED - shows aggregate

-- Test Scenario 5: Cross-department query (should filter)
-- User: jessica_employee (Sales)
-- Query: "Show me all employees making over $150k"
-- Expected: FILTERED - only shows Sales department

-- ============================================================================
-- SAMPLE OUTPUT MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '==========================================================';
    RAISE NOTICE 'AI Guardrails Control System - Database Seeded Successfully!';
    RAISE NOTICE '==========================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '- Employees: % records', (SELECT COUNT(*) FROM employees);
    RAISE NOTICE '- Users: % records', (SELECT COUNT(*) FROM users);
    RAISE NOTICE '- Guardrail Rules: % records', (SELECT COUNT(*) FROM guardrail_rules);
    RAISE NOTICE '- Audit Logs: % records', (SELECT COUNT(*) FROM audit_log);
    RAISE NOTICE '';
    RAISE NOTICE 'Test Users Available:';
    RAISE NOTICE '- admin (admin role)';
    RAISE NOTICE '- sarah_manager (Engineering manager)';
    RAISE NOTICE '- michael_manager (Sales manager)';
    RAISE NOTICE '- alisha_employee (Engineering employee)';
    RAISE NOTICE '- nelson_employee (Engineering employee)';
    RAISE NOTICE '- david_employee (Engineering employee)';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready to start development!';
    RAISE NOTICE '==========================================================';
END $$;
