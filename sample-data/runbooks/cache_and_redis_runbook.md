# Redis Cache Avalanche & Eviction Storm Runbook

## Overview
Guidelines for resolving sudden Redis latency spikes, high eviction rates, and thundering herd query floods to primary relational databases.

## Diagnostic Indicators
- Cache hit ratio dropping below 80%.
- `evicted_keys` metric increasing rapidly in Redis info stats.
- Upstream authentication and order services showing elevated response latency.

## Remediation Steps
1. Scale up max memory allocation or configure key expiration jitter.
2. Ensure `maxmemory-policy` is set to `volatile-lru` or `allkeys-lru` rather than `noeviction`.
3. Implement application-level circuit breakers to protect downstream PostgreSQL from query storms.
