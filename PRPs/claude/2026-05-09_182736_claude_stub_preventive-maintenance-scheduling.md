# PRP STUB: Preventive Maintenance Scheduling

**Metadata**
- Agent: Claude (Opus 4.7)
- Timestamp: 2026-05-09 18:27:36 +07:00
- Status: **STUB — full plan TBD; user requested deferral from main maintenance PRP v4**
- Depends on: main Maintenance Workflow PRP (`2026-05-09_104630_claude_plan_maintenance-workflow.md`) shipped first
- Estimated start: after main PRP Phase 5 lands and runs for ≥2 weeks (operational data needed to design schedule defaults)

---

## Premise

The main Maintenance PRP (v4) covers **reactive** maintenance — user reports an issue, technician fixes. This stub covers **preventive** maintenance — recurring scheduled checks (e.g. air conditioner serviced quarterly, server room HVAC monthly, fire extinguisher annually).

Originally listed in main PRP "Non-Goals" (v1) and deferred again from v4 Bucket C. Owner asked: "เพิ่ม `recurringSchedule` สำหรับ preventive maintenance".

## Why this is its own PRP, not part of main

- **Different mental model:** reactive = event-driven; preventive = time-driven (cron + auto-create request). Implementing both at once doubles cognitive load on reviewers.
- **Different user stories:** reporter/assignee/admin in main PRP; *schedule manager* role + *technician calendar view* in this PRP — distinct UX surface.
- **Depends on main PRP being live:** preventive workflow generates `MaintenanceRequest` rows with `category=preventive`, `severity=low`, `priority=normal` and auto-assigns via Phase 5 rules. The main PRP must exist first.
- **Schedule subsystem is non-trivial:** requires cron table, last-run/next-run tracking, BullMQ scheduled job, per-item or per-category templates, holiday/weekday handling, missed-run catch-up logic.

## Sketch of scope (refine when starting)

**Schema additions:**
- `MaintenanceSchedule` — `id, name, category, locationId?, severity, priority, intervalDays, nextRunAt, lastRunAt, enabled, templateTitle, templateDescription, photoTemplate?, createdById, ...`
- `MaintenanceScheduleItem` — join with `InventoryItem` (which items get checked together)

**Server Actions:**
- `getMaintenanceSchedules(filters?)`, `createMaintenanceSchedule(...)`, `updateMaintenanceSchedule(...)`, `runScheduleNow(id)` (admin trigger)

**Background job:**
- BullMQ daily cron: find `WHERE enabled = true AND nextRunAt <= NOW()`, for each:
  - `createMaintenanceRequest({ ... templated fields, items from MaintenanceScheduleItem })`
  - Update `lastRunAt = now()`, `nextRunAt = now() + intervalDays`
  - Log

**UI:**
- `/settings/maintenance-schedules` admin page (CRUD)
- "Next Scheduled" widget on `/maintenance` page
- Calendar view of upcoming scheduled checks (optional)

**Tests:** Vitest for actions + cron logic; Playwright for admin CRUD flow.

## Open questions (decide before starting)

1. **Day-of-week / day-of-month preference** — schedule on Mondays only? Skip weekends/holidays?
2. **Catch-up logic** — if cron missed a run (server down), create back-dated request OR skip?
3. **Template binding** — schedule references items at creation time OR at run time? (Inventory changes between schedule create and first run.)
4. **Cancellation semantics** — disabling schedule = stop future runs only, or also cancel any in-flight requests created from this schedule?

## Resume checklist

- [ ] Main PRP v4 fully shipped + ≥2 weeks operational
- [ ] At least 10 reactive requests in DB to inform default templates
- [ ] User confirms scope (this stub may need expansion to full PRP)
- [ ] Decide 4 open questions above
- [ ] Write full PRP following the v4 template (9 sections)
