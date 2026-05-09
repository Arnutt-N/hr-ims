# Plan: Maintenance Request Workflow — Full Implementation

**Metadata**
- Agent: Claude (Opus 4.7 — 1M context)
- Timestamp: 2026-05-09 10:46:30 +07:00
- Repo: D:\genAI\hr-ims
- Target Output: `PRPs/claude/`
- User language preference: Thai-first (ผู้ใช้สื่อสารภาษาไทย); plan kept in English for codebase consistency
- Status: **DRAFT v6 — engineering-quality additions only (migration plan + optimistic locking); no new features; ready to start Phase 1 implementation**
- Estimated effort: ~50-60 commits across 6 PRs, 6-8 working days
- Revision history:
  - v1 (10:46): initial plan, single-item per request, 5 open questions
  - v2 (15:38): multi-item batch + per-item status; Q1-Q5 answered
  - v3 (16:00): location FK + dashboards + awaiting_parts + reporter approval (`closed` state)
  - v4 (16:30): 5 Bucket-A + Phase 5 (auto-assign + escalation cron); 3 stub PRPs for Bucket C
  - v5 (18:50): 3 Bucket-A (tags, MIME, soft-delete) + Phase 6 (watch + activity feed)
  - v6 (19:15): 2 engineering-quality additions — (1) migration decision for existing `inventoryItem.repairNotes`; (2) optimistic locking via `version` field on MaintenanceRequestItem

---

## 1) Summary

**Problem (จากผู้ใช้):** เมนู "จัดการซ่อมบำรุง" มีอยู่ในระบบ แต่ขาด:
- ฟอร์มแจ้งซ่อม proper (ปัจจุบันใช้ JS `prompt()` UX แย่)
- ปุ่มแจ้งซ่อมในหน้า /inventory (staff เห็น item เสียในห้องอุปกรณ์ก็แจ้งไม่ได้ถ้าไม่ได้ยืม)
- Workflow ที่สมบูรณ์ (ขาด: assignment, severity, photos, history, technician notes)
- Dedicated table สำหรับ track maintenance requests (ทุกอย่าง infer จาก `inventoryItem.status` field เดียว)

**Goal:** สร้างระบบ Maintenance Request ที่สมบูรณ์ — มี dedicated table, ฟอร์มแจ้งซ่อมในทุกจุดที่เกี่ยวข้อง, workflow มี state machine ครบ (open → assigned → in_progress → resolved), assignment ให้ technician เฉพาะคน, history ของทุก state change, attachment photos via UploadThing, optional cost tracking

---

## 2) Current Ground Truth

### What exists today

**Database Schema** (`backend/prisma/schema.prisma`):
- `InventoryItem.status` is a string with values `available | borrowed | maintenance | issue_reported`
- `InventoryItem.repairNotes` is a single nullable string field — only stores latest note, overwritten on each repair
- No dedicated `MaintenanceRequest` or `MaintenanceLog` table
- `History` table is used as a generic audit log but is flat (no foreign-key relation to specific request entity)

**Server Actions** (`frontend/next-app/lib/actions/maintenance.ts`):
- `getMaintenanceItems()` — admin/technician — returns `InventoryItem[]` where status is `maintenance` or `issue_reported`
- `updateMaintenanceStatus(id, status, repairNotes?)` — admin only — flips status (typically to `available`) and overwrites `repairNotes`

**Server Actions** (`frontend/next-app/lib/actions/assets.ts`):
- `reportIssue(itemId, issue)` (line 123) — any logged-in user — sets `inventoryItem.status = 'issue_reported'`, creates `History` entry, revalidates `/my-assets`

**UI surfaces:**
- `app/(dashboard)/maintenance/page.tsx` — admin/technician dashboard with "Mark Repaired" modal (proper UX with `<Dialog>` + `<Textarea>`)
- `app/(dashboard)/my-assets/page.tsx:147-154` — "Report" button calls `handleReport()` which uses `prompt('Describe the issue:')` (browser-native, breaks design system)
- `app/(dashboard)/inventory/page.tsx` — **no Report Issue button** for items the user has not borrowed
- `components/ui/inventory-card.tsx` — only has "Add to Cart" / "Borrow" actions
- `app/(dashboard)/scanner/page.tsx` — references `reportIssue` but flow is unclear (out of scope for this PRP)

**RBAC** (`frontend/next-app/lib/proxy-authorize.ts`):
- `/maintenance` is in `PROTECTED_MODULES`
- Legacy fallback rule: `{ prefix: '/maintenance', roles: ['superadmin', 'admin', 'technician'] }`
- Seed file (`backend/prisma/seed.ts`) grants `/maintenance` permission to `superadmin`, `admin`, `technician` roles only

**i18n** (`frontend/next-app/lib/i18n/messages.ts`):
- Has `maintenance.title`, `maintenance.subtitle`, `maintenance.action.mark-repaired` keys (Thai+English)
- Missing keys for new workflow (severity labels, status labels, form fields)

### Gaps to close

1. **No request entity** — `inventoryItem.status` describes state but doesn't track requests over time. An item that has been repaired 5 times shows only the latest `repairNotes`.
2. **No severity / category metadata** — every report is treated equally; no way to triage critical-vs-low priority.
3. **No assignment** — "in repair" status doesn't say WHO is repairing.
4. **No state machine logging** — transitions are silent; can't audit who approved what when.
5. **Scattered reporting UX** — only `/my-assets` has a (poor) report button; `/inventory` and `/scanner` flows incomplete.

---

## 3) Goals & Non-Goals

### Goals

- Add dedicated `MaintenanceRequest` + `MaintenanceLog` Prisma models with full audit history.
- Replace `prompt()` in `/my-assets` with a proper modal form (`<Dialog>` + Zod validation).
- Add "Report Issue" entry point on `/inventory` items (any logged-in user, not just current holder).
- Implement state machine: `open → assigned → in_progress → resolved`; `→ cancelled` from any non-resolved state.
- Add request detail page (`/maintenance/[id]`) showing timeline of `MaintenanceLog` events.
- Add filters on `/maintenance` list (status, severity, assignee).
- Photo upload via UploadThing (already wired in repo).
- Optional cost tracking (`estimatedCost`, `actualCost` decimals).
- Sync `inventoryItem.status` from active request status (one source of truth, but no breaking schema change).
- Add Vitest unit tests for all new Server Actions.
- Add Playwright E2E spec covering the full report → assign → resolve flow.

### Non-Goals (explicitly deferred)

- **Preventive maintenance scheduling** (cron-based PM checks based on `Settings.checkInterval`) — separate PRP later.
- **Maintenance vendor / external supplier integration** — out of scope; assumes in-house technician model.
- **SLA tracking / email escalation** — could pair with existing notification system but treated as a separate feature.
- **Mobile-first redesign of `/maintenance`** — existing layout retained; only new states/actions added.
- **Migration of historical `inventoryItem.repairNotes` data** — existing notes stay on the column but new requests use the new tables.

---

## 4) Implementation Plan

### Phase 1 — Schema & Migration

**Goal:** Land the new tables and Prisma client regeneration without touching application code yet.

**Branch:** `feat/maintenance-schema`

**Files:**
- `backend/prisma/schema.prisma` — add models below
- `backend/prisma/seed.ts` — (optional) seed 1-2 sample requests for development
- Run `npx prisma generate && npx prisma db push` (regenerates BOTH clients)
- Run `npm run db:generate:tidb` for TiDB parity check

**New models (revised v2 — multi-item via join table):**

```prisma
// Container/header. Aggregate-level fields only.
// Status is DERIVED from items (computed in Server Action, not stored — or
// stored but always re-derived when items change). Decision: store as a
// denormalized convenience column updated atomically inside the same
// $transaction that mutates any item; keeps queries simple, accepts the
// single-writer drift risk (mitigated by transactions).
model MaintenanceRequest {
  id              Int       @id @default(autoincrement())
  reportedById    Int
  reportedBy      User      @relation("ReportedMaintenanceRequests", fields: [reportedById], references: [id])
  assignedToId    Int?
  assignedTo      User?     @relation("AssignedMaintenanceRequests", fields: [assignedToId], references: [id])

  // v3: Location of the issue — uses existing Department table
  // Optional because some assets (e.g. laptops checked out to remote staff)
  // are inherently location-agnostic.
  locationId      Int?
  location        Department? @relation("MaintenanceLocations", fields: [locationId], references: [id])

  title           String
  description     String
  severity        String    @default("medium")  // low | medium | high | critical — IMPACT axis (Q11 v4)
  priority        String    @default("normal")  // low | normal | high | urgent — URGENCY axis (Q10 v4)
  category        String    @default("other")   // electrical | mechanical | software | physical | other (mandatory triage axis)
  tags            String?   // v5: JSON array of free-form labels (max 10, each ≤32 chars). Distinct from category.
  status          String    @default("open")    // open | assigned | in_progress | awaiting_parts | resolved | closed | cancelled — AGGREGATE
  // SQLite has no native arrays — JSON string of string[] (UploadThing URLs)
  photos          String?

  estimatedCost   Float?    // aggregate estimate; per-item actuals on the join row

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  assignedAt      DateTime? // v4: set when assignedToId first assigned — used by escalation cron (Q15)
  escalatedAt     DateTime? // v4: set when escalation cron has notified admin (idempotency guard)
  resolvedAt      DateTime? // set when ALL items reach 'resolved' (technician's claim)
  closedAt        DateTime? // set when ALL items reach 'closed' (reporter's verification)
  deletedAt       DateTime? // v5: soft-delete; Prisma middleware injects WHERE deletedAt IS NULL on all find ops

  items           MaintenanceRequestItem[]
  logs            MaintenanceLog[]

  @@index([status])
  @@index([assignedToId])
  @@index([reportedById])
  @@index([locationId])
}

// Join table — one row per (request, item) pairing. Per-item state and
// resolution. Multiple rows = batch request covering multiple items.
//
// State machine (v3):
//   open ──→ in_progress ←→ awaiting_parts ──→ resolved ──→ closed
//                                                  │
//                                                  └── (rejected by reporter) ──→ in_progress
//   any non-terminal ──→ cancelled
//   closed ──→ in_progress  (admin reopen only)
//
// Terminal states: closed, cancelled
// Pending-verification: resolved (waiting for reporter to approve)
model MaintenanceRequestItem {
  id              Int       @id @default(autoincrement())
  requestId       Int
  request         MaintenanceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  itemId          Int
  item            InventoryItem @relation(fields: [itemId], references: [id])

  status          String    @default("open")  // open | in_progress | awaiting_parts | resolved | closed | cancelled
  resolution      String?   // per-item repair note from technician (set on → 'resolved')
  rejectionReason String?   // set when reporter rejects → goes back to 'in_progress'; cleared on next 'resolved'
  actualCost      Float?    // per-item cost
  resolvedAt      DateTime? // when technician marked 'resolved'
  closedAt        DateTime? // when reporter approved → 'closed'
  deletedAt       DateTime? // v5: soft-delete cascaded from parent request
  version         Int       @default(0) // v6: optimistic lock — incremented on every state mutation

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([requestId, itemId])  // one item appears once per request
  @@index([itemId])
  @@index([status])
}

// Audit trail. itemId is nullable: log entries for request-level actions
// (created, assigned, reopened) leave it null; per-item resolution events
// fill it in.
model MaintenanceLog {
  id          Int       @id @default(autoincrement())
  requestId   Int
  request     MaintenanceRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  itemId      Int?      // null = request-level event; set = item-level event
  userId      Int
  user        User       @relation("MaintenanceLogEntries", fields: [userId], references: [id])

  action      String
  // v3 actions catalog:
  //   created
  //   assigned | unassigned
  //   status_changed             — generic item status transition
  //   item_marked_awaiting_parts | item_resumed_work
  //   item_resolved              — tech claims fix done (per-item)
  //   item_approved              — reporter verifies (per-item) → closed
  //   item_rejected              — reporter rejects (per-item, with reason) → back to in_progress
  //   request_resolved           — aggregate: all items resolved
  //   request_closed             — aggregate: all items closed (terminal positive)
  //   reopened                   — admin reopens closed request
  //   cancelled                  — request or item cancelled
  //   note_added                 — free-text note, no state change
  fromStatus  String?
  toStatus    String?
  notes       String?
  createdAt   DateTime  @default(now())

  @@index([requestId])
}
```

**Aggregate status rule (v3 — enforced in Server Actions, not in DB):**

Item-level → Request-level mapping, evaluated top-down (first match wins):
- `cancelled` if `request.status === 'cancelled'` (header overrides — explicit cancel of whole request)
- `closed` if all items in `(closed | cancelled)` AND ≥1 `closed` (terminal positive, all verified)
- `resolved` if all items in `(resolved | closed | cancelled)` AND ≥1 `resolved` (waiting for reporter to approve outstanding `resolved` items)
- `in_progress` if any item is `in_progress`
- `awaiting_parts` if any item is `awaiting_parts` AND none is `in_progress` (blocked but no active work)
- `assigned` if `assignedToId IS NOT NULL` AND no item has progressed past `open`
- `open` otherwise

Set `resolvedAt` when aggregate first reaches `resolved`; set `closedAt` when first reaches `closed`. Both are immutable thereafter (cleared only on `reopened`).

**Modifications to existing models:**
- `Department`: add reverse relation
  ```prisma
  maintenanceRequests MaintenanceRequest[] @relation("MaintenanceLocations")
  ```
- `InventoryItem`: add reverse relation to the JOIN table (not request directly)
  ```prisma
  maintenanceRequestItems MaintenanceRequestItem[]
  // @deprecated repairNotes — new flow stores per-item resolution on MaintenanceRequestItem.resolution
  // repairNotes kept for backward compatibility with existing data
  ```
- `User`: add reverse relations
  ```prisma
  reportedMaintenanceRequests MaintenanceRequest[] @relation("ReportedMaintenanceRequests")
  assignedMaintenanceRequests MaintenanceRequest[] @relation("AssignedMaintenanceRequests")
  maintenanceLogs             MaintenanceLog[]     @relation("MaintenanceLogEntries")
  categoryAssigneeRules       CategoryAssigneeRule[] @relation("CategoryAssignee")  // v4 Phase 5
  ```

**v4 Phase 5 model (lands in Phase 5 PR, NOT Phase 1 — listed here for schema design completeness):**

```prisma
// Auto-assignment rules: when createMaintenanceRequest fires with a given
// category, look up the highest-priority matching rule and pre-set
// assignedToId. Multiple rules per category allowed (priority breaks ties);
// disabled rules retained for audit.
model CategoryAssigneeRule {
  id              Int       @id @default(autoincrement())
  category        String    // electrical | mechanical | software | physical | other
  assigneeUserId  Int
  assignee        User      @relation("CategoryAssignee", fields: [assigneeUserId], references: [id])
  priority        Int       @default(0)  // higher wins; 0 = default
  enabled         Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([category, enabled, priority])
}
```

**v5 Phase 6 model (lands in Phase 6 PR, NOT Phase 1 — listed here for schema design completeness):**

```prisma
// Watch subscriptions: any logged-in user can watch a request to receive
// notifications on every state change. Composite unique on (userId, requestId)
// prevents double-watch; cascade delete with request keeps table clean.
model MaintenanceRequestWatcher {
  id          Int       @id @default(autoincrement())
  userId      Int
  user        User      @relation("MaintenanceWatchers", fields: [userId], references: [id])
  requestId   Int
  request     MaintenanceRequest @relation("MaintenanceWatchers", fields: [requestId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())

  @@unique([userId, requestId])
  @@index([requestId])  // fan-out lookup on every state change
  @@index([userId])     // "my watched" list query
}
```

Reverse relations to add to `User` and `MaintenanceRequest` (in Phase 6 PR):
```prisma
// User
maintenanceWatchers MaintenanceRequestWatcher[] @relation("MaintenanceWatchers")
// MaintenanceRequest
watchers            MaintenanceRequestWatcher[] @relation("MaintenanceWatchers")
```

**Backward compatibility:**
- Keep `InventoryItem.status` and `InventoryItem.repairNotes` unchanged. Server Actions in Phase 2 will sync `status` from active request state but not remove the column.
- Existing `getMaintenanceItems` keeps working (queries `InventoryItem.status` as before) until migrated to use `MaintenanceRequest` table in Phase 2.

**Validation:**
- `npx tsc --noEmit` passes in backend AND frontend
- `npx prisma db push` succeeds against `backend/prisma/dev.db`
- `npx prisma db seed` runs without errors
- TiDB transform: `npm run db:prepare:tidb && npm run db:generate:tidb` succeeds

**Commit candidates (~3):**
1. `feat(schema): add MaintenanceRequest, MaintenanceRequestItem, MaintenanceLog models (incl. tags, deletedAt, version for optimistic lock)`
2. `chore(prisma): regenerate clients after maintenance schema changes`
3. `chore(seed): seed 1-2 sample maintenance requests with tags`

**v6 migration note:** No data migration script for existing `inventoryItem.repairNotes` — clean break per Q22 decision. Existing values stay on column as legacy data; UI surfaces them on inventory item detail with a "Legacy repair note" disclosure block.

**PR target:** `main` (small, schema-only — easy to review)

---

### Phase 2 — Server Actions

**Goal:** Implement all backend logic in Server Actions; no UI changes yet.

**Branch:** `feat/maintenance-actions`

**Files:**
- `frontend/next-app/lib/actions/maintenance.ts` — rewrite/extend
- `frontend/next-app/lib/actions/assets.ts` — modify `reportIssue` to also create a `MaintenanceRequest` (backward-compat layer)
- `frontend/next-app/lib/types/maintenance.ts` (NEW) — shared types

**New Server Actions (revised v2 — multi-item):**

```typescript
// All actions follow the repo pattern:
// auth check → role/permission check → Zod validation
// → prisma.$transaction (mutation + audit log + aggregate-status recompute)
// → revalidatePath → typed return

createMaintenanceRequest(input: {
  itemIds: number[];                                 // ≥1; batch report
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';   // v4: IMPACT axis
  priority: 'low' | 'normal' | 'high' | 'urgent';    // v4 NEW: URGENCY axis (defaults to 'normal' if omitted)
  category: 'electrical' | 'mechanical' | 'software' | 'physical' | 'other';
  tags?: string[];                                   // v5 NEW: free-form labels (max 10, each ≤32 chars, alphanumeric+dash)
  locationId?: number;                               // v3: optional FK to Department
  photoUrls?: string[];                              // ≤5 URLs; v5 Zod refinement: must match UploadThing CDN domain
  estimatedCost?: number;
}): Promise<ActionResult<MaintenanceRequest>>
// Auth: any logged-in user
// Validation: itemIds non-empty + max 20 items per batch (DoS guard)
// Side effects (single $transaction):
//   - Insert MaintenanceRequest (status='open', priority from input)
//   - v4 Phase 5: lookup CategoryAssigneeRule for this category — if a match exists,
//     set assignedToId AND assignedAt=now() AND status='assigned' in same insert
//   - Insert N MaintenanceRequestItem rows (one per itemId, status='open')
//   - Insert MaintenanceLog (action='created', itemId=null) + (action='assigned', itemId=null) if auto-assigned
//   - For each item: update InventoryItem.status='issue_reported' (backward-compat)
//   - v4 Q11: If severity === 'critical' → POST to Telegram bot via telegramService.send()
//     (env-gated: skip silently if TELEGRAM_BOT_TOKEN/TELEGRAM_ADMIN_CHAT_ID unset)
//   - If severity in ['critical','high']: enqueue in-app notification to admin/superadmin
//     v4 Q12: notification payload includes actions=[{label:'View',href:`/maintenance/${id}`}]
//   - revalidatePath('/maintenance', '/inventory', '/my-assets')

assignMaintenanceRequest(requestId: number, assigneeUserId: number): Promise<ActionResult<MaintenanceRequest>>
// Auth: admin | superadmin
// Validates: assignee has 'technician' or admin role; request not in resolved/cancelled
// Side effects:
//   - Update request: assignedToId
//   - Recompute aggregate status (open → assigned)
//   - Insert log (action='assigned', itemId=null, fromStatus, toStatus)
//   - revalidatePath

updateMaintenanceItemStatus(input: {
  requestId: number;
  itemId: number;
  expectedVersion: number;          // v6 optimistic lock — caller passes current item.version
  newStatus: 'in_progress' | 'awaiting_parts' | 'resolved' | 'cancelled';
  resolution?: string;     // required for 'resolved'
  actualCost?: number;
  notes?: string;
}): Promise<ActionResult>
// Auth: request.assignedTo === session.user.id OR admin OR superadmin
// Validates legal transitions on the JOIN ROW (v3):
//   open → in_progress | cancelled
//   in_progress → awaiting_parts | resolved | cancelled
//   awaiting_parts → in_progress | resolved | cancelled  (Q4: skip-back-to-resolved allowed)
//   resolved → cancelled  (no direct revert; reporter must reject explicitly)
//   closed → (none — terminal; only admin reopen via reopenMaintenanceRequest)
//   cancelled → (none — terminal)
// Side effects (single $transaction):
//   - Update MaintenanceRequestItem: status, resolution(if resolved), actualCost, resolvedAt(if resolved)
//   - Insert log (action='item_resolved' / 'item_marked_awaiting_parts' / 'item_resumed_work' / 'status_changed', itemId set, fromStatus, toStatus, notes)
//   - Recompute request.status via computeRequestStatus() (see Phase 1 aggregate rule)
//   - If aggregate becomes 'resolved' for the first time: set request.resolvedAt + log (action='request_resolved', itemId=null)
//   - On 'resolved': enqueue notification to reporter via notificationService — "Item ready for your verification"
//   - For 'cancelled' items: sync InventoryItem.status='available' (backward-compat). NOT for 'resolved' — that's still pending verification.
//   - revalidatePath

approveItemResolution(input: {
  requestId: number;
  itemId: number;
  expectedVersion: number;          // v6 optimistic lock
}): Promise<ActionResult>
// v3 NEW
// Auth: request.reportedBy === session.user.id OR admin
// Validates: item.status === 'resolved'
// Side effects (single $transaction):
//   - Update MaintenanceRequestItem: status='closed', closedAt=now()
//   - Insert log (action='item_approved', itemId set, fromStatus='resolved', toStatus='closed')
//   - Recompute request.status; if all items closed: set request.closedAt + log (action='request_closed', itemId=null)
//   - Sync InventoryItem.status='available' (now safe — verified)
//   - revalidatePath

rejectItemResolution(input: {
  requestId: number;
  itemId: number;
  expectedVersion: number;          // v6 optimistic lock
  reason: string;          // required
}): Promise<ActionResult>
// v3 NEW
// Auth: request.reportedBy === session.user.id OR admin
// Validates: item.status === 'resolved'; reason non-empty
// Side effects (single $transaction):
//   - Update MaintenanceRequestItem: status='in_progress', rejectionReason=reason, resolvedAt=null
//   - Insert log (action='item_rejected', itemId set, fromStatus='resolved', toStatus='in_progress', notes=reason)
//   - Recompute request.status (will revert from 'resolved' to 'in_progress' or earlier)
//   - Clear request.resolvedAt if no items remain in (resolved|closed|cancelled)
//   - Notify assignee via notificationService — "Reporter rejected your fix: <reason>"
//   - revalidatePath

cancelMaintenanceRequest(requestId: number, reason: string): Promise<ActionResult>
// Auth (Q3 decision):
//   - reporter IF (now - createdAt) < 1 hour
//   - admin | superadmin anytime
// Side effects:
//   - Update request.status='cancelled' + cascade all non-resolved items → 'cancelled'
//   - Insert log (action='cancelled', notes=reason, itemId=null)
//   - Sync inventoryItem.status='available' for cancelled items
//   - revalidatePath

reopenMaintenanceRequest(requestId: number, reason: string): Promise<ActionResult>
// Auth (Q4 decision): admin | superadmin only — never reporter
// Validates: request.status IN ('closed', 'resolved') — both terminal/quasi-terminal states can reopen
// Side effects:
//   - Update request: clear resolvedAt + closedAt
//   - Update all items in ('closed', 'resolved') back to 'in_progress'
//   - Recompute request.status via aggregate rule (will land on 'in_progress')
//   - Insert log (action='reopened', notes=reason, itemId=null)
//   - revalidatePath

deleteMaintenanceRequest(id: number, reason: string): Promise<ActionResult>
// v5 NEW
// Auth: admin | superadmin only
// Side effects (single $transaction):
//   - Set MaintenanceRequest.deletedAt = now()
//   - Cascade: set deletedAt on all related MaintenanceRequestItem rows
//   - Insert log (action='deleted', notes=reason, itemId=null)
//   - Notify reporter via notificationService — "Your request was deleted by admin: <reason>"
//   - Sync InventoryItem.status='available' for any items still in (issue_reported, maintenance) backward-compat states
//   - revalidatePath
// Note: relies on Prisma middleware to ensure subsequent reads automatically filter this out

restoreMaintenanceRequest(id: number): Promise<ActionResult>
// v5 NEW
// Auth: admin | superadmin only
// Validates: request.deletedAt IS NOT NULL (must be currently deleted)
// Side effects (single $transaction):
//   - Clear MaintenanceRequest.deletedAt
//   - Cascade: clear deletedAt on related items
//   - Insert log (action='restored')
//   - revalidatePath

getMaintenanceTags(filter?: string): Promise<ActionResult<string[]>>
// v5 NEW
// Auth: any logged-in user
// Returns deduplicated tag list across all non-deleted requests, optionally
// filtered by substring match. Used for autocomplete in TagInput component
// and the filter bar chip multi-select.
// Implementation: SELECT tags FROM MaintenanceRequest WHERE tags IS NOT NULL,
// parse JSON, flatten, dedupe, optional substring filter, limit 50.

getMaintenanceStats(filters?: {
  dateFrom?: Date;
  dateTo?: Date;
  severity?: string;
  priority?: string;       // v4
  category?: string;
  tags?: string[];         // v5
  locationId?: number;
}): Promise<ActionResult<{
  totalRequests: number;
  byStatus: Record<RequestStatus, number>;
  bySeverity: Record<Severity, number>;
  byPriority: Record<Priority, number>;          // v4 NEW
  byCategory: Record<Category, number>;
  byLocation: Array<{ departmentId: number; departmentName: string; count: number }>;
  averageResolveTimeHours: number | null;       // resolvedAt - createdAt mean
  averageCloseTimeHours: number | null;         // closedAt - createdAt mean
  topItemsByRequestCount: Array<{ itemId: number; itemName: string; count: number }>;  // top 10

  // v4 Q14 NEW — cost report by department
  costByDepartment: Array<{
    departmentId: number;
    departmentName: string;
    estimatedTotal: number;
    actualTotal: number;
    requestCount: number;
  }>;

  // v4 Q14 NEW — technician productivity
  technicianProductivity: Array<{
    userId: number;
    userName: string;
    resolvedCount: number;
    closedCount: number;
    averageResolveTimeHours: number;          // for requests assigned to this user
    averageCloseTimeHours: number;
    totalActualCost: number;                  // sum of actualCost on items they resolved
  }>;

  costSummary: { estimatedTotal: number; actualTotal: number };
  trendByDay: Array<{ date: string; created: number; closed: number }>;  // last 30 days
}>>
// v3 NEW — used by both /reports/maintenance and /maintenance/dashboard
// v4 expanded with cost-by-dept and technician productivity
// Auth: admin | superadmin | technician | auditor (read-only)

addMaintenanceNote(requestId: number, notes: string, itemId?: number): Promise<ActionResult>
// Auth: assignee OR admin OR superadmin
// Side effects: insert log only (action='note_added', itemId optional for context)

getMaintenanceRequests(filters?: {
  status?: string;                                   // request-level aggregate
  assignedToId?: number | 'me' | 'unassigned';
  severity?: string;
  itemId?: number;                                   // returns requests touching this item
  tags?: string[];                                   // v5: AND-match (request must have ALL listed tags)
  view?: 'active' | 'deleted';                       // v5: 'deleted' bypasses soft-delete middleware (admin only)
}): Promise<ActionResult<Array<MaintenanceRequest & {
  items: Array<MaintenanceRequestItem & { item: Pick<InventoryItem,'id'|'name'|'serial'|'image'> }>;
  reportedBy: Pick<User,'id'|'name'>;
  assignedTo: Pick<User,'id'|'name'> | null;
}>>>
// Auth: admin | superadmin | technician | auditor (read-only)
// v5: view='deleted' requires admin/superadmin role (extra RBAC check)

getMyMaintenanceRequests(): Promise<ActionResult<...>>  // same return shape
// Auth: any logged-in user — returns requests where reportedById === session.user.id

getMaintenanceRequest(id: number): Promise<ActionResult<MaintenanceRequest & {
  items: ...;
  logs: MaintenanceLog[];          // ordered by createdAt asc — timeline
  reportedBy, assignedTo
}>>
// Auth: any logged-in user (admin/auditor see all; user sees own + assigned-to-me)
```

**v6: Optimistic lock helper (`lib/maintenance/optimistic-lock.ts`):**

```typescript
// Throws OptimisticLockError if expected version doesn't match current.
// Caller (Server Action) calls this inside its $transaction BEFORE mutating,
// then increments version atomically when the mutation succeeds.

export class OptimisticLockError extends Error {
  constructor(public readonly entity: string, public readonly id: number) {
    super(`${entity}#${id} was modified by another user; please refresh`);
  }
}

export async function assertItemVersion(
  tx: Prisma.TransactionClient,
  itemId: number,
  expectedVersion: number,
): Promise<void> {
  const current = await tx.maintenanceRequestItem.findUnique({
    where: { id: itemId },
    select: { version: true },
  });
  if (!current) throw new Error(`Item #${itemId} not found`);
  if (current.version !== expectedVersion) {
    throw new OptimisticLockError('MaintenanceRequestItem', itemId);
  }
}

// Pattern in Server Action:
//   await prisma.$transaction(async (tx) => {
//     await assertItemVersion(tx, itemId, input.expectedVersion);
//     await tx.maintenanceRequestItem.update({
//       where: { id: itemId },
//       data: { status: newStatus, version: { increment: 1 } },  // atomic
//     });
//   });
```

UI handling: when Server Action returns `{ error: 'OptimisticLock', message: '...' }`, RequestItemRow shows toast + auto-refetches request data + re-renders.

**v5: Prisma soft-delete middleware (`lib/prisma.ts` augmentation):**

```typescript
// Apply ONCE at Prisma client construction. Auto-filters deletedAt for the
// 2 maintenance tables. Other tables unaffected. Bypass via params.args.where
// explicitly setting deletedAt OR via model-level skip flag passed in args.

const SOFT_DELETE_MODELS = new Set([
  'MaintenanceRequest',
  'MaintenanceRequestItem',
]);

prisma.$use(async (params, next) => {
  if (!SOFT_DELETE_MODELS.has(params.model ?? '')) return next(params);

  // Skip if caller explicitly sets deletedAt (e.g. admin "deleted view")
  const explicitlyHandlesDeleted =
    params.args?.where?.deletedAt !== undefined ||
    params.args?.where?.AND?.some?.((c: any) => c?.deletedAt !== undefined);

  if (explicitlyHandlesDeleted) return next(params);

  // Inject deletedAt: null filter on all read operations
  if (['findUnique', 'findFirst', 'findMany', 'count', 'aggregate'].includes(params.action)) {
    params.args = params.args ?? {};
    params.args.where = { ...(params.args.where ?? {}), deletedAt: null };
  }

  // Convert delete operations to soft-delete (set deletedAt instead)
  // NOTE: deliberately NOT enabled here. delete operations should go through
  // explicit `deleteMaintenanceRequest` Server Action for audit trail.

  return next(params);
});
```

**Server-side helper to compute aggregate status (v3 — extract to `lib/maintenance/aggregate.ts`):**

```typescript
type ItemStatus = 'open' | 'in_progress' | 'awaiting_parts' | 'resolved' | 'closed' | 'cancelled';
type RequestStatus = 'open' | 'assigned' | 'in_progress' | 'awaiting_parts' | 'resolved' | 'closed' | 'cancelled';

export function computeRequestStatus(
  items: { status: ItemStatus }[],
  assignedToId: number | null,
  isCancelled: boolean,
): RequestStatus {
  if (isCancelled) return 'cancelled';

  const isTerminal = (s: ItemStatus) => s === 'closed' || s === 'cancelled';
  const isResolvedOrTerminal = (s: ItemStatus) =>
    s === 'resolved' || isTerminal(s);

  // All items closed or cancelled, with at least one closed → fully closed
  if (items.every(i => isTerminal(i.status)) && items.some(i => i.status === 'closed')) {
    return 'closed';
  }

  // All items in (resolved | closed | cancelled), with at least one still resolved → pending verification
  if (items.every(i => isResolvedOrTerminal(i.status)) && items.some(i => i.status === 'resolved')) {
    return 'resolved';
  }

  // Active work in progress beats waiting state
  if (items.some(i => i.status === 'in_progress')) return 'in_progress';

  // Blocked on parts (no active work)
  if (items.some(i => i.status === 'awaiting_parts')) return 'awaiting_parts';

  // Assigned but no item has progressed past 'open'
  if (assignedToId !== null) return 'assigned';

  return 'open';
}

// Helper: when does a status transition need approval before counting as "done"?
export function isPendingVerification(status: ItemStatus): boolean {
  return status === 'resolved';
}

// Helper: terminal-positive — workflow successfully concluded
export function isTerminalPositive(status: ItemStatus): boolean {
  return status === 'closed';
}
```

This is the ONE place the aggregate rule lives. All Server Actions that mutate items call this and write the result back to `request.status` inside the same transaction.

**State transition table (assert before mutation):**

```typescript
// lib/maintenance/transitions.ts
const ALLOWED_ITEM_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  open:           ['in_progress', 'cancelled'],
  in_progress:    ['awaiting_parts', 'resolved', 'cancelled'],
  awaiting_parts: ['in_progress', 'resolved', 'cancelled'],
  resolved:       ['closed', 'in_progress', 'cancelled'],  // 'in_progress' only via rejectItemResolution; 'closed' only via approveItemResolution
  closed:         ['in_progress'],                          // admin reopen only
  cancelled:      [],                                        // terminal
};

export function assertValidItemTransition(from: ItemStatus, to: ItemStatus): void {
  if (!ALLOWED_ITEM_TRANSITIONS[from].includes(to)) {
    throw new Error(`Illegal item transition: ${from} → ${to}`);
  }
}
```

**Modify `reportIssue` in `assets.ts`:**
- Keep existing signature for backward compat
- Internally call `createMaintenanceRequest` with default severity/category
- Eventually deprecate (Phase 3 will replace UI callers)

**Validation:**
- Vitest unit tests for each action covering: auth (✓/✗), Zod validation, RBAC, state-machine legality, transaction atomicity
- Coverage threshold: 70%+ per file (matches repo's vitest config thresholds)

**Commit candidates (~13):**
1. `feat(maintenance): add aggregate-status helper + transition table + types (incl. priority enum + tags)`
2. `feat(prisma): add soft-delete middleware for maintenance tables (auto-filter deletedAt)`
3. `feat(actions): add createMaintenanceRequest (multi-item, location, priority, tags, MIME validation, Telegram)`
4. `feat(actions): add assignMaintenanceRequest + updateMaintenanceItemStatus (incl. awaiting_parts)`
5. `feat(actions): add approveItemResolution + rejectItemResolution (reporter verification)`
6. `feat(actions): add cancelMaintenanceRequest + reopenMaintenanceRequest`
7. `feat(actions): add deleteMaintenanceRequest + restoreMaintenanceRequest (soft-delete)`
8. `feat(actions): add addMaintenanceNote + getMaintenanceRequest + getMaintenanceTags`
9. `feat(actions): add getMaintenanceStats with cost-by-dept + technician-productivity + tag filter`
10. `feat(notifications): add quick-action payload support (actions[] with deep-link hrefs)`
11. `feat(services): add telegramService.sendMaintenanceAlert (env-gated, no-op if unset)`
12. `feat(uploadthing): restrict maintenance photo route to safe MIME types (jpeg/png/webp/heic; reject SVG)`
13. `refactor(actions): wire legacy reportIssue through createMaintenanceRequest`

**PR target:** `main` (depends on Phase 1 PR being merged)

---

### Phase 3 — UI Components & Pages

**Goal:** Surface the new workflow to users.

**Branch:** `feat/maintenance-ui`

**New components (revised v3 — multi-item + awaiting_parts + approval flow + location):**
- `components/maintenance/RequestForm.tsx`
  - Props: `defaultItemIds?: number[]` (pre-fill when opened from `/inventory` or `/my-assets`), `open`, `onOpenChange`, `onSuccess`
  - Form fields:
    - **Items picker** (multi-select with chips; max 20) — combobox over `getInventoryItems` that's not already in an active request; pre-fills + locks if `defaultItemIds` is set
    - **Location** (v3) — Department combobox via `getDepartments()` Server Action, optional
    - title, description
    - **severity** (Select 4 options) — IMPACT axis with helper text "ผลกระทบต่อการใช้งาน"
    - **priority** (Select 4 options) — v4 NEW URGENCY axis with helper text "ความเร่งด่วนของการซ่อม"
    - category (Select)
    - **tags (TagInput)** — v5 NEW: max 10 chips, autocomplete from existing tags
    - photos (UploadThing button, max 5 × 4MB; **v5 accept list = jpeg/png/webp/heic** — SVG rejected at upload-route level with clear error toast)
    - estimatedCost (optional decimal)
  - Zod schema mirrored from `createMaintenanceRequest` Server Action
  - Uses `useTransition` for proper hydration handling
- `components/maintenance/RequestCard.tsx`
  - Props: `request: MaintenanceRequest & { items: ItemWithStatus[]; reportedBy; assignedTo; location? }`
  - Aggregate status badge (7 colors — including amber for `awaiting_parts`, blue-gray for `closed`), severity icon, assignee avatar, location chip
  - Item count summary: "3 items — 1 closed, 1 resolved (pending), 1 awaiting parts" with multi-segment progress bar
  - Quick actions for admin: Assign / Cancel; quick action for reporter: View (when items pending approval, show "verify" badge nudge)
- `components/maintenance/RequestItemRow.tsx` (NEW v2, expanded v3)
  - Per-item row inside the detail page
  - Props: `requestItem`, `currentUserRole`, `isReporter`, `isAssignee`
  - Per-item status badge (6 colors)
  - **Action buttons gated by current state + actor:**
    - assignee + status=open|awaiting_parts: "Start Work" → in_progress
    - assignee + status=in_progress: "Mark Awaiting Parts" / "Mark Resolved" (opens dialog) / "Cancel"
    - assignee + status=awaiting_parts: "Resume Work" / "Mark Resolved" (skip allowed) / "Cancel"
    - **reporter + status=resolved (v3): "Approve" → closed / "Reject" (opens RejectItemDialog)**
    - admin: all of the above + "Force Close" (admin override)
  - Show resolution + actualCost when status ∈ (resolved, closed); show rejectionReason if previously rejected
- `components/maintenance/StatusBadge.tsx` — atomic; `level: 'request' | 'item'` palette variant; v3 palette includes `awaiting_parts` (amber) and `closed` (blue-gray) entries
- `components/maintenance/SeverityIcon.tsx`
- `components/maintenance/AssigneeSelect.tsx` — combobox of users with `technician`/admin role
- `components/maintenance/DepartmentSelect.tsx` (NEW v3) — combobox over Department; reusable in RequestForm + dashboard filters
- `components/maintenance/PhotoGallery.tsx` — render `photoUrls` from JSON string (with lightbox)
- `components/maintenance/ResolveItemDialog.tsx` (NEW v2) — required `resolution` textarea + optional `actualCost`
- `components/maintenance/RejectItemDialog.tsx` (NEW v3) — required `reason` textarea; warns "this will send the work back to the technician" + previous rejection reasons (if any)
- `components/maintenance/CancelRequestDialog.tsx` (NEW v2) — required `reason`; warns if request has closed items
- `components/maintenance/MaintenanceStatsPanel.tsx` (NEW v3) — server-fetched stats render block; reused by both dashboard pages
- `components/maintenance/charts/StatusPieChart.tsx`, `SeverityBarChart.tsx`, `TrendLineChart.tsx`, `TopItemsTable.tsx` (NEW v3) — Recharts-based viz; thin wrappers
- `components/maintenance/charts/PriorityBarChart.tsx` (NEW v4) — second axis bar
- `components/maintenance/charts/CostByDepartmentChart.tsx` (NEW v4 Q14) — stacked bar (estimated vs actual) per department
- `components/maintenance/charts/TechnicianProductivityTable.tsx` (NEW v4 Q14) — sortable table with avg-resolve-time, count, total-cost columns
- `components/maintenance/PrintWorkOrder.tsx` (NEW v4 Q13) — printable layout component, used by /maintenance/[id]/print page
- `components/maintenance/TagInput.tsx` (NEW v5) — chip-based multi-input with autocomplete from `getMaintenanceTags()`; max 10 chips; client-side validation (length + alphanumeric+dash)
- `components/maintenance/TagFilterChips.tsx` (NEW v5) — read-only chip display + click-to-toggle for filter bar
- `components/maintenance/DeleteRequestDialog.tsx` (NEW v5) — admin-only; required `reason` textarea; warns "ผู้แจ้งจะได้รับแจ้งเตือน" with reason

**New pages:**
- `app/(dashboard)/maintenance/page.tsx` (rewrite)
  - Filter bar: status (request-level), severity, assignee (default for technician role: `assigned to me + status != closed`)
  - **v3:** add filter for "Items pending my approval" (reporter view) — surfaces requests where any item.status === 'resolved' and reporter === me
  - List of `RequestCard`
  - "+ New Request" button at top — opens RequestForm with empty item picker
- `app/(dashboard)/maintenance/[id]/page.tsx` (NEW v2)
  - Server Component (initial render) + client island for action panel
  - Header: title, severity, request-level status badge, reporter, assignee, **location chip (v3)**, photos
  - **Items section:** list of `RequestItemRow` — one per item in the batch with its own per-item status + action buttons
  - **Logs Timeline:** chronological list of `MaintenanceLog` showing item-level events (with item name) and request-level events (without) — visually grouped; **v3** highlights `item_approved`/`item_rejected`/`item_marked_awaiting_parts` with distinct icons
  - Action panel (gated by role + state):
    - Admin: Assign / Cancel (entire request) / Reopen (if closed)
    - Assignee: per-item buttons live on each `RequestItemRow` (incl. v3 awaiting_parts toggle)
    - **Reporter (v3):** Approve/Reject buttons live on each `RequestItemRow` for items in `resolved`; Cancel (request) within 1hr if not yet assigned
- `app/(dashboard)/reports/maintenance/page.tsx` (NEW v3 — option A for Q7)
  - Lives under existing /reports section
  - Filter bar (date range, severity, **priority** v4, category, location)
  - Renders `MaintenanceStatsPanel` (incl. v4 cost-by-dept + technician-productivity)
- `app/(dashboard)/maintenance/dashboard/page.tsx` (NEW v3 — option B for Q7)
  - Sub-route of /maintenance
  - Same filter bar + same `MaintenanceStatsPanel`
  - Tab navigation at top: "รายการ" (List) → /maintenance | "ภาพรวม" (Dashboard) → /maintenance/dashboard
  - **Q7 decision deadline:** smoke-test both for ~1 week after Phase 3 ships; cleanup commit removes the unchosen route. PRP section 7 has the validation checklist item.
- `app/(dashboard)/maintenance/[id]/print/page.tsx` (NEW v4 Q13)
  - Server Component, no chrome (overrides layout to a minimal print-only shell)
  - Renders `<PrintWorkOrder>` with all request fields including items table, photos, signature lines
  - "Print" button on /maintenance/[id] opens this in new tab; user triggers `window.print()` from inline button or browser shortcut
  - print.css styles: A4 layout, no nav/footer, page-break controls
- `app/(dashboard)/maintenance/page.tsx` v5 additions:
  - **Tags filter chips** in filter bar (multi-select, autocomplete from `getMaintenanceTags()`)
  - **"Show deleted"** toggle (admin-only — calls `getMaintenanceRequests({view:'deleted'})`); shows soft-deleted requests with "Restore" button
- `app/(dashboard)/maintenance/[id]/page.tsx` v5 additions:
  - Tags display row (chip list, read-only on detail page)
  - Admin-only "Delete" button that opens `DeleteRequestDialog`

**Modify existing:**
- `components/ui/inventory-card.tsx`
  - Add "Report Issue" menu item (kebab/dropdown) — opens RequestForm with `defaultItemIds=[item.id]`
  - Visible to any logged-in user (not just current holder)
- `app/(dashboard)/my-assets/page.tsx`
  - Replace `prompt()` in `handleReport` with RequestForm modal seeded with the asset id
- `app/(dashboard)/dashboard/page.tsx`
  - Add a "Pending verification" widget showing reporter's items in `resolved` state (v3) — link straight to that request detail page
- `lib/i18n/messages.ts`
  - Add Thai+English keys for:
    - severity (low/medium/high/critical)
    - category (electrical/mechanical/software/physical/other)
    - **request status (open/assigned/in_progress/awaiting_parts/resolved/closed/cancelled)** — v3 expanded to 7
    - **item status (open/in_progress/awaiting_parts/resolved/closed/cancelled)** — v3 expanded to 6
    - action labels (assign/start-work/mark-awaiting-parts/resume-work/mark-resolved/approve/reject/cancel-item/cancel-request/reopen/add-note)
    - form labels (title/description/items/location/photos/estimated-cost/actual-cost/resolution/cancel-reason/rejection-reason)
    - dashboard labels (total-requests/avg-resolve-time/top-items/cost-summary/trend-by-day)
    - empty-states (no requests / no items in batch / no pending verification)
  - **`closed` label** = "ปิดงาน" / "Closed" (per Q9 v3 decision)
  - **`awaiting_parts` label** = "รออะไหล่" / "Awaiting Parts"

**Validation:**
- Manual UI smoke check (start dev server, walk through report → assign → resolve flow)
- Vitest component tests for RequestForm (render, validation, submit)
- TypeScript compiles cleanly
- All new strings have both TH and EN translations

**Commit candidates (~16):**
1. `feat(ui): add atomic maintenance components (StatusBadge, SeverityIcon, PhotoGallery, DepartmentSelect)`
2. `feat(ui): add TagInput + TagFilterChips with autocomplete from getMaintenanceTags`
3. `feat(ui): add RequestForm with multi-item picker + Dept + severity + priority + tags + UploadThing (MIME-restricted)`
4. `feat(ui): add RequestCard with aggregate status (7 states) + priority badge + tags chips + item-count summary`
5. `feat(ui): add RequestItemRow with awaiting_parts buttons + Resolve/Reject/Cancel/Delete dialogs`
6. `feat(ui): rewrite /maintenance list page with filters incl. tags + "pending my approval" + admin "show deleted"`
7. `feat(ui): add /maintenance/[id] detail page with per-item actions, approve/reject UI, log timeline, Print + Delete buttons`
8. `feat(ui): add MaintenanceStatsPanel + base chart components (Status, Severity, Trend, TopItems)`
9. `feat(ui): add v4 dashboard charts (Priority, CostByDepartment, TechnicianProductivity)`
10. `feat(ui): add /reports/maintenance and /maintenance/dashboard pages (both — comparison TBD)`
11. `feat(ui): add /maintenance/[id]/print route + PrintWorkOrder component + print.css`
12. `feat(ui): add "Pending verification" widget to /dashboard for reporters`
13. `feat(ui): extend NotificationBell with quick-action buttons (deep-link hrefs)`
14. `refactor(ui): wire Report Issue button on inventory cards + my-assets to RequestForm`
15. `chore(i18n): add maintenance workflow translations (TH+EN, statuses + priority + actions + tags + delete)`
16. `chore(i18n): add Thai translations for v5 features (tags, soft-delete, watch, activity)`

**PR target:** `main` (depends on Phase 1+2 PRs)

---

### Phase 4 — RBAC, Tests, E2E

**Goal:** Lock down permissions, add automated coverage, validate full flow end-to-end.

**Branch:** `feat/maintenance-tests-rbac`

**Files:**
- `frontend/next-app/lib/proxy-authorize.ts` — add `/maintenance/[id]` patterns if needed
- `backend/prisma/seed.ts` — ensure `technician` role has `/maintenance` and `/maintenance/[id]` access
- `frontend/next-app/tests/actions/maintenance.test.ts` (NEW or extend)
  - Test all 7 new Server Actions with: auth pass/fail, RBAC enforce, Zod validation reject, valid state transitions, illegal state transitions
- `frontend/next-app/tests/integration/proxy-rbac.test.ts` — add cases for `/maintenance/[id]`
- `frontend/next-app/tests/e2e/golden/09-maintenance-workflow.spec.ts` (NEW)
  - **Avoid the round 7-12 patterns:**
    - Use `waitUntil: 'networkidle'` after every navigation
    - Use the `clickAndWaitForServerAction` helper extracted to `tests/e2e/fixtures/server-actions.ts`
    - No vacuous assertions (every "the action did X" must verify X via UI state OR network response)
  - Spec outline (multi-item happy path with awaiting_parts + reporter approval):
    1. user logs in → /inventory → click kebab on first item → "Report Issue" → RequestForm opens
    2. in RequestForm, **add a second item** via items picker → **select Department in Location dropdown** (v3) → fill title/desc/severity=high → submit
    3. assert success toast, request appears in user's "My Reports" list with `2 items` count + location chip visible
    4. admin logs in → /maintenance → see new request → click Assign → pick technician
    5. technician logs in → /maintenance → filter "assigned to me" → click into detail
    6. technician → on item #1 row → "Start Work" → assert per-item badge `in_progress`, request aggregate `in_progress`
    7. **(v3 awaiting_parts)** technician → on item #1 → "Mark Awaiting Parts" → assert per-item badge `awaiting_parts` (amber); request aggregate **still** `in_progress` (item #2 priority not yet started)
    8. technician → on item #1 → "Resume Work" → back to `in_progress`
    9. technician → on item #1 → "Mark Resolved" → ResolveItemDialog opens → fill resolution + actualCost → submit → per-item badge `resolved`; request aggregate **still** `in_progress`
    10. **(v3 reporter notify)** assert reporter has notification: "Item #1 ready for verification"
    11. **(v3 approve)** user (reporter) → /maintenance → filter "pending my approval" → click detail → on item #1 → "Approve" → confirms → per-item badge `closed`; request aggregate **still** `in_progress` (item #2 untouched)
    12. technician → on item #2 → "Start Work" → "Mark Resolved" (skip awaiting_parts) → fill resolution → submit
    13. **(v3 reject)** user (reporter) → on item #2 → "Reject" → RejectItemDialog opens → enter reason → submit → per-item badge back to `in_progress`; **assignee gets notification** with rejection reason
    14. technician → re-fix item #2 → "Mark Resolved" → fill new resolution → submit
    15. user → on item #2 → "Approve" → per-item `closed` → request aggregate flips to `closed`, `closedAt` shown
    16. user re-checks /my-assets → both items back to available (synced after `closed`, not after `resolved` — verify this distinction)
    17. auditor → /logs → entries present in chronological order: `created` → `assigned` → `item_marked_awaiting_parts` → `item_resumed_work` → `item_resolved`(×2) → `item_approved`(×1) → `item_rejected`(×1) → `item_resolved`(×1) → `item_approved`(×1) → `request_closed`
  - Negative specs (separate tests):
    18. cancel test: reporter creates request → immediately Cancel within 1hr → succeeds; second reporter creates → mock clock past 1hr → Cancel attempt → fails with 403; admin can cancel anytime → succeeds
    19. reopen test: admin reopens a `closed` request → request.status `in_progress`, all `closed` items revert to `in_progress`, `closedAt` and `resolvedAt` cleared
    20. **(v3 illegal transition)** technician tries to set item from `closed` to `in_progress` directly via API → Server Action rejects (admin-only via reopen) → assert 403 + log entry NOT created
    21. **(v4 priority)** create request with priority='urgent' → assert priority badge displays SEPARATELY from severity badge in RequestCard + detail page header
    22. **(v4 print)** click "Print" button on detail page → opens /maintenance/[id]/print in new tab → assert print-only layout (no nav/header/footer); items table all rows; signature lines present
    23. **(v4 quick-action)** create high-severity request → admin notification has "View" action button → click → navigates to detail. On reporter's resolve notification, "Approve" action opens approve confirm dialog directly.
    24. **(v4 stats)** open /reports/maintenance after the workflow → cost-by-department chart renders with non-zero data; technician productivity table shows the assignee's avg-resolve-time
    25. **(v5 tags)** create request with tags `['warranty', 'vip']` → assert chips render in RequestCard + detail page; filter by tag `warranty` → only this request appears in list
    26. **(v5 MIME)** attempt to upload SVG file in RequestForm → UploadThing rejects with clear error toast; non-SVG image (jpeg) succeeds
    27. **(v5 soft-delete)** admin → request detail → "Delete" → DeleteRequestDialog with reason → submit → request disappears from default /maintenance list; reporter receives notification with reason; admin "Show deleted" view toggle reveals it; "Restore" returns it to active list
    28. **(v5 middleware)** technician runs `getMaintenanceRequests()` after admin deletes a request → does NOT see deleted entry (verified via Prisma middleware filter)
    29. **(v6 optimistic lock)** Vitest unit test (not E2E) — call `updateMaintenanceItemStatus` twice with same `expectedVersion` (simulating 2 concurrent technicians); first succeeds, second throws `OptimisticLockError`; item.version increments by exactly 1
    30. **(v6 legacy repairNotes)** seed an InventoryItem with `repairNotes='replaced battery 2025-12-01'` and NO MaintenanceRequest references; load /inventory/[id] → assert "Legacy repair note" block renders the value

**Validation:**
- `npm test` (Vitest) passes in `frontend/next-app/`
- `npx playwright test tests/e2e/golden/09-maintenance-workflow.spec.ts` passes locally (chromium AND Mobile Chrome)
- CI green on the PR

**Commit candidates (~5):**
1. `feat(rbac): add /maintenance/[id]/print + /reports/maintenance route gating + technician permissions`
2. `test(actions): add unit tests for all 13 maintenance Server Actions (incl. priority, Telegram, tags, soft-delete)`
3. `test(prisma): add unit tests for soft-delete middleware (filter active/deleted/explicit-bypass paths)`
4. `test(e2e): add golden 09 — maintenance request lifecycle (28-step incl. v4 priority/print/quick-action + v5 tags/MIME/soft-delete)`
5. `test(actions): add unit tests for telegramService.sendMaintenanceAlert (env-gated paths)`

**PR target:** `main` (depends on Phase 1+2+3 PRs)

---

### Phase 5 — Workflow Automation (`feat/maintenance-automation`) — v4 NEW

**Goal:** Reduce manual triage overhead by auto-routing requests to the right technician + escalating stalled requests to admins. Smaller in scope than Phase 3, but introduces the project's first scheduled background job for maintenance.

**Branch:** `feat/maintenance-automation`

**Files:**
- `backend/prisma/schema.prisma` — add `CategoryAssigneeRule` model (already designed in Phase 1 schema notes; lands here for delivery)
- `frontend/next-app/lib/actions/category-rules.ts` (NEW)
- `frontend/next-app/lib/actions/maintenance.ts` — modify `createMaintenanceRequest` to consult rule lookup
- `frontend/next-app/app/(dashboard)/settings/maintenance-rules/page.tsx` (NEW)
- `frontend/next-app/components/settings/CategoryRuleManager.tsx` (NEW)
- `backend/src/jobs/maintenanceEscalation.ts` (NEW) — BullMQ job
- `backend/src/queues/maintenanceQueue.ts` (NEW or extend existing pattern in `queues/`)
- `backend/src/services/telegramService.ts` (extend if needed) — `sendEscalationAlert(request)` method

**New Server Actions (4):**

```typescript
getCategoryRules(): Promise<ActionResult<CategoryAssigneeRule[]>>
// Auth: admin | superadmin
// Returns all rules (incl. disabled) ordered by category, priority desc

setCategoryRule(input: {
  id?: number;                  // omit = create; provide = update
  category: string;
  assigneeUserId: number;
  priority?: number;            // default 0
  enabled?: boolean;
}): Promise<ActionResult<CategoryAssigneeRule>>
// Auth: admin | superadmin
// Validates: assigneeUserId has technician/admin role; (category, assigneeUserId) unique enough
// Side effects: upsert + log

deleteCategoryRule(id: number): Promise<ActionResult>
// Auth: admin | superadmin
// Soft-disable instead of hard delete (audit retention)

testAutoAssignment(category: string): Promise<ActionResult<{
  matchedRule: CategoryAssigneeRule | null;
  resolvedAssignee: User | null;
}>>
// Admin tooling — preview which assignee would be picked for a given category
```

**Modified `createMaintenanceRequest`:**
- After insert, look up first `CategoryAssigneeRule` where `category === input.category AND enabled = true ORDER BY priority DESC LIMIT 1`
- If found, set `assignedToId`, `assignedAt`, `status='assigned'` in the same `$transaction`
- Insert log `(action='assigned', notes='auto-assigned via CategoryAssigneeRule')`

**BullMQ escalation job:**
- Cron: hourly (configurable via env `MAINTENANCE_ESCALATION_CRON`)
- Query: `SELECT * FROM MaintenanceRequest WHERE assignedToId IS NOT NULL AND status = 'open' AND assignedAt < (NOW() - INTERVAL '24 hours') AND escalatedAt IS NULL`
- For each match (transaction):
  - Update `escalatedAt = now()`
  - Insert log `(action='escalated', notes='auto-escalated: assignee inactive >24hr')`
  - Send in-app notification to admin/superadmin with quick-action `[{label: 'Reassign', href: '/maintenance/${id}'}]`
  - If `TELEGRAM_BOT_TOKEN` env present: `telegramService.sendEscalationAlert(request)`
- Idempotent via `escalatedAt IS NULL` guard — re-running same hour cannot double-notify

**New page `/settings/maintenance-rules`:**
- Admin/superadmin only
- Table of existing rules: category, assignee (avatar+name), priority, enabled toggle, edit/delete actions
- "Add Rule" modal opens `CategoryRuleManager` form
- "Test" sandbox: pick a category dropdown → shows resolved assignee preview

**RBAC:**
- Add `/settings/maintenance-rules` to `PROTECTED_MODULES`
- Legacy fallback: superadmin + admin only
- Seed `RolePermission` accordingly

**Tests:**
- Vitest unit tests for 4 new Server Actions
- Vitest test for BullMQ escalation logic (mock the queue)
- Playwright E2E `tests/e2e/golden/10-maintenance-automation.spec.ts` (NEW):
  1. admin → /settings/maintenance-rules → create rule "electrical" → @tech-electrical
  2. user → create request with category=electrical → auto-assigned (assert RequestCard shows tech name immediately)
  3. mock clock past 24hr → trigger escalation job manually → assert admin notification + log entry `escalated` + `escalatedAt` set
  4. trigger again — assert no double-notify (idempotent)

**Validation:**
- All Vitest tests pass
- E2E golden 10 passes
- BullMQ worker is registered correctly in `backend/src/index.ts`
- `MAINTENANCE_ESCALATION_CRON` documented in `.env.example`

**Commit candidates (~6):**
1. `feat(schema): add CategoryAssigneeRule model + Prisma client regen`
2. `feat(actions): add getCategoryRules + setCategoryRule + deleteCategoryRule + testAutoAssignment`
3. `feat(actions): wire createMaintenanceRequest to consult CategoryAssigneeRule on insert`
4. `feat(ui): add /settings/maintenance-rules page + CategoryRuleManager component`
5. `feat(jobs): add maintenance-escalation BullMQ cron + telegramService.sendEscalationAlert`
6. `test(automation): add Vitest + Playwright golden 10 (auto-assign + escalation)`

**PR target:** `main` (depends on Phase 1-4 PRs)

---

### Phase 6 — Engagement & Visibility (`feat/maintenance-engagement`) — v5 NEW

**Goal:** Allow stakeholders beyond reporter/assignee to follow request progress (watch subscriptions); surface user activity history for performance review and accountability (activity feed). Smaller in scope than Phase 3 but introduces fan-out notification logic.

**Branch:** `feat/maintenance-engagement`

**Files:**
- `backend/prisma/schema.prisma` — add `MaintenanceRequestWatcher` model (designed in Phase 1 schema notes)
- `frontend/next-app/lib/actions/maintenance-watchers.ts` (NEW)
- `frontend/next-app/lib/actions/maintenance.ts` — modify all 6 state-change actions to fan-out notifications
- `frontend/next-app/lib/actions/user-activity.ts` (NEW)
- `frontend/next-app/app/(dashboard)/users/[id]/activity/page.tsx` (NEW)
- `frontend/next-app/app/(dashboard)/maintenance/watched/page.tsx` (NEW) — quick filter for "my watched"
- `frontend/next-app/components/maintenance/WatchButton.tsx` (NEW)
- `frontend/next-app/components/users/ActivityFeed.tsx` (NEW)
- `frontend/next-app/components/users/ActivityFilterBar.tsx` (NEW)

**4 New Server Actions:**

```typescript
watchRequest(requestId: number): Promise<ActionResult>
// Auth: any logged-in user
// Validates: request exists, not already watched (idempotent — return success if already watching)
// Side effects:
//   - INSERT INTO MaintenanceRequestWatcher (userId, requestId)
//   - revalidatePath(`/maintenance/${id}`, '/maintenance/watched')

unwatchRequest(requestId: number): Promise<ActionResult>
// Auth: any logged-in user
// Idempotent — return success even if not currently watching

getMyWatchedRequests(): Promise<ActionResult<Array<MaintenanceRequest & { items, reportedBy, assignedTo }>>>
// Auth: any logged-in user
// Returns active (non-deleted, non-cancelled) watched requests for current user

getUserActivity(userId: number, filters?: {
  actionType?: string;        // filter by MaintenanceLog.action
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;             // default 50
  offset?: number;
}): Promise<ActionResult<Array<MaintenanceLog & {
  request: Pick<MaintenanceRequest, 'id' | 'title' | 'status'>;
  item?: Pick<InventoryItem, 'name'>;
}>>>
// Auth: own profile (any user) | admin/superadmin/auditor (any user)
// Joins MaintenanceLog → MaintenanceRequest → optional InventoryItem
// Ordered by createdAt DESC
```

**Modified state-change Server Actions (fan-out to watchers):**
- `assignMaintenanceRequest`: notify watchers "Request #X assigned to <name>"
- `updateMaintenanceItemStatus`: notify watchers "Item #Y in Request #X marked <status>"
- `approveItemResolution`: notify watchers "Item #Y approved by reporter"
- `rejectItemResolution`: notify watchers "Item #Y rejected: <reason>"
- `cancelMaintenanceRequest`: notify watchers "Request #X cancelled: <reason>"
- `reopenMaintenanceRequest`: notify watchers "Request #X reopened by admin"

**Fan-out implementation pattern:**
- Inside the same `$transaction` as the state mutation, query `MaintenanceRequestWatcher` for the request
- For each watcher (excluding the actor `session.user.id`): enqueue one notification with quick-action `[{label:'View',href:'/maintenance/${id}'}]`
- If watcher count >50, enqueue a single batch job via BullMQ (`maintenance-watcher-fanout` queue) instead of N inline inserts — avoids long transaction
- Performance: indexed via `@@index([requestId])` on watcher table

**New pages:**
- `/maintenance/watched` — list of user's watched requests (RequestCard list, no filter bar)
- `/users/[id]/activity` — chronological feed:
  - Activity card per `MaintenanceLog`: action icon, "User did X on Request #Y", item name (if itemId), timestamp
  - Filter bar: action type multi-select, date range picker, "load more" pagination
  - Header: user info, summary stats (total actions in period, by category)

**WatchButton on detail page:**
- Toggle: outlined "Watch" / filled "Watching" (with count of total watchers)
- Click triggers `watchRequest`/`unwatchRequest` via `clickAndWaitForServerAction`-style pattern
- Visible to any logged-in user

**Tests:**
- Vitest unit for 4 new Server Actions
- Vitest test for fan-out logic (mock watchers, assert notifications enqueued correctly, actor excluded)
- Vitest test for soft-delete interaction (deleted requests don't fan-out)
- Playwright E2E `tests/e2e/golden/11-maintenance-engagement.spec.ts` (NEW):
  1. user A creates request → user B watches → user A logs in as approver and assigns → assert user B receives notification
  2. user A → /users/me/activity → assert "created" entry visible
  3. user A → /users/userB/activity (as admin) → assert allowed; (as plain user) → assert 403
  4. user B → /maintenance/watched → request appears; click "Unwatch" → request disappears

**Validation:**
- All Vitest tests pass
- E2E golden 11 passes
- Manual smoke: 3 watchers on a request → all receive notifications on each state change; actor excluded

**Commit candidates (~5):**
1. `feat(schema): add MaintenanceRequestWatcher model + reverse relations`
2. `feat(actions): add watchRequest + unwatchRequest + getMyWatchedRequests`
3. `feat(actions): fan-out watcher notifications from all state-change Server Actions`
4. `feat(actions): add getUserActivity for profile activity feed`
5. `feat(ui): add WatchButton + /maintenance/watched + ActivityFeed + /users/[id]/activity`
6. `test(engagement): add Vitest + Playwright golden 11 (watch + activity feed)`

**PR target:** `main` (depends on Phase 1-5 PRs)

---

## 5) PR Strategy

| PR | Branch | Phase | Depends on | Estimated diff (v5) |
|----|--------|-------|-----------|---------------------|
| #1 | `feat/maintenance-schema` | 1 | none | small (~300 lines) — 3 tables + Department FK + priority + tags + deletedAt + timestamps |
| #2 | `feat/maintenance-actions` | 2 | PR #1 | xlarge (~1500 lines) — 13 actions + Prisma soft-delete middleware + Telegram + notification quick-actions + UploadThing MIME |
| #3 | `feat/maintenance-ui` | 3 | PR #1+2 | xxlarge (~3100 lines) — 2 dashboards + reject + approval + print + priority + 3 charts + tags + delete view |
| #4 | `feat/maintenance-tests-rbac` | 4 | PR #1+2+3 | xlarge (~1700 lines) — 28-step E2E + soft-delete middleware tests + tags/MIME |
| #5 | `feat/maintenance-automation` | 5 | PR #1-4 | medium (~700 lines) — auto-assign rules + escalation cron + admin settings page |
| **#6** | **`feat/maintenance-engagement`** | **6** | PR #1-5 | medium (~900 lines) — watcher table + 4 actions + fan-out from state changes + WatchButton + activity feed page |

**Rationale for splitting:**
- Phase 1 is reviewable on its own (schema is well-bounded). Reviewers can validate model design without wading through UI.
- Phase 2 makes the new tables usable but invisible — easy to review for correctness in isolation.
- Phase 3 is the largest change (UI) but depends on stable backend.
- Phase 4 closes the loop with tests + RBAC, which are easier to review when the implementation is stable.

**Each PR should:**
- Pass full CI before merge
- Follow `[Claude]` commit prefix convention used in this repo
- Update CLAUDE.md "Recent Notable Work" section in the final PR (#4) summarizing the feature

---

## 6) Risks & Open Questions

### Risks

1. **Hydration race in new buttons** — RequestForm modal trigger and assign/status buttons in `/maintenance` are all Client Components with `onClick` handlers. Apply the `clickAndWaitForServerAction` pattern from PR #14 round 12 in E2E to avoid the same flake.
2. **TiDB schema parity** — `MaintenanceRequest.photos` as JSON string works in both SQLite and MySQL but no native validation; consider adding a Zod parse in Server Actions when reading.
3. **Backward-compat sync drift** — the rule "active request status drives `inventoryItem.status`" must be enforced consistently in every status-change Server Action; missing one path leaves UI inconsistent.
4. **Existing `inventoryItem.repairNotes` becomes vestigial** — kept for backward compat but new code should not write to it. Add a code comment marking it `@deprecated`.

### Decisions (confirmed by user 2026-05-09)

**v2 round (15:38):**
1. **Severity SLA → YES.** `critical` and `high` severity trigger an in-app notification to admin/superadmin via the existing `notificationService` immediately on request creation. `medium`/`low` rely on dashboard view.
2. **Photo upload limits → 5 photos × 4MB each.** Configure in UploadThing route definition.
3. **Cancel rights → reporter within 1 hour + admin anytime.** Server Action enforces window via `(Date.now() - createdAt) < 3600_000` for non-admins.
4. **Reopen → YES, admin only.** Allow `closed → in_progress` transition gated by admin role; logs as `action='reopened'` in `MaintenanceLog`. (Updated in v3: now reopens from `closed`, not `resolved`.)
5. **Multi-item → YES, batch with per-item status.** One request can target N items via `MaintenanceRequestItem` join table. Each item has its own status; request-level status is aggregated (`closed` only when all items closed; `in_progress` if any item is in_progress; etc.). See revised schema in Phase 1.

**v3 round (16:00):**
6. **Location field → Department FK.** Add `locationId Int?` on `MaintenanceRequest` referencing existing `Department` table. Form uses dropdown over `Department.findMany()`. Optional (some requests are inherently location-agnostic, e.g. laptop checked out to remote staff).
7. **Reports/Dashboard → ship BOTH routes.** Build `/reports/maintenance` AND `/maintenance/dashboard` with identical content; ship both in Phase 3, then user smoke-tests for ~1 week. Pick the survivor; remove the loser in a cleanup commit. (See PRP section 7 for the decision deadline.)
8. **`awaiting_parts` state → YES, between in_progress and resolved.** Item-level state added; allowed transitions: `in_progress ↔ awaiting_parts` (toggle), `awaiting_parts → resolved` (skip allowed — short repairs don't need to bounce back through in_progress), `awaiting_parts → cancelled`. Visually distinct (amber/yellow badge) to signal "blocked, not idle".
9. **Reporter approval before close → YES.** New terminal state `closed` (code) / "ปิดงาน" / "Closed" (label). Workflow: `tech marks resolved` → notification to reporter → `reporter approves` → `closed` OR `reporter rejects with reason` → back to `in_progress`. Reporter can also cancel before approving if request is invalid. Internal status code uses `closed` (industry convention, symmetric with `cancelled`); user-facing label uses "ปิดงาน"/"Closed".

**v4 round (16:30) — Bucket A integrations into Phases 1-4:**
10. **`priority` separate from `severity`.** Two-axis triage: `severity` ∈ low/medium/high/critical = "ผลกระทบ/blast radius" (data loss, safety, # users affected); `priority` ∈ low/normal/high/urgent = "ความเร่งด่วน/time pressure" (deadline, business impact). UI shows both as separate selects; technician dashboard sortable by either; severity drives Telegram alert (Q11), priority drives escalation timer (Q14).
11. **Telegram alert for `critical` requests.** Reuse existing `TELEGRAM_BOT_TOKEN` env var + `TELEGRAM_ADMIN_CHAT_ID`. Server-side notification path: on `createMaintenanceRequest` with `severity === 'critical'` → POST to Telegram bot API with request title/description/reporter/items list. Falls back gracefully if env vars unset (no error, just skipped).
12. **Quick-action from notification.** Notification payload includes `actions[]` (e.g. `[{label: 'Approve', href: '/maintenance/123?approve=item-7'}, {label: 'View', href: '/maintenance/123'}]`). NotificationBell component renders inline action buttons; clicking action navigates to detail page with query param that auto-opens the relevant dialog. No new Server Actions — actions are deep links into existing UI flows.
13. **Print work order page.** New route `/maintenance/[id]/print` — Server Component, no chrome (no nav/header/footer), `print.css`-style layout. Fields: header (title, request#, severity, priority, location, reporter, assignee, createdAt), items table (name, serial, status, resolution), photos thumbnails, signature lines (assignee, approver). Browser-driven print via `window.print()` from a "Print" button on detail page.
14. **Cost report by department + Technician productivity.** Extend `getMaintenanceStats` aggregation: (a) `costByDepartment` — sum actualCost grouped by request.locationId; (b) `technicianProductivity` — for each assignee, count of resolved requests + average time-to-resolve + average time-to-close. Two new chart components in StatsPanel.

**v4 Phase 5 (Bucket B — Workflow Automation):**
15. **Auto-assign by category.** New `CategoryAssigneeRule` table (`id, category, assigneeUserId, priority`). When `createMaintenanceRequest` runs, look up first matching rule and pre-set `assignedToId`. Admin manages rules at `/settings/maintenance-rules` (new page).
16. **Escalation cron (>24hr).** BullMQ scheduled job (`maintenance-escalation`) runs hourly. Finds requests where `assignedToId IS NOT NULL AND status === 'open' AND now() - assignedAt > 24hr`. For each: notify admin in-app + Telegram (if env present) + log entry (action='escalated'). Re-poll without re-notifying ones already escalated (idempotent via log lookup).

**v6 round (19:15) — engineering-quality additions (no new features):**
22. **Migration decision for existing `inventoryItem.repairNotes` data → CLEAN BREAK.** Existing values stay on the column as legacy data; new flow does not migrate them into MaintenanceRequest entities. Rationale: backfilling would invent fake reporters/timestamps/severities; risk of corrupted history. UI handles legacy by: detail page on inventory item shows "Legacy repair note (pre-migration): ..." block when `repairNotes IS NOT NULL` and no MaintenanceRequest references that item yet. No data migration script needed in Phase 1.
23. **Optimistic locking for item state transitions.** Add `version Int @default(0)` to `MaintenanceRequestItem` schema. State-mutating Server Actions (`updateMaintenanceItemStatus`, `approveItemResolution`, `rejectItemResolution`) accept `expectedVersion: number` from caller and verify match before mutation; on mismatch throw `OptimisticLockError` (UI shows "This item was updated by someone else; please refresh"). Each successful mutation increments `version`. Pattern prevents lost-update bug when 2 technicians act on same item concurrently.

**v5 round (18:50) — Bucket A integrations into Phases 1-4:**
17. **`tags` field — free-form labels.** Add `tags String?` (JSON array of strings, max 10 tags per request, each ≤32 chars). Distinct from `category` (5-enum, mandatory triage axis): tags are optional free-form labels for cross-cutting attributes like `warranty`, `outsourced`, `vip`, `recurring-issue`. Filter on /maintenance list page via chip multi-select (autocomplete from existing tag set across all requests).
18. **Photo MIME validation.** Restrict UploadThing route accept list to `image/jpeg | image/png | image/webp | image/heic`; reject SVG (XSS vector via embedded scripts). Add Zod refinement on `createMaintenanceRequest.photoUrls` to verify URLs match UploadThing CDN domain (not arbitrary externals). Server Action also re-validates Content-Type via HEAD request on first photo (defensive — UploadThing config could change).
19. **Soft-delete via Prisma middleware.** Add `deletedAt DateTime?` to `MaintenanceRequest` AND `MaintenanceRequestItem`. Implement `prisma.$use((params, next) => { ... })` middleware that injects `WHERE deletedAt IS NULL` on every `find*` operation by default. Server Actions:
    - `deleteMaintenanceRequest(id, reason)` (admin only) — sets `deletedAt`, cascades to items, logs `action='deleted'`
    - `restoreMaintenanceRequest(id)` (admin only) — clears `deletedAt`, cascades, logs `action='restored'`
    - Admin "Deleted Requests" view at `/maintenance?view=deleted` bypasses middleware via explicit `prisma.$queryRaw` or middleware skip flag

**v5 Phase 6 (NEW — Engagement & Visibility):**
20. **Watch subscription.** Any logged-in user can "watch" a request via Watch button on detail page. New `MaintenanceRequestWatcher` table (`userId, requestId, createdAt; @@unique([userId, requestId])`). Watchers receive in-app notifications on every state change (assigned, item_resolved, item_approved, item_rejected, cancelled, closed, reopened). Server Actions: `watchRequest(reqId)`, `unwatchRequest(reqId)`, `getMyWatchedRequests()`. Modify all 6 state-change Server Actions to fan-out notifications to watchers (excludes the actor themselves to avoid self-notification noise). Performance: indexed lookup; if watchers >50, enqueue notification batch via BullMQ.
21. **Activity feed on user profile.** New page `/users/[id]/activity` shows chronological feed of every `MaintenanceLog` entry where `userId === pageUserId`. Filterable by action type (created/assigned/resolved/etc.) and date range. Useful for performance review (manager sees their report's contribution) and accountability audit. Server Action `getUserActivity(userId, filters?)` joins MaintenanceLog → MaintenanceRequest → MaintenanceRequestItem for context. Auth: any logged-in user can view their own; admin/superadmin can view anyone; auditor can view all.

**State machine summary (item-level, v3):**
```
            ┌─────────────────────────────────────────────────────┐
            │                                                     │
   open ──→ in_progress ←→ awaiting_parts ──→ resolved ──→ closed │
    │           │                │              │                 │
    │           │                │              │ (reject+reason) │
    └───────────┴────────────────┴──────→ cancelled                │
                                                ↑                 │
                                       (reopen by admin)──────────┘
```

| State | Who can move | Who can move OUT | Notes |
|-------|--------------|------------------|-------|
| `open` | system (on create) | assignee/admin | Initial |
| `in_progress` | assignee | assignee/admin | Active work |
| `awaiting_parts` | assignee | assignee | Blocked (waiting on supply); still "active" perceptually |
| `resolved` | assignee | reporter (approve→closed; reject→in_progress) / admin | Pending verification |
| `closed` | reporter (approve) / admin (force) | admin (reopen→in_progress) | Terminal positive |
| `cancelled` | reporter (≤1hr) / admin | admin (reopen→in_progress) | Terminal negative |

---

## 7) Validation Checklist

Before marking the entire feature complete:

- [ ] All 4 PRs merged to `main`
- [ ] `npx prisma migrate dev` runs cleanly on a fresh DB
- [ ] TiDB schema transform validates without warnings
- [ ] All Vitest tests pass with ≥70% coverage on new files
- [ ] Playwright golden 09 spec passes on chromium AND Mobile Chrome (at least 9/10 runs)
- [ ] Manual smoke test: report → assign → in_progress → awaiting_parts → resolved → approved (closed) flow completed by **4 different roles** (reporter, assignee/technician, admin, auditor)
- [ ] **(v3)** Reject → re-resolve → approve loop tested manually
- [ ] **(v3)** Notification arrives for reporter on `resolved`, for assignee on `rejected`
- [ ] **(v3) Q7 deadline:** ~1 week after Phase 3 ships, decide whether `/reports/maintenance` or `/maintenance/dashboard` survives; cleanup commit removes loser
- [ ] **(v4)** `priority` and `severity` displayed as separate badges throughout UI
- [ ] **(v4)** Telegram alert fires on critical request (verified with TELEGRAM_BOT_TOKEN set + actual chat ID); silent no-op when env unset
- [ ] **(v4)** Print work order renders cleanly on A4 portrait (manual browser print preview check)
- [ ] **(v4)** NotificationBell shows quick-action buttons that deep-link to detail page + auto-open dialogs
- [ ] **(v4)** Cost-by-department + technician-productivity charts render with seeded data
- [ ] **(v4 Phase 5)** Auto-assign rule applied on createMaintenanceRequest (verify via UI + log entry)
- [ ] **(v4 Phase 5)** Escalation cron triggers admin notification at 24hr; idempotent on re-run
- [ ] **(v4 Phase 5)** `/settings/maintenance-rules` admin page CRUD + "Test" preview works
- [ ] **(v5)** Tags create + filter + autocomplete works
- [ ] **(v5)** Photo MIME — SVG rejected, jpeg/png/webp/heic accepted with clear toast on rejection
- [ ] **(v5)** Soft-delete — admin deletes invisible by default; "Show deleted" reveals; Restore works; reporter notified with reason
- [ ] **(v5)** Prisma soft-delete middleware — verified with delete-then-query test (no leak)
- [ ] **(v5 Phase 6)** Watch subscription — fan-out notifications on every state change; actor self-excluded
- [ ] **(v5 Phase 6)** Activity feed `/users/me/activity` shows own actions; admin/auditor view others; plain user 403 on others
- [ ] **(v5 Phase 6)** Fan-out batching — watchers >50 enqueued via BullMQ instead of inline (load test)
- [ ] **(v6)** Optimistic lock — concurrent updates trigger `OptimisticLockError`; UI handles gracefully with refresh prompt
- [ ] **(v6)** Legacy `repairNotes` displayed on inventory item detail when present
- [ ] No regressions in existing maintenance dashboard (current `getMaintenanceItems` users still work)
- [ ] CLAUDE.md updated with new feature summary
- [ ] Memory updated: feedback `feedback_maintenance_workflow_design.md` if any non-obvious decision was made

---

## 8) Resume Instructions for Next Session

Whoever picks this up next (likely me/Claude or the user):

1. Read this PRP completely first.
2. Check current git state: are any of the 4 branches already started? (`git branch -a | grep maintenance`)
3. Check whether PR #14 changes (the multi-AI E2E debugging) introduced anything that affects this plan — particularly look for new content in `tests/e2e/fixtures/`.
4. Start with **Phase 1** (schema). It's the smallest and most well-bounded, and it unblocks every later phase.
5. Update this PRP's "Status" line at the top as phases complete: `IN PROGRESS — Phase X` → `COMPLETE`.
6. If `prisma generate` fails after schema edits, check that BOTH `client` and `client_frontend` generators are pointing at writable directories (this repo has had issues with read-only `node_modules` after CI runs).

**Estimated session budget:** 1 working day per phase if done sequentially with full review cycles. Faster if phases overlap (Phase 2 can start immediately after Phase 1 schema lands; Phase 3 UI shells can be drafted in parallel with Phase 2 backend).

---

## 9) Memory tie-in

After Phase 1 + 2 land, consider adding to project memory:

- `project_maintenance_workflow.md` — new feature exists, key Server Actions, where to extend (e.g. SLA notifications)
- `feedback_state_machine_pattern.md` — if the state-machine validation in `updateMaintenanceRequestStatus` proves to be a pattern worth reusing for other workflow entities (Request approval, etc.)
