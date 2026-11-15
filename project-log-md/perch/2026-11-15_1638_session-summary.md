# Session Summary — Perch (Quill)

| Field | Value |
|-------|-------|
| **วันที่** | 15 พฤศจิกายน 2569 (2026-11-15) เวลา 16:38 น. |
| **Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **Session Duration** | 14 พ.ย. 2569 13:50 → 15 พ.ย. 2569 16:38 น. |
| **Branch ที่ทำงาน** | `ci/security-authz-hard-fail` · `fix/authz-policy-v20-v21` · `docs/agents-enforcement-truth` |
| **สถานะรวม** | PR #34 และ #35 **merge เข้า `main` แล้ว** · เหลือ 1 PR เอกสารรอเปิด + งานที่รอเจ้าของตัดสินใจ |

> Iron Rules acknowledged — ไม่มี secret ถูกพิมพ์หรือ commit ในเซสชันนี้

---

## ✅ Completed Work (งานที่ทำเสร็จ)

### 1. PR #34 — เทสต์ authz 246 เคสเข้า CI แบบ hard-fail ✅ MERGED

**Merge commit:** `610417f` (15 พ.ย. 2569 14:30 น.) · CI เขียว 9/9

**ปัญหาที่ปิด:** `idor.test.ts` (28 เคส) และ `rbac-matrix.test.ts` (218 เคส) ที่เพิ่งเขียนใหม่ใน PR #33 **ไม่ถูกรันที่ไหนเลย** — `ci.yml` ตัดทั้งโฟลเดอร์ `src/tests/security` ออก และ `security-e2e.yml` เป็น `continue-on-error: true` พร้อมตัด `rbac-matrix` ออกอีกชั้น คอมเมนต์ในไฟล์อ้างว่า matrix "already runs in-memory in the main backend CI job" ซึ่งไม่จริง

**สิ่งที่ทำ:**
- เพิ่ม job `security-authz` ใน `ci.yml` — hard-fail ทุก PR, SQLite เปล่า, **ไม่ต้อง Redis, ไม่ต้อง seed**
- ลบ `continue-on-error` ออกจาก `security-e2e.yml` และแก้คอมเมนต์ที่ผิด
- แยก scope ชัด: in-process suites → PR gate, live-server suites → nightly

**หลักฐาน:** 246/246 pass · mutation `requireRole` → 73 เคสล้ม exit 1 · job ใช้เวลา 30 วินาที

### 2. PR #35 — ปิด policy V20/V21/V22 ✅ MERGED

**Merge commit:** `a5e4938` (15 พ.ย. 2569 16:09 น.) · CI เขียว 8/8

| ข้อ | ปัญหา | คำตัดสิน |
|---|---|---|
| **V20** | `getRequests` กรองเฉพาะ `role === 'user'` → technician/auditor เห็น request ทุกคน | ใช้ approver tier เดียวกับ frontend (`APPROVER_ROLES`) เพราะ frontend เข้มกว่าอยู่แล้ว |
| **V21** | `scopeRequestWarehouse` ปล่อย non-owner ผ่านเมื่อ `warehouseId = null` | เฉพาะ admin tier ผ่าน; คนอื่นได้ 404 |
| **V22** | `POST /api/stock-transfers` สะท้อน `available` ใน 400 → stock oracle | บังคับ source-warehouse scope; **ไม่** เช็ค destination โดยเจตนา |

**สิ่งที่ทำเพิ่มหลังรีวิวก่อน merge (ทางเลือก 1):**
- Backend: เปลี่ยน 404 → **403** เมื่อคลังมีอยู่แต่ไม่มีสิทธิ์ (404 ทำให้ผู้ใช้ตามหาคลังที่ไม่ได้หายไป)
- Frontend: เพิ่ม `getTransferSourceWarehouses()` กรองด้วย `getManagedWarehouseIds` ตัวเดียวกับ backend
- `WarehouseSelector` รับ prop `scope`; ต้นทางใช้ `source`, ปลายทางคง `all`
- เพิ่ม positive control ที่ขาด: plain user ที่มี DepartmentMapping → 201 และคู่ลบ ไม่มี mapping → 403

**หลักฐาน:** 249/249 authz · 75/75 unit · tsc 0 error · mutation ยืนยันทั้ง 403→404 และถอด scope check

### 3. รัน pstack skills ครบ 7 ตัวตามลำดับ

| ขั้น | ผล |
|---|---|
| `no-comments` | ลบ 146 บรรทัด comment sermon · extract `isApproverTier` ไป `lib/authz.ts` · ลบ dead binding |
| `blast-radius` | พิสูจน์ด้วยการรัน 4 เคส: multi-role, uppercase, department mapping |
| `babysit` | ทั้งสอง PR `CLEAN`/`MERGEABLE` |
| `interrogate` | 1 finding รอดการรัน (destination ไม่ถูกเช็ค — ตัดสินว่าเป็นเจตนา) |
| `thermos` | parity พิสูจน์แล้ว: `expectedScope=[21]` ตรงกับ API 201/403 |
| `correct` | ตั้งชื่อ `test:unit` / `test:authz` ให้ CI เรียกคำเดียวกับที่คนรัน |
| `deslop` | ลบ `isActive: true` filter ที่ไม่มีใครขอ (เปลี่ยนพฤติกรรมเงียบ ๆ) |

### 4. Enforcement table + assertion guard ใน AGENTS.md

**เพิ่มใน `AGENTS.md`:**
- **Enforcement table** — บอกตรง ๆ ว่าชั้นไหนกันอะไร: ไม่มี husky, ไม่มี pre-commit hook; GitHub มี required checks 4 ตัว; ที่เหลือเป็นคำพูด
- **Mistake classes 6 ข้อ** พร้อม commit ที่พิสูจน์ว่าเกิดจริง
- **กฎ 4 ข้อ** ที่ต่อจากตาราง

**`scripts/check-test-assertions.cjs`** — guard ที่ทำให้ mistake #1 บังคับได้จริง:
- ผ่านกับ 3 ไฟล์ที่สะอาด: `ok: 3 test file(s), every it-block asserts something`
- ลบ `expect()` → exit 1 พร้อมชี้ชื่อเทสต์
- ผูกเข้า CI แบบ ratchet (ไม่ให้ build แดงจากหนี้เดิม)

### 5. แก้ข้อผิดพลาดของตัวเอง

| ผิด | แก้ |
|---|---|
| เขียนว่า "ไม่มี branch protection" | ของจริงมี required checks 4 ตัว (strict, required_conversation_resolution) · `enforce_admins = false` |
| เขียนว่า CI "ไม่บล็อก merge" | 4 job บล็อกจริง · authz/E2E/Lighthouse ไม่บล็อก |
| `test:authz` ประกาศบน #35 แต่ #34 ยังใช้ `npx jest` inline | `5706bdc` ให้ #34 เรียกชื่อ script |
| assertion guard ใช้ path ผิด (job มี `working-directory: backend`) | `4cd2b6b` แก้เป็น `../scripts/...` |

---

## ⏳ Pending Work (งานที่ยังไม่ทำ)

### PR เอกสารที่ยังไม่เปิด

- [ ] **`docs/agents-enforcement-truth`** — commit `4a9c174` แก้ enforcement table ให้ตรงความจริง (branch protection เปิดอยู่) · push แล้ว แต่**ยังไม่ได้เปิด PR** · branch มี 2 commit (รวม `d0524b7` ของ Claude ที่ติดมา)

### งานที่รอเจ้าของตัดสินใจ

- [ ] **หนี้ assertion 8 ไฟล์** — security suite ที่สร้าง `SecurityTestResult` แล้วเรียก `recordResult()` เท่านั้น จึงผ่านเสมอ:
  `api/rate-limiting` (11/11) · `auth/brute-force` (6/8) · `auth/jwt-attacks` (9/11) · `auth/session-security` (10/10) · `authz/privilege-escalation` (13/13) · `infra/security-headers` (18/18) · `injection/sql-injection` (10/11) · `injection/xss` (12/12)
- [ ] **เพิ่ม job เหล่านี้เป็น required checks** — ตอนนี้ `Backend · authz`, E2E, Lighthouse ไม่บล็อก merge
- [ ] **local `main` ahead 1** — commit `d0524b7` ของ Claude (handoff log 2026-11-11) ยังไม่ push · ไม่ใช่ของเซสชันนี้ · **ห้าม force**
- [ ] **branch `docs/agents-enforcement-truth` ahead 2** จาก `origin/main` — `4a9c174` (ของเซสชันนี้) + `d0524b7` (ของ Claude ที่ติดมา) · ต้องตัดสินว่าจะเปิด PR รวมหรือแยก

### PR ค้าง

- [ ] **PR #24** `docs/cline-handoff-session-summary` — ค้างตั้งแต่ ส.ค. 2569, `CONFLICTING`
- [ ] **PR #30** `cursor/mysql-dev-dialect-8774` — draft, `CONFLICTING`, แตะ schema/migration/seed/CI · ต้องตัดสินก่อนว่าจะเลิกใช้ SQLite เป็น dev DB หรือไม่

### งานทำความสะอาด

- [ ] `D:\00 hrProject\hr-ims-pr26` — โฟลเดอร์ค้าง 313 ไฟล์ / 2.9 MB (policy บล็อก recursive delete) · ลบเองด้วย `Remove-Item "D:\00 hrProject\hr-ims-pr26" -Recurse -Force`
- [ ] `.audit/` — artifact จากการทดสอบของ Codex ~50,298 ไฟล์ · ไม่ใช่ source แอป · ตรวจก่อนลบ
- [ ] **backup refs** ที่ไม่ต้องใช้แล้ว: `backup/pr35-pre-rebase`, `backup/pre-rebase-34`, `backup/pr35-pre-rebase2` · ลบด้วย `git branch -D <name>`
- [ ] `.claude/skill-collections-20260815.md` ถูกลบและค้างใน working tree — **ของเดิมก่อนเซสชันนี้ ไม่ใช่ฝีมือเซสชัน**

---

## ⚠️ Issues & Observations (ปัญหา/ข้อสังเกต/ข้อแนะนำ)

- 🐛 **Bug (แก้แล้ว)**: assertion guard ใช้ path `scripts/...` แต่ job `backend` มี `working-directory: backend` → `MODULE_NOT_FOUND` · แก้ใน `4cd2b6b`
- 🐛 **Bug (แก้แล้ว)**: `package.json` มี `test:unit`/`test:authz` **ซ้ำสองครั้ง** หลัง rebase ทับ #34 · แก้โดยคืนไฟล์ให้ตรง main
- ⚠️ **Warning**: `AGENTS.md` เวอร์ชันที่ merge ไปใน #35 เขียนว่าไม่มี branch protection ซึ่ง**ผิด** · แก้ใน branch `docs/agents-enforcement-truth` ที่ยังไม่เปิด PR
- ⚠️ **Warning**: subagent หลุด 3 ครั้งในเซสชันนี้ (comment-sicko 69 tool calls, thermos 2 ตัวที่ 43 และ 51) · งานทำเองแทนด้วยกฎเดียวกัน ใช้ token น้อยกว่าและได้หลักฐานที่ตรวจซ้ำได้
- ⚠️ **Warning**: `npm ci` บนเครื่องนี้ต้องใช้ `--allow-remote=all` เพราะ lockfile ชี้ tarball 700 รายการไป `registry.npmmirror.com` และ npm 12 ตั้ง `allow-remote = "none"` · npm ยังบล็อก install script ของ bcrypt ต้องรัน `npx node-pre-gyp install --fallback-to-build` เอง
- 📝 **Note**: vitest ทั้งชุดบนเครื่องล้ม 7 เคสใน `maintenance-v6.test.ts` เพราะ worker timeout · รันเดี่ยวผ่าน 33/33 · CI เขียว · ไม่ใช่ bug ในโค้ด
- 📝 **Note**: `jest` รันสอง suite รวมกันบน Windows crash ด้วย `-1073740791` (stack buffer overrun) · รันแยกไฟล์ผ่านทั้งคู่ · CI (ubuntu) ไม่มีปัญหา
- 📝 **Note**: frontend `tsc --noEmit` มี error เดิมเต็มโปรเจกต์ (เช่น `next/navigation` ไม่มี declaration) · ไม่ใช่ของเซสชันนี้ · ไฟล์ที่แตะมีแค่ error `next/cache` ที่มีอยู่ก่อน

---

## 📂 Files Changed

### PR #34 (`610417f`)

| Action | File Path | Description |
|--------|-----------|-------------|
| Modified | `.github/workflows/ci.yml` | job `security-authz` ใหม่ + เรียก `test:unit`/`test:authz` |
| Modified | `.github/workflows/security-e2e.yml` | ลบ `continue-on-error`, แก้คอมเมนต์ที่ผิด |
| Modified | `backend/package.json` | เพิ่ม `test:unit`, `test:authz` |
| Created | `project-log-md/handoff/logs/2026-11-14_1350_perch_to_all.md` | handoff log |

### PR #35 (`a5e4938`)

| Action | File Path | Description |
|--------|-----------|-------------|
| Modified | `backend/src/controllers/requestController.ts` | V20: approver tier |
| Modified | `backend/src/routes/requests.ts` | V21: null-warehouse → 404 |
| Modified | `backend/src/routes/stock-transfers.ts` | V22: source scope → 403 |
| Modified | `backend/src/lib/authz.ts` | เพิ่ม `isApproverTier` |
| Modified | `backend/src/tests/security/authz/idor.fixture.ts` | auditor, departmentUser, victimNoWarehouse, teardown StockTransfer |
| Modified | `backend/src/tests/security/authz/idor.test.ts` | 7 เคสใหม่ |
| Modified | `backend/src/tests/security/authz/rbac-matrix.fixture.ts` | ถอด POST stock-transfers ออกจาก role-only matrix |
| Modified | `backend/src/tests/unit/object-authz.test.ts` | อัปเดต 2 เคสที่ pin พฤติกรรมเก่า |
| Modified | `frontend/next-app/lib/actions/warehouse.ts` | `getTransferSourceWarehouses()` |
| Modified | `frontend/next-app/components/warehouse/WarehouseSelector.tsx` | prop `scope` + empty state |
| Modified | `frontend/next-app/components/warehouse/StockTransferForm.tsx` | ใช้ `scope="source"` |
| Modified | `AGENTS.md` | enforcement table + mistake classes |
| Created | `scripts/check-test-assertions.cjs` | assertion guard |
| Created | `project-log-md/handoff/logs/2026-11-14_1735_perch_to_all.md` | handoff log |

### ยังไม่ merge (`docs/agents-enforcement-truth`)

| Action | File Path | Description |
|--------|-----------|-------------|
| Modified | `AGENTS.md` | แก้ enforcement table: branch protection เปิดอยู่จริง |
| Created | `project-log-md/perch/2026-11-15_1638_session-summary.md` | ไฟล์นี้ |

---

## 🔗 อ้างอิง

- PR #34: https://github.com/Arnutt-N/hr-ims/pull/34 → `610417f`
- PR #35: https://github.com/Arnutt-N/hr-ims/pull/35 → `a5e4938`
- Handoff log: `project-log-md/handoff/logs/2026-11-14_1350_perch_to_all.md`, `2026-11-14_1735_perch_to_all.md`
- CI บน main หลัง merge: run `43690226463` (#34) และ `43697837472` (#35) — เขียวทั้งคู่
