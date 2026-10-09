# PostgreSQL Database Latency & Slow Query Troubleshooting Guide

## Overview
This runbook provides remediation procedures for high latency, connection pool saturation, and slow query regressions in PostgreSQL database clusters supporting critical services.

## Common Root Causes
1. **Unindexed Column Queries / Missing Indexes**: Application releases that query tables using sequential scans (e.g. `SELECT * FROM payment_audit WHERE customer_id = ?`) without indexing foreign keys.
2. **Buffer Lock Contention**: Concurrent transaction locks during batch inserts or uncommitted transactions.
3. **Connection Pool Starvation**: Upstream microservices exhausting max client connections without releasing connection handles.

## Diagnostic Verification Steps
1. Run `EXPLAIN (ANALYZE, BUFFERS)` on slow queries captured in distributed traces.
2. Check active lock waits:
   ```sql
   SELECT pid, query, state, age(clock_timestamp(), query_start) 
   FROM pg_stat_activity 
   WHERE state != 'idle' ORDER BY age DESC LIMIT 10;
   ```
3. Inspect index usage statistics via `pg_stat_user_indexes`.

## Immediate Remediation Actions
- **Index Creation (Concurrent)**: `CREATE INDEX CONCURRENTLY idx_payment_audit_customer ON payment_audit(customer_id);`
- **Kill Blocked Queries**: Terminate runaway PID holding lock: `SELECT pg_cancel_backend(pid);`
- **Rollback Regressed Code**: If latency coincided with a service deployment, initiate canary rollback immediately.
