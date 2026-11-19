# Handoff / Readiness Gates — Perch (Quill)

| Field | Value |
|-------|-------|
| **วันที่** | วันพุธที่ 18 พฤศจิกายน 2569 (2026-11-18) เวลา 18:32 น. (Asia/Bangkok) · อัปเดต 18:56 น. |
| **From Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **To Agent** | `all` |
| **Branch** | `codex/hr-ims-examples-review-report` (ยังไม่ commit · ยังไม่ push · ยังไม่เปิด PR) |
| **งาน** | ปิด 5 เรื่องก่อนปล่อยตามรายงาน `2026-11-18_hr-ims-stock-readiness-recommendations-th.md` |
| **สถานะรวม** | 🟡 PENDING_HANDOFF — ปิดได้ 3 เรื่อง · ติดความปลอดภัย DB 2 เรื่อง · ยังไม่ commit |

> Iron Rules acknowledged — ไม่มี secret ถูกพิมพ์หรือ commit · ไม่ได้แตะ `.env` · ไม่ได้ push/merge เข้า `main` · ไม่ได้เปิด PR
>
> **เรื่อง secret:** ผู้ใช้แนบข้อมูลเชื่อมต่อ TiDB ที่ระบุว่าเป็น prod และฐานข้อมูล `hrims` พร้อมระบุห้ามอ่าน/ส่งในแชท ผมไม่ได้ใช้ข้อมูลนั้นเชื่อมต่อหรือเขียนฐานข้อมูล และไม่ได้บันทึกค่าใดลงไฟล์

---

## 1. ผลตามข้อ 1–5

| ข้อ | งาน | ผล |
|---|---|---|
| 1 | ตารางสิทธิ์ผู้อนุมัติ | จัดทำ `project-log-md/perch/2026-11-18_approver-signoff-matrix.md` แล้ว รอเจ้าของระบบเซ็นรับรอง |
| 2 | `npm run test:authz` | ✅ แก้ open handles ด้วย `prisma.$disconnect()` และรันผ่าน 249/249 exit 0 ด้วยค่า env ทดสอบชั่วคราว |
| 3 | Migration บน TiDB ทดสอบ | 🛑 หยุดก่อนเชื่อมต่อ เพราะ URL ที่ให้เป็น prod และมีขั้นตอนเขียน/ลบข้อมูล จัดทำ runbook แยกแล้ว |
| 4 | ทดสอบเขียนพร้อมกัน/rollback บน DB จริง | 🛑 หยุดก่อนเชื่อมต่อ prod เพิ่ม unit test ยืนยัน conditional guard แล้ว แต่ยังต้องรันบน DB ทดสอบ |
| 5 | เส้นทางคืนวัสดุ Express | ✅ ตรวจแล้ว ไม่มี caller จริง มีเฉพาะ test บันทึกผลไว้ใน sign-off matrix |

---

## 2. สิ่งที่ทำเสร็จ

### 2.1 แก้ open handles ของ authz
- `backend/src/tests/security/authz/idor.test.ts` — import `prisma` และเรียก `prisma.$disconnect()` ใน `afterAll` หลัง `teardownIdorFixture()`
- `backend/src/tests/security/authz/rbac-matrix.test.ts` — import `prisma` และเรียก `prisma.$disconnect()` ใน `afterAll`
- รันด้วยค่า env ทดสอบชั่วคราวบน SQLite ทดสอบ (`file:./security-authz.db`)
  - `rbac-matrix.test.ts` 212/212 ผ่าน
  - `idor.test.ts` 37/37 ผ่าน
  - `npm run test:authz` 249/249 ผ่าน exit 0 จบปกติ

### 2.2 ตารางสิทธิ์และชุดกรณี parity
สร้าง `project-log-md/perch/2026-11-18_approver-signoff-matrix.md` มีตารางสิทธิ์ตามบทบาท, ความแตกต่างระหว่าง Next.js/Express, ชุดกรณี 15 ข้อ และช่องที่เจ้าของระบบต้องเซ็น

จุดสำคัญที่ต้องตัดสิน:
- คำขอ `warehouseId = null` ที่ผู้อนุมัติเป็นเจ้าของเอง FE อนุญาต BE 404
- คำขอคืนที่ไม่มีคลัง FE อัปเดตบางส่วน BE 400
- Express `POST /api/requests` รับ `type` เป็น arbitrary string และจองสต็อกแม้เป็น return

### 2.3 เส้นทางคืนวัสดุ Express
ตรวจแล้วไม่มี caller จริงที่ส่ง `type: 'return'` ไปยัง `PATCH /api/requests/:id/status` มีเฉพาะ unit/IDOR/object-authz test เส้นทางที่ mount จริงคือ `PATCH /:id/status` ไม่มี `/api/requests/:id/approve` คำขอคืนจริงสร้างจาก Next.js Server Action `requestReturn`

### 2.4 ทดสอบ conditional guard
- `frontend/next-app/tests/actions/requests.test.ts` — เพิ่มเทสต์ยืนยัน `updateMany({ where: { id, status: 'pending' } })`
- `frontend/next-app/tests/actions/stock-count.test.ts` — เพิ่มเทสต์ยืนยัน `updateMany({ where: { id, status: 'approved' } })` และกรณี `count = 0` ต้อง rollback
- ผล targeted 26/26 ผ่าน

### 2.5 ตรวจ migration แบบคงที่
- `prisma validate` SQLite ผ่าน
- `prepare-tidb-prisma.js` + validate TiDB schema ผ่าน
- ตรวจข้อความ SQL พบ guard/idempotent, FK, unique `(roundId, itemId)` และ index `status`
- จัดทำ `project-log-md/perch/2026-11-18_tidb-test-runbook.md` สำหรับ DBA รันบน DB **ทดสอบ**เท่านั้น

---

## 3. ⛔ สิ่งที่หยุดและเหตุผล

- ไม่เชื่อมต่อ TiDB ตามข้อมูลที่แนบมา เพราะระบุ prod และงานข้อ 3/4 มี migration + fixture ที่ลบข้อมูล
- ไม่รัน concurrent/rollback test บน prod ต้องใช้ DB ทดสอบแยก
- ไม่พิมพ์หรือบันทึก secret ใด ๆ

---

## 4. ⏳ Pending Work

- [ ] เจ้าของระบบเซ็นตารางสิทธิ์ใน `2026-11-18_approver-signoff-matrix.md`
- [ ] DBA รัน migration ตาม `2026-11-18_tidb-test-runbook.md` บน TiDB **ทดสอบ** และเก็บหลักฐาน
- [ ] ทดสอบเขียนพร้อมกัน/rollback บน DB ทดสอบจริง
- [ ] เจ้าของระบบตัดสินใจว่าจะรองรับเส้นทางคืนวัสดุ Express ในรอบเปิดใช้หรือไม่
- [x] รัน full suite ใหม่ในสภาพแวดล้อมที่ node process ไม่ค้าง — 517/517 ผ่าน 2 รันติดต่อกัน (18:45 และ 18:50 น.)
- [ ] Commit / push / เปิด PR draft เมื่อเจ้าของโปรเจคอนุญาต

---

## 5. ✅ Verification

| รายการ | ผล |
|---|---|
| `npm run test:authz` | 249/249 ผ่าน exit 0 |
| Vitest targeted (requests + stock-count) | 26/26 ผ่าน |
| `tsc --noEmit` backend | ผ่าน |
| `tsc --noEmit` frontend | ผ่าน |
| `prisma validate` SQLite + TiDB | ผ่าน |
| Vitest full suite | ✅ 517/517 ผ่าน 2 รันติดต่อกัน (18:45 และ 18:50 น.) หลังเพิ่ม `vi.waitFor` ใน login-form test |
| Migration บน DB จริง | ไม่ได้รัน ตามเหตุผลด้านความปลอดภัย |

---

## 6. 📂 Files Changed (รอบนี้)

| Action | File Path | Description |
|--------|-----------|-------------|
| Modified | `backend/src/tests/security/authz/idor.test.ts` | `prisma.$disconnect()` ใน afterAll |
| Modified | `backend/src/tests/security/authz/rbac-matrix.test.ts` | `prisma.$disconnect()` ใน afterAll |
| Modified | `frontend/next-app/tests/actions/requests.test.ts` | เทสต์ conditional approval guard |
| Modified | `frontend/next-app/tests/actions/stock-count.test.ts` | เทสต์ conditional apply guard + rollback |
| Modified | `frontend/next-app/tests/components/login-form.test.tsx` | `vi.waitFor` เพื่อรอ DOM ภายใต้ load |
| Created | `project-log-md/perch/2026-11-18_approver-signoff-matrix.md` | ตารางสิทธิ์ + ชุดกรณี parity |
| Created | `project-log-md/perch/2026-11-18_tidb-test-runbook.md` | แนวทางรัน migration บน DB ทดสอบ |
| Created | `project-log-md/perch/2026-11-18_1832_readiness-gates-handoff.md` | ไฟล์สรุปนี้ |
