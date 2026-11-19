# Handoff / Follow-up Summary — Perch (Quill)

| Field | Value |
|-------|-------|
| **วันที่** | วันพุธที่ 18 พฤศจิกายน 2569 (2026-11-18) เวลา 13:27 น. (Asia/Bangkok) |
| **From Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **To Agent** | `all` |
| **Branch ที่ทำงาน** | `codex/hr-ims-examples-review-report` (ยังไม่ commit · ยังไม่ push · ยังไม่เปิด PR) |
| **เอกสารที่ทำตาม** | `2026-11-18_proposal-4-stock-workflow-decision-th.md` |
| **สถานะรวม** | 🟡 PENDING_HANDOFF — ทำตามข้อแนะนำ 1–4 แล้ว · full suite ยังไม่เสถียร · ยังไม่ commit |

> Iron Rules acknowledged — ไม่มี secret ถูกพิมพ์หรือ commit · ไม่ได้แตะ `.env` · ไม่ได้ push/merge เข้า `main` · ไม่ได้เปิด PR
>
> ไม่ได้รันคำสั่งเขียนฐานข้อมูลจริง · ไม่มี `DATABASE_URL` หรือ `TIDB_DATABASE_URL` ในเครื่อง

---

## 1. 🎯 ภารกิจ

ผู้ใช้ให้ทำตามเอกสารข้อเสนอที่ 4 และประเด็นก่อนเปิดใช้ระบบคลัง ซึ่งสรุปทางเลือกว่าให้ **คงการตัดสต็อกตอนอนุมัติในรอบแรก และเพิ่มประวัติการเคลื่อนไหวจากคำขอ** พร้อมให้แก้ความเสี่ยงรอบตรวจนับ กำหนดจุดเริ่มต้นบัตรคุมวัสดุ ยืนยัน migration/TiDB และแยกการตรวจผลทดสอบ ความเร็ว และสิทธิ์

---

## 2. ✅ Completed Work

### 2.1 แก้ความเสี่ยงรอบตรวจนับ (ข้อแนะนำ 1)
- `frontend/next-app/lib/actions/stock-count.ts`
  - `applyStockCount()` เปลี่ยนจาก loop เรียก `adjustStockQuantity()` ทีละรายการเป็น **หนึ่ง `$transaction`** ที่อ่านสถานะรอบใหม่ ตรวจ `approved` อีกครั้ง อัปเดต `StockLevel`, สร้าง `StockTransaction`, เขียน `auditLog`, และตั้งสถานะ `applied` ในธุรกรรมเดียวกัน → กันการลองใหม่ซ้ำหลังรายการกลางล้มเหลว
  - ใส่ `referenceId: StockCountRound:<id>` ใน `StockTransaction` เพื่อตรวจย้อนหลัง
  - `recordStockCount()` เปลี่ยนการคำนวณส่วนต่างจากเทียบกับยอดตอนเปิดรอบ (`systemQuantity`) มาเทียบกับ **ยอดระบบ ณ เวลานับ** (`StockLevel.quantity`) ตามกรณีที่เอกสารยกตัวอย่าง (เปิดรอบ 100 จ่ายออก 10 นับได้ 90 → ส่วนต่าง 0 ไม่ใช่ −10) โดยยังเก็บ `systemQuantity` เป็นข้อมูลอ้างอิงตอนเปิดรอบ
- `frontend/next-app/tests/actions/stock-count.test.ts` ปรับเทสต์ให้ตรงพฤติกรรมใหม่ 4/4 ผ่าน

### 2.2 เพิ่มประวัติการเคลื่อนไหวตอนอนุมัติคำขอ (ข้อเสนอ 4 ทางเลือกที่เลือก)
- `frontend/next-app/lib/actions/requests.ts` — ใน transaction เดิมของการอนุมัติ เพิ่ม `stockTransaction.create()` ประเภท `outbound` สำหรับ withdraw/borrow และ `inbound` สำหรับ return โดยใช้ `referenceId: Request:<id>`
- `backend/src/controllers/requestController.ts` — เพิ่ม `stockTransaction.create()` แบบเดียวกันใน transaction ของ Express (ใช้ `existingRequest.userId` เป็นผู้บันทึกเพราะ handler นี้ไม่มี `req.user` typed)
- `frontend/next-app/tests/actions/requests.test.ts` — เพิ่ม assertion ว่า `stockTransaction.create` ถูกเรียกด้วย `quantity: -2`, `type: 'outbound'`, `referenceId: 'Request:11'`
- `backend/src/tests/unit/requestController.test.ts` — เพิ่ม mock `stockTransaction.create` ทุก txMock และ assertion `quantity: -5`, `type: 'outbound'`, `referenceId: 'Request:1'`

### 2.3 จุดเริ่มต้นบัตรคุมวัสดุ (ข้อแนะนำ 2)
- `frontend/next-app/app/(dashboard)/inventory/stock-card/page.tsx` — เพิ่ม `STOCK_CARD_CUTOVER_DATE = '2026-11-18'` และข้อความในหน้าเว็บว่าก่อนวันนี้แสดงรายการเท่าที่ตรวจสอบได้ ไม่ใช้คำนวณยอดยกมา · ยอดทางการยังอ่านจาก `StockLevel`

### 2.4 Migration และ TiDB (ข้อแนะนำ 3)
- สร้าง `backend/prisma/migrations/manual/2026-11-18_stock_count.sql` ตามรูปแบบ idempotent ของโปรเจค (`CREATE TABLE IF NOT EXISTS` ผ่าน guard `information_schema.TABLES`) สำหรับ `StockCountRound` และ `StockCountLine` พร้อม FK และ index ให้ตรง schema
- `prisma validate` ผ่านทั้ง SQLite และ TiDB schema ที่แปลงด้วย `prepare-tidb-prisma.js`
- **ยังไม่ได้รัน migration บนฐานข้อมูลจริง** เพราะไม่มี `DATABASE_URL`/`TIDB_DATABASE_URL` และไม่แตะ `security-authz.db`

### 2.5 การตรวจผลทดสอบ (ข้อแนะนำ 4)
- `tsc --noEmit` ผ่านทั้ง frontend และ backend
- Vitest targeted 24/24 ผ่าน · Jest requestController 6/6 ผ่าน · assertion guard ผ่าน
- Full suite รัน 2 ครั้ง ตามที่เอกสารแนะนำ ผลไม่เสถียร: รันแรก 515/515 ผ่าน · รันที่สอง 508/515 (7 failures ใน `tests/components/login-form.test.tsx` เหมือนเดิม)

---

## 3. ⏳ Pending Work

- [ ] **แก้ความไม่เสถียรของ full suite** — `login-form.test.tsx` ผ่านบางรันและ fail บางรัน (รันเดี่ยวเคย 8/8 ผ่าน) ต้องตรวจ root cause ก่อนสรุปความพร้อมปล่อยของจริง
- [ ] **รัน migration จริงบน SQLite/TiDB** — ต้องมี `DATABASE_URL`/`TIDB_DATABASE_URL` และยืนยันขั้นตอน deploy ของหน่วยงาน
- [ ] **TiDB report parity จริง** — ยังไม่มีตัวเลขเปรียบเทียบผลรวมรายงาน SQLite vs TiDB
- [ ] **วัด p95 จริง** — ยังไม่มีชุดข้อมูลตัวแทนก่อน/หลัง
- [ ] **ยืนยันขอบเขตมองเห็นคำขอของ approver** ให้สอดคล้องกันทั้ง Next.js และ Express โดยยึดหน้าที่จริง (ยังไม่เปลี่ยนในรอบนี้)
- [ ] **Commit / push / เปิด PR draft** — ยังไม่ทำ รอคำสั่งเจ้าของโปรเจค

---

## 4. ⚠️ Issues & Observations

- ⚠️ **Full suite ไม่เสถียร** — 2 รันให้ผลต่างกัน (515/515 และ 508/515) ความล้มเหลวอยู่ที่ `login-form.test.tsx` ไม่ใช่ไฟล์ที่แตะในรอบนี้ แต่ตามข้อแนะนำ 4 ควรถือเป็น blocker ก่อนสรุปพร้อมปล่อย
- ⚠️ **ไม่มี live DB** — migration SQL ผ่านการตรวจรูปแบบและ schema validate แล้ว แต่ยังไม่ได้ execute จริง
- 💡 **ทางเลือกขั้นจ่ายจริงยังพักไว้** — ตามที่เอกสารตัดสิน ใช้ทางเลือก "ตัดตอนอนุมัติ + เพิ่มประวัติ" ในรอบแรก ยังไม่เพิ่มสถานะจ่าย/partial issue/overdue ใหม่

---

## 5. ✅ Verification

| รายการ | ผล |
|---|---|
| Prisma validate (SQLite + TiDB transform) | ผ่าน |
| `tsc --noEmit` frontend/backend | ผ่าน |
| Vitest targeted (requests + stock-count) | 24/24 ผ่าน |
| Jest requestController | 6/6 ผ่าน |
| Vitest full run #1 | 515/515 ผ่าน |
| Vitest full run #2 | 508/515 (7 flaky login-form) |
| `check-test-assertions.cjs` | ผ่าน |
| Migration SQL บน DB จริง | ยังไม่ได้รัน (ไม่มี URL) |

---

## 6. 📂 Files Changed (รอบนี้)

| Action | File Path | Description |
|--------|-----------|-------------|
| Modified | `frontend/next-app/lib/actions/stock-count.ts` | atomic apply + variance ณ เวลานับ |
| Modified | `frontend/next-app/tests/actions/stock-count.test.ts` | เทสต์พฤติกรรมใหม่ |
| Modified | `frontend/next-app/lib/actions/requests.ts` | StockTransaction ตอนอนุมัติ (Next.js) |
| Modified | `backend/src/controllers/requestController.ts` | StockTransaction ตอนอนุมัติ (Express) |
| Modified | `frontend/next-app/tests/actions/requests.test.ts` | assertion ประวัติการเคลื่อนไหว |
| Modified | `backend/src/tests/unit/requestController.test.ts` | mock + assertion ประวัติการเคลื่อนไหว |
| Modified | `frontend/next-app/app/(dashboard)/inventory/stock-card/page.tsx` | cutover date |
| Created | `backend/prisma/migrations/manual/2026-11-18_stock_count.sql` | migration ตารางตรวจนับ |
| Created | `project-log-md/perch/2026-11-18_1327_proposal-4-followup-handoff.md` | ไฟล์สรุปนี้ |

---

## 7. 📥 Received From

- รับมาจาก: `codex` (เอกสาร `2026-11-18_proposal-4-stock-workflow-decision-th.md`)
- Handoff ก่อนหน้า: `project-log-md/perch/2026-11-18_1251_examples-review-implementation-handoff.md`
- สิ่งที่ทำต่อ: แก้ความเสี่ยงรอบตรวจนับ → เพิ่มประวัติตอนอนุมัติ → กำหนด cutover → migration → รัน full suite 2 ครั้ง
