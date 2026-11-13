# ตารางสำรวจ IDOR ฉบับแก้ใหม่ (rewrite จาก gemini docx ที่ผิด schema)

**วันที่:** 2026-11-11 (revise 2026-11-12: เพิ่ม V17–V24, auth style `requireAuth` บน proxy routes, warehouse-null gap, policy-decision escapes)
**Branch:** `halfbeak` (จะสร้าง `fix/object-level-authz` ตอน implement)
**ขอบเขต:** Backend Express routes (`backend/src/routes/*`) + Frontend Server Actions (`frontend/next-app/lib/actions/*`)
**ที่มา:** rewrite จาก `PRPs/gemini/hr-ims_—_โค้ดแก้ไขช่องโหว่_IDOR_ฉบับเต็ม_(...).docx` — docx เดิมอ้าง model/route/field ที่ไม่มีใน repo นี้ (ดู §4) จึงไม่สามารถ copy มาลงได้

## 0. Iron Rules ที่ยึดถือ

- ห้ามแสดง secret/token/password/private ID ใน chat, log, commit — ตรวจด้วย count/hash/presence เท่านั้น
- `user` ที่ส่งเข้า authz helper ต้องมาจาก server-verified เท่านั้น: `req.user` (JWT/proxy middleware) หรือ `session.user` (`auth()`) — ห้ามจาก body/query/params/headers
- ห้าม connect TiDB production, ห้าม `db:push:prod` / `db:seed:prod` / `db:migrate:deploy`
- ทุก CUD ยังต้องมี audit log + `revalidatePath` ตาม §3.4/§3.7 ของ AGENTS.md (plan เดิมทิ้งทั้งคู่ — ห้ามทำตาม)

## 1. ความจริงของ schema ที่นโยบายต้องรองรับ

Models ที่เกี่ยว (จาก `backend/prisma/schema.prisma`):

| Model | Fields ที่ใช้ scope | Status จริง |
|---|---|---|
| `Request` | `userId`, `warehouseId`, `type` (withdraw/borrow/return) | pending/approved/rejected/cancelled |
| `CartItem` | `userId`, `itemId` (`@@unique([userId, itemId])`) | — |
| `StockTransfer` | `fromWarehouseId`, `toWarehouseId`, `requestedBy`, `approvedBy` | pending/approved/completed/rejected |
| `StockLevel` | `warehouseId`, `itemId` (`@@unique`) | — |
| `StockTransaction` | `warehouseId`, `itemId`, `userId`, `type` | — |
| `MaintenanceRequest` | `reportedById`, `assignedToId`, `locationId` (Department) | open/assigned/in_progress/awaiting_parts/resolved/closed/cancelled |
| `User` | `role` (string), `department` (string), `managedWarehouses` (Warehouse[]), `userRoles` | active/inactive |

**User ไม่มี `warehouseId` / `departmentId`** —  derive warehouse ของ user จาก:
1. `Warehouse.managers` (relation ตรง)
2. `DepartmentMapping` ที่ `department = user.department` → `warehouseId`

Session (`frontend/next-app/auth.ts`) มี `id`, `email`, `role`, `roles[]`, `permissions[]` — **ไม่มี** warehouse/department ฝั่ง frontend จึง query จาก prisma เมื่อต้อง scope

Backend auth มี 3 แบบ: `authenticateToken` (JWT), `requireAuth` (x-user-* + x-internal-key ผ่าน proxy), `requireRole`/`authorize` (role check)

## 2. นโยบายการเข้าถึง (ฉบับแก้)

- **404 not 403** สำหรับ object-level deny — ไม่รั่วว่า record มีอยู่จริง
- **admin tier** (`superadmin`, `admin`) bypass object scope สำหรับ operational resource — ยกเว้นแก้/ลบ superadmin
- **warehouse scope**: read/write `StockLevel`/`StockTransfer`/`StockTransaction` ของคลังใด ต้องเป็น manager ของคลัง หรือ DepartmentMapping ของ user ชี้ไปคลังนั้น; user ที่ไม่มี warehouse → เห็นเฉพาะ record ตัวเอง (request/cart/maintenance)
- **cart**: owner only เสมอ (แม้ admin) — ตะกร้าเป็น personal ephemeral state
- **identity**: จาก server-verified เท่านั้น; body field อย่าง `requestedBy`/`approvedBy`/`userId` ห้ามนำไปเขียน query

## 3. IDOR inventory ฉบับจริง (24 ช่อง)

| # | ตำแหน่ง | ปัญหา | Severity | วิธีแก้ |
|---|---|---|---|---|
| V1 | `backend/src/routes/stock-transfers.ts:39` | `GET /api/stock-transfers/:id` ไม่มี auth middleware — anonymous อ่านใบโอนได้ | HIGH | `requireAuth` + warehouse scope read |
| V2 | `backend/src/routes/stock-transfers.ts:9` | `GET /api/stock-transfers` ไม่มี auth | HIGH | `requireAuth` + scope list ตาม warehouses ของ user (admin tier เห็นหมด) |
| V3 | `backend/src/routes/stock-levels.ts:9,38` | `GET /api/stock-levels`, `GET /:warehouseId/:itemId` ไม่มี auth | HIGH | `requireAuth` + warehouse scope read (admin tier เห็นหมด) |
| V4 | `backend/src/routes/stock-transactions.ts:96` | `GET /history/:itemId` มี auth แต่ไม่ scope warehouse — เห็น history ทุกคลัง | MEDIUM | กรอง `warehouseId` ∈ warehouses ของ user (admin tier เห็นหมด) |
| V5 | `backend/src/routes/requests.ts:13` | `PATCH /:id/status` เช็ค role แต่ role `'hr'` ไม่มีในระบบ + ไม่ scope warehouse ของ request | HIGH | `authorize(['superadmin','admin','approver'])` + request.warehouseId ต้อง ∈ warehouses ของ user |
| V6 | `backend/src/routes/stock-transfers.ts:64,90,170` | `POST` รับ `requestedBy`, `PATCH` รับ `approvedBy` จาก body — spoof user id ได้ | HIGH | ใช้ `req.user.id` เสมอ |
| V7 | `frontend/next-app/lib/actions/cart.ts:83` | `removeFromCart(cartItemId)` ลบได้ทุก id ไม่เช็ค owner | HIGH | `findFirst({ id, userId })` ก่อน delete; ไม่พบ → `{ error: 'Item not found' }` |
| V8 | `frontend/next-app/lib/actions/stock-management.ts:6` + `AdjustStockDialog.tsx:42` | `adjustStockQuantity(..., userId)` รับ userId param + caller ส่ง `1` ตายตัว | HIGH | ตัด param; userId จาก session; scope warehouse |
| V9 | `frontend/next-app/lib/actions/stock-management.ts:56` | `updateStockLimits` ไม่มี auth check + ไม่ scope warehouse | HIGH | `requireRole(...ADMIN_ROLES)` หรือ manager ของคลังนั้น + warehouse scope |
| V10 | `frontend/next-app/lib/actions/stock-management.ts:84,100` | `getItemDetail`, `getStockHistory` ไม่มี session check — อ่าน stock ทุกคลังได้ | MEDIUM | session check + คืน stockLevels/transactions เฉพาะ warehouses ที่ user เข้าถึง (admin tier เห็นหมด) |
| V11 | `frontend/next-app/lib/actions/stock-transaction.ts:18` | `receiveGoods(formData)` **ไม่มี auth ใดๆ** + schema รับ `userId` จาก payload ("In real app, get from session") — ใครก็เพิ่มสต็อกเข้าคลังใดก็ได้ในชื่อ user ใดก็ได้ | CRITICAL | `auth()` check, ตัด `userId` จาก schema (ใช้ session), warehouse scope |
| V12 | `frontend/next-app/lib/actions/stock-transaction.ts:80` | `getStockHistory(itemId)` (ตัวที่ 2 — ซ้ำกับ stock-management) ไม่มี auth, ไม่ scope warehouse, **และไม่มี caller ใดๆ** | MEDIUM | ลบฟังก์ชัน + describe block ใน stock-transaction.test.ts (ดู §3.1) |
| V13 | `frontend/next-app/lib/actions/requests.ts:46` | `updateRequestStatus` เช็ค role แต่ไม่ scope warehouse ของ request — approver คนใดก็ได้อนุมัติคำขอของคลังใดก็ได้ | HIGH | ตรวจ `request.warehouseId ∈ managed warehouses` (admin tier ผ่าน) ก่อน $transaction |
| V14 | `frontend/next-app/lib/actions/warehouse.ts:140,152` | `getDivisions`, `getProvinces` ไม่มี session check — reference data แต่ anonymous ผ่าน Server Action ได้ | LOW | `auth()` check |
| V15 | `backend/src/routes/requests.ts:13` | `authorize(['admin','hr'])` — role `'hr'` ไม่มีในระบบ (dead clause); จริงๆ แล้ว admin เท่านั้น | MEDIUM | เปลี่ยนเป็น `['superadmin','admin','approver']` ตามนโยบาย §2 |
| V16 | `backend/src/routes/stock-levels.ts:102,152` | `PATCH /:warehouseId/:itemId/adjust` + `/limits` เช็ค role แต่ไม่เช็กว่า user สังกัดคลังนั้น — approver ที่ไม่เกี่ยวข้องปรับสต็อกคลังใดก็ได้ | HIGH | `assertWarehouseAccess` ทั้ง 2 route |
| V17 | `frontend/next-app/lib/actions/inventory.ts:46,94` | `fetchInventoryItems`, `fetchInventoryPages` ไม่มี session check — anonymous เรียก Server Action อ่าน catalog + stock levels ได้ | MEDIUM | `auth()` check |
| V18 | `frontend/next-app/lib/actions/categories.ts:14` | `getCategories` ไม่มี session check | LOW | `auth()` check |
| V19 | `frontend/next-app/lib/actions/history.ts:13` | `getHistory` มี session แต่ไม่ scope `userId` — user เห็น history ทั้ง org incl. ชื่อ+email คนอื่น | HIGH | where เพิ่ม `userId` เมื่อไม่ใช่ admin tier (mirror `getRequests`) |
| V20 | `frontend/next-app/lib/actions/dashboard.ts:6,63` + `reports.ts:6` | `getDashboardStats`, `getLowStockItems`, `getReportStats` มี session แต่ aggregate ทั้ง org — เห็นยอดคงเหลือ/รายการเคลื่อนไหว/ผู้ใช้ทุกคลัง | MEDIUM | scope ตาม warehouses ของ user หรือ admin tier เท่านั้น; ถ้า product ตั้งใจให้เห็นทั้ง org ให้บันทึกเป็น policy decision ไม่ใช่บั๊ก |
| V21 | `backend/src/routes/inventory.ts:8` + `warehouses.ts:9,28` | `GET /api/inventory` (คืนรายการทั้งหมด incl. stock), `GET /api/warehouses`, `GET /api/warehouses/:id` ไม่มี auth | MEDIUM | `requireAuth`; warehouse list เก็บ public ได้ถ้า product ต้องการ — บันทึก decision |
| V22 | `frontend/next-app/lib/actions/assets.ts:66` | `checkInAsset(itemId)` สร้าง history `action='check'` ได้ทุก item ไม่เช็ค holder | MEDIUM | ตรวจ `currentHolderId === user.id` หรือมี approved borrow request ของ user ก่อน |
| V23 | `frontend/next-app/lib/actions/assets.ts:92` | `requestReturn(itemId)` สร้าง return request ของ item ใดก็ได้ ไม่เช็ค holder | MEDIUM | เช่นเดียวกับ V22 |
| V24 | `frontend/next-app/lib/actions/assets.ts:131` | `reportIssue` legacy fallback (`inventoryItem.update` status flip) ไม่เช็ค holder — delegate `createMaintenanceRequest` มี reporter scope กันอยู่แล้ว | LOW | เช็ค holder ใน fallback ด้วย หรือลบ fallback |

**อย่าแตะ** (scope ถูกต้องอยู่แล้ว): `getRequests` (scope `userId` เมื่อ role==='user'), `getMyAssets` (scope `userId`), `getActiveSessions`/`revokeSession`/`revokeAllOtherSessions` (ใช้ session user เอง), `getUserActivity` (own profile หรือ admin/auditor), `watchRequest`/`unwatchRequest`/`getMyWatchedRequests`/`isWatching` (scope `userId`), `scanner.ts` ทั้ง 2 (session + scope `userId`), `markAsRead`/`markAllAsRead` (where มี `userId`), users actions (admin-only + self-guard + superadmin guard), settings/permissions/test-email (superadmin-only), categories CRUD + category-rules + departments mappings (admin-only), warehouse CRUD (admin check แล้ว), maintenance actions ทุกตัว (session ครบ; reporter/assignee scope ผ่าน `lib/maintenance/*`)
**แก้ไขจากรอบก่อน:** `getHistory` (history.ts) ที่เคยเขียนว่า "scope ถูกต้อง" — จริงๆ แล้ว **มี session check แต่ไม่ scope `userId`** → ย้ายมาเป็น V19

### 3.1 Caller ที่ต้องแก้ตาม signature change

- `app/(dashboard)/inventory/[id]/AdjustStockDialog.tsx:36-42` — ลบ arg `1` ออก (signature change จาก V8; line 42 คือ `1 // Mock user ID`)
- `app/(dashboard)/inventory/[id]/SetLimitsDialog.tsx:42` — คง signature เดิม แต่ action ข้างในเพิ่ม auth (V9)
- `app/(dashboard)/inventory/receive/GoodsReceiptForm.tsx:63` — ลบ field `userId: 1` ออกจาก payload (V11; form schema ที่ line 18-26 ก็ไม่ต้องรับ userId)
- `components/dashboard/requests-table.tsx:57` — `updateRequestStatus` คง signature; action ข้างในเพิ่ม warehouse scope (V13)
- test ที่ต้องอัปเดต: `tests/actions/stock-management.test.ts` (เรียก `adjustStockQuantity(1, 10, 5, 'restock', 4)` — ตัด arg ที่ 5), `tests/actions/stock-transaction.test.ts` (payload มี `userId`), `tests/actions/requests.test.ts` (เพิ่ม case warehouse scope)
- `getStockHistory` ใน `stock-transaction.ts:80` **ไม่มี caller** (grep เจอเฉพาะ test ของตัวเอง; StockHistoryTab.tsx:40 เรียกจาก stock-management) → ลบฟังก์ชันทิ้ง + ลบ describe block `getStockHistory` ใน stock-transaction.test.ts ด้วย แทนการแก้

## 4. สิ่งที่ plan เดิม (docx) ผิด — ห้าม copy

- Routes `cart.ts`/`transfers.ts`/`maintenance.ts`/`stock.ts` ไม่มีใน repo (จริง: `stock-levels.ts`, `stock-transfers.ts`, `stock-transactions.ts`)
- Endpoints B1–B4, B11–B13, B17–B19 ส่วนใหญ่ไม่มี (`GET/PATCH/DELETE /api/requests/:id`, `/api/users/:id` ฯลฯ)
- Models `BorrowRequest`/`Requisition`/`MaintenanceTicket`/`StockItem`/`Cart` ไม่มี (จริง: `Request`, `MaintenanceRequest`, `StockLevel`, `CartItem`)
- Fields `createdById`/`sourceWarehouseId`/`targetWarehouseId`/`approverNote` ไม่มี (จริง: `requestedBy`/`fromWarehouseId`/`toWarehouseId`)
- Status `PENDING`/`DRAFT`/`IN_TRANSIT`/`DISPATCHED`/`RECEIVED` ไม่มี (จริง: lowercase)
- Backend ใช้ **Jest** ไม่ใช่ Vitest; ไม่มี `npm run typecheck` ใน backend; frontend test dir คือ `tests/` ไม่ใช่ `__tests__/`
- อ้าง `warehouseId`/`departmentId` บน User — schema ไม่มี → helper ทุกตัวพัง
- `scopedDelete` บน profile จะ hard-delete User (repo ใช้ soft-delete ผ่าน `status`)
- replacement ทั้งไฟล์ทิ้ง audit log, `revalidatePath`, transaction, email/Telegram, stock reservation

## 5. Implementation plan (minimal diff)

### 5.1 Helper ใหม่: `backend/src/lib/authz.ts`

```ts
export class NotFoundError extends Error { statusCode = 404 }
export function isAdminTier(user): boolean  // superadmin | admin
export async function getManagedWarehouseIds(prisma, user): Promise<number[]>
  // Warehouse.managers + DepartmentMapping(department = user.department) → warehouseId
export async function assertWarehouseAccess(prisma, user, warehouseId): Promise<void>
  // admin tier ผ่าน; ไม่เช็คพบ → throw NotFoundError
```

**ฝั่ง frontend ไม่มี helper mirror** — Server Actions อ่าน session จาก `auth()`/`requireRole` (มีอยู่แล้วใน `auth-guards.ts`) แล้ว query prisma ตรงโดยใส่ `userId`/`warehouseId` scope ใน `where` เอง (pattern เดิมของ `getRequests`/`markAsRead`) หลักการ: **ไม่มี authz helper ที่รับ user มาจากนอก server session** — ทุกอย่าง derive จาก session ที่ `auth()` คืนมาเท่านั้น (Iron Rules)
**ยกเว้น 1 util:** `frontend/next-app/lib/warehouse-scope.ts` — `getManagedWarehouseIds(userId)` + `isAdminSession(session)` ใช้ร่วมกันหลาย actions (DRY) โดยรับเฉพาะ `userId` ที่อ่านจาก session ใน action นั้นเอง

### 5.2 Backend route fixes

**Auth style:** routes ที่ถูกเรียกจาก UI ผ่าน Next.js `proxy.ts` (ส่ง `x-user-*` + `x-internal-key`) ต้องใช้ `requireAuth` (proxy style) — **ไม่ใช้** `authenticateToken` (JWT) กับ routes ที่ rbac-matrix ทดสอบอยู่ เพราะ `ANY_AUTH` rules ส่งแค่ x-user headers แล้ว `authenticateToken` จะ 401 ทั้งหมด (regression เทียม) `authenticateToken` เก็บไว้เฉพาะ route ที่ตั้งใจให้ external JWT consumer เรียก (ไม่มีในขอบเขตนี้)

- `stock-transfers.ts`: `router.use(requireAuth)` ทั้งไฟล์; POST: `requestedBy: req.user.id` (เพิกเฉย body field); PATCH: `approvedBy: req.user.id` (drop body field); GET `/` + `/:id`: admin tier เห็นหมด, อื่นก็กรอง `fromWarehouseId`/`toWarehouseId` ∈ managed warehouses หรือ `requestedBy = user.id`
- `stock-levels.ts`: GET `/` + GET `/:warehouseId/:itemId` เพิ่ม `requireAuth` + warehouse scope (admin tier เห็นหมด); PATCH ทั้ง 2 (`/adjust`, `/limits`) เพิ่ม `assertWarehouseAccess` (V16; POST คง `requireRole(['superadmin','admin'])` อยู่แล้ว = admin tier) + adjust route ใช้ `userId` จาก session ไม่ใช่ body
- `stock-transactions.ts`: GET `/history/:itemId` เพิ่ม warehouse scope
- `requests.ts`: PATCH `/:id/status` → `authorize(['superadmin','admin','approver'])` (V15: ตัด `'hr'` ที่ตายแล้ว) + ตรวจ `request.warehouseId ∈ managed warehouses` (admin tier ผ่าน)
- `inventory.ts` + `warehouses.ts` (V21): `GET /` ทั้ง 2 เพิ่ม `requireAuth` (+ warehouse scope บน `GET /api/warehouses/:id` เฉพาะ staff ของคลัง หรือเก็บ public ตาม policy decision §3 V21 — ถ้า product ต้องการ catalog เปิด)

### 5.2.1 ข้อยกเว้น (policy decision บันทึกใน PR)

- `GET /api/warehouses` อาจคง public ได้ถ้า catalog เปิดให้ user เลือกคลังยืม — ให้เจ้าของ product ตัดสิน ไม่ใช่ fix ตามดุลยพินิจ
- dashboard/reports aggregate (V20) ถ้า product ตั้งใจให้เห็นทั้ง org (แดชบอร์ดบริหาร) → ไม่ต้อง scope; ให้ย้ายออกจาก inventory นี้เป็น documented decision

**Warehouse-null gap:** `Request.warehouseId` เป็น nullable และ cart submit path สร้าง request ที่ `warehouseId = null` ได้ → non-admin ที่เป็นเจ้าของ request ยัง approve/read ตัวเองได้ (`OR: [{ userId: user.id }]` ก่อน warehouse check); ถ้าไม่มี warehouse ใดเข้ากันเลยให้ 404 ตามนโยบาย ไม่ใช่ 403

### 5.3 Frontend action fixes

- `cart.ts` `removeFromCart`: `findFirst({ where: { id, userId } })` → ไม่พบคืน error; พบจึง `delete`
- `stock-management.ts`: `adjustStockQuantity` ตัด param `userId` (ใช้ session), เพิ่ม `requireRole(...ADMIN_ROLES)` หรือ manager-of-warehouse check; `updateStockLimits` เพิ่ม auth + warehouse scope; `getItemDetail`/`getStockHistory` เพิ่ม session check + scope stockLevels/transactions ตาม warehouses ของ user
- `stock-transaction.ts` `receiveGoods` (V11): เพิ่ม `auth()` check, ตัด `userId` จาก `InboundSchema` (ใช้ session), warehouse scope; `getStockHistory` (V12): **ลบออก** (ไม่มี caller — ดู §3.1)
- `requests.ts` `updateRequestStatus` (V13): ตรวจ `request.warehouseId ∈ managed warehouses` ก่อน `$transaction` (admin tier ผ่าน)
- `warehouse.ts` `getDivisions`/`getProvinces` (V14): เพิ่ม `auth()` check
- `inventory.ts` `fetchInventoryItems`/`fetchInventoryPages` (V17) + `categories.ts` `getCategories` (V18): เพิ่ม `auth()` check
- `history.ts` `getHistory` (V19): where เพิ่ม `userId = session user.id` เมื่อไม่ใช่ admin tier (mirror `getRequests`) — ระวัง: หน้า /history ใช้ทั้ง user กับ admin
- `dashboard.ts` + `reports.ts` (V20): scope aggregates ตาม warehouses ของ user หรือจำกัด admin tier — หรือบันทึก policy decision (§5.2.1)
- `assets.ts` `checkInAsset`/`requestReturn` (V22/V23): เช็ค holder (`currentHolderId === user.id` หรือมี approved borrow request ของ user) ก่อนเขียน; `reportIssue` fallback (V24): เช็คเดียวกัน หรือลบ fallback
- `AdjustStockDialog.tsx:42` — ลบ arg `1` ออก (signature change จาก V8)

### 5.4 RBAC fixture (`backend/src/tests/security/authz/rbac-matrix.fixture.ts`)

เพิ่ม rules ใหม่เข้า `ANY_AUTH` (ปัจจุบัน rules เหล่านี้ **ไม่มีอยู่ใน matrix เลย** — ไม่ได้อยู่ใน `PUBLIC`): `/api/stock-transfers` GET `/` + `/:id`, `/api/stock-levels` GET `/` + `/:warehouseId/:itemId`, `/api/stock-transactions/history/:itemId`, `/api/inventory` GET `/`, `/api/warehouses` GET `/` + `/:id` (มี auth แล้ว แต่ role อะไรก็ผ่าน — object scope จัดการใน handler) + เพิ่ม `PATCH /api/requests/:id/status` เข้า `APPROVER_TIER` (role list ใหม่)
**หมายเหตุ:** security tests 2 ชุดต่างกัน — `rbac-matrix.test.ts` นำเข้า `app` จาก `src/index` (in-memory, ไม่ต้องมี server) ส่วน `idor.test.ts` ใช้ `SecurityHttpClient(targets.backend)` ยิงไปที่ **live server** `http://localhost:3001` (ต้องรัน backend ก่อน) — CI กันทั้งโฟลเดอร์ออกด้วย `--testPathIgnorePatterns=src/tests/security` แต่รันเองได้ตามปกติ

## 6. Test plan

- `backend/src/tests/unit/authz.test.ts` (Jest, prisma mock) — `getManagedWarehouseIds`, `assertWarehouseAccess`, NotFoundError case
- `backend/src/tests/unit/object-authz.test.ts` (supertest(app), mock prisma singleton แบบ requestController.test.ts) — anonymous GET stock-transfers/stock-levels → 401 (proxy-style `requireAuth`); cross-warehouse PATCH adjust → 404; body-spoof `requestedBy`/`approvedBy` ถูกเพิกเฉย (บันทึกได้ id ของ session user เท่านั้น); request ที่ `warehouseId = null` + non-admin owner → ผ่าน (warehouse-null gap §5.2)
- **rbac-matrix regression:** หลังย้าย fixture จาก `PUBLIC` → `ANY_AUTH` (§5.4) ต้องรัน `rbac-matrix.test.ts` ใหม่ — rules ที่ย้ายมาจะต้องไม่ 401 เมื่อส่ง x-user headers ครบ (ถ้าใส่ `authenticateToken` โดยไม่ตั้งใจจะเห็น regression นี้ทันที)
- `frontend/next-app/tests/actions/cart.test.ts` เพิ่ม case: removeFromCart ของ user อื่น → `{ error: 'Item not found' }`
- `frontend/next-app/tests/actions/stock-management.test.ts` เพิ่ม case: ปราศจาก session → Unauthorized; cross-warehouse → Not found
- `frontend/next-app/tests/actions/stock-transaction.test.ts` อัปเดต: `receiveGoods` ตอนนี้ต้องมี session (mock `auth` แบบเดียวกับ cart.test.ts); payload ไม่มี `userId` แล้ว
- `frontend/next-app/tests/actions/requests.test.ts` เพิ่ม case: approver ที่ไม่ได้สังกัด warehouse ของ request → `{ error: 'Request not found' }` (404 policy); request `warehouseId = null` + owner → ยังผ่าน (warehouse-null gap)
- `frontend/next-app/tests/actions/warehouse.test.ts` เพิ่ม case: `getDivisions`/`getProvinces` ปราศจาก session → Unauthorized
- `frontend/next-app/tests/actions/history.test.ts` เพิ่ม case: user ธรรมดาเห็นเฉพาะ `userId` ตัวเอง; admin tier เห็นหมด (V19)
- `frontend/next-app/tests/actions/inventory.test.ts` + `categories.test.ts`: ปราศจาก session → Unauthorized (V17/V18)
- `frontend/next-app/tests/actions/assets.test.ts` เพิ่ม case: `checkInAsset`/`requestReturn` ของ item ที่ user ไม่ถืออยู่ → error ไม่เขียน history/request (V22/V23)
- `frontend/next-app/tests/actions/dashboard.test.ts` + `reports.test.ts`: กรณี scope (V20) ตาม policy ที่เลือก
- **mock infra ที่มีอยู่แล้ว:** `tests/actions/__mocks__/prisma` + `tests/actions/__mocks__/auth` (`sessionFor('user')`) — ใช้ต่อได้เลย ดูตัวอย่างจาก cart.test.ts
- **backend route test pattern:** `tests/unit/requestController.test.ts` mock `utils/prisma` singleton + `jest.mock('../../services/notificationService')` — routes ที่ fix เพิ่ม test แบบ supertest(app) + mock prisma delegate แบบเดียวกัน (ไม่ต้อง spin server live; idor.test.ts ที่ยิง live server อยู่แล้วให้คงไว้ รันด้วยมือ)
- รัน: `cd backend && npm test -- --testPathIgnorePatterns=src/tests/security`; `cd frontend/next-app && npx vitest run --coverage`; `npm run lint` ทั้งสองฝั่ง; `npm run build` backend (tsc)

## 7. Commit + PR plan

```
git switch -c fix/object-level-authz        # จาก halfbeak (branch ปัจจุบัน; main ตามถ้าไม่มี diff)
# commit 1: doc ฉบับนี้
# commit 2: backend authz helper + route fixes
# commit 3: frontend action fixes + dialog callers
# commit 4: tests + rbac fixture
git push -u origin fix/object-level-authz
gh pr create --draft --title "fix(authz): object-level access checks for stock/requests/cart" --body-file pr-body.md
```

PR body ร่าง: 24 ช่อง V1–V24, 404-not-403 policy, identity จาก server-verified session/JWT เท่านั้น, ไม่แก้ schema, RBAC fixture update, test results (กรอกหลังรันจริง — ห้ามเขียน "All passing" ล่วงหน้าเหมือน docx เดิม)

## 8. Follow-ups (นอกขอบเขต PR นี้)

- `deleteUser` hard delete → soft delete
- `getRequests` scope ด้วย `role === 'user'` string — ไม่รองรับ multi-role (`roles[]`)
- หน่วยงาน: warehouse managers vs DepartmentMapping ยังไม่ unify — `getManagedWarehouseIds` ต้องเรียก 2 ครั้ง; ถ้า schema อนุญาตให้เพิ่ม `Warehouse.managers` เป็น source of truth เดียว + migrate จะดีกว่า
- docx เดิมอ้าง `GET /api/cart`, `/api/transfers/:id`, `/api/maintenance/:id`, `/api/stock/:id`, `/api/users/:id` — endpoint เหล่านี้ไม่มีใน repo; ถ้าจะเพิ่ม REST mirror ของ Server Actions มาให้ external consumer ให้เปิด PR แย่พร้อม audit + RBAC ตั้งแต่ต้น
