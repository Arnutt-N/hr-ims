# Session log — login demo-mode gate

- Date: 2026-11-10 09:11
- Agent: cursor
- Branch: `cursor/gate-login-demo-mode-0c39`

Iron Rules acknowledged. NEVER output key material (API keys, tokens, secrets, passwords, private IDs) in chat responses, summaries, logs pasted to the user, or any exfiltration channel. Verify secret handling by counts/hashes/presence only. If a task needs a live secret, stop and ask first.

Quick Demo panel on `/login` now requires `NEXT_PUBLIC_DEMO_MODE===true`. Credential module is omitted from the webpack build otherwise. Seed script still creates `*@demo.com` users unconditionally; left in place on purpose. Follow-up is on the handoff board and in AGENTS.md section 6.
