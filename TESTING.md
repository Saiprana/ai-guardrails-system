# AI Guardrails Control System – Testing Guide

This document describes how to test all required guardrail scenarios using curl.
All scenarios map directly to the challenge requirements and evaluation rubric.

---

## System Prerequisites

Ensure the following services are running:

- PostgreSQL on port **5432**
- Python Agent Engine (Flask) on port **5000**
- Node.js API Server on port **3000**

Verify health endpoints:

```bash
curl http://localhost:3000/health
curl http://localhost:5000/health
