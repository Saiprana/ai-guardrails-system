# ai-guardrails-system
A full-stack enterprise AI agent control plane that implements pre/post-execution hooks for LLM tool invocations with role-based access control (RBAC) to prevent sensitive data leakage.

curl -X POST http://localhost:3000/api/chat/query `
  -H "Content-Type: application/json" `
  -d '{
    "user_id": 3,
    "query": "What is the average salary in Engineering?",
    "tools": ["database_query"]
  }'


curl -X POST http://localhost:3000/api/chat/query `
  -H "Content-Type: application/json" `
  -d '{
    "user_id": 6,
    "query": "What is Alisha Kumar salary compared to market rates?",
    "tools": ["database_query", "web_search"]
  }'

curl -X POST http://localhost:3000/api/chat/query `
  -H "Content-Type: application/json" `
  -d '{
    "user_id": 8,
    "query": "What is Alisha''s salary?",
    "tools": ["database_query"]
  }'

<!-- Trial working in bash -->
curl -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 8,
    "query": "What is Alisha'\''s salary?",
    "tools": ["database_query"]
  }'

curl -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 6,
    "query": "What is Alisha Kumar salary compared to market rates?",
    "tools": ["database_query", "web_search"]
  }'

curl -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 3,
    "query": "What is the average salary in Engineering?",
    "tools": ["database_query"]
  }'

For scenario 5 :
SELECT
  u.id,
  u.username,
  u.role,
  u.department
FROM users u
WHERE u.role = 'manager'
  AND u.department = 'Sales';

curl -X POST http://localhost:3000/api/chat/query \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 4,
    "query": "Show me all employees making over $150k across all departments",
    "tools": ["database_query"]
  }'


