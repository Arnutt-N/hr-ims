# 🤝 Cross-Agent Handoff Board

> **Last Updated:** 2026-11-19 06:47 | **Updated By:** perch
>
> ไฟล์นี้เป็น Dashboard กลาง ทุก Agent ต้องอ่านก่อนเริ่มงาน และอัพเดทเมื่อจบงาน
>
> **🧹 Cleaned 2026-11-16:** รายการที่ค้างเกิน 6 เดือน (ก่อน 2026-05-16) ถูกย้ายไป
> [HANDOFF_BOARD_ARCHIVE.md](HANDOFF_BOARD_ARCHIVE.md) — ย้ายเฉพาะที่ **ตรวจแล้วว่าปิดจริง**
> ไม่ใช่แค่เก่า (4 tasks · 6 queue entries · 2 issues · 10 activity entries)
> รายการที่เก่าแต่ยังเปิดอยู่จริงยังคงอยู่บนบอร์ดนี้

---

## 📊 Agent Status

| Agent | Status | Last Active | Current/Last Task | Session Log |
|-------|--------|-------------|-------------------|-------------|
| **antigravity** | 🟢 AVAILABLE | 2026-11-13 13:30 | Completed IDOR/object-level authz remediation (V1–V24) on `fix/object-level-authz` | [2026-11-13_1330_antigravity_to_all](logs/2026-11-13_1330_antigravity_to_all.md) |
| **kilo** | ⚪ IDLE | 2026-01-30 | Codebase Analysis Report | [session_2026-01-30](../kilo/session_2026-01-30_185739.md) |
| **claude_code** | 🟢 AVAILABLE | 2026-11-13 12:14 | IDOR/object-level authz — handed off mid-task; completed by antigravity | [2026-11-13_1214_claude_code_to_all](logs/2026-11-13_1214_claude_code_to_all.md) |
| **codex** | 🟡 PENDING_HANDOFF | 2026-11-13 21:31 | PR #26 review and IDOR test repair remain in progress | [2026-11-13_2131_codex_to_all](logs/2026-11-13_2131_codex_to_all.md) |
| **perch** | 🟡 PENDING_HANDOFF | 2026-11-19 06:47 | Stock workflow work committed as `95aa20b` on `feat/stock-workflow-readiness` (23 files, +1697/−101). Not pushed, no PR. Test results not yet bound to that commit | [2026-11-19_0647_session-summary](../perch/2026-11-19_0647_session-summary.md) |
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
| 9 | Add assertions to the 8 remaining security suites | ⌛ Pending | - | 🔴 High | They call `recordResult()` only, so they always pass. See Issues #8 |
| 10 | Promote authz / E2E / Lighthouse jobs to required checks | ⌛ Pending | - | 🟡 Medium | Only 4 jobs block merge today; `enforce_admins = false` |
| 11 | Open PR for `docs/agents-enforcement-truth` | ⌛ Pending | - | 🟡 Medium | Commit `4a9c174` pushed but no PR opened; branch also carries `d0524b7` |
| 12 | Build `lib/thai-procurement/` util set | 🔵 Plan Ready | perch | 🟡 Medium | **PRD + PRP written and validated** — 6 modules, 72 tests, all passing when extracted and run. Plan: `PRPs/perch/2026-11-16_PRP_thai-procurement-utils.md`. Ready to implement Task 1–7 |
| 13 | Add cost/lot layer to stock | ⌛ Pending | - | 🟡 Medium | `StockLevel` has no price; `InventoryItem`/`StockTransaction` have no cost field → cannot value stock |
| 14 | Resolve spec open questions before any procurement build | ⌛ Pending | - | 🟡 Medium | 7 owner decisions + **PlanBudget spec file is missing** |
| 15 | Merge PR #34 (authz CI gate) | ✅ Done | perch | 🔴 High | Merged to `main` as `610417f` on 2026-11-15 14:30; CI 9/9 green |
| 16 | Merge PR #35 (V20/V21/V22 policy) | ✅ Done | perch | 🔴 High | Merged to `main` as `a5e4938` on 2026-11-15 16:09; CI 8/8 green |
| 17 | Deep Audit Cursor Pointer (Round 2) | ✅ Done | codex | 🟡 Medium | Audit remaining dashboard pages |
| 18 | Canonicalize AI workspace and handoff path | ✅ Done | codex | 🟡 Medium | `.agent` -> `.agents`, handoff path now `project-log-md/handoff/logs/` |
| 19 | Bind test evidence to `95aa20b` | ⌛ Pending | - | 🔴 High | 249/249 authz, 76/76 unit, 517/517 Vitest all predate the commit. Re-run on `feat/stock-workflow-readiness` and record command, time, exit code |
| 20 | Close TiDB migration + concurrency evidence | ⌛ Pending | - | 🔴 High | Runbook exists (`perch/2026-11-18_tidb-test-runbook.md`) but nothing executed against a test TiDB |
| 21 | Owner sign-off: approver matrix, Express return path, opening balances | ⌛ Pending | - | 🔴 High | Three decisions block go-live. Approver matrix drafted at `perch/2026-11-18_approver-signoff-matrix.md` |

> **Cleaned 2026-11-16:** 4 tasks older than 6 months were archived after verifying they
> are actually closed (not just old) — `swagger-jsdoc` is now a dependency,
> `middleware.ts` is gone, and tag `v1.5.0` exists (2026-02-13). See
> [HANDOFF_BOARD_ARCHIVE.md](HANDOFF_BOARD_ARCHIVE.md) §1.

### Task Status Legend
- ✅ Done | 🔵 In Progress | ⌛ Pending | 🔴 Blocked

---

## 📤 Handoff Queue

> งานที่รอส่งต่อระหว่าง Agents

| # | From | To | Task | Priority | Handoff Log | Date |
|---|------|----|------|----------|-------------|------|
| 1 | cursor | all | Login Quick Demo panel is hidden unless `NEXT_PUBLIC_DEMO_MODE=true` (set this on the demo Vercel project hr-ims / hrims-pro.vercel.app or the panel disappears). Follow-up before real data: `backend/prisma/seed.ts` still upserts `*@demo.com` users, including superadmin, with no env gate | 🔴 High | [log](logs/2026-11-10_0911_cursor_to_all.md) | 2026-11-10 |
| 0 | cursor | all | `cloudflared.exe` removed from the tree going forward (still in git history). History rewrite is an owner decision — do not force-push. No tracked tunnel credential found. | 🟡 Medium | [log](logs/2026-11-10_0859_cursor_to_all.md) | 2026-11-10 |
| 6 | antigravity | all | IDOR/object-level authz remediation (V1–V24) complete on `fix/object-level-authz` — draft PR ready for owner review & policy decisions (V20/V21) | 🟡 Medium | [log](logs/2026-11-13_1330_antigravity_to_all.md) | 2026-11-13 |
| 7 | perch | all | Authz suites now gate every PR (PR #34, draft, CI 9/9 green). Owner decision: merge #34, then the 4 policy items are the only security work left. | 🔴 High | [log](logs/2026-11-14_1350_perch_to_all.md) | 2026-11-14 |
| 8 | perch | all | `secrets/examples` analyzed end-to-end: 3 Apps Script apps + 4 rebuild specs (SchoolProc / StockReq / ProcureHub / FixTrack). All 4 specs pick the same stack as HR-IMS. **Owner decisions needed before any procurement build** — see `secrets/examples/ADOPTION_PLAN_TH.md` §5. Note: **PlanBudget spec is referenced but not in the folder.** | 🟡 Medium | [log](logs/2026-11-16_1455_perch_to_all.md) | 2026-11-16 |

> **Cleaned 2026-11-16:** 6 entries older than 6 months were archived after verifying they
> are closed — the v1.5.0 release shipped (tag exists, 2026-02-13, followed by v1.5.1 and up
> to v4.1.0), the `.agents` cutover is live, and the superadmin RBAC item was superseded by
> the authz work in PRs #33/#34/#35. See [HANDOFF_BOARD_ARCHIVE.md](HANDOFF_BOARD_ARCHIVE.md) §2.

---

## ⚠️ Issues & Observations

> ปัญหา ข้อสังเกต ข้อแนะนำ ที่ Agent ตรวจพบ

| # | Reporter | Date | Type | Description | Status |
|---|----------|------|------|-------------|--------|
| 0 | cursor | 2026-11-10 | ⚠️ Warning | Tracked `cloudflared.exe` (~65 MiB PE32+) removed from the index only. The blob remains in git history until the owner chooses a history rewrite. No force-push was done. | ⌛ Open |
| 3 | codex | 2026-04-03 | 📝 Note | Canonical handoff path is now `project-log-md/handoff/logs/`; `research/` remains gitignored and handoff logs are now unignored for Git tracking | ✅ Applied |
| 4 | perch | 2026-11-13 | 🐛 Bug | PR #26 (`fix/proxy-header-spoofing`) did not compile on merge: `backend/src/middleware/auth.ts:66` referenced `INTERNAL_API_KEY`, which `main` had removed in favour of a per-request `expectedKey`. Git merged both cleanly (different lines) and kept a dead binding → `TS2552`. **Fixed in `ac5ded8`, merged as `cc8392e`**: guard now checks `expectedKey`; `tsc` 0 errors, 75/75 unit, CI 8/8 green. | ✅ Applied |
| 5 | perch | 2026-11-13 | 📝 Note | `idor.test.ts` had zero `expect()` calls and asserted against 5 unmounted routes, so its 13/13 Jest passes were meaningless. Rewritten: 28 cases, real assertions, positive controls, mutation-verified. **Merged as PR #33 → `47ad231`** (CI 8/8 green). | ✅ Applied |
| 6 | perch | 2026-11-14 | ⚠️ Warning | The 246 rewritten authz cases (28 IDOR + 218 RBAC matrix) ran **nowhere**: `ci.yml` excluded all of `src/tests/security`, and `security-e2e.yml` was `continue-on-error: true` while excluding `rbac-matrix`. Its comment claimed the matrix "already runs in-memory in the main backend CI job" — it did not. **Fixed on `ci/security-authz-hard-fail`**: new hard-fail `security-authz` job in `ci.yml` (throwaway SQLite, no Redis, no seed) + `continue-on-error` removed from the nightly workflow. **Fixed in PR #34** (`ci/security-authz-hard-fail`), CI 9/9 green; job log shows 246/246. | ✅ Applied |
| 7 | perch | 2026-11-14 | 🔒 Security | The 4 open authz policy items are decided and closed in **PR #35** (`fix/authz-policy-v20-v21`, CI 9/9 green). **V20:** `getRequests` scoped only `role === 'user'`, so technician/auditor saw every request — the frontend already gated on `APPROVER_ROLES`, so the backend was the looser surface. **V21:** `scopeRequestWarehouse` let any non-owner through when `warehouseId` was null; the controller then threw 400 anyway, and the owner was the only one refused. **V22:** `POST /api/stock-transfers` echoed the source stock quantity in `available` on its 400, a stock oracle for unmanaged warehouses. Tests 246 → 253; mutation-verified all three. | ✅ Applied |
| 8 | perch | 2026-11-16 | ⚠️ Warning | **8 security suites still have no assertions.** `api/rate-limiting` (11/11) · `auth/brute-force` (6/8) · `auth/jwt-attacks` (9/11) · `auth/session-security` (10/10) · `authz/privilege-escalation` (13/13) · `infra/security-headers` (18/18) · `injection/sql-injection` (10/11) · `injection/xss` (12/12) — each builds a `SecurityTestResult` and calls `recordResult()` only, so they pass unconditionally. `scripts/check-test-assertions.cjs` catches missing `expect()` but not a suite that asserts nothing meaningful. | ⌛ Open |
| 9 | perch | 2026-11-16 | ⚠️ Warning | **HR-IMS has no Thai government procurement domain at all.** Searching `schema.prisma` for `ครุภัณฑ์`, `วัสดุ`, `เลขครุภัณฑ์`, `ค่าเสื่อม`, `ราคาซาก`, `งบประมาณ`, `ผู้ค้า`, `จัดซื้อ`, `จำหน่าย` returns **0 hits each**; no `depreciation` / `salvage` / `usefulLife` / `assetCode` / `regNo` / `fiscalYear` / `budget` / `vendor` / `procurement` / `disposal` fields either. `InventoryItem.serial` is a manufacturer serial, not a Thai asset register number. | ⌛ Open |
| 10 | perch | 2026-11-16 | ⚠️ Warning | **No Thai-gov utility layer exists.** `bahtText`, `fiscalYear`, `taxId`, `withholding`, `VAT`, `ปีงบประมาณ`, `บาทถ้วน` return **0 hits** across `frontend/next-app/lib` and `backend/src`. `lib/date-utils.ts` (73 lines) has only BE-year date formatting — no fiscal year, no working-day arithmetic, no Thai numerals. The 4 rebuild specs all need these. | ⌛ Open |
| 11 | perch | 2026-11-16 | 📝 Note | **`secrets/examples` contains 2 byte-identical duplicate specs.** MD5 `165BC3051A` = `egp/SPEC.md` and `egp/SPEC-egp-school-procurement.md`; MD5 `BD9CC3966B` = `ระบบคลังพัสดุ/SPEC.md` and `ระบบคลังพัสดุ/SPEC-stock-requisition.md`. Only 2 of the 4 new `.md` files are genuinely new: `SPEC-procurement-system.md` (ProcureHub) and `SPEC-repair-maintenance.md` (FixTrack). | ⌛ Open |
| 12 | perch | 2026-11-16 | 📝 Note | **`PlanBudget` spec is referenced but absent.** `SPEC-repair-maintenance.md:902` points at `/workspace/smart-budget-clone/SPEC-smart-budget.md`, and §9.2 rule 4 depends on its budget rules, but no such file exists in the repo. Any budget work is blocked until the owner supplies it. | 🔴 Blocked |
| 13 | perch | 2026-11-17 | ⚠️ Warning | **Perch caps user-level skill registration and the surviving set is unstable across sessions.** Ceiling ≈ 71 user skills (`~/.perch/skills` 40 of 113 + `~/.agents/skills` 32 of 486). The set shuffles between sessions — one session gained `blueprint`/`why`/`writing-plans` but lost `how`. `perch skills disable` does **not** free a slot (tested: disabled 5, count stayed 101). **Fixed** by placing 21 junctions under project-level `.perch/skills/`, which has its own quota and registered 21/21. Note `loadSkill` reads the registry at session start, so new junctions need a restart. | ✅ Applied |
| 14 | perch | 2026-11-17 | 🐛 Bug | **`pstack-tdd` and `pstack-reflect` shipped with a UTF-8 BOM** (`EF BB BF`) at the head of `SKILL.md`, so Perch reported `SKILL.md is missing a YAML frontmatter block` even though the `---` block was present. Stripped the BOM from `~/.agents/skills/`; both skills now register. Any skill installed from ECC may carry the same defect. | ✅ Applied |
| 16 | perch | 2026-11-19 | ⚠️ Warning | **`.audit/` held an 867 MB app copy with `node_modules` and was not ignored.** `git add -A` would have staged it. Fixed by adding `.audit/` and per-machine `.perch` config to `.gitignore` in `95aa20b`; verified with `git check-ignore`. Branches checked out before that commit still carry the trap. | ✅ Applied |
| 17 | perch | 2026-11-19 | 📝 Note | **`git status --porcelain` collapses new folders into one entry**, so file counts read far lower than reality (67 shown vs 397 with `-uall`). Any handoff that quotes a file count should state which flag produced it. | ⌛ Open |
| 15 | perch | 2026-11-17 | 📝 Note | **Perch CLI chat history is a buffer, not an archive.** `recentMessages` keeps only the last 11 messages, `/clear` discards the thread, and `cli-history.json` stores prompts only (no assistant replies). Only 2 thread files exist on disk. The reliable cross-session record is the session summary in `project-log-md/`. | ⌛ Open |

### Type Legend
- 🐛 Bug | 💡 Suggestion | ⚠️ Warning | 📝 Note

---

## 📜 Recent Activity Log

> บันทึกกิจกรรมล่าสุด (ล่าสุด 10 รายการ)

| # | Date | Agent | Action | Details |
|---|------|-------|--------|
| 0 | 2026-11-19 06:47 | perch | ✅ COMPLETE | **Committed the stock workflow work as `95aa20b`** on new branch `feat/stock-workflow-readiness` (23 files, +1697/−101): stock count rounds, stock card, printable requisition, request pagination, Asia/Bangkok report grouping, conditional `updateMany` on both surfaces. Also closed the `.audit/` trap in `.gitignore` (867 MB app copy with `node_modules` was stageable). Wrote a point-by-point reply to Codex's gates review. **Not pushed, no PR.** Test evidence still predates the commit. See `perch/2026-11-19_0647_session-summary.md` |
| 0 | 2026-11-17 07:24 | perch | 📝 PLAN | **Wrote and validated the PRD + PRP for `lib/thai-procurement/`.** 6 modules (money, baht-text, tax-id, fiscal, vat-wht, thresholds), 7 tasks, 72 tests. Extracted every module from the plan verbatim, placed it at the stated path, and ran the project's Vitest: **7 files, 72 tests, all passed**. Validation caught 7 real defects including a Bangkok/UTC day-arithmetic bug that treated every Thai Monday as a Sunday, a tier gap that threw on 5,000.50 baht, and a taxId fixture that failed its own checksum. Also fixed Perch's skill-registration cap with 21 project-level junctions. **No app code touched, no commit.** See `PRPs/perch/plan_reviews/2026-11-17_PRP_thai-procurement-utils-validate-3.md` |
| 0 | 2026-11-16 15:05 | perch | 🛠️ SETUP | **Cleaned the board of items older than 6 months.** Archived 4 sprint tasks, 6 queue entries, 2 issues and 10 activity entries to `HANDOFF_BOARD_ARCHIVE.md` — but only after verifying each is actually closed, not merely old: `swagger-jsdoc` is now a real dependency in `backend/package.json`; `frontend/next-app/middleware.ts` no longer exists (only `proxy.ts`); **tag `v1.5.0` exists (2026-02-13 12:12)**, followed by `v1.5.1` and up to `v4.1.0`; the `.agents` cutover is live in `AGENTS.md`. Nothing was deleted — all 20 source logs remain in `handoff/logs/`. Items that are old but still genuinely open (`cloudflared.exe` history, Quick Demo seed follow-up) stayed on the board. |
| 0 | 2026-11-16 14:55 | perch | 📊 ANALYSIS | Analyzed `secrets/examples` end-to-end — 14 files, 4 folders: 3 Apps Script apps (municipal stock 820+841 lines, materials log 467 live + 748 inert, SACS 1,292+2,830 lines) and 4 rebuild specs. Produced 5 docs: `CODEBASE_WALKTHROUGH.md`, `COMPARISON_HR-IMS_TH.md`, `FUNCTION_MAP_TH.md`, `SPEC-SUITE_UPDATE_TH.md`, `ADOPTION_PLAN_TH.md`. **No HR-IMS app code touched, no commit.** Key finding: all 4 specs pick Next.js + Prisma + Postgres — the same stack HR-IMS already runs — but HR-IMS has zero Thai-gov procurement domain and zero Thai-gov utils. See `logs/2026-11-16_1455_perch_to_all.md` |
| 1 | 2026-11-15 16:09 | perch | ✅ COMPLETE | **PR #35 merged to `main` as `a5e4938`** — closed the 4 open authz policy items (V20/V21/V22). CI 8/8 green. 249/249 authz + 75/75 unit; all three mutation-verified. See `logs/2026-11-15_1638_perch_to_all.md` (backfilled 2026-11-16) |
| 1 | 2026-11-15 14:30 | perch | ✅ COMPLETE | **PR #34 merged to `main` as `610417f`** — the 246 authz cases now gate every PR as a hard-fail job. CI 9/9 green; job log shows 246/246. 73 cases fail under a `requireRole` mutation. See `logs/2026-11-15_1638_perch_to_all.md` (backfilled 2026-11-16) |
| 0 | 2026-11-14 17:35 | perch | ✅ COMPLETE | Closed the 4 open authz policy items — **PR #35**, CI 9/9 green. V20 request visibility now matches the frontend's approver tier; V21 warehouse-less transitions refuse non-admins with 404; V22 stock-transfer creation requires source-warehouse scope. 253 authz + 75 unit cases pass; all three mutation-verified. See `logs/2026-11-14_1735_perch_to_all.md` |
| 0 | 2026-11-14 13:50 | perch | ✅ COMPLETE | Wired the 246 authz cases into CI as a hard-fail gate — new `security-authz` job in `ci.yml` (throwaway SQLite, no Redis/seed) and `continue-on-error` removed from `security-e2e.yml`. **PR #34 opened (draft), CI 9/9 green**; the new job's log shows `Tests: 246 passed, 246 total`. 73 fail under a `requireRole` mutation. See `logs/2026-11-14_1350_perch_to_all.md` |
| 0 | 2026-11-13 23:45 | perch | ✅ COMPLETE | PR #26 merged to `main` as `cc8392e` — build fixed (`INTERNAL_API_KEY` → `expectedKey`), CI 8/8 green, post-merge `tsc` 0 errors and auth tests 10/10 re-verified on `main`. |
| 1 | 2026-11-13 23:05 | perch | ✅ COMPLETE | PR #33 merged to `main` as `47ad231` — IDOR suite rewritten (28 cases, mutation-verified), CI 8/8 green. See `logs/2026-11-13_2240_perch_to_all.md` |
| 1 | 2026-11-13 13:30 | antigravity | ✅ COMPLETE | Completed IDOR/object-level authz fixes (V1–V24), unit/RBAC tests, and draft PR on `fix/object-level-authz` |
| 1 | 2026-11-10 09:11 | cursor | ✅ COMPLETE | Gated `/login` Quick Demo panel on `NEXT_PUBLIC_DEMO_MODE===true`. Credential module omitted from the production build when the flag is off. Seed still creates `*@demo.com` users (follow-up) |
| 0 | 2026-11-10 08:59 | cursor | ✅ COMPLETE | Removed tracked `cloudflared.exe` going forward; `.gitignore` blocks re-add; tunnel scripts/docs call `cloudflared` on PATH. History not rewritten. Credential scan: presence only, no tracked tunnel secret. |
| 2 | 2026-08-23 20:15 | cline | ✅ COMPLETE | BullMQ worker bootstrap — `src/worker.ts` + schedulers wired; escalation verified E2E against real Redis (`{"processed":0}` tick + hourly repeatable) |

> **Cleaned 2026-11-16:** 10 entries older than 6 months moved to
> [HANDOFF_BOARD_ARCHIVE.md](HANDOFF_BOARD_ARCHIVE.md) §4. Source logs remain in `handoff/logs/`.

### Action Types
- 📥 RECEIVE | 📤 HANDOFF | 🔵 START | ✅ COMPLETE | 🔍 DIAGNOSE | 🛠️ SETUP | 📊 ANALYSIS
