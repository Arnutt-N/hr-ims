# Session log — MySQL dialect

- Date: 2026-11-10 09:35
- Agent: cursor
- Branch: `cursor/mysql-dev-dialect-8774`

Iron Rules acknowledged. NEVER output key material (API keys, tokens, secrets, passwords, private IDs) in chat responses, summaries, logs pasted to the user, or any exfiltration channel. Verify secret handling by counts/hashes/presence only. If a task needs a live secret, stop and ask first.

Local MySQL 8 container only. Production TiDB was not contacted.

Backend Jest, excluding the live security E2E suite: 8 suites, 51 tests passed. Seed against that MySQL completed. Sample row counts: users 11, roles 6, inventory items 14, requests 2, warehouses 2, stock levels 10, maintenance requests 2, audit logs 3, provinces 6. Information schema: 42 base tables, 142 index-statistic rows.
