# CLAUDE.md

> ⭐ **คู่มือฉบับเต็มย้ายไปที่ [AGENTS.md](./AGENTS.md) แล้ว — โปรดอ่านและปฏิบัติตามไฟล์นั้น**

## Single Source of Truth

**[AGENTS.md](./AGENTS.md)** เป็นคู่มือหลักฉบับรวม (single source of truth) สำหรับ AI Agents
ทุกตัวในโปรเจค HR-IMS ครอบคลุม:

- Project Overview & Tech Stack (§0)
- AI Agent Collaboration System + Handoff Protocol (§1)
- Build/Lint/Test Commands + Local Infra (§2)
- Code Style Guidelines + Server Action & Audit Logging Patterns (§3)
- Project Architecture, Security, Database Schema Highlights (§4)
- Development Workflows incl. RBAC & i18n (§5)
- Next Tasks Queue, Emergency Procedures, Files Reference, Checklist (§6–§11)
- Environment Variables, Testing Strategy & CI, Notes for AI Assistants (§12–§14)

เนื้อหาทั้งหมดของ `CLAUDE.md` ฉบับเก่าถูก consolidate เข้า `AGENTS.md` เรียบร้อยแล้ว
(2026-08-23) — **ห้ามแก้คู่มือซ้ำในไฟล์นี้ ให้แก้ที่ `AGENTS.md` ที่เดียว**

### Claude-specific quick notes

- Git commit prefix: `[Claude] <description>` (ตาม convention §11 ของ AGENTS.md)
- Handoff log naming: `project-log-md/handoff/logs/YYYY-MM-DD_HHmm_claude_code_to_<target>.md`


