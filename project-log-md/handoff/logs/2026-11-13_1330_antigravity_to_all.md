# Handoff Log

---
| Field | Value |
|-------|-------|
| **Date** | 2026-11-13 13:30 น. (เวลาไทย) |
| **From Agent** | antigravity |
| **To Agent** | all |
| **Session Duration** | 2026-11-13 12:31 → 13:30 |
| **Remark** | Iron Rules acknowledged. Implemented remaining IDOR/object-level authz fixes (V1–V24), tests, and RBAC matrix updates on branch `fix/object-level-authz`. |

---

## สรุปงานที่ทำ

1. **Backend route fixes (V1–V6, V15–V16, V21):**
   - `backend/src/routes/stock-transfers.ts`: เปลี่ยน `GET /` และ `GET /:id` จาก `authenticateToken` เป็น `requireAuth` (proxy-style) และแก้ `where.AND` เมื่อมีทั้ง `warehouseId` query และ warehouse scope
   - `backend/src/routes/stock-levels.ts`: เพิ่ม `requireAuth` + `assertWarehouseAccess` บน `GET /:warehouseId/:itemId` (V3)
   - `backend/src/routes/stock-transactions.ts`: เพิ่ม `requireAuth` + warehouse scope บน `GET /history/:itemId` (V4)
   - `backend/src/routes/requests.ts` & `backend/src/controllers/requestController.ts`: เปลี่ยนเป็น `requireAuth` + `requireRole(['superadmin','admin','approver'])` + `scopeRequestWarehouse` middleware (รวม warehouse-null owner check) และรองรับ `req.user.id ?? req.user.userId` (V5/V15)
   - `backend/src/routes/inventory.ts` & `backend/src/routes/warehouses.ts`: เพิ่ม `requireAuth` บน `GET /` และ `GET /:id` (V21)
2. **Frontend Server Actions & Callers (V7–V14, V17–V20, V22–V24):**
   - สร้าง `frontend/next-app/lib/warehouse-scope.ts` (`isAdminSession`, `getManagedWarehouseIds`)
   - แก้ `cart.ts` (V7), `stock-management.ts` (V8–V10), `stock-transaction.ts` (V11: ลบ `userId` จาก schema, V12: ลบ `getStockHistory`), `requests.ts` (V13), `warehouse.ts` (V14), `inventory.ts` (V17), `categories.ts` (V18), `history.ts` (V19), `dashboard.ts` + `reports.ts` (V20), `assets.ts` (V22–V24)
   - ลบ hardcoded `1` / `userId: 1` ใน `AdjustStockDialog.tsx` และ `GoodsReceiptForm.tsx`
3. **Tests & Verification:**
   - Backend unit/integration (`--testPathIgnorePatterns=src/tests/security --forceExit`): **10/10 suites, 64/64 tests passed** (รวม `authz.test.ts` และ `object-authz.test.ts`)
   - Backend `rbac-matrix.test.ts` (with `DATABASE_URL=file:./prisma/dev.db`, `INTERNAL_API_KEY=test-internal-key`): **1/1 suite, 218/218 tests passed**
   - Backend `npm run build` (`tsc`): **passed**
   - Frontend `vitest run --coverage`: **35/35 files, 425/425 tests passed**, `lib/actions` line coverage **89.46%**
   - Frontend `npm run lint`: **0 errors** (19 pre-existing warnings)

## ไฟล์ที่สร้าง/แก้ไข

- `backend/src/lib/authz.ts` (new)
- `backend/src/routes/{stock-transfers,stock-levels,stock-transactions,requests,inventory,warehouses}.ts`
- `backend/src/controllers/requestController.ts`
- `backend/src/tests/unit/{authz,object-authz}.test.ts` (new)
- `backend/src/tests/security/authz/rbac-matrix.fixture.ts`
- `frontend/next-app/lib/warehouse-scope.ts` (new)
- `frontend/next-app/lib/actions/{cart,stock-management,stock-transaction,requests,warehouse,inventory,categories,history,dashboard,reports,assets}.ts`
- `frontend/next-app/app/(dashboard)/inventory/[id]/AdjustStockDialog.tsx`
- `frontend/next-app/app/(dashboard)/inventory/receive/GoodsReceiptForm.tsx`
- `frontend/next-app/tests/actions/{cart,stock-management,stock-transaction,requests,warehouse,history,inventory,categories,assets,dashboard,reports}.test.ts`

## งานที่ส่งต่อ

- [ ] Owner review draft PR บน `fix/object-level-authz` และตัดสิน policy decisions:
  - V21: `GET /api/warehouses` ควรคง `requireAuth` หรือเปิด public catalog
  - V20: `dashboard`/`reports` aggregates ตั้งใจให้เห็นทั้ง org หรือ scope ตาม warehouse/admin
- [ ] Run E2E / live-server `idor.test.ts` ก่อน merge หากต้องการทดสอบกับ live server

## คำสั่งที่เกี่ยวข้อง

```bash
cd backend && npm test -- --testPathIgnorePatterns=src/tests/security --forceExit
cd backend && npm run build
cd frontend/next-app && npx vitest run --coverage
cd frontend/next-app && npm run lint
```
