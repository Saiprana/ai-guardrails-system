/**
 * AI Guardrails Control System - API Server
 * Node.js Express Application - Port 3000
 * 
 * This is the API layer that handles requests from the Angular frontend
 * and proxies to the Python agent engine.
 */

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5434,
    database: process.env.DB_NAME || 'guardrails_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Saipranavi99'
});

// Agent engine URL
const AGENT_ENGINE_URL = process.env.AGENT_ENGINE_URL || 'http://localhost:5000';

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'api-server' });
});

// ============================================================================
// GUARDRAIL CRUD ENDPOINTS
// ============================================================================

/**
 * GET /api/guardrails
 * List all guardrail rules with optional filtering
 */
app.get('/api/guardrails', async (req, res) => {
    try {
        const { rule_type, enabled, action } = req.query;
        
        // TODO: Build dynamic query based on filters
        let query = 'SELECT * FROM guardrail_rules WHERE 1=1';
        const params = [];
        
        if (rule_type) {
            params.push(rule_type);
            query += ` AND rule_type = $${params.length}`;
        }
        
        if (enabled !== undefined) {
            params.push(enabled === 'true');
            query += ` AND enabled = $${params.length}`;
        }
        
        if (action) {
            params.push(action);
            query += ` AND action = $${params.length}`;
        }
        
        query += ' ORDER BY priority ASC';
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching guardrails:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch guardrails' 
        });
    }
});

/**
 * GET /api/guardrails/:id
 * Get a specific guardrail rule by ID
 */
app.get('/api/guardrails/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM guardrail_rules WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Guardrail not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching guardrail:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch guardrail' 
        });
    }
});

/**
 * POST /api/guardrails
 * Create a new guardrail rule
 */
app.post('/api/guardrails', async (req, res) => {
    try {
        const {
            rule_name,
            description,
            rule_type,
            trigger_condition,
            action,
            target_roles,
            config,
            priority,
            enabled
        } = req.body;
        
        // TODO: Add validation
        if (!rule_name || !rule_type || !trigger_condition || !action) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }
        
        const result = await pool.query(
            `INSERT INTO guardrail_rules 
            (rule_name, description, rule_type, trigger_condition, action, 
             target_roles, config, priority, enabled)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                rule_name,
                description || null,
                rule_type,
                JSON.stringify(trigger_condition),
                action,
                target_roles || [],
                JSON.stringify(config || {}),
                priority || 100,
                enabled !== false
            ]
        );
        
        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: 'Guardrail created successfully'
        });
        
    } catch (error) {
        console.error('Error creating guardrail:', error);
        
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({
                success: false,
                error: 'A guardrail with this name already exists'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create guardrail' 
        });
    }
});

/**
 * PUT /api/guardrails/:id
 * Update an existing guardrail rule
 */
app.put('/api/guardrails/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            rule_name,
            description,
            rule_type,
            trigger_condition,
            action,
            target_roles,
            config,
            priority,
            enabled
        } = req.body;
        
        // TODO: Build dynamic update query
        const result = await pool.query(
            `UPDATE guardrail_rules 
            SET rule_name = COALESCE($1, rule_name),
                description = COALESCE($2, description),
                rule_type = COALESCE($3, rule_type),
                trigger_condition = COALESCE($4, trigger_condition),
                action = COALESCE($5, action),
                target_roles = COALESCE($6, target_roles),
                config = COALESCE($7, config),
                priority = COALESCE($8, priority),
                enabled = COALESCE($9, enabled),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *`,
            [
                rule_name,
                description,
                rule_type,
                trigger_condition ? JSON.stringify(trigger_condition) : null,
                action,
                target_roles,
                config ? JSON.stringify(config) : null,
                priority,
                enabled,
                id
            ]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Guardrail not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Guardrail updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating guardrail:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update guardrail' 
        });
    }
});

/**
 * DELETE /api/guardrails/:id
 * Delete a guardrail rule
 */
app.delete('/api/guardrails/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM guardrail_rules WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Guardrail not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Guardrail deleted successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error deleting guardrail:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete guardrail' 
        });
    }
});

// ============================================================================
// CHAT / QUERY ENDPOINTS
// ============================================================================

/**
 * POST /api/chat/query
 * Execute a query through the agent engine
 */
app.post('/api/chat/query', async (req, res) => {
    try {
        const { user_id, query, tools, context } = req.body;
        
        // Validate request
        if (!user_id || !query) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: user_id, query'
            });
        }
        
        // TODO: Proxy request to Python agent engine
        const response = await axios.post(
            `${AGENT_ENGINE_URL}/api/agent/query`,
            {
                user_id,
                query,
                tools: tools || ['database_query'],
                context: context || {}
            },
            {
                timeout: 30000 // 30 second timeout
            }
        );
        
        res.json({
            success: true,
            data: response.data
        });
        
    } catch (error) {
        console.error('Error executing query:', error.message);
        
        if (error.response) {
            // Agent engine returned an error
            return res.status(error.response.status).json({
                success: false,
                error: error.response.data.error || 'Agent engine error'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Failed to execute query' 
        });
    }
});

/**
 * GET /api/users
 * Get list of users for testing
 */
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id, 
                u.username, 
                u.role, 
                u.department,
                e.name as employee_name
            FROM users u
            LEFT JOIN employees e ON u.employee_id = e.id
            ORDER BY u.role, u.username
        `);
        
        res.json({
            success: true,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch users' 
        });
    }
});

// ============================================================================
// AUDIT LOG ENDPOINTS
// ============================================================================

/**
 * GET /api/audit-logs
 * Retrieve audit logs with filtering
 */
app.get('/api/audit-logs', async (req, res) => {
    try {
        const { 
            user_id, 
            tool, 
            blocked, 
            date_from, 
            date_to, 
            limit = 50,
            offset = 0 
        } = req.query;
        
        // TODO: Build dynamic query with filters
        let query = `
            SELECT 
                al.*,
                u.username,
                u.role as user_role
            FROM audit_log al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE 1=1
        `;
        const params = [];
        
        if (user_id) {
            params.push(user_id);
            query += ` AND al.user_id = $${params.length}`;
        }
        
        if (tool) {
            params.push(tool);
            query += ` AND al.tool_invoked = $${params.length}`;
        }
        
        if (blocked !== undefined) {
            params.push(blocked === 'true');
            query += ` AND al.blocked = $${params.length}`;
        }
        
        if (date_from) {
            params.push(date_from);
            query += ` AND al.timestamp >= $${params.length}`;
        }
        
        if (date_to) {
            params.push(date_to);
            query += ` AND al.timestamp <= $${params.length}`;
        }
        
        query += ` ORDER BY al.timestamp DESC`;
        
        params.push(limit);
        query += ` LIMIT $${params.length}`;
        
        params.push(offset);
        query += ` OFFSET $${params.length}`;
        
        const result = await pool.query(query, params);
        
        // Get total count
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM audit_log'
        );
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset),
                count: result.rows.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch audit logs' 
        });
    }
});

/**
 * GET /api/audit-logs/:id
 * Get a specific audit log entry
 */
app.get('/api/audit-logs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT 
                al.*,
                u.username,
                u.role as user_role,
                u.department
            FROM audit_log al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.id = $1
        `, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Audit log not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching audit log:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch audit log' 
        });
    }
});

// ============================================================================
// STATISTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/stats/dashboard
 * Get dashboard statistics
 */
app.get('/api/stats/dashboard', async (req, res) => {
    try {
        // TODO: Implement dashboard statistics
        // - Total queries today
        // - Blocked queries percentage
        // - Most triggered hooks
        // - Risk score distribution
        
        const totalQueries = await pool.query(`
            SELECT COUNT(*) as count 
            FROM audit_log 
            WHERE timestamp >= CURRENT_DATE
        `);
        
        const blockedQueries = await pool.query(`
            SELECT COUNT(*) as count 
            FROM audit_log 
            WHERE blocked = true 
            AND timestamp >= CURRENT_DATE
        `);
        
        const topHooks = await pool.query(`
            SELECT 
                UNNEST(hooks_triggered) as hook,
                COUNT(*) as count
            FROM audit_log
            WHERE timestamp >= CURRENT_DATE
            GROUP BY hook
            ORDER BY count DESC
            LIMIT 5
        `);
        
        res.json({
            success: true,
            data: {
                total_queries: parseInt(totalQueries.rows[0].count),
                blocked_queries: parseInt(blockedQueries.rows[0].count),
                top_hooks: topHooks.rows,
                updated_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch statistics' 
        });
    }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found' 
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('AI Guardrails API Server Started');
    console.log('='.repeat(60));
    console.log(`Port: ${PORT}`);
    console.log(`Database: ${process.env.DB_NAME || 'guardrails_db'}`);
    console.log(`Agent Engine: ${AGENT_ENGINE_URL}`);
    console.log('='.repeat(60));
    console.log('\nAvailable endpoints:');
    console.log('  GET    /health');
    console.log('  GET    /api/guardrails');
    console.log('  POST   /api/guardrails');
    console.log('  PUT    /api/guardrails/:id');
    console.log('  DELETE /api/guardrails/:id');
    console.log('  POST   /api/chat/query');
    console.log('  GET    /api/audit-logs');
    console.log('  GET    /api/users');
    console.log('  GET    /api/stats/dashboard');
    console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    pool.end();
    process.exit(0);
});

module.exports = app;
