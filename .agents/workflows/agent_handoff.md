---
description: สร้าง Handoff Log และอัพเดท Board สำหรับส่งต่องานระหว่าง Agents
---

# Workflow: Agent Handoff (Cross-Agent)

## วัตถุประสงค์
สร้าง Handoff Log เพื่อส่งต่องาน/รับงานระหว่าง AI Agents หลายตัว พร้อมอัพเดท Dashboard กลาง

> ⚠️ **ก่อนใช้ workflow นี้** ให้อ่าน Skill: `cross-agent-handoff` เพื่อเข้าใจระบบทั้งหมด
> อ่าน: `.agents/skills/cross-agent-handoff/SKILL.md`

---

## ขั้นตอนการทำงาน

### 1. อ่าน HANDOFF_BOARD.md (Dashboard กลาง)
// turbo
```bash
type "D:\02 genAI\hr-ims\project-log-md\handoff\HANDOFF_BOARD.md"
```
- ดูสถานะ Agent ทุกตัว
- ดู Handoff Queue → มีงานส่งมาหาเราไหม
- ดู Issues → มีปัญหาที่ต้องรู้ไหม

### 2. อ่าน Handoff Logs ล่าสุด (ถ้ามี)
// turbo
```bash
dir "D:\02 genAI\hr-ims\project-log-md\handoff\logs" /O:-D /B
```
- ดู handoff logs ล่าสุด
- อ่าน log ที่เกี่ยวข้องกับ Agent ตัวเอง

### 3. สร้าง Handoff Log
สร้างไฟล์ `.md` ใน `project-log-md/handoff/logs/`

**ชื่อไฟล์:** `YYYY-MM-DD_HHmm_<from_agent>_to_<to_agent>.md`
- `<from_agent>` = Agent ID ที่ส่ง (เช่น antigravity, kilo, claude_code)
- `<to_agent>` = Agent ID ที่รับ หรือ `all` ถ้าส่งให้ทุกคน

**เนื้อหาตาม template ใน SKILL.md:**
- ข้อมูล Agent, วันเวลา, หมายเหตุ
- ✅ Completed Work
- ⏳ Pending Work
- 📤 Handoff Tasks
- 📥 Received From
- ⚠️ Issues & Observations
- 📂 Files Changed

**Custom Time:** ถ้าต้องการกำหนดเวลาเอง ให้ระบุใน `Date` field และ `Remark`

### 4. อัพเดท HANDOFF_BOARD.md
อัพเดทไฟล์ `project-log-md/handoff/HANDOFF_BOARD.md` ตามกฎใน SKILL.md:

- **Agent Status Table** — อัพเดทสถานะตัวเอง
- **Current Sprint Tasks** — อัพเดท tasks ที่เกี่ยวข้อง
- **Handoff Queue** — เพิ่ม entry (ถ้าส่งงาน) หรือลบ entry (ถ้ารับงาน)
- **Issues & Observations** — เพิ่มปัญหา/ข้อแนะนำ (ถ้ามี)
- **Recent Activity Log** — เพิ่ม entry ใหม่ด้านบนสุด

### 5. ตรวจสอบว่าไฟล์ถูกสร้าง/อัพเดทจริง
// turbo
```bash
dir "D:\02 genAI\hr-ims\project-log-md\handoff\logs" /O:-D /B
```

### 6. Verification Checklist
- ✅ Handoff log ถูกสร้างใน `handoff/logs/` ด้วยชื่อที่ถูกต้อง
- ✅ HANDOFF_BOARD.md ถูกอัพเดท
- ✅ Agent Status ถูกต้อง
- ✅ Recent Activity Log มี entry ใหม่
- ✅ เนื้อหาครบตาม template

---

## 📌 Quick Commands

```bash
# ดู board ปัจจุบัน
type "D:\02 genAI\hr-ims\project-log-md\handoff\HANDOFF_BOARD.md"

# ดู handoff logs ล่าสุด
dir "D:\02 genAI\hr-ims\project-log-md\handoff\logs" /O:-D /B

# ดู session logs ของ agent ตัวเอง
dir "D:\02 genAI\hr-ims\project-log-md\<agent_id>" /O:-D /B
```

---

## 💡 Tips
- รัน `/session-summary` ก่อน แล้วค่อยรัน `/agent_handoff` จะได้ session log + handoff log ครบ
- ถ้าไม่รู้จะส่งให้ใคร ใช้ `all` เป็น `<to_agent>`
- ถ้ารับงานมาแล้วไม่รู้จะเริ่มยังไง อ่าน handoff log + session log ของ agent ที่ส่งมา
