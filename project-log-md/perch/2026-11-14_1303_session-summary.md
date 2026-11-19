# Session Summary — Perch (Quill)

| Field | Value |
|-------|-------|
| **วันที่** | 14 พฤศจิกายน 2569 (2026-11-14) เวลา 13:03 น. |
| **Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **Session Duration** | 13 พ.ย. 2569 22:00 → 14 พ.ย. 2569 13:03 น. (ต่อเนื่องข้ามคืน) |
| **Branch ที่ทำงาน** | `main` (local) · `fix/idor-test-assertions` · `fix/proxy-header-spoofing` |
| **สถานะรวม** | งานที่รับมาส่งมอบครบ · เหลือเฉพาะงานที่รอเจ้าของตัดสินใจ |

> Iron Rules acknowledged — ไม่มี secret ถูกพิมพ์หรือ commit ในเซสชันนี้

---

## ✅ Completed Work (งานที่ทำเสร็จ)

### 1. รับงานต่อจาก Codex และตรวจสถานะจริง

รับ handoff `2026-11-13_2131_codex_to_all.md` แล้วตรวจใหม่ทั้งหมด พบว่าหลายอย่างขยับไปแล้ว:

| รายการ | Codex บันทึก | สถานะจริงตอนตรวจ |
|---|---|---|
| `origin/main` | `a6d9f2f` | `a6d9f2f` (ไม่ขยับ) |
| local `main` | ahead 2 | ahead 2 (ไม่เปลี่ยน) |
| PR #26 | OPEN draft `ddde6d11` | OPEN draft `ddde6d11` (เหมือนเดิม) |
| `origin/pr-26-review` | ใช้ review | **ถูกลบจาก origin แล้ว** |

### 2. PR #33 — เขียน `idor.test.ts` ใหม่ ✅ MERGED

**Merge commit:** `47ad231` (13 พ.ย. 2569 23:03 น.) · CI เขียว 8/8

**ปัญหาของไฟล์เดิม (ยืนยันจาก source):**
- ไม่มี `expect()` แม้แต่บรรทัดเดียว — เรียก `client.recordResult()` แล้วจบ เทสต์จึงผ่านเสมอ
- ยิง route ที่ไม่มีอยู่จริง 5 เส้น: `PUT /api/inventory/:id`, `POST /api/requests/:id/approve`, `POST /api/stock-levels/:id/adjust`, `GET /api/users/:id/profile`, `PUT /api/users/:id`
- `/api/users` ใช้ `authenticateToken` (JWT) ไม่ใช่ `x-user-*` header — ที่เดิมส่ง header แล้วได้ 401 คือการพิสูจน์ว่า route ปฏิเสธ scheme ที่มันไม่รับอยู่แล้ว
- นับ 404 เป็นหลักฐานว่าปลอดภัย

**สิ่งที่เขียนใหม่:**
- 28 เคส ทุกเคสมี `expect()` · ไม่รับ 500 เป็นความปลอดภัย
- route/method ตรงกับ `src/index.ts` ที่ mount จริง
- ทุก negative control มี positive control คู่กันบน route เดียวกัน
- block `route contract` ยืนยันว่า 5 path เก่ายังไม่ถูก mount
- `idor.fixture.ts`: 2 คลัง 6 ผู้ใช้ 1 item 3 requests, namespaced, teardown ตาม FK order, `checkDatabaseIsolation` ปฏิเสธ target ที่ไม่ใช่ SQLite

**ผลทดสอบ:**

| รายการ | ผล |
|---|---|
| `idor.test.ts` | 28/28 pass |
| `tsc --noEmit` | 0 errors |
| `rbac-matrix.test.ts` | 218/218 pass (ไม่ถูกกระทบ) |
| Mutation: `assertWarehouseAccess` → no-op | **4 เคสล้ม** |
| Mutation: `requireRole` → always allow | **5 เคสล้ม** |

### 3. PR #26 — แก้ build ที่ทำให้ merge ไม่ได้ ✅ MERGED

**Merge commit:** `cc8392e` (13 พ.ย. 2569 23:43 น.) · CI เขียว 8/8

**สาเหตุจริง (สรุปผิดตอนแรกแล้วแก้ภายหลัง):**
ตอนแรกเข้าใจว่า PR ลืมประกาศตัวแปร — **ไม่ถูก** branch ของ PR ประกาศ `const INTERNAL_API_KEY` เองและ compile ผ่านด้วยตัวเอง

สาเหตุจริงคือ `main` เปลี่ยนไปใช้ `expectedKey` ต่อ request แล้วลบ module-level const ทิ้ง PR แก้คนละบรรทัด git จึง merge ได้สะอาด **เก็บทั้งสองแบบไว้** เหลือ dead binding:

```
src/middleware/auth.ts(66,10): error TS2552: Cannot find name 'INTERNAL_API_KEY'
```

**วิธีแก้ (`ac5ded8`):** คง `expectedKey` ของ main (อ่านต่อ request ดีกว่า — rotate key ได้โดยไม่ต้อง restart) guard เช็ค `expectedKey` และ comparison ตัด `!expectedKey` ออกเพราะ guard return ไปแล้ว

**ตรวจซ้ำบน `main` หลัง merge:** `tsc` 0 error · auth tests 10/10

### 4. ตรวจและแก้ระบบ skill ให้เรียกได้ครบ

**ปัญหา:** `loadSkill` เรียกได้แค่ ~70 ตัวจาก `.agents/skills` 485 ตัว ส่วน `.claude/skills` เรียกไม่ได้เลย

**สิ่งที่พบ:**
- Perch อ่านจาก **`.perch/skills` (project) + `.agents/skills` + `~/.perch/skills` (personal)** — ยืนยันจาก bundle `perch.mjs` และคำสั่ง `perch skills`
- `.agents/skills` ถูกตัดที่ ~40 ตัวแรกตามตัวอักษร
- `~/.perch/skills` ไม่มีเพดาน — เป็นที่ที่ควรวาง
- 20 skill มี `disable-model-invocation: true` ซึ่ง Perch ตั้งใจไม่โหลด (`handoff`, `implement`, `teach`, `to-prd`, `triage`, `wizard` ฯลฯ)

**สิ่งที่ทำ:**
- สร้าง junction 110 ตัวจาก `~/.claude/skills` → `~/.perch/skills` (รวมของเดิมเป็น 112)
- ตรวจพบว่า junction ใน `~/.claude/skills` **110 ตัวมีอยู่ก่อนแล้ว** (เก่าสุด 5 ต.ค. 2569) ชี้ไป `~/.agents/skills` — ไม่ใช่ฝีมือเซสชันนี้
- ทำให้เกิด chain 2 ชั้น จึงแนะนำให้ repoint ตรงไป `.agents` (ของจริง)
- **policy บล็อกการ repoint** (ลบ junction นอกโปรเจกต์) — เจ้าของรันเองแล้ว

**ผลหลัง repoint:**

| | ก่อน | หลัง |
|---|---|---|
| ชี้ตรง `.agents` | 1 | **112** |
| ผ่าน `.claude` | 111 | **0** |
| อ่าน `SKILL.md` ได้ | 112 | **112** |
| เสีย | 0 | **0** |
| `perch skills` เห็น | ~70 | **129** (81 ส่วนตัว + 34 โปรเจกต์ + 14 built-in) |

เนื้อหาตรงกัน 112/112 (SHA256) · ต้นทางไม่ถูกแตะ (`.claude` 114, `.agents` 486, project `.agents` 17)

### 5. เอกสารและ handoff

- `project-log-md/handoff/logs/2026-11-13_2240_perch_to_all.md` — handoff log
- `project-log-md/handoff/HANDOFF_BOARD.md` — อัปเดต Issues #4/#5 และ Activity Log
- `project-log-md/codex/2026-11-13_2014_idor-live-review.md` — ของ Codex ไม่แตะ

---

## ⏳ Pending Work (งานที่ยังไม่ทำ)

### รอเจ้าของตัดสินใจ (blocker ของงาน security ที่เหลือ)

- [ ] **Technician เห็น request ของทุกคน** — `backend/src/controllers/requestController.ts:50` กรองเฉพาะ role `user` · เทสต์ pin พฤติกรรมปัจจุบันไว้แล้ว ไม่ได้แก้
- [ ] **Null-warehouse request transition** — `backend/src/routes/requests.ts:30` approver เปลี่ยน status request ของคนอื่นที่ `warehouseId=null` ได้
- [ ] **Stock-transfers disclosure** — `backend/src/routes/stock-transfers.ts:115` ไม่เช็ค source warehouse แต่คืน `available` ที่บรรทัด 142
- [ ] **V20/V21 policy** — warehouse/request visibility ต้องยืนยันกับ owner

### งานที่แนะนำให้ทำต่อ (ไม่ต้องรอใคร)

- [ ] **ต่อ `idor.test.ts` + `rbac-matrix.test.ts` เข้า CI แบบ hard-fail** ← แนะนำเป็นอันดับแรก
  - `ci.yml:129` ตัด `src/tests/security` ทั้งโฟลเดอร์ออก
  - `security-e2e.yml:122` เป็น `continue-on-error: true` และตัด rbac-matrix ออก
  - ผลคือ **218 เคสของ rbac-matrix ไม่ถูกรันที่ไหนเลย** ทั้งที่คอมเมนต์ในไฟล์อ้างว่า "already runs in main CI job"
  - ต้องมีไฟล์ SQLite ของ job เอง เพราะ `checkDatabaseIsolation` รับเฉพาะ `DATABASE_URL` ที่เป็น `file:`

### PR ค้าง

- [ ] **PR #24** `docs/cline-handoff-session-summary` — docs 3 ไฟล์ ค้างตั้งแต่ ส.ค. 2569, `CONFLICTING` 2 จุดที่ `HANDOFF_BOARD.md` (ทั้งสองฝั่งเพิ่มแถวในตารางเดียวกัน) · คุณค่าต่ำ
- [ ] **PR #30** `cursor/mysql-dev-dialect-8774` — draft, 41 ไฟล์ +1653/−479, `CONFLICTING` · แตะ schema, migration, seed, controller, CI · ต้องตัดสินก่อนว่าจะเลิกใช้ SQLite เป็น dev DB หรือไม่

### งานทำความสะอาด

- [ ] `D:\00 hrProject\hr-ims-pr26` — โฟลเดอร์ค้าง 313 ไฟล์ / 2.9 MB (worktree ถอนทะเบียนแล้ว แต่ `git worktree remove` timeout และ policy บล็อก recursive delete) · ลบเองด้วย `Remove-Item "D:\00 hrProject\hr-ims-pr26" -Recurse -Force`
- [ ] `.audit/` — artifact จากการทดสอบของ Codex 50,298 ไฟล์ · ไม่ใช่ source แอป · ตรวจก่อนลบ
- [ ] local `main` ahead 3 / behind 0 — มี 3 commit ที่ไม่เคย push (`aa91f0a`, `a6c28d5`, `487e059` เป็นงานค้างเดิม ไม่ใช่ของเซสชันนี้) · **ห้าม force** เพราะมี commit ของ agent อื่น

---

## ⚠️ Issues & Observations (ปัญหา/ข้อสังเกต/ข้อแนะนำ)

- 🐛 **Bug (แก้แล้ว)**: PR #26 merge ไม่ได้เพราะ `TS2552` — `INTERNAL_API_KEY` ถูกอ้างแต่ main ลบไปแล้ว · แก้ใน `ac5ded8` · merged `cc8392e`
- 🐛 **Bug (แก้แล้ว)**: `idor.test.ts` ไม่มี `expect()` เลย และยิง route ที่ไม่มีอยู่จริง 5 เส้น · เขียนใหม่ 28 เคส · merged `47ad231`
- ⚠️ **Warning**: `perch skills` รายงานว่า `cross-agent-handoff` มี frontmatter name `"Cross-Agent Handoff"` ไม่ตรงกับชื่อโฟลเดอร์ · **ยังไม่แก้** (ของโปรเจกต์ อยู่นอกขอบเขต)
- ⚠️ **Warning**: `security-e2e.yml` คอมเมนต์อ้างว่า rbac-matrix "already runs in-memory in the main backend CI job" — **ไม่จริง** เพราะ `ci.yml` ตัดทั้งโฟลเดอร์ security ออก
- 📝 **Note**: `handoff` skill เรียกไม่ได้เพราะมี `disable-model-invocation: true` — ใช้ `cross-agent-handoff` ของโปรเจกต์แทนได้
- 📝 **Note**: junction 110 ตัวใน `~/.claude/skills` เป็นของที่มีอยู่ก่อน (ต.ค. 2569) ไม่ใช่ฝีมือเซสชันนี้
- 📝 **Note**: `architect` มีใน `.agents/skills` แต่ไม่มีใน `.claude/skills` — `.claude` ไม่ใช่ superset ของ `.agents`
- 📝 **Note**: เซสชันนี้สรุปสาเหตุ TS2552 ผิดตอนแรก (บอกว่า PR ลืมประกาศตัวแปร) แล้วแก้ภายหลัง — บทเรียน: ต้อง merge จริงแล้ว build ก่อนสรุป

---

## 📂 Files Changed

| Action | File Path | Description |
|--------|-----------|-------------|
| Modified | `backend/src/tests/security/authz/idor.test.ts` | เขียนใหม่ 28 เคส มี assertion จริง + positive control |
| Created | `backend/src/tests/security/authz/idor.fixture.ts` | fixture 286 บรรทัด + teardown + isolation guard |
| Modified | `backend/src/middleware/auth.ts` | แก้ `INTERNAL_API_KEY` → `expectedKey` (PR #26) |
| Created | `project-log-md/handoff/logs/2026-11-13_2240_perch_to_all.md` | handoff log |
| Modified | `project-log-md/handoff/HANDOFF_BOARD.md` | Issues #4/#5 + Activity Log |
| Created | `project-log-md/perch/2026-11-14_1303_session-summary.md` | ไฟล์นี้ |

**ไฟล์ source นอก test tree ไม่ถูกแก้** ยกเว้น `backend/src/middleware/auth.ts` ที่แก้ใน PR #26 ตามที่ได้รับมอบหมาย

---

## 🔗 อ้างอิง

- PR #33: https://github.com/Arnutt-N/hr-ims/pull/33 → `47ad231`
- PR #26: https://github.com/Arnutt-N/hr-ims/pull/26 → `cc8392e`
- Handoff log: `project-log-md/handoff/logs/2026-11-13_2240_perch_to_all.md`
- รายงาน Codex ต้นทาง: `project-log-md/codex/2026-11-13_2014_idor-live-review.md`
