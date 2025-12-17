"""
AI Guardrails Control System - Agent Engine
Python Flask Application - Port 5000

This is the core agent engine that executes pre/post hooks for LLM tool invocations.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Tuple
import os
from decimal import Decimal
from flask.json.provider import DefaultJSONProvider



app = Flask(__name__)
CORS(app)

# ============================================================================
# DATABASE CONNECTION
# ============================================================================

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5434'),
    'database': os.getenv('DB_NAME', 'guardrails_db'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'Saipranavi99')
}


def get_db_connection():
    """Get PostgreSQL database connection"""
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

# ============================================================================
# GUARDRAIL RULE ENGINE
# ============================================================================

# Trial
class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

app.json = CustomJSONProvider(app)

def serialize_decimals(obj):
    if isinstance(obj, list):
        return [serialize_decimals(i) for i in obj]
    if isinstance(obj, dict):
        return {k: serialize_decimals(v) for k, v in obj.items()}
    if isinstance(obj, Decimal):
        return float(obj)
    return obj

def extract_salary_threshold(query: str):
    match = re.search(r'over\s*\$?(\d+)', query.lower())
    if match:
        return int(match.group(1)) * 1000
    return None

# trial ends

class GuardrailEngine:
    """Core engine for executing guardrail rules"""
    
    def __init__(self):
        self.sensitive_keywords = [
            'salary', 'compensation', 'pay', 'wages', 'bonus',
            'ssn', 'social security', 'personal', 'confidential'
        ]
        self.employee_name_pattern = r'\b[A-Z][a-z]+ [A-Z][a-z]+\b'
        
    def load_active_guardrails(self, user_role: str) -> List[Dict]:
        """Load active guardrail rules applicable to user's role"""
        conn = get_db_connection()
        cur = conn.cursor()
        
        # TODO: Implement query to fetch active guardrails
        # - Filter by enabled = true
        # - Filter by target_roles containing user's role
        # - Order by priority ASC (lower numbers = higher priority)
        query = """
            SELECT * FROM guardrail_rules
            WHERE enabled = true
            AND (%s = ANY(target_roles) OR 'admin' = ANY(target_roles))
            ORDER BY priority ASC
        """
        
        cur.execute(query, (user_role,))
        rules = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return [dict(rule) for rule in rules]
    
    def execute_pre_hooks(self, query: str, user: Dict, tools: List[str]) -> Dict:
        """
        Execute pre-hooks before tool invocation
        
        Returns:
            {
                "allowed": bool,
                "modified_query": str,
                "tools_blocked": [str],
                "hooks_triggered": [str],
                "reason": str,
                "risk_score": int
            }
        """
        result = {
            "allowed": True,
            "modified_query": query,
            "tools_blocked": [],
            "hooks_triggered": [],
            "reason": "",
            "risk_score": 0
        }
        
        # Load applicable guardrails
        guardrails = self.load_active_guardrails(user['role'])
        pre_hooks = [g for g in guardrails if g['rule_type'] == 'pre_hook']
        
        for hook in pre_hooks:
            # TODO: Implement trigger condition checking
            # Check if query matches trigger_condition
            
            trigger = hook['trigger_condition']
            # Trial
            keywords = trigger.get('keywords', [])
            trigger_tools = trigger.get('tools', [])
            
            # Check keywords
            # if 'keywords' in trigger:
            #     if self._contains_keywords(query, trigger['keywords']):
            # Trial
            if keywords and self._contains_keywords(query, keywords):
                    result['hooks_triggered'].append(hook['rule_name'])
                    
                    # Apply action based on rule

                    # if hook['action'] == 'block':
                    
                        # TODO: Implement blocking logic
                        # - Check if user has permission
                        # - Special handling for "allow_own_salary"
                    # Trial 1
                    # allow_own = hook['config'].get('allow_own_salary', False)
                    # if allow_own and user.get('employee_id'):
                    #     # if asking about own name, allow
                    #     if user['username'].split('_')[0].lower() in query.lower():
                    #         continue

                    # result['allowed'] = False
                    # result['reason'] = hook['config'].get('error_message', 'Access denied')
                    # result['risk_score'] = 90
                    # return result
                    # Trial 2
                    # Employees cannot query others' salaries → BLOCK
                    if user['role'] == 'employee':
                        result['allowed'] = False
                        result['reason'] = hook['config'].get(
                            'error_message',
                            'You do not have permission to access salary information'
                        )
                        result['risk_score'] = 90
                        return result

                    # Managers/Admins → ALLOW but enforce post-hook filtering & masking
                    result['risk_score'] = max(result['risk_score'], 70)
                    # break
            
            # Check for web_search with internal data
            if 'web_search' in tools and self._detect_internal_data(query):
                result['tools_blocked'].append('web_search')
                result['hooks_triggered'].append('prevent_data_leakage_websearch')
                result['allowed'] = False
                result['reason'] = 'Cannot use web search with internal employee data'
                result['risk_score'] = 95
        
        return result
    
    def execute_post_hooks(self, response_data: Any, user: Dict, tool_used: str) -> Dict:
        """
        Execute post-hooks after tool invocation
        
        Returns:
            {
                "filtered_response": Any,
                "masked_fields": [str],
                "aggregated": bool,
                "hooks_triggered": [str]
            }
        """
        result = {
            "filtered_response": response_data,
            "masked_fields": [],
            "aggregated": False,
            "hooks_triggered": []
        }
        
        # Load applicable guardrails
        guardrails = self.load_active_guardrails(user['role'])
        post_hooks = [g for g in guardrails if g['rule_type'] == 'post_hook']
        
        for hook in post_hooks:
            # TODO: Implement post-processing logic
            
            if hook['action'] == 'mask':
                # TODO: Implement data masking
                # - Mask salary fields
                # - Replace exact values with ranges
                # - Preserve structure
                # trial
                result['hooks_triggered'].append(hook['rule_name'])
                result['masked_fields'].append('salary')

                # pass
            
            elif hook['action'] == 'filter':
                # TODO: Implement data filtering
                # - Filter by department
                # - Filter by role permissions
                # - Remove unauthorized records
                # trail
                result['hooks_triggered'].append(hook['rule_name'])
                # pass
        
        return result
    
    def _contains_keywords(self, text: str, keywords: List[str]) -> bool:
        """Check if text contains any of the specified keywords"""
        text_lower = text.lower()
        return any(keyword.lower() in text_lower for keyword in keywords)
    
    def _detect_internal_data(self, query: str) -> bool:
        """Detect if query contains internal employee data"""
        # TODO: Implement detection logic
        # - Check for employee names
        # - Check for email addresses (@company.com)
        # - Check for salary keywords
        
        # Check for company email pattern
        if '@company.com' in query.lower():
            return True
        
        # Check for employee names
        names = re.findall(self.employee_name_pattern, query)
        if names:
            # Verify if these are actual employee names
            return self._verify_employee_names(names)
        
        # Check for salary keywords with specific values
        if any(kw in query.lower() for kw in ['salary', 'compensation', 'pay']):
            if re.search(r'\$?\d+[,.]?\d*k?', query):
                return True
        
        return False
    
    def _verify_employee_names(self, names: List[str]) -> bool:
        """Verify if extracted names match employee records"""
        conn = get_db_connection()
        cur = conn.cursor()
        
        for name in names:
            cur.execute("SELECT COUNT(*) as count FROM employees WHERE name ILIKE %s", (name,))
            result = cur.fetchone()
            if result['count'] > 0:
                cur.close()
                conn.close()
                return True
        
        cur.close()
        conn.close()
        return False

# ============================================================================
# TOOL SIMULATORS
# ============================================================================

class ToolSimulator:
    """Simulate LLM tool invocations"""
    
    def __init__(self):
        pass
    
    def database_query(self, query_intent: str, user: Dict) -> Dict:
        """
        Simulate database query tool
        
        Args:
            query_intent: What the user wants to query
            user: User information including role and department
        
        Returns:
            {
                "data": [...],
                "metadata": {...}
            }
        """
        conn = get_db_connection()
        cur = conn.cursor()
        
        # TODO: Implement query parsing and execution
        # - Parse query intent
        # - Apply RBAC filtering
        # - Execute appropriate SQL query
        # - Return results
        
        # Trial
        if "average" in query_intent.lower():
            cur.execute("""
                SELECT department, AVG(salary) as avg_salary, COUNT(*) as count
                FROM employees
                WHERE department = %s
                GROUP BY department
            """, (user['department'],))
            rows = cur.fetchall()
            data = [dict(r) for r in rows]

        else:
        # Example: Fetch all employees (should be filtered by post-hooks)
            # cur.execute("""
            #     SELECT id, name, email, department, role, salary
            #     FROM employees
            #     ORDER BY department, salary DESC
            # """)
            # Trial
            salary_threshold = extract_salary_threshold(query_intent)

            if salary_threshold:
                cur.execute("""
                    SELECT id, name, email, department, role, salary
                    FROM employees
                    WHERE salary > %s
                    ORDER BY department, salary DESC
                """, (salary_threshold,))
            else:
                cur.execute("""
                    SELECT id, name, email, department, role, salary
                    FROM employees
                    ORDER BY department, salary DESC
                """)


            data = [dict(r) for r in cur.fetchall()]
        
        # results = cur.fetchall()
        
        cur.close()
        conn.close()
        
        # return {
        #     "data": [dict(row) for row in results],
        #     "metadata": {
        #         "count": len(results),
        #         "query_type": "select",
        #         "tool": "database_query"
        #     }
        # }
        # Trial
        return {
            "data": data,
            "metadata": {
                "tool": "database_query",
                "count": len(data)
            }
        }
    
    def web_search(self, query: str, user: Dict) -> Dict:
        """
        Simulate web search tool (should be blocked if internal data detected)
        
        This is a mock implementation that returns fake search results
        """
        # TODO: Implement web search simulation
        # In real implementation, this would call external APIs
        # For this exercise, return mock data
        
        return {
            "data": [
                {
                    "title": "Senior Software Engineer Salary Guide 2024",
                    "url": "https://example.com/salary-guide",
                    "snippet": "Senior Software Engineers earn between $120k-$180k..."
                },
                {
                    "title": "Tech Salary Trends",
                    "url": "https://example.com/trends",
                    "snippet": "Market rates for senior engineers have increased..."
                }
            ],
            "metadata": {
                "count": 2,
                "query": query,
                "tool": "web_search"
            }
        }

# ============================================================================
# RBAC & PERMISSION CHECKING
# ============================================================================

def check_user_permissions(user: Dict, action: str, target_employee_id: int = None) -> bool:
    """Check if user has permission for the requested action"""
    
    # TODO: Implement comprehensive permission checking
    # - Admin: Full access
    # - Manager: Access to own department + direct reports
    # - Employee: Access to own data only
    
    if user['role'] == 'admin':
        return True
    
    if action == 'view_salary':
        if user['role'] == 'employee':
            # Can only view own salary
            return user.get('employee_id') == target_employee_id
        
        elif user['role'] == 'manager':
            # Can view direct reports' salaries
            return is_direct_report(user.get('employee_id'), target_employee_id)
    
    return False

def is_direct_report(manager_id: int, employee_id: int) -> bool:
    """Check if employee reports directly to manager"""
    if not manager_id or not employee_id:
        return False
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT manager_id FROM employees WHERE id = %s
    """, (employee_id,))
    
    result = cur.fetchone()
    cur.close()
    conn.close()
    
    if result:
        return result['manager_id'] == manager_id
    
    return False

def filter_by_department(data: List[Dict], user: Dict) -> List[Dict]:
    """Filter data to only show user's department"""
    if user['role'] == 'admin':
        return data
    
    user_dept = user.get('department')
    return [item for item in data if item.get('department') == user_dept]

def mask_salary_data(data: List[Dict], user: Dict) -> List[Dict]:
    """Mask exact salary values with ranges"""
    # TODO: Implement salary masking
    # - Convert exact values to ranges (e.g., $145k -> $140k-$160k)
    # - Keep direct reports' exact salaries visible for managers
    
    masked_data = []
    for item in data:
        masked_item = item.copy()
        
        if 'salary' in masked_item:
            salary = float(masked_item['salary'])
            
            # Check if user can see exact salary
            # if not check_user_permissions(user, 'view_salary', item.get('id')):
            # Trial 1
            # if user['role'] != 'admin' and not check_user_permissions(user, 'view_salary', item.get('id')):

            #     # Mask salary with range
            #     range_size = 20000
            #     lower = (salary // range_size) * range_size
            #     upper = lower + range_size
            #     masked_item['salary'] = f"${int(lower/1000)}k-${int(upper/1000)}k"
            #     masked_item['salary_masked'] = True
            # Trial 2
            if user['role'] != 'admin':
                if user['role'] == 'manager':
                    if not is_direct_report(user.get('employee_id'), item.get('id')):
                        range_size = 20000
                        lower = (salary // range_size) * range_size
                        upper = lower + range_size
                        masked_item['salary'] = f"${int(lower/1000)}k-${int(upper/1000)}k"
                        masked_item['salary_masked'] = True
                else:
                    # employees: always mask
                    range_size = 20000
                    lower = (salary // range_size) * range_size
                    upper = lower + range_size
                    masked_item['salary'] = f"${int(lower/1000)}k-${int(upper/1000)}k"
                    masked_item['salary_masked'] = True
        
        masked_data.append(masked_item)
    
    return masked_data

# ============================================================================
# AUDIT LOGGING
# ============================================================================

def log_audit_event(user_id: int, username: str, query: str, tool: str, 
                   hooks: List[str], action: str, masked: bool, blocked: bool,
                   risk_score: int, summary: str, metadata: Dict) -> int:
    """Log audit event to database"""
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        INSERT INTO audit_log 
        (user_id, username, query, tool_invoked, hooks_triggered, action_taken, 
         data_masked, blocked, risk_score, response_summary, metadata)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        user_id, username, query, tool, hooks, action,
        masked, blocked, risk_score, summary, json.dumps(serialize_decimals(metadata))
    ))
    
    audit_id = cur.fetchone()['id']
    conn.commit()
    
    cur.close()
    conn.close()
    
    return audit_id

# ============================================================================
# API ENDPOINTS
# ============================================================================

guardrail_engine = GuardrailEngine()
tool_simulator = ToolSimulator()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "agent-engine"})

@app.route('/api/agent/query', methods=['POST'])
def execute_query():
    """
    Main endpoint for executing AI agent queries with guardrails
    
    Request Body:
        {
            "user_id": int,
            "query": str,
            "tools": [str],  # e.g., ["database_query", "web_search"]
            "context": {}
        }
    
    Response:
        {
            "response": str or dict,
            "hooks_triggered": [str],
            "data_masked": bool,
            "blocked": bool,
            "risk_score": int,
            "audit_id": int
        }
    """
    try:
        data = request.json
        
        # Extract request data
        user_id = data.get('user_id')
        query = data.get('query')
        tools = data.get('tools', ['database_query'])
        context = data.get('context', {})
        
        # Fetch user information
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        # user = dict(cur.fetchone())
        # Trial
        row = cur.fetchone()

        if not row:
            return jsonify({"error": f"User {user_id} not found"}), 404

        user = dict(row)
        
        # Trial
        if not user.get('department'):
            # Fallback: infer department from employee record
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute(
                "SELECT department FROM employees WHERE id = %s",
                (user.get('employee_id'),)
            )
            emp = cur.fetchone()
            cur.close()
            conn.close()

            if emp:
                user['department'] = emp['department']

        # Trial ends
        cur.close()
        conn.close()
        
        # STEP 1: Execute Pre-Hooks
        pre_result = guardrail_engine.execute_pre_hooks(query, user, tools)
        
        if not pre_result['allowed']:
            # Query blocked by pre-hooks
            audit_id = log_audit_event(
                user_id, user['username'], query, 
                tools[0] if tools else 'none',
                pre_result['hooks_triggered'],
                'blocked',
                False, True,
                pre_result['risk_score'],
                pre_result['reason'],
                {'pre_hook_result': pre_result}
            )
            
            return jsonify({
                "response": pre_result['reason'],
                "hooks_triggered": pre_result['hooks_triggered'],
                "data_masked": False,
                "blocked": True,
                "risk_score": pre_result['risk_score'],
                "audit_id": audit_id
            })
        
        # STEP 2: Execute Tool (simulate)
        active_tools = [t for t in tools if t not in pre_result['tools_blocked']]
        
        if 'database_query' in active_tools:
            tool_response = tool_simulator.database_query(query, user)
        elif 'web_search' in active_tools:
            tool_response = tool_simulator.web_search(query, user)
        else:
            tool_response = {"data": [], "metadata": {}}
        
        # STEP 3: Execute Post-Hooks
        post_result = guardrail_engine.execute_post_hooks(
            tool_response['data'], user, active_tools[0] if active_tools else 'none'
        )
        
        # Apply filtering and masking
        filtered_data = filter_by_department(post_result['filtered_response'], user)
        masked_data = mask_salary_data(filtered_data, user)
        
        # STEP 4: Log Audit Event
        audit_id = log_audit_event(
            user_id, user['username'], query,
            active_tools[0] if active_tools else 'none',
            pre_result['hooks_triggered'] + post_result['hooks_triggered'],
            'allowed_filtered',
            len(post_result['masked_fields']) > 0,
            False,
            pre_result['risk_score'],
            f"Query executed successfully. {len(masked_data)} results returned.",
            {
                'pre_hooks': pre_result,
                'post_hooks': post_result,
                'tools_used': active_tools
            }
        )
        # Trial start
        # STEP 5: Format Response
        # return jsonify({
        #     "response": masked_data,
        #     "hooks_triggered": pre_result['hooks_triggered'] + post_result['hooks_triggered'],
        #     "data_masked": len(post_result['masked_fields']) > 0,
        #     "blocked": False,
        #     "risk_score": pre_result['risk_score'],
        #     "audit_id": audit_id,
        #     "metadata": {
        #         "total_results": len(masked_data),
        #         "tools_used": active_tools,
        #         "tools_blocked": pre_result['tools_blocked']
        #     }
        # })
        safe_data = serialize_decimals(masked_data)

        return jsonify({
            "response": safe_data,
            "hooks_triggered": pre_result['hooks_triggered'] + post_result['hooks_triggered'],
            "data_masked": len(post_result['masked_fields']) > 0,
            "blocked": False,
            "risk_score": pre_result['risk_score'],
            "audit_id": audit_id,
            "metadata": {
                "total_results": len(safe_data),
                "tools_used": active_tools,
                "tools_blocked": pre_result['tools_blocked']
            }
        })

        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/test/scenarios', methods=['GET'])
def get_test_scenarios():
    """Return test scenarios for frontend testing"""
    return jsonify({
        "scenarios": [
            {
                "id": 1,
                "name": "Direct Salary Query - Blocked",
                "user": "david_employee",
                "query": "What is Alisha's salary?",
                "expected": "blocked"
            },
            {
                "id": 2,
                "name": "Comparative Salary - Masked",
                "user": "michael_manager",
                "query": "Compare Alisha and Nelson's salaries",
                "expected": "masked"
            },
            {
                "id": 3,
                "name": "Web Search Data Leakage - Blocked",
                "user": "alisha_employee",
                "query": "What is Alisha's salary compared to market rates?",
                "expected": "blocked"
            },
            {
                "id": 4,
                "name": "Department Aggregates - Allowed",
                "user": "sarah_manager",
                "query": "What's the average salary in Engineering department?",
                "expected": "allowed"
            },
            {
                "id": 5,
                "name": "Cross-Department - Filtered",
                "user": "jessica_employee",
                "query": "Show me all employees making over $150k",
                "expected": "filtered"
            }
        ]
    })

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("AI Guardrails Agent Engine Starting...")
    print("=" * 60)
    print(f"Database: {DB_CONFIG['database']}@{DB_CONFIG['host']}")
    print("Port: 5000")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
