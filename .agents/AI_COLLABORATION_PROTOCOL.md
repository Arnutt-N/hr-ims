# 🤝 AI Collaboration Protocol for HR-IMS

## Multi-AI Assistant Workflow Guide

เอกสารนี้อธิบายวิธีการทำงานร่วมกันระหว่าง AI Assistants หลายตัวในโปรเจค HR-IMS

> Migration note (2026-04-03): path ปัจจุบันของ AI workspace คือ `.agents/` เอกสารย้อนหลังบางส่วนอาจยังอ้าง `.agent/` ซึ่งเป็นชื่อเดิมก่อน rename

---

## 1. AI Assistants ที่ทำงานร่วมกัน

| AI Assistant | บทบาทหลัก | จุดแข็ง | Config File |
|--------------|-----------|---------|-------------|
| **Antigravity (Gemini)** | Lead Developer | Full-stack development, testing, complex implementations | - |
| **Claude Code** | Developer | Code quality, architecture, refactoring | `CLAUDE.md` |
| **Kilo Code** | Researcher/Analyst | System analysis, documentation, recommendations | - |
| **CodeX (OpenAI)** | Developer | Code generation, debugging, optimization | - |
| **อื่นๆ** | ตามที่กำหนด | - | - |

---

## 2. โครงสร้างโฟลเดอร์สำหรับ AI Collaboration

```
hr-ims/
├── .agents/                          # 🔧 AI Configuration & Workflows
│   ├── workflows/                    # Slash commands (ทุก AI ใช้ร่วมกัน)
│   ├── skills/                       # Skills/Knowledge base
│   └── AI_COLLABORATION_PROTOCOL.md  # ไฟล์นี้
│
├── research/                         # 📚 Research & Analysis (gitignored)
│   ├── kilo/                         # งานจาก Kilo Code
│   ├── antigravity/                  # งานจาก Antigravity
│   └── shared/                       # เอกสารที่ใช้ร่วมกัน
│
└── docs/                             # 📖 Official Documentation
    ├── USER_GUIDE_TH.md
    ├── ADMIN_GUIDE_TH.md
    └── TECHNICAL_GUIDE_TH.md
```

---

## 3. วิธีส่งมอบงานระหว่าง AI

### 3.1 การสร้าง Handoff Log

เมื่อทำงานเสร็จหรือต้องการส่งต่อให้ AI ตัวอื่น ให้สร้างไฟล์ใน `project-log-md/handoff/logs/` และอัปเดต `project-log-md/handoff/HANDOFF_BOARD.md` ตามรูปแบบนี้:

```markdown
# Handoff Log

---
| Field | Value |
|-------|-------|
| **Date** | [วันที่และเวลา] |
| **From Agent** | [agent_id ที่ส่งงาน] |
| **To Agent** | [agent_id ที่รับงาน หรือ "all"] |
| **Session Duration** | [ช่วงเวลาที่ทำงาน หรือ n/a] |
| **Remark** | [หมายเหตุเพิ่มเติม ถ้ามี] |

---

## สรุปงานที่ทำ
[อธิบายสิ่งที่ทำแล้ว]

## ไฟล์ที่สร้าง/แก้ไข
- `path/to/file1.ts` - [คำอธิบายสั้นๆ]
- `path/to/file2.ts` - [คำอธิบายสั้นๆ]

## สิ่งที่ต้องทำต่อ
- [ ] งาน 1
- [ ] งาน 2

## งานที่ส่งต่อ
- [ ] งานที่ต้องทำต่อ 1
- [ ] งานที่ต้องทำต่อ 2

## ข้อควรระวัง / หมายเหตุ
[สิ่งที่ AI ตัวถัดไปควรรู้]

## คำสั่งที่เกี่ยวข้อง
```bash
# คำสั่งที่จำเป็น
npm run dev
```
```

### 3.2 ตำแหน่งที่เก็บ Handoff Documents

```
project-log-md/
├── handoff/
│   ├── HANDOFF_BOARD.md
│   └── logs/
│       ├── 2026-02-11_1300_antigravity_to_all.md
│       ├── 2026-02-11_1633_codex_to_all.md
│       └── ...
```

---

## 4. Convention สำหรับการทำงาน

### 4.1 Naming Convention สำหรับไฟล์วิจัย/วิเคราะห์

```
[หมายเลข]_[ชื่องาน]_[AI-name].md

ตัวอย่าง:
01_system_analysis_report.md      (จาก Kilo)
02_security_implementation.md     (จาก Antigravity)
```

### 4.2 การ Comment ในโค้ด

เมื่อแก้ไขโค้ดที่ AI ตัวอื่นสร้าง ให้ระบุ:

```typescript
// [2026-01-29] Modified by Antigravity: Added rate limiting
// Original by Kilo: Security headers configuration
```

### 4.3 การใช้ Git Commit Message

```
[AI-NAME] Brief description

Examples:
[Antigravity] Add security testing framework
[Kilo] System analysis and recommendations
[Antigravity+Kilo] Collaborative rate limiting implementation
```

---

## 5. การรับงานจาก AI ตัวอื่น

### 5.1 ขั้นตอนก่อนเริ่มงาน

1. **อ่าน `project-log-md/handoff/HANDOFF_BOARD.md`**
2. **อ่าน handoff logs ที่เกี่ยวข้อง** ใน `project-log-md/handoff/logs/`
3. **ตรวจสอบ task.md** ถ้ามี (อยู่ใน brain folder ของแต่ละ session)
4. **อ่าน skill ที่เกี่ยวข้อง** ใน `.agents/skills/`
5. **ตรวจสอบ workflows** ใน `.agents/workflows/`

### 5.2 คำสั่งเริ่มต้นที่ควรรัน

```bash
# ดูสถานะ Git
git status

# ดู commit ล่าสุด
git log --oneline -10

# ตรวจสอบ branch
git branch -a
```

---

## 6. ข้อมูลสำคัญของโปรเจค

### 6.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind v4, Shadcn UI |
| Backend | Express.js, Prisma ORM |
| Database | SQLite (dev), PostgreSQL (prod) |
| Auth | NextAuth.js v5, JWT |

### 6.2 พอร์ตที่ใช้

| Service | Port |
|---------|------|
| Frontend (Next.js) | 3000 |
| Backend (Express) | 3001 |
| Prisma Studio | 5555 |

### 6.4 การเก็บ Project Logs (`project-log-md/`)

เก็บ Logs ตามชื่อ AI เพื่อให้ติดตามบริบทได้ง่าย:

```
project-log-md/
├── common/                  # ไฟล์ส่วนกลาง (git history, workflows)
├── antigravity/            # implementation logs
├── claude_code/            # refactoring logs
├── kilo/                   # research logs
├── codex/                  # coding logs
└── archive/                # logs เก่า
```

### 6.5 Commands ที่ใช้บ่อย

```bash
# Start Development
/start_dev                    # ใช้ workflow

# Or manually:
cd backend && npm run dev     # Backend
cd frontend/next-app && npm run dev  # Frontend

# Database
cd backend && npx prisma studio      # Open DB GUI
cd backend && npx prisma db push     # Push schema changes

# Testing
cd backend && npm test -- --testPathPattern=security  # Security tests
```



---

## 7. งานที่ทำไปแล้ว (History)

### 7.1 Security Testing Framework (by Antigravity)

**สถานะ:** ✅ Completed  
**วันที่:** 2026-01-29

**ไฟล์ที่สร้าง:**
```
backend/src/tests/security/
├── config.ts                    # Configuration
├── README.md                    # Documentation
├── utils/
│   ├── payloads.ts             # Attack payloads
│   └── http-client.ts          # HTTP client
├── auth/
│   ├── brute-force.test.ts
│   ├── session-security.test.ts
│   └── jwt-attacks.test.ts
├── authz/
│   ├── idor.test.ts
│   └── privilege-escalation.test.ts
├── injection/
│   ├── sql-injection.test.ts
│   └── xss.test.ts
├── api/
│   └── rate-limiting.test.ts
├── infra/
│   └── security-headers.test.ts
└── pentest/
    ├── security-scanner.ts
    └── vuln-reporter.ts
```

### 7.2 System Analysis (by Kilo Code)

**สถานะ:** ✅ Completed  
**วันที่:** 2026-01-29

**ไฟล์ที่สร้าง:**
```
research/kilo/
├── 01_system_analysis_report.md
└── 02_system_improvement_recommendations.md
```

**สิ่งที่แนะนำให้ทำต่อ:**
1. 🔴 Rate Limiting (สูงมาก)
2. 🔴 Logging & Monitoring (สูงมาก)
3. 🟠 Password Policy (สูง)
4. 🟠 Backup & Recovery (สูง)

---

## 8. Template สำหรับ AI ใหม่ที่เข้ามาทำงาน

### 8.1 Onboarding Prompt

เมื่อ AI ใหม่เข้ามาทำงาน ให้ user ส่ง prompt นี้:

```
คุณกำลังทำงานในโปรเจค HR-IMS ซึ่งมี AI หลายตัวทำงานร่วมกัน

กรุณาอ่านไฟล์เหล่านี้ก่อนเริ่มงาน:
1. `.agents/AI_COLLABORATION_PROTOCOL.md` - วิธีทำงานร่วมกัน
2. `project-log-md/handoff/HANDOFF_BOARD.md` - สถานะกลางและ handoff queue
3. `project-log-md/handoff/logs/` - handoff logs ล่าสุด
4. `.agents/skills/` - Skills ที่เกี่ยวข้อง

หลังจากอ่านแล้ว ให้สรุปสิ่งที่เข้าใจและพร้อมรับงานต่อ
```

### 8.2 Handoff Prompt (เมื่อส่งต่องาน)

```
กรุณาสร้าง handoff log ตามรูปแบบใน `.agents/AI_COLLABORATION_PROTOCOL.md`
สำหรับงานที่ทำเสร็จ ให้บันทึกที่ `project-log-md/handoff/logs/` และอัปเดต `project-log-md/handoff/HANDOFF_BOARD.md`
```

---

## 9. การแก้ไข Conflict

หาก AI หลายตัวแก้ไขไฟล์เดียวกัน:

1. **ตรวจสอบ git status** ก่อนเริ่มงาน
2. **Pull ล่าสุด** ด้วย `git pull`
3. **แจ้ง user** หากพบ conflict
4. **ห้าม force push** โดยไม่ได้รับอนุญาต

---

## 10. Contact & Communication

- **User (arnutt.n)** - ผู้ตัดสินใจสุดท้าย
- **Antigravity** - Development Lead
- **Kilo Code** - Research & Analysis

---

*Last Updated: 2026-04-03 by CodeX*
