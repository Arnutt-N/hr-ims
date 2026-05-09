# PRP STUB: Kanban View for Maintenance Requests

**Metadata**
- Agent: Claude (Opus 4.7)
- Timestamp: 2026-05-09 18:27:36 +07:00
- Status: **STUB — full plan TBD; user requested deferral from main maintenance PRP v4**
- Depends on: main Maintenance Workflow PRP v4 list page + Server Actions shipped first
- Estimated start: after main PRP Phase 3+4 land + ≥1 week of usage of the existing list view

---

## Premise

Main PRP v4 ships `/maintenance/page.tsx` as a filtered list of `RequestCard`s. Owner asked: "Kanban view ของ requests" — a column-based view where columns = statuses (open / assigned / in_progress / awaiting_parts / resolved / closed) and cards = requests, with **drag-drop between columns** to change status.

This is an alternative UX, not a replacement. The toggle "List | Kanban" lives at the top of `/maintenance`.

## Why this is its own PRP, not part of main

- **UX exploration needed:** Kanban patterns vary widely (column scrollability, swimlanes, WIP limits, card density). Designing a good one needs iteration with real users — better done after main PRP gives them familiarity with the data model.
- **Drag-drop library decision:** `@dnd-kit/core` (modern, accessible) vs `react-beautiful-dnd` (mature, archived) vs `react-dnd` (heavier). All have non-trivial learning curves and bundle costs.
- **State complexity:** dragging a card from `in_progress` → `closed` needs to: (a) check if transition is legal, (b) prompt for resolution if going to `resolved`/`closed`, (c) handle reporter approval flow. The drag-drop UX intersects with the v3/v4 reporter approval state machine in non-obvious ways.
- **Mobile considerations:** Kanban is desktop-first by nature; mobile needs alternate layout (vertical lists per column or hidden behind tabs).

## Sketch of scope (refine when starting)

**No new Server Actions** — reuse `updateMaintenanceItemStatus`, `approveItemResolution`, etc. Server contract stays.

**Components:**
- `KanbanBoard.tsx` — top-level grid of columns
- `KanbanColumn.tsx` — column with title, count, scrollable card list, drop zone
- `KanbanCard.tsx` — compact RequestCard variant with drag handle
- `useDragHandlers.ts` hook wrapping @dnd-kit setup

**UI integration:**
- View toggle on `/maintenance` page: List (default) | Kanban
- Persist user preference in localStorage
- Mobile: collapse to single-column accordion

**State machine integration:**
- Drag from `in_progress` → `resolved`: open ResolveItemDialog before committing
- Drag from `resolved` → `closed`: open approve confirm
- Drag from `resolved` → `in_progress`: open RejectItemDialog (require reason)
- Drag to illegal state: snap back + toast error

**Tests:**
- Vitest for drag-handler logic
- Playwright for desktop drag-drop flow (Playwright has native drag support)

## Open questions

1. **Library:** `@dnd-kit/core` confirmed? Check bundle size against repo's perf budget.
2. **Card size & density** — show full RequestCard or compact variant? Items count visible?
3. **WIP limits** — enforce max cards in `in_progress` per technician (Lean style)?
4. **Filtering on Kanban** — same filter bar as List? Or different (group by assignee swimlane)?
5. **Mobile fallback** — hide Kanban toggle on mobile? Or show stacked columns?

## Resume checklist

- [ ] Main PRP v4 list view shipped + ≥1 week usage data (do users actually want a different view?)
- [ ] User reviews competitor Kanban UIs (Trello, Jira, Linear) and picks reference style
- [ ] Bundle size budget confirmed — `@dnd-kit` adds ~20KB gzipped
- [ ] Decide 5 open questions above
- [ ] Write full PRP following the v4 template
