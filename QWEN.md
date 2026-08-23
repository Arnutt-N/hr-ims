# QWEN.md

> ⭐ **คู่มือฉบับเต็มย้ายไปที่ [AGENTS.md](./AGENTS.md) แล้ว — โปรดอ่านและปฏิบัติตามไฟล์นั้น**

## Single Source of Truth

**[AGENTS.md](./AGENTS.md)** เป็นคู่มือหลักฉบับรวม (single source of truth) สำหรับ AI Agents
ทุกตัวในโปรเจค HR-IMS ครอบคลุม Project Overview, Tech Stack, Commands, Code Style,
Architecture, Security, Workflows, Env Vars, Testing & Notes (§0–§14)

เนื้อหาทั้งหมดของ `QWEN.md` ฉบับเก่าถูก consolidate เข้า `AGENTS.md` เรียบร้อยแล้ว
(2026-08-23) — **ห้ามแก้คู่มือซ้ำในไฟล์นี้ ให้แก้ที่ `AGENTS.md` ที่เดียว**
(หมายเหตุ: ฉบับเก่าระบุ production DB เป็น PostgreSQL ซึ่งไม่ถูกต้อง — ปัจจุบันคือ
MySQL-compatible TiDB ดู §0 และ §2.4 ของ AGENTS.md)

### Qwen-specific quick notes

- Git commit prefix: `[Qwen] <description>` (ตาม convention §11 ของ AGENTS.md)
- Handoff log naming: `project-log-md/handoff/logs/YYYY-MM-DD_HHmm_qwen_to_<target>.md`


