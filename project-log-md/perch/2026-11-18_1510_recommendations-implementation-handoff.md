# Handoff / Session Summary — Perch (Quill)

| Field | Value |
|-------|-------|
| **วันที่** | วันพุธที่ 18 พฤศจิกายน 2569 (2026-11-18) เวลา 15:10 น. (Asia/Bangkok) · อัปเดตผล authz 16:28 น. |
| **From Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **To Agent** | `all` |
| **Branch ที่ทำงาน** | `codex/hr-ims-examples-review-report` (ยังไม่ commit · ยังไม่ push · ยังไม่เปิด PR) |
| **เอกสารที่ทำตาม** | `2026-11-18_proposal-4-followup-recommendations-th.md` |
| **สถานะรวม** | 🟡 PENDING_HANDOFF — ทำเกณฑ์ตรวจรับที่แก้ได้ในโค้ดแล้ว · full suite เสถียรแล้ว · authz ยังรันอยู่ · migration/ข้อมูลนำร่องยังค้าง |

> Iron Rules acknowledged — ไม่มี secret ถูกพิมพ์หรือ commit · ไม่ได้แตะ `.env` · ไม่ได้ push/merge เข้า `main` · ไม่ได้เปิด PR

---

## 1. 🎯 ภารกิจ

ผู้ใช้ให้ใช้ skill `pstack poteto-mode` implement ตามเอกสารข้อเสนอแนะหลังดำเนินการตามข้อเสนอที่ 4 ซึ่งกำหนดเกณฑ์ตรวจรับ 3 เรื่องก่อนเปิดใช้ ได้แก่ ประวัติเบิก/ยืม/คืนตรงกันสองฝั่ง, การปรับยอดครั้งเดียวเมื่อสั่งพร้อมกัน, และยอดยกมาที่รับรองได้ พร้อมตารางความพร้อมก่อนปล่อย

---

## 2. ✅ Completed Work

### 2.1 ประวัติเบิก/ยืม/คืนตรงกันทั้งสองฝั่ง
- `backend/src/controllers/requestController.ts`
  - เปลี่ยน signature เป็น `AuthRequest` เพื่อให้มี `req.user` แบบ type-safe
  - เพิ่มสาขา `return` ใน `updateRequestStatus()` เมื่อ approve → เพิ่ม `StockLevel.quantity`, `InventoryItem.stock`, บันทึก `StockTransaction` type `inbound`, `history` status `completed` (ตรงกับ Next.js)
  - ใช้ `actorId = req.user.userId ?? req.user.id` เป็น `StockTransaction.userId` (ผู้ทำรายการ) ส่วน `history.userId` ยังเป็นผู้ขอ ทำให้ดูย้อนหลังได้ว่าทั้งสองทำหน้าที่ใด
  - withdraw/borrow ยังตัด `quantity` และ `reserved` พร้อมบันทึก `outbound`
- `backend/src/tests/unit/requestController.test.ts` — อัปเดต mock ทุกตัวสำหรับ `updateMany` + `findUnique` สองครั้ง และเพิ่มเทสต์คำขอคืน (inbound, quantity +3, userId 5)

### 2.2 กันซ้ำเมื่อสั่งพร้อมกัน (conditional status update)
- `backend/src/controllers/requestController.ts` — เปลี่ยน `request.update` เป็น `request.updateMany({ where: { id, status: 'pending' } })` ถ้า `count !== 1` ให้ throw และ rollback ทั้ง transaction
- `frontend/next-app/lib/actions/requests.ts` — ทำแบบเดียวกันทั้งสาขา approve และ reject/cancel
- `frontend/next-app/lib/actions/stock-count.ts` — `applyStockCount()` ใช้ `stockCountRound.updateMany({ where: { id, status: 'approved' } })` ภายใน transaction เดิม ถ้า `count !== 1` ให้ throw → rollback ยอด/ประวัติ/สถานะพร้อมกัน
- อัปเดต mock ใน `requests.test.ts` และ `stock-count.test.ts` สำหรับ `updateMany`

### 2.3 ยอดยกมา / cutover
- `frontend/next-app/app/(dashboard)/inventory/stock-card/page.tsx`
  - เปลี่ยน `STOCK_CARD_CUTOVER_DATE` ให้อ่านจาก env `STOCK_CARD_CUTOVER_DATE` ได้ โดยค่าเริ่มต้นยังเป็น `2026-11-18`
  - เพิ่มข้อความเตือนในหน้าว่าก่อนใช้กระทบยอดต้องบันทึกยอดยกมารายคลัง/รายวัสดุ พร้อมเวลาและผู้รับรอง และตรวจสมการ `ยอดยกมา + รับเข้า − จ่ายออก + ปรับยอด = StockLevel.quantity`
- **ยังไม่มีข้อมูลยอดยกมาจริง** ต้องให้คลังนำร่องให้ข้อมูลก่อนใช้กระทบยอด

### 2.4 แก้ความไม่เสถียรของ full suite
- `frontend/next-app/tests/components/login-form.test.tsx`
  - ย้าย `delete process.env.NEXT_PUBLIC_DEMO_MODE` มาก่อน `vi.resetModules()` ใน `beforeEach`
  - เพิ่ม `vi.resetModules()` ในแต่ละ test case หลัง `stubEnv`
  - ล้าง cookie `hr-ims-locale` ใน `beforeEach`/`afterEach` เพราะ `LocaleProvider` reconcile กับ cookie บน mount และ jsdom เก็บ cookie ข้าม case
- ผล full suite รัน 2 ครั้งติดต่อกัน 515/515 ผ่านทั้งคู่ (ก่อนหน้า 515/515 สลับ 508/515)

---

## 3. ⏳ Pending Work

- [ ] **รัน `npm run test:authz` ให้ผ่านในสภาพแวดล้อมที่มี secret ครบ** — ตรวจแล้ว 27/37 fail เนื่องจากไม่มี `JWT_SECRET` และ `INTERNAL_API_KEY` ตรงกับ config (ในเครื่องไม่มี `.env`) และ Jest ค้างจาก open handles ต้องใช้ secret ของสภาพแวดล้อมจริง ไม่เดาค่าในโค้ด
- [ ] **รัน migration จริงบนฐานข้อมูลทดสอบ** — ยังไม่มี `DATABASE_URL`/`TIDB_DATABASE_URL`
- [ ] **เทียบผลรวมรายงาน SQLite vs TiDB** รวมกรณีข้ามเดือนตามเวลาไทย
- [ ] **วัด p95 หน้าคำขอและรายงาน** จากชุดข้อมูลตัวแทน
- [ ] **ให้เจ้าของยืนยันขอบเขต approver** ให้ตรงกันทั้ง Next.js และ Express
- [ ] **ให้คลังนำร่องให้ยอดยกมารับรอง** พร้อมเวลาและผู้รับรอง
- [ ] **Commit / push / เปิด PR draft** รอคำสั่งเจ้าของโปรเจค

---

## 4. ⚠️ Issues & Observations

- ⚠️ **authz ไม่ผ่านในเครื่องนี้** — background รันนาน 61 นาทีแล้วจบแบบไม่มีผล · รันแยกด้วย `DATABASE_URL=file:./security-authz.db` ผล 32 fail/5 pass เพราะ `JWT_SECRET` ไม่มี · ใส่ JWT ชั่วคราวผล 27 fail/10 pass เพราะ internal key ไม่ตรง · 27 failures ส่วนใหญ่เป็น route contract/authorization ที่ต้องใช้ secret จริง · Jest ค้างจาก open handles ต้องใช้ `--forceExit` · **ไม่ถือว่าโค้ดที่แก้ทำให้ authz fail** แต่ก็ยังไม่ผ่านเกณฑ์ CI ในเครื่องนี้
- ⚠️ **Express return ผ่าน route จริงยังไม่ได้ทดสอบ E2E** — มี unit test แล้ว แต่ยังไม่ได้ยืนยันว่ามี caller จริงส่ง `type: 'return'` มาที่ `PATCH /:id/status`
- 💡 **การอ่านสถานะอย่างเดียวไม่พอ** — แก้ด้วย conditional `updateMany` แล้ว แต่ยังไม่ได้ทดสอบบน DB จริงแบบ concurrent

---

## 5. ✅ Verification

| รายการ | ผล |
|---|---|
| `tsc --noEmit` backend | ผ่าน |
| `tsc --noEmit` frontend | ผ่าน |
| Jest `requestController.test.ts` | 7/7 ผ่าน |
| Vitest targeted (requests + stock-count + login-form) | login-form เดี่ยว 8/8 ผ่าน |
| Vitest full run #1 (14:47 น.) | 515/515 ผ่าน |
| Vitest full run #2 (14:53 น.) | 515/515 ผ่าน |
| `npm run test:unit` (backend) | 76/76 ผ่าน |
| `npm run test:authz` | ไม่ผ่านในเครื่องนี้ (27 fail/10 pass ด้วย env ชั่วคราว; ต้องใช้ secret จริง) |
| `check-test-assertions.cjs` | ผ่าน |
| Migration SQL บน DB จริง | ยังไม่ได้รัน |

---

## 6. 📂 Files Changed (รอบนี้)

| Action | File Path | Description |
|--------|-----------|-------------|
| Modified | `backend/src/controllers/requestController.ts` | AuthRequest, return branch, actorId, conditional updateMany |
| Modified | `backend/src/tests/unit/requestController.test.ts` | mocks + เทสต์ return + updateMany |
| Modified | `frontend/next-app/lib/actions/requests.ts` | conditional updateMany ทั้ง approve/reject |
| Modified | `frontend/next-app/lib/actions/stock-count.ts` | conditional updateMany ตอน apply |
| Modified | `frontend/next-app/tests/actions/requests.test.ts` | mocks + assertions updateMany |
| Modified | `frontend/next-app/tests/actions/stock-count.test.ts` | mock updateMany |
| Modified | `frontend/next-app/app/(dashboard)/inventory/stock-card/page.tsx` | cutover env + ข้อความยอดยกมา |
| Modified | `frontend/next-app/tests/components/login-form.test.tsx` | แก้ flaky test |
| Created | `project-log-md/perch/2026-11-18_1510_recommendations-implementation-handoff.md` | ไฟล์สรุปนี้ |

---

## 7. 📥 Received From

- รับมาจาก `codex` เอกสาร `2026-11-18_proposal-4-followup-recommendations-th.md`
- Handoff ก่อนหน้า `project-log-md/perch/2026-11-18_1340_session-consolidated-handoff.md`
- สิ่งที่ทำต่อ: ทำให้ประวัติตรงกันสองฝั่ง → กันซ้ำด้วย conditional update → cutover ตั้งค่าได้ → แก้ flaky test → รัน full suite 2 ครั้ง
