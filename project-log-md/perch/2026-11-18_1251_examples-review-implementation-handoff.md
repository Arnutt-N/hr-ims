# Handoff / Session Summary — Perch (Quill)

| Field | Value |
|-------|-------|
| **วันที่** | วันพุธที่ 18 พฤศจิกายน 2569 (2026-11-18) เวลา 12:51 น. (Asia/Bangkok) |
| **From Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **To Agent** | `all` |
| **Branch ที่ทำงาน** | `codex/hr-ims-examples-review-report` (ยังไม่ commit · ยังไม่ push · ยังไม่เปิด PR) |
| **Revision อ้างอิงรายงาน** | `9f5c2b6` |
| **Session Duration** | 18 พ.ย. 2569 ประมาณ 11:50 – 12:51 น. |
| **สถานะรวม** | 🟡 PENDING_HANDOFF — ทำข้อเสนอ 1–3 เสร็จ · ข้อเสนอ 4 รอตัดสินกติกา · ยังไม่ commit |

> Iron Rules acknowledged — ไม่มี secret ถูกพิมพ์หรือ commit · ไม่ได้แตะ `.env` · ไม่ได้ push/merge เข้า `main` · ไม่ได้เปิด PR (ต้องเป็น draft เมื่อเปิด)
>
> หมายเหตุ skill: ไม่มี `SKILL.md` ชื่อ `handoff` โดยตรง ใช้ skill `cross-agent-handoff` ร่วมกับฟอร์แมต session summary ที่มีอยู่ใน `project-log-md/perch/`

---

## 1. 🎯 ภารกิจ

ผู้ใช้ให้ใช้ skill `pstack poteto-mode` ตรวจโค้ดตามจุดที่รายงาน [2026-11-18_hr-ims-examples-review-th.md](../../project-log-md/codex/2026-11-18_hr-ims-examples-review-th.md) ชี้ แล้ว implement ข้อเสนอในรายงาน ต่อมาให้ "continue" จึงทำข้อเสนอ 3 ต่อ และสุดท้ายให้สรุปงานที่เสร็จ/ค้างพร้อมชื่อ agent และเวลาแบบไทยลงที่ `project-log-md/perch`

---

## 2. ✅ Completed Work (งานที่ทำเสร็จ)

### 2.1 ตรวจโค้ดตามจุดที่รายงานชี้ (เสร็จ 11:58 น.)
ยืนยันข้อกล่าวอ้างของรายงานตรงกับโค้ดที่ `9f5c2b6` ทุกจุดที่ตรวจ
- `getReportStats()` มี `prisma.user.groupBy()` ที่เรียกแล้วทิ้งผล · `usersById.find()` ใน loop · รวมยอดเดือนในแอปด้วย `toISOString()` (UTC)
- `getRequests()` ดึงคำขอพร้อม `requestItems`/`item` ไม่มี `take`/`skip`
- `StockTransaction`/`Request` เป็นแหล่งข้อมูลที่ใช้ได้ · รับเข้าบันทึกยอด+transaction ใน `$transaction` เดียวกันและรับ `referenceId` แบบข้อความ
- อนุมัติตัด `quantity` และลด `reserved` ทั้ง Next.js (`requests.ts`) และ Express (`requestController.ts`)
- ฟังก์ชันจัดซื้อ `lib/thai-procurement/` มี 7 ไฟล์ แต่ import พบเฉพาะในไฟล์ทดสอบ

พบเพิ่ม: การจัดลำดับไม่ตรงกัน (Next.js ใช้ `createdAt`, Express ใช้ `date`) และเขตเวลา UTC ในรายงานเดือน

### 2.2 ข้อเสนอ 1 — บัตรคุมวัสดุและใบเบิกพิมพ์ได้ (เสร็จ ~12:10 น.)
- `frontend/next-app/lib/actions/stock-management.ts` — เพิ่ม `getStockCard(filters)` กรองคลัง/วัสดุ/ช่วงวันที่ ตรวจสิทธิ์ด้วย `canAccessWarehouse`
- `frontend/next-app/app/(dashboard)/inventory/stock-card/page.tsx` + `PrintStockCardButton.tsx` — หน้าบัตรคุมวัสดุ แสดงรายการเคลื่อนไหวและยอดคงเหลือจาก `StockLevel` **แยกกัน** เพราะ `StockTransaction` ไม่บันทึกการตัดสต็อกตอนอนุมัติ (จึงไม่คำนวณยอดยกมาจากประวัติ)
- `frontend/next-app/lib/actions/requests.ts` — เพิ่ม `getRequestForPrint(id)` ใช้ visibility เดียวกับ `getRequests`
- `frontend/next-app/app/(dashboard)/requests/[id]/print/page.tsx` + `frontend/next-app/components/requests/PrintRequisition.tsx` — ใบเบิก A4 พิมพ์ได้ ตามรูปแบบ `PrintWorkOrder`
- `frontend/next-app/components/dashboard/requests-table.tsx` — ปุ่ม "พิมพ์ใบเบิก" ต่อ row
- `frontend/next-app/components/layout/sidebar.tsx` — ลิงก์ Stock Card

### 2.3 ข้อเสนอ 2 — ลดข้อมูลหน้ารายงาน/คำขอ (เสร็จ ~12:15 น.)
- `frontend/next-app/lib/actions/reports.ts` — ลบ `groupBy()` ที่ไม่ใช้ · เปลี่ยน `find()` เป็น `Map` · เปลี่ยนจัดกลุ่มเดือนเป็นเขตเวลา `Asia/Bangkok` ผ่าน `Intl.DateTimeFormat('en-CA', …)` · ตัด field `action` ที่ไม่ใช้ออกจาก `select`
- `frontend/next-app/lib/actions/requests.ts` — `getRequests()` รับ options (`status`/`page`/`perPage`) ยังรองรับ positional `status` เดิม · แบ่งหน้าฝั่งเซิร์ฟเวอร์ (`take`/`skip`/`count`) · orderBy `(createdAt desc, id desc)` · นับ `pendingCount` แยกจาก filter · เพิ่ม pagination ในผลลัพธ์
- `frontend/next-app/app/(dashboard)/requests/page.tsx` — อ่าน `page`/`status` จาก `searchParams` · ใช้ `pendingCount` จากเซิร์ฟเวอร์ · ส่ง `pagination` ให้ตาราง
- `frontend/next-app/components/dashboard/requests-table.tsx` — ใช้ `components/ui/pagination.tsx` · แก้ empty-state ให้ยังแสดง pagination

### 2.4 ข้อเสนอ 3 — รอบตรวจนับและจัดการส่วนต่าง (เสร็จ ~12:40 น.)
- `backend/prisma/schema.prisma` — เพิ่ม `StockCountRound` (สถานะ `counting | review | approved | applied | cancelled`) และ `StockCountLine` (`systemQuantity` สแนปชอตตอนเปิดรอบ, `countedQuantity`, `variance`) พร้อม relations ใน `User`, `Warehouse`, `InventoryItem` และ index
- Regenerate Prisma client ทั้ง backend และ frontend แล้ว
- `frontend/next-app/lib/actions/stock-count.ts` — 5 action: `createStockCountRound`, `recordStockCount`, `approveStockCount`, `applyStockCount`, `getStockCountRounds` · `applyStockCount` เรียก `adjustStockQuantity` เดิม จึงยังเขียน `StockTransaction` + audit ตามกติกาเดิม ไม่เปลี่ยนกติกาตัดสต็อก
- `frontend/next-app/components/inventory/StockCountActions.tsx` + `app/(dashboard)/inventory/stock-count/page.tsx` — หน้ารอบตรวจนับ พร้อมปุ่มตามสถานะ
- `frontend/next-app/components/layout/sidebar.tsx` — ลิงก์ Stock Count
- `frontend/next-app/tests/actions/__mocks__/prisma.ts` — เพิ่ม `stockCountRound`, `stockCountLine`

### 2.5 เทสต์ที่เพิ่ม
- `tests/actions/reports.test.ts` — ทดสอบเขตเวลา Bangkok (UTC 30 เม.ย. 17:30 → พฤษภาคม) + แก้ mock `user.findMany`
- `tests/actions/requests.test.ts` — ทดสอบ pagination, orderBy, `pendingCount`
- `tests/actions/stock-management.test.ts` — ทดสอบ filter บัตรคุมวัสดุ + วันที่ไม่ถูกต้อง
- `tests/actions/stock-count.test.ts` (ใหม่ 4 เทสต์) — snapshot ยอดระบบ, คำนวณ variance, ปฏิเสธ apply ก่อนอนุมัติ, apply เฉพาะส่วนต่างไม่เป็นศูนย์

---

## 3. ⏳ Pending Work (งานที่ยังไม่ทำ)

- [ ] **ข้อเสนอ 4 — ขั้นจ่ายจริงหรือจัดซื้อ** (รายงานข้อ 9): ต้องตัดสินกติกาก่อนว่าสถานะไหนตัดสต็อก/ลดจอง และสถานะไหนเป็นขั้นจ่ายจริง ต้องแก้ Next.js (`requests.ts`) และ Express (`requestController.ts`) ให้ตรงกัน + ตรวจ duplicate submit ไม่ตัดซ้ำ **ไม่ควรเดากติกาแล้วลงโค้ด**
- [ ] **Commit / push / เปิด PR (draft)** งานทั้งหมดใน branch `codex/hr-ims-examples-review-report` — ยังไม่ทำตาม Iron Rule 3/4 ต้องรอคำสั่งเจ้าของโปรเจค
- [ ] **TiDB parity จริง** — ไม่มี `backend/.env` หรือ `TIDB_DATABASE_URL` ในเครื่อง จึงตรวจได้แค่ schema transform + validate ไม่ได้รันเทียบผลรวมรายงานบน TiDB จริง
- [ ] **วัด p95 จริง** — ยังไม่มีข้อมูลขนาดใกล้ใช้งานจริง จึงยังไม่มีตัวเลขก่อน/หลังสำหรับหน้ารายงานและคำขอ
- [ ] **Migration SQL สำหรับ `StockCountRound`/`StockCountLine`** — ยังไม่ได้สร้างไฟล์ migration แยก (โปรเจคมีทั้ง `prisma migrate` และ `migrations/manual/*.sql` สำหรับ TiDB) ต้องตัดสินว่าจะใช้แนวทางไหนก่อน deploy

---

## 4. ⚠️ Issues & Observations

- 🐛 **Flaky test (นอกขอบเขตงาน)**: รัน full suite ครั้งแรกได้ 508/515 · 7 failures อยู่ใน `tests/components/login-form.test.tsx` (Quick Demo panel) รันไฟล์นั้นเดี่ยวซ้ำอีกครั้งได้ 8/8 ผ่าน ไม่ได้แก้ไขเพราะไม่เกี่ยวกับไฟล์ที่แตะ
- ⚠️ **ข้อมูลไม่ครบสำหรับบัตรคุมวัสดุ**: `StockTransaction` ไม่บันทึกการตัดสต็อกตอนอนุมัติคำขอ (เฉพาะ inbound/adjustment) จึงไม่สามารถคำนวณยอดยกมาที่ถูกต้องได้จากประวัติ หน้าเว็บแสดงคำอธิบายนี้ไว้และใช้ยอดจาก `StockLevel` แทน
- ⚠️ **Visibility ไม่เปลี่ยน**: `getRequests()` ยังคงกติกาเดิม (approver เห็นหมด / user เห็นของตัวเอง) ไม่ได้เพิ่ม warehouse scope เพราะการเปลี่ยนต้องแก้ทั้ง Next.js และ Express ตาม Iron Rule
- 💡 **แนะนำ**: ก่อนเปิด PR ควรสร้าง migration SQL สำหรับตารางตรวจนับ และตกลงเรื่องข้อเสนอ 4 กับเจ้าของโปรเจค

---

## 5. ✅ Verification ที่ทำแล้ว

| รายการ | ผล |
|---|---|
| `prisma validate` (SQLite) | ผ่าน |
| `prepare-tidb-prisma.js` + validate (MySQL/TiDB) | ผ่าน |
| `prisma generate` (backend + frontend client) | ผ่าน |
| `tsc --noEmit` (frontend) | ผ่าน |
| Vitest targeted (4 ไฟล์ action) | 46/46 ผ่าน |
| Vitest full suite | 508/515 (7 flaky ใน login-form; rerun ไฟล์นั้น 8/8 ผ่าน) |
| `check-test-assertions.cjs` (4 ไฟล์) | ผ่าน |
| `git diff` review | ตรวจแล้ว ไม่มี secret |

---

## 6. 📂 Files Changed

| Action | File Path | Description |
|--------|-----------|-------------|
| Modified | `backend/prisma/schema.prisma` | โมเดล `StockCountRound`/`StockCountLine` + relations |
| Modified | `frontend/next-app/lib/actions/reports.ts` | ลด work + เขตเวลา Bangkok |
| Modified | `frontend/next-app/lib/actions/requests.ts` | pagination + `getRequestForPrint` |
| Modified | `frontend/next-app/lib/actions/stock-management.ts` | `getStockCard` |
| Created | `frontend/next-app/lib/actions/stock-count.ts` | 5 stock-count actions |
| Created | `frontend/next-app/app/(dashboard)/inventory/stock-card/page.tsx` | หน้าบัตรคุมวัสดุ |
| Created | `frontend/next-app/app/(dashboard)/inventory/stock-card/PrintStockCardButton.tsx` | ปุ่มพิมพ์ |
| Created | `frontend/next-app/app/(dashboard)/inventory/stock-count/page.tsx` | หน้ารอบตรวจนับ |
| Created | `frontend/next-app/components/inventory/StockCountActions.tsx` | UI รอบตรวจนับ |
| Created | `frontend/next-app/components/requests/PrintRequisition.tsx` | ใบเบิก A4 |
| Created | `frontend/next-app/app/(dashboard)/requests/[id]/print/page.tsx` | หน้าพิมพ์ใบเบิก |
| Modified | `frontend/next-app/components/dashboard/requests-table.tsx` | pagination + ปุ่มพิมพ์ |
| Modified | `frontend/next-app/app/(dashboard)/requests/page.tsx` | searchParams + pendingCount |
| Modified | `frontend/next-app/components/layout/sidebar.tsx` | ลิงก์ Stock Card + Stock Count |
| Modified | `frontend/next-app/tests/actions/__mocks__/prisma.ts` | mock models ใหม่ |
| Modified | `frontend/next-app/tests/actions/{reports,requests,stock-management}.test.ts` | เทสต์เพิ่ม |
| Created | `frontend/next-app/tests/actions/stock-count.test.ts` | 4 เทสต์รอบตรวจนับ |
| Created | `project-log-md/perch/2026-11-18_1251_examples-review-implementation-handoff.md` | ไฟล์สรุปนี้ |

---

## 7. 📥 Received From

- รับมาจาก: `codex` (รายงาน [2026-11-18_hr-ims-examples-review-th.md](../../project-log-md/codex/2026-11-18_hr-ims-examples-review-th.md) ที่ `9f5c2b6`)
- สิ่งที่ทำต่อ: ตรวจโค้ดตามจุดที่ชี้ → implement ข้อเสนอ 1–3 → ค้างข้อเสนอ 4 ตามเงื่อนไขในรายงาน
