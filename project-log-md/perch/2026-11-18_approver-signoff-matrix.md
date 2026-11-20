# Approver Permission Sign-off Matrix — HR-IMS

| Field | Value |
|-------|-------|
| **วันที่** | วันพุธที่ 18 พฤศจิกายน 2569 (Asia/Bangkok) |
| **Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **Revision** | โค้ดที่ merge ใน `e27cfd9` (PR #38, 19 พฤศจิกายน 2569) — อัปเดต 20 พฤศจิกายน 2569 |
| **สถานะ** | 🟡 รอเจ้าของระบบยืนยัน (ไม่ใช่นโยบายที่ Agent ตัดสินแทน) |

เอกสารนี้จัดทำเพื่อปิดงานข้อ 1 ตามรายงาน [ข้อเสนอแนะหลังดำเนินงานปรับปรุงระบบคลัง HR-IMS](../codex/2026-11-18_hr-ims-stock-readiness-recommendations-th.md) ใช้เป็นโครงให้เจ้าของระบบเซ็นรับรอง และเป็นชุดกรณีเดียวกันสำหรับตรวจ Next.js กับ Express

---

## 1. สิทธิ์ที่อ่านได้จากโค้ดปัจจุบัน

| บทบาท | ดูรายการคำขอ (Next.js) | ดูรายการคำขอ (Express) | อนุมัติ/ปฏิเสธ (Next.js) | อนุมัติ/ปฏิเสธ (Express) | ตรวจคลัง |
|---|---|---|---|---|---|
| superadmin | เห็นทั้งหมด | เห็นทั้งหมด | ได้ | ได้ | ไม่จำกัด |
| admin | เห็นทั้งหมด | เห็นทั้งหมด | ได้ | ได้ | ไม่จำกัด |
| approver | เห็นทั้งหมด | เห็นทั้งหมด | ได้ แต่จำกัดคลังที่ดูแล | ได้ แต่จำกัดคลังที่ดูแล | ต้องเป็น manager ของคลังต้นทาง |
| auditor | เห็นเฉพาะของตน | เห็นเฉพาะของตน | ไม่ได้ | ไม่ได้ | ไม่เกี่ยว |
| technician | เห็นเฉพาะของตน | เห็นเฉพาะของตน | ไม่ได้ | ไม่ได้ | ไม่เกี่ยว |
| user | เห็นเฉพาะของตน | เห็นเฉพาะของตน | ไม่ได้ | ไม่ได้ | ไม่เกี่ยว |

หมายเหตุ: หน้า dashboard/history/stock ให้ auditor อ่านได้กว้างกว่าหน้าคำขอ (`isReadAllSession`) แต่หน้าคำขอไม่ได้ใช้ helper นี้

---

## 2. ความแตกต่างที่ต้องให้เจ้าของตัดสิน

| กรณี | Next.js | Express | ผลกระทบ |
|---|---|---|---|
| คำขอ `warehouseId = null` และผู้อนุมัติเป็นเจ้าของคำขอเอง | ปฏิเสธ `Request not found` (`requests.ts:115-121`) | ปฏิเสธ 404 (`routes/requests.ts:30-32`) | ตรงกันแล้วที่ชั้นตรวจสิทธิ์ ยังต้องให้เจ้าของยืนยันว่าเป็นนโยบายที่ต้องการ |
| คำขอคืน `type = return` ที่ไม่มีคลัง | อัปเดตเฉพาะ `InventoryItem.stock` ไม่มี `StockTransaction` | 400 `Request warehouse not found` | ต้องกำหนดว่าคำขอคืนต้องระบุคลังหรือไม่ |
| รายการคำขอ | แบ่งหน้า กรอง status เรียง `createdAt desc, id desc` มี `requestItems` | ไม่แบ่งหน้า เรียง `date desc` ไม่มี items | Express ไม่สามารถใช้ขับ UI ได้ ต้องระบุว่าเป็น API สำหรับ consumer ภายนอกหรือไม่ |
| `cancelled` | รับค่า | รับค่า | UI มีเฉพาะ approved/rejected ต้องระบุว่าจะเปิด cancel ใน UI หรือไม่ |
| `POST /api/requests` ด้วย `type = return` | ไม่มีช่องทางนี้ (return ถูกสร้างจาก Server Action `requestReturn`) | รับ arbitrary string และจองสต็อก | ต้องระบุว่าควรปิดหรือแก้กติกา |
| ตัวตนใน `StockTransaction.userId` | ผู้อนุมัติ | ผู้อนุมัติ (`actorId`) หลังแก้ล่าสุด | ตรงกันแล้ว แต่ต้องยืนยันความหมาย |

---

## 3. ชุดกรณีสำหรับตรวจความตรงกัน (ใช้ทั้งสองฝั่ง)

1. superadmin/admin/approver ดูรายการคำขอ → เห็นทั้งหมด
2. user/technician/auditor ดูรายการคำขอ → เห็นเฉพาะของตน
3. approver อนุมัติคำขอในคลังที่ดูแล → สำเร็จ `quantity` และ `reserved` ลดตามจำนวน มี `outbound` และ history `approved`
4. approver กระทำกับคำขอในคลังที่ไม่ดูแล → ปฏิเสธ สถานะ/สต็อก/ประวัติไม่เปลี่ยน
5. approver กระทำกับคำขอไม่มีคลังที่ตนเป็นเจ้าของ → ทั้งสองปฏิเสธ (Next.js `Request not found`, Express 404) ตรงกับ `e27cfd9` แล้ว รอเจ้าของยืนยันนโยบาย
6. approver กระทำกับคำขอไม่มีคลังที่ตนไม่ได้เป็นเจ้าของ → Next.js ผ่านชั้นตรวจสิทธิ์แล้วเข้า logic อนุมัติ (`:122-127` ตรวจเฉพาะเมื่อมีคลัง) ส่วน Express ปฏิเสธ 404 ต้องให้เจ้าของตัดสินช่องนี้
7. admin กระทำกับคำขอไม่มีคลังที่มีรายการ → ผลต่างกันตามข้อ 2
8. user/technician/auditor พยายามอนุมัติ → ปฏิเสธ ไม่มีการเปลี่ยนแปลง
9. อนุมัติคำขอคืนในคลังที่ดูแล → `StockLevel.quantity` และ `InventoryItem.stock` เพิ่ม มี `inbound` อ้าง `Request:<id>` `StockTransaction.userId` เป็นผู้อนุมัติ `history.userId` เป็นผู้ขอ
10. อนุมัติคำขอคืนที่ไม่มีคลัง → **รอเจ้าของตัดสิน**
11. อนุมัติซ้ำ/พร้อมกัน → conditional `updateMany` ต้องให้ผลครั้งเดียว
12. ปฏิเสธ/ยกเลิก → คืนเฉพาะ `reserved` ไม่แตะ `quantity`
13. คำขอที่ถูกดำเนินการแล้ว → ปฏิเสธ ไม่มีการเปลี่ยนแปลง
14. `getRequestForPrint` เฉพาะ Next.js → approver เห็นตาม id, user เห็นเฉพาะของตน (ไม่มีเทียบเท่า Express)
15. `POST /api/requests` แบบ `type = return` → ต้องตัดสินว่าควรยอมรับหรือไม่

---

## 4. ช่องที่ต้องเซ็นก่อนปล่อย

| ช่อง | ผู้เซ็น | ค่าที่ต้องระบุ |
|---|---|---|
| ขอบเขตดูคำขอของ approver | เจ้าของระบบ | เห็นทั้งหมด หรือเฉพาะคลังที่ดูแล |
| คำขอไม่มีคลังที่เจ้าของเป็นผู้อนุมัติ | เจ้าของระบบ | ยืนยันการปฏิเสธตาม `e27cfd9` หรือเปลี่ยนนโยบาย |
| คำขอไม่มีคลังที่เจ้าของไม่ใช่ผู้อนุมัติ | เจ้าของระบบ | อนุญาตให้ Next.js ดำเนินการต่อ หรือปฏิเสธให้ตรง Express |
| คำขอคืนต้องมีคลังหรือไม่ | เจ้าของระบบ + คลังนำร่อง | ต้อง/ไม่ต้อง |
| รองรับ `cancelled` ใน UI หรือไม่ | เจ้าของระบบ | ใช่/ไม่ใช่ |
| Express `POST /api/requests` รับ `return` หรือไม่ | เจ้าของระบบ | ใช่/ไม่ใช่ พร้อมกติกาจองสต็อก |

---

## 5. ผลตรวจ Express return path

ไม่พบ caller จริงในโค้ดแอปที่ส่ง `type: 'return'` ไปยัง `PATCH /api/requests/:id/status` พบเฉพาะ unit test, IDOR test และ object-authz test

- เส้นทางที่ mount จริงคือ `PATCH /api/requests/:id/status` (`backend/src/routes/requests.ts:46`)
- ไม่มีเส้นทาง `/api/requests/:id/approve` แม้ security config ใช้ชื่อนี้
- คำขอคืนจริงถูกสร้างจาก Next.js Server Action `requestReturn` (`frontend/next-app/lib/actions/assets.ts:123-135`)
- UI อนุมัติเรียก Server Action ไม่ได้เรียก Express (`frontend/next-app/components/dashboard/requests-table.tsx:64`)
- E2E ใช้ UI/Server Action (`frontend/next-app/tests/e2e/golden/02-request-lifecycle.spec.ts`)

**ข้อเสนอ:** บันทึกว่า Express รองรับ return แบบ defensive ไว้แล้ว แต่ยังไม่มี caller จริง ให้เจ้าของระบบตัดสินใจว่าจะรองรับช่องทางนี้ในรอบเปิดใช้หรือไม่ ถ้าไม่รองรับควรจำกัด `type` ใน `createRequest` และเพิ่ม test ยืนยันว่าคำขอคืนไม่เข้าสาขาตัดยอด
