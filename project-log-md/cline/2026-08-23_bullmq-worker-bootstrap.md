# BullMQ Worker Bootstrap — 2026-08-23

> Agent: Cline (ox-alpha) | Task: Wire maintenanceEscalationQueue into BullMQ Bootstrap (AGENTS.md §6 High Priority #1)

## Root Cause ที่ลงลึกกว่า task เดิม

Task เดิมมองว่าเป็น "escalation worker ไม่ถูกรัน" — การ trace ด้วย graft/grep พบว่าเป็น **gap ระดับ bootstrap**: queues ทั้งหมดใน backend (maintenance-escalation, backup, email) ไม่เคยถูก import ใน runtime path ใดเลย (`index.ts` 74 บรรทัดไม่มี worker startup; import เดียวใน repo คือ `backupJob.ts → backupQueue` ซึ่งตัวมันเองก็ dead code)

จึงออกแบบเป็น dedicated entry point แทนการ patch เฉพาะ escalation

## Key Decisions

| Decision | เหตุผล |
|---|---|
| Option B: `src/worker.ts` แยก (ไม่ bootstrap ใน index.ts) | API server/tests ไม่ผูก Redis dependency; scale อิสระ — ตรง hint ใน handoff 2026-05-10 |
| require-after-dotenv (ไม่ใช้ static imports) | TS hoist static imports ข้าม `dotenv.config()` → queue modules อ่าน `REDIS_URL` ก่อน env โหลด; `-r dotenv/config` บน nodemon ไม่ reliable |
| แก้ `maxRetriesPerRequest: null` ทั้ง 3 modules | BullMQ Worker blocking-command requirement — ตอน review ตั้งใจยกไว้ แต่ implement แล้วเป็น config one-liner คุ้มที่จะปิดใน PR เดียว |
| เริ่ม backup scheduler ด้วย | scheduler มี feature-flag + settings gate อยู่แล้ว, idempotent — ฟรีและปิด gap เดียวกัน |

## Verification Evidence

```
bull:maintenance-escalation-queue:repeat:cab2b9d0...:1787490000000
bull:maintenance-escalation-queue:repeat:cab2b9d0...:1787493600000   (+1hr)
bull:maintenance-escalation-queue:repeat:cab2b9d0...:1787497200000   (+1hr)

job escalation-tick → returnvalue: {"processed":0}  (6ms)
```

Test regression check: full suite 10F/167F **identical กับ baseline** (stash → run → pop) = pre-existing failures บน b11ba0d

## Files

- `backend/src/worker.ts` (new), `backend/.env.example` (new)
- `backend/package.json`, `.gitignore`
- `backend/src/queues/*.ts` ×3 (connection config only)
- `AGENTS.md`, HANDOFF_BOARD.md

Handoff log: `project-log-md/handoff/logs/2026-08-23_2015_cline_to_all.md`
