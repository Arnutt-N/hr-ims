# Plan: RBAC Audit And Improvement For All Roles

**Metadata**
- Agent: CodeX (OpenAI)
- Timestamp: 2026-04-03 17:10:32 +07:00
- Repo: D:\02 genAI\hr-ims
- Target Output: PRPs/codex

## 1) Summary

ตรวจสอบสิทธิ์ใช้งานของผู้ใช้ทั้ง 6 บทบาท:
- `superadmin`
- `admin`
- `approver`
- `auditor`
- `technician`
- `user`

การตรวจรอบนี้ยึด **Intended Policy** เป็นเกณฑ์หลัก แล้วเทียบกับพฤติกรรมจริงของระบบใน 3 ชั้น:
- Session/Auth
- UI/Menu/Page Access
- Server Action/API Enforcement

ผลลัพธ์ที่ต้องได้:
- RBAC matrix ครบทุกบทบาท
- Findings ที่อ้างอิงจากโค้ดจริง
- ข้อเสนอแนะในการปรับปรุงแบบจัดลำดับความสำคัญ
- Test matrix สำหรับใช้ตรวจซ้ำและทำ automation ต่อ

## 2) Current Ground Truth

จาก repo ปัจจุบัน ยืนยันแล้วว่า:
- มี demo users ครบทั้ง 6 บทบาทและ active จริง
- ระบบมี multi-role support ใน `frontend/next-app/auth.ts` และ `frontend/next-app/lib/auth-guards.ts`
- สิทธิ์ใน `sidebar`, `frontend actions`, `backend routes`, และ `RolePermission` ยังไม่ตรงกันทั้งหมด
- `RolePermission` ยังไม่ใช่ source of truth เพราะ table ว่าง
- backend บางจุดยังอ้าง role เก่า เช่น `hr` ซึ่งไม่อยู่ใน schema ปัจจุบัน

## 3) Intended Role Matrix

ใช้ matrix นี้เป็น baseline ในการตรวจ

### superadmin
- ใช้ได้ทุกฟังก์ชัน
- เข้าถึง system settings, permissions, logging, backup, email, health admin ได้

### admin
- ใช้งานงานปฏิบัติการทั้งหมดได้
- จัดการ inventory, requests, users, tags, warehouses, department mappings ได้
- ไม่ควรเข้าถึง superadmin-only settings

### approver
- ดูและจัดการ requests ได้
- อนุมัติ/ปฏิเสธคำขอ และจัดการ stock approval/adjustment ที่เกี่ยวข้องได้
- ไม่ควรเข้าถึง users, tags, audit logs, system settings

### auditor
- เข้าถึง `history`, `reports`, `audit logs` แบบ read-only
- ไม่ควรทำ mutation ฝั่ง operational/admin

### technician
- เข้าถึง `maintenance` และ `scanner` ได้
- ไม่ควรเข้าถึง approval/admin/audit/system features

### user
- ใช้ `inventory`, `cart`, `my-assets` ได้
- ดู/สร้างคำขอของตัวเองได้
- ต้องถูกกันจาก admin/audit/settings paths

## 4) Audit Execution Plan

### Phase A: Build RBAC Truth Table
สกัดสิทธิ์จาก 4 แหล่งแล้วเทียบกัน
- Session roles จาก `auth.ts` และ `lib/auth-guards.ts`
- Menu visibility จาก `components/layout/sidebar.tsx`
- Frontend guard logic จาก pages และ server actions
- Backend enforcement จาก routes และ middleware

ผลลัพธ์:
- ตาราง `role x feature`
- คอลัมน์ `intended`, `current UI`, `current action/API`, `gap`

### Phase B: Feature Inventory
ตรวจฟังก์ชันหลักทั้งหมด
- `dashboard`
- `inventory`
- `cart`
- `my-assets`
- `requests`
- `maintenance`
- `history`
- `reports`
- `scanner`
- `tags`
- `users`
- `audit logs`
- `settings`
- `settings/categories`
- `settings/warehouses`
- `settings/departments`
- `settings/permissions`
- `settings/sessions`
- `settings/system`
- `settings/logging`
- `settings/backup`
- `settings/email`
- `settings/health`

### Phase C: Role-by-Role Verification
ตรวจแต่ละบทบาทใน 3 ระดับ
- มองเห็นเมนูหรือไม่
- เปิด route ตรงได้หรือไม่
- เรียก action/API สำคัญแล้วถูกอนุญาตหรือถูกกันถูกต้องหรือไม่

สถานะที่ต้องใช้ในการสรุป:
- `aligned`
- `under-permitted`
- `over-permitted`
- `policy gap`

## 5) Known Findings To Validate

จุดที่ต้องถือเป็น candidate findings ตั้งแต่เริ่มตรวจ:

### Maintenance
- เมนูตั้งใจให้ `superadmin/admin/technician`
- แต่ action update ใน `frontend/next-app/lib/actions/maintenance.ts` อนุญาตแค่ `admin`
- read path ยังเปิดกว้างกว่าที่ policy สื่อ

### Reports / History / Scanner
- sidebar จำกัด role
- แต่ actions หลายจุดเช็กแค่ authentication ไม่ได้ enforce role ตาม intended policy

### Settings
- เมนูหลักให้ `admin` เห็น
- แต่ `frontend/next-app/lib/actions/settings.ts` เป็น `superadmin` only

### Permissions
- หน้า permissions เป็น superadmin-only
- แต่ submenu settings ยังทำให้ความคาดหวังเรื่อง access ไม่ชัด

### Categories / Warehouses
- read access เปิดกว้างกว่าที่ sidebar สื่อ

### Legacy Roles
- backend บาง route ยังอ้าง `hr`
- ไม่ตรงกับ schema ที่รองรับจริง

### RolePermission
- schema มีอยู่ แต่ข้อมูลจริงว่าง
- permissions UI ยังไม่ใช่ระบบบังคับสิทธิ์จริงทั้ง stack

## 6) Deliverables

### Deliverable 1: RBAC Matrix
ตาราง `role x feature` โดยระบุ
- Intended access
- UI visibility
- Route access
- Action/API enforcement
- Final verdict

### Deliverable 2: Findings Report
เรียงตามความรุนแรง
- Critical
- High
- Medium
- Low

แต่ละ finding ต้องมี
- อธิบาย impact
- อ้างอิง path ที่เกี่ยวข้อง
- ระบุว่าเป็น `over-permission`, `under-permission`, `policy drift`, หรือ `legacy inconsistency`

### Deliverable 3: Improvement Recommendations
- `P0`: ปิดช่อง role drift ที่กระทบความปลอดภัยหรือการใช้งานจริง
- `P1`: รวม source of truth เป็น shared role guards เดียว
- `P2`: ทำ automated RBAC regression tests และ cleanup legacy checks

## 7) Recommended Fix Direction

- ใช้ `frontend/next-app/lib/auth-guards.ts` เป็น frontend authorization entrypoint กลาง
- ลดการใช้ `session.user.role` ตรงๆ แล้วเปลี่ยนเป็น helper ที่รองรับ multi-role
- backend ต้องเลิกอ้าง role ที่ไม่มีใน schema เช่น `hr`
- ต้องตัดสินให้ชัดว่า `RolePermission` จะเป็นระบบจริงหรือเป็นเพียง menu customization
- ถ้าจะใช้ `RolePermission` จริง ต้อง seed baseline permissions และ enforce ทั้ง UI และ action/API ให้ครบ

## 8) Test Cases And Scenarios

### superadmin
- ต้องเข้าและใช้งานได้ทุกหน้า
- ต้องใช้ system/email/logging/backup/permissions ได้จริง

### admin
- ต้องใช้ operational/admin features ได้
- ต้องถูกกันจาก superadmin-only settings

### approver
- ต้องจัดการ requests ได้
- ต้องใช้ approval-related actions ได้
- ต้องไม่เข้าถึง users, tags, audit logs, system settings

### auditor
- ต้องดู history/reports/logs ได้แบบ read-only
- ต้องไม่สามารถใช้ mutation actions

### technician
- ต้องใช้ maintenance/scanner ได้จริง
- ต้องไม่เข้าถึง approval/admin/system features

### user
- ต้องเข้าถึงเฉพาะ self-service flows
- direct URL ไปหน้า admin/settings/audit ต้องไม่ผ่าน

### Cross-check rule
ทุกกรณีต้องเทียบให้ตรงกันระหว่าง:
- menu visibility
- direct route access
- action/API authorization

## 9) Acceptance Criteria

แผนตรวจนี้ถือว่าสมบูรณ์เมื่อ:
- มี matrix ครบทุก role และทุก feature หลัก
- มี findings ที่ผูกกับโค้ดจริง ไม่ใช่การคาดเดา
- มีข้อเสนอแนะที่จัดลำดับความสำคัญแล้ว
- สามารถใช้เป็น baseline สำหรับ implementation และ test automation ต่อได้ทันที

## 10) Assumptions

- ใช้ demo accounts ใน seed ปัจจุบันเป็นชุดทดสอบมาตรฐาน
- ใช้ intended policy จากชื่อบทบาท, sidebar, และ flow หลักของระบบ
- งานนี้เป็น audit/spec phase ไม่ใช่ implementation phase
- หาก feature ใดไม่มี source of truth เดียว ให้จัดเป็น policy gap และเสนอ decision ที่ต้องล็อกก่อนแก้
