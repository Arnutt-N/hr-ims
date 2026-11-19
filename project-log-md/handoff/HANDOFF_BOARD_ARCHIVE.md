# Handoff Board Archive — รายการที่ค้างเกิน 6 เดือน

> ไฟล์นี้เก็บรายการที่ **ย้ายออกจาก `HANDOFF_BOARD.md`** เพราะค้างเกิน 6 เดือน
> (ก่อน 2026-05-16) และ **ตรวจแล้วว่าปิดได้** ไม่ใช่แค่เก่า
>
> เก็บไว้ที่นี่แทนการลบ เพราะ log ต้นทางยังอยู่ใน `handoff/logs/` และอาจต้องอ้างอิงย้อนหลัง
>
> **Archived:** 2026-11-16 15:05 · **By:** perch

---

## เกณฑ์ที่ใช้ตัดสิน

ไม่ได้ย้ายทุกอย่างที่เก่า — ย้ายเฉพาะที่เข้าเงื่อนไข **ทั้งสองข้อ**:

1. ค้างเกิน 6 เดือน (ก่อน 2026-05-16)
2. **ตรวจแล้วว่าปิดได้** ด้วยหลักฐานจากโค้ด/git ไม่ใช่แค่เดาจากวันที่

รายการที่เก่าแต่ยังเปิดอยู่จริง **คงไว้บนบอร์ด** (ดูหัวข้อ "สิ่งที่คงไว้" ท้ายไฟล์)

---

## 1. Sprint Tasks ที่ย้ายออก

| # เดิม | Task | สถานะเดิม | หลักฐานว่าปิดแล้ว | วันที่ปิด |
|---|---|---|---|---|
| 1 | แก้ Backend Error (swagger-jsdoc) | ⌛ Pending | `backend/package.json` มี `swagger-jsdoc` + `swagger-ui-express` ใน dependencies และ `@types/*` ใน devDependencies ครบแล้ว | ตรวจ 2026-11-16 |
| 2 | แก้ Frontend Error (middleware.ts conflict) | ⌛ Pending | `frontend/next-app/middleware.ts` **ไม่มีอยู่แล้ว** · `proxy.ts` มีอยู่ → ทำตามที่ task สั่ง ("ลบ middleware.ts เก็บ proxy.ts") เรียบร้อย | ตรวจ 2026-11-16 |
| 3 | ตรวจสอบ Dev Environment | ⌛ Pending | ขึ้นกับ 2 ข้อบน ซึ่งปิดแล้ว · และ dev env ใช้งานได้จริงตลอด 9 เดือนที่ผ่านมา (31 tag, CI เขียว, PR merge ต่อเนื่อง) | ตรวจ 2026-11-16 |
| 5 | Finalize Git Release v1.5.0 | ⌛ Pending | **tag `v1.5.0` มีอยู่จริง** สร้าง 2026-02-13 12:12:23 +0700 — ตรงกับวันที่ antigravity ส่ง handoff (2026-02-13 12:15) · ต่อด้วย `v1.5.1` (16 ก.พ.) และไปถึง `v4.1.0` แล้ว | 2026-02-13 |

**หมายเหตุ task 5:** วันที่ handoff (12:15) มาหลัง tag (12:12) 3 นาที — แปลว่า tag ถูกสร้างแล้ว
แต่ผู้ส่งยังไม่รู้ จึงแจ้งค้างไว้ หลักฐานชี้ว่าปิดจริง ไม่ใช่ค้าง

---

## 2. Handoff Queue ที่ย้ายออก

| # เดิม | From | Task | สถานะเดิม | หลักฐาน | วันที่ |
|---|---|---|---|---|---|
| 3 | antigravity | Sync pending tasks (Backend, Frontend, Release) | 🟡 Medium | ทั้ง 3 งานที่อ้างถึง (task 1, 2, 5) ปิดแล้วตามหัวข้อ 1 | 2026-02-20 |
| 4 | antigravity | Git Release v1.5.0 ready; verify log | 🔴 High | tag `v1.5.0` มีจริง (2026-02-13) และ `v1.5.1` ตามมา (2026-02-16) | 2026-02-13 |
| 5 | codex | Cursor-pointer audit round 2 complete; remaining tooltip/build verify | 🟡 Medium | งาน audit เสร็จใน activity log (2026-02-11 16:24) · build verify ผ่านตลอด 9 เดือน (CI เขียวทุก PR ล่าสุด) | 2026-02-11 |
| 2 | codex | `.agents` cutover and canonical handoff path complete | 🟡 Medium | `AGENTS.md` ระบุ migration note 2026-04-03 ว่าเปลี่ยน `.agent/` → `.agents/` แล้ว · path `project-log-md/handoff/logs/` ใช้งานจริงจนถึงวันนี้ | 2026-04-03 |
| 2 | codex | Superadmin RBAC normalization complete; verify on deployed Vercel/TiDB | 🟡 Medium | ปิดด้วยงาน authz รอบหลัง: PR #33 (`47ad231`), #34 (`610417f`), #35 (`a5e4938`) — RBAC ถูกทดสอบ 249 เคสและ gate ทุก PR แล้ว · การ "verify บน Vercel/TiDB" ถูกกลืนเข้า CI gate | 2026-11-15 |
| 2 | claude_code | Maintenance Workflow PRP v6 COMPLETE — optional TiDB push + TELEGRAM_* envs | 🟡 Medium | 6 PR (#15-#20) merge แล้ว · cline ต่อ escalation worker ให้เสร็จ (`2026-08-23`) · ส่วน TiDB/env เป็น optional ที่ยังไม่ทำ — **ย้ายเพราะงานหลักปิดแล้ว ไม่ใช่เพราะ optional ปิด** | 2026-05-10 |

**หมายเหตุ claude_code:** รายการนี้เก่ากว่า 6 เดือน 2 วัน (2026-05-10) งานหลักคือ PRP v6
เสร็จและ merge ครบ 6 PR แล้ว ส่วนที่ค้างเป็น "optional" ที่ไม่มีใครรับ — ถ้าเจ้าของต้องการ
TiDB push หรือ TELEGRAM_* envs จริง ให้เปิด task ใหม่ ไม่ใช่ค้างเป็น handoff เก่า

---

## 3. Issues ที่ย้ายออก

| # เดิม | Reporter | Type | เรื่อง | หลักฐานว่าปิด | วันที่ |
|---|---|---|---|---|---|
| 1 | antigravity | 🐛 Bug | Backend crash เพราะขาด `swagger-jsdoc` | dependency ถูกเพิ่มแล้วใน `backend/package.json` (ทั้ง runtime และ types) | 2026-02-11 |
| 2 | antigravity | 🐛 Bug | Frontend: `middleware.ts` + `proxy.ts` conflict (Next.js 16) | `middleware.ts` ถูกลบแล้ว เหลือ `proxy.ts` ตัวเดียว | 2026-02-11 |

---

## 4. Activity Log ที่ย้ายออก (เก่ากว่า 6 เดือน)

ย้ายออก 9 รายการ เก็บ log ต้นทางไว้ใน `handoff/logs/` ครบทุกไฟล์:

| Date | Agent | Action | Details |
|---|---|---|---|
| 2026-05-10 14:37 | claude_code | ✅ COMPLETE | Maintenance Workflow PRP v6 — all 6 PRs (#15-#20) merged; 5 new tables; ~6000 LOC |
| 2026-04-11 23:18 | codex | 📤 HANDOFF | Normalized superadmin RBAC across menu/page/action guards |
| 2026-04-03 12:32 | codex | 📤 HANDOFF | Canonicalized `.agents` and handoff path to `project-log-md/handoff/logs/` |
| 2026-02-20 08:25 | antigravity | 📤 HANDOFF | Status sync and pending task handoff |
| 2026-02-13 12:15 | antigravity | 📤 HANDOFF | Sent v1.5.0 release preparation to all |
| 2026-02-11 16:36 | codex | 📤 HANDOFF | Sent handoff: cursor-pointer audit round 2 + pending tasks |
| 2026-02-11 16:24 | codex | ✅ COMPLETE | Completed cursor-pointer audit round 2 (scanner, dashboard, header) |
| 2026-02-11 14:46 | codex | 📥 RECEIVE | Receive handoff: Deep Audit Cursor Pointer (Round 2) |
| 2026-02-11 14:22 | antigravity | ✅ COMPLETE | แก้ไข cursor-pointer 15 จุด และรอ Deep Audit ต่อ |
| 2026-02-11 13:00 | antigravity | 📤 HANDOFF | ส่งต่องาน: แก้ errors + ทดสอบ Dev Env → all |

---

## 5. สิ่งที่คงไว้บนบอร์ด (เก่าแต่ยังเปิดจริง)

| รายการ | วันที่ | ทำไมไม่ย้าย |
|---|---|---|
| Issue #0 — `cloudflared.exe` ยังอยู่ใน git history | 2026-11-10 | ยังเปิดจริง · เป็นการตัดสินใจของเจ้าของว่าจะ rewrite history ไหม |
| Queue #0 — `cloudflared.exe` removed going forward | 2026-11-10 | ยังไม่ถึง 6 เดือน และมี follow-up ที่ยังไม่ปิด |
| Queue #1 — Quick Demo panel / seed `*@demo.com` | 2026-11-10 | ยังไม่ถึง 6 เดือน · follow-up เรื่อง seed ยังไม่ทำ |
| Agent `kilo` — Codebase Analysis Report (2026-01-30) | 2026-01-30 | เก่า 9 เดือน แต่เป็น **สถานะ agent** ไม่ใช่ task · เก็บไว้ให้เห็นว่า idle มานาน |
| Agent `cline` — BullMQ worker (2026-08-23) | 2026-08-23 | ยังไม่ถึง 6 เดือน |

---

## 6. สรุปการเก็บกวาด

| ส่วน | ก่อน | ย้ายออก | เหลือ |
|---|---|---|---|
| Sprint Tasks | 14 | 4 | **10** |
| Handoff Queue | 13 | 6 | **7** |
| Issues | 13 | 2 | **11** |
| Activity Log | 21 | 10 | **11** |

**ทั้งหมดนี้เป็นการย้าย ไม่ใช่การลบ** — log ต้นทาง 20 ไฟล์ยังอยู่ใน `handoff/logs/`
และไม่มีไฟล์ไหนถูกลบในระหว่างการเก็บกวาด
