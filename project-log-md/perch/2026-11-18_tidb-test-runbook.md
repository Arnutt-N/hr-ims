# TiDB Test Migration Runbook — HR-IMS Stock Count

| Field | Value |
|-------|-------|
| **วันที่** | วันพุธที่ 18 พฤศจิกายน 2569 (Asia/Bangkok) |
| **Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **สถานะ** | 🛑 หยุดก่อนเชื่อมต่อฐานข้อมูลที่ให้มา เพราะระบุว่าเป็น prod |

## ทำไมไม่รันต่อ

ผู้ใช้แนบข้อมูลเชื่อมต่อ TiDB พร้อมระบุห้ามอ่านหรือส่งในแชท ข้อมูลนั้นชี้ไปยัง cluster ที่ระบุว่าเป็น **prod** และฐานข้อมูล `hrims` งานข้อ 3 และ 4 ของเกณฑ์ตรวจรับมีขั้นตอนรัน migration และ fixture ที่ลบข้อมูล (`teardownIdorFixture`) จึงไม่ปลอดภัยที่จะรันกับฐานข้อมูลนี้ ผมไม่ได้ใช้ข้อมูลนั้นเชื่อมต่อหรือเขียนฐานข้อมูล และไม่ได้บันทึกค่าลงไฟล์

## สิ่งที่ตรวจได้โดยไม่แตะฐานข้อมูล

- `prisma validate` บน `backend/prisma/schema.prisma` ผ่าน
- `backend/scripts/prepare-tidb-prisma.js` แปลงเป็น MySQL schema แล้ว `prisma validate` ผ่าน
- ตรวจข้อความ SQL แบบคงที่ พบ guard สำหรับ `StockCountRound`, `StockCountLine`, FK, unique `(roundId, itemId)` และ index `status`
- `npm run test:authz` ผ่าน 249/249 ใน SQLite ทดสอบ ด้วยค่า env ทดสอบชั่วคราว ไม่ใช่ secret จากไฟล์ที่แนบมา

## ขั้นตอนสำหรับ DBA บน TiDB **ทดสอบ** เท่านั้น

1. สร้างฐานข้อมูลทดสอบแยกจาก prod เช่น `hrims_stockcount_test` และใช้ secret จากระบบจัดการค่าของสภาพแวดล้อมทดสอบ
2. สำรอง schema และข้อมูลเดิมก่อนรัน และบันทึกวิธีคืนสภาพ
3. รัน migration ที่ `backend/prisma/migrations/manual/2026-11-18_stock_count.sql` ด้วย `prisma db execute` ต่อ URL ของฐานข้อมูลทดสอบ
4. ตรวจตาราง ดัชนี และ foreign key ว่าตรงกับ `schema.prisma`
5. รันคำสั่ง migration ซ้ำอีกครั้งเพื่อยืนยัน idempotent
6. ทดสอบรอบตรวจนับครบ เปิดรอบ → บันทึกผล → อนุมัติ → ปรับยอด ผ่านช่องทางปกติ
7. เก็บผลตรวจพร้อม revision และสภาพแวดล้อมแนบกับหลักฐานตรวจรับ

## ข้อควรระวัง

- อย่าใช้ URL ที่ระบุ prod สำหรับข้อ 3 หรือ 4
- อย่าใช้ `npm run test:authz` กับ TiDB เพราะ `checkDatabaseIsolation()` ใน `idor.fixture.ts` ปฏิเสธเป้าหมายที่ไม่ใช่ `file:` เพื่อกันการลบข้อมูล
- การทดสอบเขียนพร้อมกันและ rollback ต้องทำบนฐานข้อมูลทดสอบที่สร้างขึ้นเพื่อการนี้โดยเฉพาะ
