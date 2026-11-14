# 🤝 Cross-Agent Handoff Board

> **Last Updated:** 2026-11-14 17:35 | **Updated By:** perch
>
> ไฟล์นี้เป็น Dashboard กลาง ทุก Agent ต้องอ่านก่อนเริ่มงาน และอัพเดทเมื่อจบงาน

---

## 📊 Agent Status

| Agent | Status | Last Active | Current/Last Task | Session Log |
|-------|--------|-------------|-------------------|-------------|
| **antigravity** | 🟢 AVAILABLE | 2026-11-13 13:30 | Completed IDOR/object-level authz remediation (V1–V24) on `fix/object-level-authz` | [2026-11-13_1330_antigravity_to_all](logs/2026-11-13_1330_antigravity_to_all.md) |
| **kilo** | ⚪ IDLE | 2026-01-30 | Codebase Analysis Report | [session_2026-01-30](../kilo/session_2026-01-30_185739.md) |
| **claude_code** | 🟢 AVAILABLE | 2026-11-13 12:14 | IDOR/object-level authz — handed off mid-task; completed by antigravity | [2026-11-13_1214_claude_code_to_all](logs/2026-11-13_1214_claude_code_to_all.md) |
| **codex** | 🟡 PENDING_HANDOFF | 2026-11-13 21:31 | PR #26 review and IDOR test repair remain in progress | [2026-11-13_2131_codex_to_all](logs/2026-11-13_2131_codex_to_all.md) |
| **perch** | 🟢 AVAILABLE | 2026-11-14 17:35 | Closed the 4 open authz policy items (V20/V21/V22) | [2026-11-14_1735_perch_to_all](logs/2026-11-14_1735_perch_to_all.md) |
| **cline** | 🟢 AVAILABLE | 2026-08-23 20:15 | BullMQ worker bootstrap — escalation worker wired & verified E2E | [2026-08-23_2015_cline_to_all](logs/2026-08-23_2015_cline_to_all.md) |
| **cursor** | 🟢 AVAILABLE | 2026-11-10 09:24 | Gate login Quick Demo panel behind `NEXT_PUBLIC_DEMO_MODE`; removed tracked `cloudflared.exe` | [demo](logs/2026-11-10_0911_cursor_to_all.md), [cloudflared](logs/2026-11-10_0859_cursor_to_all.md) |
| **gemini_cli** | ⚪ IDLE | - | - | - |
| **open_code** | ⚪ IDLE | - | - | - |

### Status Legend
- 🟢 `AVAILABLE` — พร้อมรับงาน / เพิ่งทำเสร็จ
- 🔵 `IN_PROGRESS` — กำลังทำงานอยู่
- 🟡 `PENDING_HANDOFF` — รอส่งต่องาน
- 🔴 `BLOCKED` — ติดปัญหา ทำต่อไม่ได้
- ⚪ `IDLE` — ยังไม่มีข้อมูล / ไม่ได้ active

---

## 📋 Current Sprint Tasks

| # | Task | Status | Assigned To | Priority | Notes |
|---|------|--------|-------------|----------|-------|
| 1 | แก้ Backend Error (swagger-jsdoc) | ⌛ Pending | - | 🔴 High | ขาด dependency `swagger-jsdoc` |
| 2 | แก้ Frontend Error (middleware.ts conflict) | ⌛ Pending | - | 🔴 High | ลบ `middleware.ts` เก็บ `proxy.ts` |
| 3 | ตรวจสอบ Dev Environment | ⌛ Pending | - | 🟡 Medium | หลังแก้ error ทั้ง 2 ข้อ |
| 4 | Deep Audit Cursor Pointer (Round 2) | ✅ Done | codex | 🟡 Medium | Audit remaining dashboard pages |
| 5 | Finalize Git Release v1.5.0 | ⌛ Pending | - | 🔴 High | Run provided commands |
| 6 | Canonicalize AI workspace and handoff path | ✅ Done | codex | 🟡 Medium | `.agent` -> `.agents`, handoff path now `project-log-md/handoff/logs/` |

### Task Status Legend
- ✅ Done | 🔵 In Progress | ⌛ Pending | 🔴 Blocked

---

## 📤 Handoff Queue

> งานที่รอส่งต่อระหว่าง Agents

| # | From | To | Task | Priority | Handoff Log | Date |
|---|------|----|------|----------|-------------|------|
| 1 | cursor | all | Login Quick Demo panel is hidden unless `NEXT_PUBLIC_DEMO_MODE=true` (set this on the demo Vercel project hr-ims / hrims-pro.vercel.app or the panel disappears). Follow-up before real data: `backend/prisma/seed.ts` still upserts `*@demo.com` users, including superadmin, with no env gate | 🔴 High | [log](logs/2026-11-10_0911_cursor_to_all.md) | 2026-11-10 |
| 0 | cursor | all | `cloudflared.exe` removed from the tree going forward (still in git history). History rewrite is an owner decision — do not force-push. No tracked tunnel credential found. | 🟡 Medium | [log](logs/2026-11-10_0859_cursor_to_all.md) | 2026-11-10 |
| 2 | cline | all | BullMQ worker bootstrap DONE (`src/worker.ts` + `start:worker`/`dev:worker`) — escalation cron live, verified against real Redis. **Prod deploy ต้องรัน process ที่สอง** (`npm run start:worker`). Optional: TiDB push, TELEGRAM_* envs ยังเหลือจาก handoff เดิม | 🟡 Medium | [log](logs/2026-08-23_2015_cline_to_all.md) | 2026-08-23 |
| 2 | claude_code | any | Maintenance Workflow PRP v6 COMPLETE — 6 PRs merged. Optional: TiDB schema push for 5 new tables, set TELEGRAM_* envs in prod (escalation worker wiring ✅ done by cline 2026-08-23) | 🟡 Medium | [log](logs/2026-05-10_1437_claude_code_to_any.md) | 2026-05-10 |
| 2 | codex | all | Superadmin RBAC normalization complete; verify on deployed Vercel/TiDB environment | 🟡 Medium | [log](logs/2026-04-11_2318_codex_to_all.md) | 2026-04-11 |
| 2 | codex | all | `.agents` cutover and canonical handoff path complete; update external tooling if needed | 🟡 Medium | [log](logs/2026-04-03_1232_codex_to_all.md) | 2026-04-03 |
| 3 | antigravity | all | Sync pending tasks (Backend, Frontend, Release) | 🟡 Medium | [log](logs/2026-02-20_0825_antigravity_to_all.md) | 2026-02-20 |
| 4 | antigravity | all | Git Release v1.5.0 ready; verify log | 🔴 High | [log](logs/2026-02-13_1215_antigravity_to_all.md) | 2026-02-13 |
| 5 | codex | all | Cursor-pointer audit round 2 complete; remaining tooltip/build verify | 🟡 Medium | [log](logs/2026-02-11_1633_codex_to_all.md) | 2026-02-11 |
| 6 | antigravity | all | IDOR/object-level authz remediation (V1–V24) complete on `fix/object-level-authz` — draft PR ready for owner review & policy decisions (V20/V21) | 🟡 Medium | [log](logs/2026-11-13_1330_antigravity_to_all.md) | 2026-11-13 |
| 7 | perch | all | Authz suites now gate every PR (PR #34, draft, CI 9/9 green). Owner decision: merge #34, then the 4 policy items are the only security work left. | 🔴 High | [log](logs/2026-11-14_1350_perch_to_all.md) | 2026-11-14 |

---

## ⚠️ Issues & Observations

> ปัญหา ข้อสังเกต ข้อแนะนำ ที่ Agent ตรวจพบ

| # | Reporter | Date | Type | Description | Status |
|---|----------|------|------|-------------|--------|
| 0 | cursor | 2026-11-10 | ⚠️ Warning | Tracked `cloudflared.exe` (~65 MiB PE32+) removed from the index only. The blob remains in git history until the owner chooses a history rewrite. No force-push was done. | ⌛ Open |
| 1 | antigravity | 2026-02-11 | 🐛 Bug | Backend crash เพราะขาด `swagger-jsdoc` | ⌛ Open |
| 2 | antigravity | 2026-02-11 | 🐛 Bug | Frontend: `middleware.ts` + `proxy.ts` conflict (Next.js 16) | ⌛ Open |
| 3 | codex | 2026-04-03 | 📝 Note | Canonical handoff path is now `project-log-md/handoff/logs/`; `research/` remains gitignored and handoff logs are now unignored for Git tracking | ✅ Applied |
| 4 | perch | 2026-11-13 | 🐛 Bug | PR #26 (`fix/proxy-header-spoofing`) did not compile on merge: `backend/src/middleware/auth.ts:66` referenced `INTERNAL_API_KEY`, which `main` had removed in favour of a per-request `expectedKey`. Git merged both cleanly (different lines) and kept a dead binding → `TS2552`. **Fixed in `ac5ded8`, merged as `cc8392e`**: guard now checks `expectedKey`; `tsc` 0 errors, 75/75 unit, CI 8/8 green. | ✅ Applied |
| 5 | perch | 2026-11-13 | 📝 Note | `idor.test.ts` had zero `expect()` calls and asserted against 5 unmounted routes, so its 13/13 Jest passes were meaningless. Rewritten: 28 cases, real assertions, positive controls, mutation-verified. **Merged as PR #33 → `47ad231`** (CI 8/8 green). | ✅ Applied |
| 6 | perch | 2026-11-14 | ⚠️ Warning | The 246 rewritten authz cases (28 IDOR + 218 RBAC matrix) ran **nowhere**: `ci.yml` excluded all of `src/tests/security`, and `security-e2e.yml` was `continue-on-error: true` while excluding `rbac-matrix`. Its comment claimed the matrix "already runs in-memory in the main backend CI job" — it did not. **Fixed on `ci/security-authz-hard-fail`**: new hard-fail `security-authz` job in `ci.yml` (throwaway SQLite, no Redis, no seed) + `continue-on-error` removed from the nightly workflow. **Fixed in PR #34** (`ci/security-authz-hard-fail`), CI 9/9 green; job log shows 246/246. | ✅ Applied |
| 7 | perch | 2026-11-14 | 🔒 Security | The 4 open authz policy items are decided and closed in **PR #35** (`fix/authz-policy-v20-v21`, CI 9/9 green). **V20:** `getRequests` scoped only `role === 'user'`, so technician/auditor saw every request — the frontend already gated on `APPROVER_ROLES`, so the backend was the looser surface. **V21:** `scopeRequestWarehouse` let any non-owner through when `warehouseId` was null; the controller then threw 400 anyway, and the owner was the only one refused. **V22:** `POST /api/stock-transfers` echoed the source stock quantity in `available` on its 400, a stock oracle for unmanaged warehouses. Tests 246 → 253; mutation-verified all three. | ✅ Applied |

### Type Legend
- 🐛 Bug | 💡 Suggestion | ⚠️ Warning | 📝 Note

---

## 📜 Recent Activity Log

> บันทึกกิจกรรมล่าสุด (ล่าสุด 10 รายการ)

| # | Date | Agent | Action | Details |
|---|------|-------|--------|
| 0 | 2026-11-14 17:35 | perch | ✅ COMPLETE | Closed the 4 open authz policy items — **PR #35**, CI 9/9 green. V20 request visibility now matches the frontend's approver tier; V21 warehouse-less transitions refuse non-admins with 404; V22 stock-transfer creation requires source-warehouse scope. 253 authz + 75 unit cases pass; all three mutation-verified. See `logs/2026-11-14_1735_perch_to_all.md` |
| 0 | 2026-11-14 13:50 | perch | ✅ COMPLETE | Wired the 246 authz cases into CI as a hard-fail gate — new `security-authz` job in `ci.yml` (throwaway SQLite, no Redis/seed) and `continue-on-error` removed from `security-e2e.yml`. **PR #34 opened (draft), CI 9/9 green**; the new job's log shows `Tests: 246 passed, 246 total`. 73 fail under a `requireRole` mutation. See `logs/2026-11-14_1350_perch_to_all.md` |
| 0 | 2026-11-13 23:45 | perch | ✅ COMPLETE | PR #26 merged to `main` as `cc8392e` — build fixed (`INTERNAL_API_KEY` → `expectedKey`), CI 8/8 green, post-merge `tsc` 0 errors and auth tests 10/10 re-verified on `main`. |
| 1 | 2026-11-13 23:05 | perch | ✅ COMPLETE | PR #33 merged to `main` as `47ad231` — IDOR suite rewritten (28 cases, mutation-verified), CI 8/8 green. See `logs/2026-11-13_2240_perch_to_all.md` |
| 1 | 2026-11-13 13:30 | antigravity | ✅ COMPLETE | Completed IDOR/object-level authz fixes (V1–V24), unit/RBAC tests, and draft PR on `fix/object-level-authz` |
| 1 | 2026-11-10 09:11 | cursor | ✅ COMPLETE | Gated `/login` Quick Demo panel on `NEXT_PUBLIC_DEMO_MODE===true`. Credential module omitted from the production build when the flag is off. Seed still creates `*@demo.com` users (follow-up) |
| 0 | 2026-11-10 08:59 | cursor | ✅ COMPLETE | Removed tracked `cloudflared.exe` going forward; `.gitignore` blocks re-add; tunnel scripts/docs call `cloudflared` on PATH. History not rewritten. Credential scan: presence only, no tracked tunnel secret. |
| 2 | 2026-08-23 20:15 | cline | ✅ COMPLETE | BullMQ worker bootstrap — `src/worker.ts` + schedulers wired; escalation verified E2E against real Redis (`{"processed":0}` tick + hourly repeatable) |
| 2 | 2026-05-10 14:37 | claude_code | ✅ COMPLETE | Maintenance Workflow PRP v6 — all 6 PRs (#15-#20) merged; 5 new tables; ~6000 LOC |
| 2 | 2026-04-11 23:18 | codex | 📤 HANDOFF | Normalized superadmin RBAC across menu/page/action guards |
| 2 | 2026-04-03 12:32 | codex | 📤 HANDOFF | Canonicalized `.agents` and handoff path to `project-log-md/handoff/logs/` |
| 3 | 2026-02-20 08:25 | antigravity | 📤 HANDOFF | Status sync and pending task handoff |
| 4 | 2026-02-13 12:15 | antigravity | 📤 HANDOFF | Sent v1.5.0 release preparation to all |
| 5 | 2026-02-11 16:36 | codex | 📤 HANDOFF | Sent handoff: cursor-pointer audit round 2 + pending tasks |
| 6 | 2026-02-11 16:24 | codex | ✅ COMPLETE | Completed cursor-pointer audit round 2 (scanner, dashboard, header) |
| 7 | 2026-02-11 14:46 | codex | 📥 RECEIVE | Receive handoff: Deep Audit Cursor Pointer (Round 2) |
| 8 | 2026-02-11 14:22 | antigravity | ✅ COMPLETE | แก้ไข cursor-pointer 15 จุด และรอ Deep Audit ต่อ |
| 9 | 2026-02-11 13:00 | antigravity | 📤 HANDOFF | ส่งต่องาน: แก้ errors + ทดสอบ Dev Env → all |

### Action Types
- 📥 RECEIVE | 📤 HANDOFF | 🔵 START | ✅ COMPLETE | 🔍 DIAGNOSE | 🛠️ SETUP | 📊 ANALYSIS
