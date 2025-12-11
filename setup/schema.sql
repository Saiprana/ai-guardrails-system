-- AI Guardrails Control System - Database Schema
-- PostgreSQL 14+

-- Drop existing tables (for clean reinstall)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS guardrail_rules CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(50) NOT NULL,
    role VARCHAR(100) NOT NULL,
    salary DECIMAL(10, 2) NOT NULL,
    manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_email ON employees(email);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TYPE user_role_enum AS ENUM ('admin', 'manager', 'employee');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    role user_role_enum NOT NULL,
    department VARCHAR(50),
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department);

-- ============================================================================
-- GUARDRAIL RULES TABLE
-- ============================================================================
CREATE TYPE rule_type_enum AS ENUM ('pre_hook', 'post_hook');
CREATE TYPE rule_action_enum AS ENUM ('block', 'mask', 'filter', 'require_approval');

CREATE TABLE guardrail_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    rule_type rule_type_enum NOT NULL,
    trigger_condition JSONB NOT NULL,
    action rule_action_enum NOT NULL,
    target_roles TEXT[] DEFAULT '{}',
    config JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_guardrails_type ON guardrail_rules(rule_type);
CREATE INDEX idx_guardrails_enabled ON guardrail_rules(enabled);
CREATE INDEX idx_guardrails_priority ON guardrail_rules(priority);
CREATE INDEX idx_guardrails_trigger_gin ON guardrail_rules USING GIN (trigger_condition);

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(50),
    query TEXT NOT NULL,
    tool_invoked VARCHAR(50),
    hooks_triggered TEXT[] DEFAULT '{}',
    action_taken VARCHAR(50),
    data_masked BOOLEAN DEFAULT false,
    blocked BOOLEAN DEFAULT false,
    risk_score INTEGER,
    response_summary TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit queries
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_tool ON audit_log(tool_invoked);
CREATE INDEX idx_audit_blocked ON audit_log(blocked);
CREATE INDEX idx_audit_hooks_gin ON audit_log USING GIN (hooks_triggered);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guardrails_updated_at BEFORE UPDATE ON guardrail_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for employee hierarchy
CREATE OR REPLACE VIEW employee_hierarchy AS
SELECT 
    e.id,
    e.name,
    e.email,
    e.department,
    e.role,
    e.salary,
    m.name as manager_name,
    m.id as manager_id
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;

-- View for recent audit activity
CREATE OR REPLACE VIEW recent_audit_activity AS
SELECT 
    al.id,
    al.username,
    u.role as user_role,
    al.query,
    al.tool_invoked,
    al.hooks_triggered,
    al.action_taken,
    al.blocked,
    al.data_masked,
    al.timestamp
FROM audit_log al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.timestamp DESC
LIMIT 100;

-- ============================================================================
-- GRANT PERMISSIONS (adjust based on your setup)
-- ============================================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table creation
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

COMMENT ON TABLE employees IS 'Stores employee information including salary and reporting structure';
COMMENT ON TABLE users IS 'Application users with role-based access control';
COMMENT ON TABLE guardrail_rules IS 'Configurable rules for pre/post-processing of AI queries';
COMMENT ON TABLE audit_log IS 'Complete audit trail of all query executions and guardrail actions';
