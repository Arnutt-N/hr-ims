# คู่มือฉบับสมบูรณ์: การสร้าง Skills สำหรับ Claude Code

> **วันที่อัปเดต**: 23 กุมภาพันธ์ 2026
> **แหล่งอ้างอิง**: [The Complete Guide to Building Skill for Claude](https://github.com/anthropics/claude-code)

---

## 📋 สารบัญ

1. [บทนำ: Skills คืออะไร](#บทนำ-skills-คืออะไร)
2. [โครงสร้างของ Skill](#โครงสร้างของ-skill)
3. [การสร้าง Skill แบบ Step-by-Step](#การสร้าง-skill-แบบ-step-by-step)
4. [YAML Front Matter - หัวใจของ Skill](#yaml-front-matter---หัวใจของ-skill)
5. [การเชื่อมต่อ MCP Servers](#การเชื่อมต่อ-mcp-servers)
6. [ตัวอย่าง Skills ยอดนิยม](#ตัวอย่าง-skills-ยอดนิยม)
7. [Best Practices](#best-practices)
8. [การแก้ไขปัญหาทั่วไป](#การแก้ไขปัญหาทั่วไป)

---

## บทนำ: Skills คืออะไร

### นิยาม

**Skills** คือไฟล์ `SKILL.md` ที่บรรจุความเชี่ยวชาญเฉพาะด้าน (Domain Expertise) ซึ่ง Claude จะ **เปิดใช้งานอัตโนมัติ** เมื่อตรวจจับบริบทที่เกี่ยวข้อง

### Skills vs Slash Commands

| ลักษณะ | Skills | Slash Commands |
|--------|--------|----------------|
| **การเรียกใช้** | อัตโนมัติจากบริบท | ต้องพิมพ์ `/command-name` |
| **ตำแหน่งไฟล์** | `SKILL.md` ในโฟลเดอร์ | กำหนดใน `settings.json` |
| **ความยืดหยุ่น** | สูง - รองรับหลายไฟล์ | จำกัดเฉพาะ prompt เดียว |
| **การผสาน MCP** | แนะนำ MCP ที่เกี่ยวข้อง | ต้องระบุเอง |

> 💡 **หมายเหตุ**: ในปี 2026, Slash Commands ถูก **รวมเข้ากับ Skills System** แล้ว - ทั้งสองทำงานร่วมกันได้อย่างลงตัว

---

## โครงสร้างของ Skill

### โครงสร้างโฟลเดอร์มาตรฐาน

```
skill-folder/
├── SKILL.md          # ไฟล์หลัก (จำเป็น)
├── scripts/          # สคริปต์เสริม (ไม่จำเป็น)
│   └── helper.sh
├── references/       # เอกสารอ้างอิง (ไม่จำเป็น)
│   └── api-docs.md
└── assets/           # ทรัพยากร (ไม่จำเป็น)
    └── diagrams/
```

### ตำแหน่งติดตั้ง

```bash
# Global Skills (ใช้ได้กับทุกโปรเจกต์)
~/.claude/skills/<skill-name>/SKILL.md

# Project-specific Skills (ใช้เฉพาะโปรเจกต์)
<project-root>/.claude/skills/<skill-name>/SKILL.md
```

---

## การสร้าง Skill แบบ Step-by-Step

### Step 1: สร้างโฟลเดอร์

```bash
mkdir -p ~/.claude/skills/thai-code-reviewer
```

### Step 2: สร้างไฟล์ SKILL.md

```markdown
---
name: thai-code-reviewer
description: ตรวจสอบโค้ดภาษาไทยและอังกฤษ ตามมาตรฐาน Google Engineering
---

# Thai Code Reviewer

## บทบาท
คุณเป็น Code Reviewer ที่เข้มงวด พูดได้ทั้งภาษาไทยและอังกฤษ

## คำแนะนำ
1. ตรวจสอบ Type Safety ของทุกฟังก์ชัน
2. ตรวจสอบ Error Handling
3. ให้คำแนะนำเป็นภาษาที่ผู้ใช้เข้าใจ
```

### Step 3: ทดสอบ

```bash
# รีสตาร์ท Claude Code
claude

# ทดสอบโดยพูดคุยเกี่ยวกับ code review
"ช่วย review โค้ดนี้ให้หน่อย"
```

---

## YAML Front Matter - หัวใจของ Skill

### โครงสร้าง YAML มาตรฐาน

```yaml
---
name: skill-name                    # ชื่อ Skill (จำเป็น)
description: คำอธิบายสั้นๆ          # คำอธิบาย (จำเป็น)
triggers:                           # ทริกเกอร์การเปิดใช้ (ไม่จำเป็น)
  - คำหลัก: "review", "ตรวจสอบ"
  - รูปแบบไฟล์: "*.ts", "*.tsx"
mcp_servers:                        # MCP ที่แนะนำ (ไม่จำเป็น)
  - context7
  - sequential
  - playwright
personas:                           # เปอร์โซนาที่เกี่ยวข้อง (ไม่จำเป็น)
  - analyzer
  - qa
---
```

### ฟิลด์ทั้งหมด

| ฟิลด์ | จำเป็น | ประเภท | คำอธิบาย |
|-------|--------|--------|----------|
| `name` | ✅ | string | ชื่อเฉพาะของ Skill |
| `description` | ✅ | string | คำอธิบายสั้น (max 100 ตัวอักษร) |
| `triggers` | ❌ | array | คำหลัก/รูปแบบที่กระตุ้น |
| `mcp_servers` | ❌ | array | MCP servers ที่แนะนำ |
| `personas` | ❌ | array | เปอร์โซนาที่เกี่ยวข้อง |
| `version` | ❌ | string | เวอร์ชันของ Skill |
| `author` | ❌ | string | ชื่อผู้สร้าง |
| `requires` | ❌ | array | Skills ที่ต้องใช้ร่วม |

---

## การเชื่อมต่อ MCP Servers

### MCP คืออะไร

**MCP (Model Context Protocol)** = ห้องครัวอาชีพ พร้อมเครื่องมือและวัตถุดิบ
**Skill** = สูตรอาหาร บอกวิธีใช้เครื่องมือ

### MCP Servers ยอดนิยม

| MCP Server | การใช้งาน | คำสั่งติดตั้ง |
|------------|----------|---------------|
| **Context7** | ค้นหาเอกสารไลบรารี่ | `claude mcp add context7 -- npx -y @upstash/context7-mcp` |
| **Sequential** | วิเคราะห์ซับซ้อนหลายขั้นตอน | `claude mcp add sequential -- npx -y @anthropics/sequential-thinking` |
| **Playwright** | E2E Testing, Browser Automation | `claude mcp add playwright -- npx -y @anthropics/playwright-mcp` |
| **Magic** | สร้าง UI Components | `claude mcp add magic -- npx -y @anthropics/magic-mcp` |
| **FastMCP** | สร้าง MCP Server เอง | `pip install fastmcp` |

### การกำหนด MCP ใน Skill

```yaml
---
name: fullstack-developer
description: Full-stack development ครบวงจร
mcp_servers:
  - context7      # สำหรับค้นหา documentation
  - magic         # สำหรับสร้าง UI components
  - sequential    # สำหรับวิเคราะห์ซับซ้อน
---
```

---

## ตัวอย่าง Skills ยอดนิยม

### 1. Code Reviewer Skill

```markdown
---
name: strict-reviewer
description: Code review เข้มงวดตาม Google Engineering Standards
triggers:
  - review, ตรวจสอบ, รีวิว
  - "*.ts", "*.tsx", "*.js"
mcp_servers:
  - context7
  - sequential
personas:
  - analyzer
  - qa
---

# Strict Code Reviewer

## บทบาท
คุณเป็น Code Reviewer ที่เข้มงวด ไม่ยอมรับข้อผิดพลาด

## รายการตรวจสอบ
1. [ ] Type Safety - ทุก function มี return type
2. [ ] Error Handling - ทุก error ถูกจัดการ
3. [ ] Security - ไม่มี SQL Injection, XSS
4. [ ] Performance - ไม่มี N+1 queries
5. [ ] Testing - Critical paths มี tests

## รูปแบบผลลัพธ์
```
### 🔴 Critical Issues
- [File:Line] Description

### 🟡 Warnings
- [File:Line] Description

### 🟢 Suggestions
- [File:Line] Description
```
```

### 2. Thai Document Generator

```markdown
---
name: thai-docs
description: สร้างเอกสารภาษาไทยที่เป็นมืออาชีพ
triggers:
  - document, 文档, เอกสาร, คู่มือ
  - "*.md", "*.txt"
mcp_servers:
  - context7
personas:
  - scribe
---

# Thai Document Generator

## บทบาท
คุณเป็นนักเขียนเอกสารที่เชี่ยวชาญภาษาไทย

## หลักการเขียน
1. ใช้ภาษาไทยที่ถูกต้องตามหลักสถาบันราชภัฏ
2. แบ่งหัวข้อชัดเจน
3. มีตัวอย่างโค้ดประกอบ
4. สรุปที่ท้ายบท

## โครงสร้างเอกสาร
# หัวข้อหลัก
## หัวข้อย่อย
### รายละเอียด

**หมายเหตุ**: ข้อความสำคัญ
`โค้ด`: inline code
```

### 3. Multi-Language Skill (Thai + English)

```markdown
---
name: bilingual-assistant
description: ผู้ช่วยที่พูดได้ทั้งภาษาไทยและอังกฤษ
triggers:
  - ช่วย, help, อธิบาย, explain
---

# Bilingual Assistant

## การตรวจจับภาษา
- หากผู้ใช้พิมพ์ภาษาไทย → ตอบภาษาไทย
- หากผู้ใช้พิมพ์ภาษาอังกฤษ → ตอบภาษาอังกฤษ
- หากผู้ใช้พิมพ์ผสม → ตอบภาษาหลักที่ผู้ใช้ใช้มากกว่า

## การสลับภาษา
```typescript
function detectLanguage(input: string): 'th' | 'en' | 'mixed' {
  const thaiChars = input.match(/[\u0E00-\u0E7F]/g) || []
  const totalChars = input.replace(/\s/g, '').length
  const thaiRatio = thaiChars.length / totalChars

  if (thaiRatio > 0.7) return 'th'
  if (thaiRatio < 0.3) return 'en'
  return 'mixed'
}
```
```

---

## Best Practices

### ✅ ควรทำ

1. **รักษา Skill ให้สั้น**
   - YAML header: < 100 ตัวอักษร
   - เนื้อหา: < 2000 tokens

2. **ใช้ Triggers อย่างชาญฉลาด**
   ```yaml
   triggers:
     - คำหลัก: "api", "endpoint", "REST"
     - รูปแบบไฟล์: "routes/*", "controllers/*"
   ```

3. **แนะนำ MCP ที่เหมาะสม**
   ```yaml
   mcp_servers:
     - context7    # Frontend/Backend docs
     - sequential  # Complex analysis
   ```

4. **ผูกกับ Personas**
   ```yaml
   personas:
     - architect   # System design
     - security    # Security review
   ```

### ❌ ไม่ควรทำ

1. สร้าง Skill ที่ซับซ้อนเกินไป
2. ใส่โค้ดยาวๆ ใน SKILL.md (ใช้ `references/` แทน)
3. ลืมอัปเดตเมื่อโปรเจกต์เปลี่ยนแปลง

---

## การแก้ไขปัญหาทั่วไป

### ปัญหา: Skill ไม่ถูกเปิดใช้งาน

**สาเหตุ**:
- ชื่อโฟลเดอร์ไม่ตรงกับ `name` ใน YAML
- ทริกเกอร์ไม่ตรงกับบริบท

**แก้ไข**:
```bash
# ตรวจสอบตำแหน่งไฟล์
ls ~/.claude/skills/<skill-name>/SKILL.md

# ตรวจสอบ YAML syntax
cat SKILL.md | head -10
```

### ปัญหา: MCP Server ไม่ทำงาน

**สาเหตุ**:
- ไม่ได้ติดตั้ง MCP
- API Key ไม่ถูกต้อง

**แก้ไข**:
```bash
# ตรวจสอบ MCP ที่ติดตั้ง
claude mcp list

# เพิ่ม MCP ใหม่
claude mcp add context7 -- npx -y @upstash/context7-mcp

# ตั้งค่า API Key
export CONTEXT7_API_KEY=your_key_here
```

### ปัญหา: Context ไม่เพียงพอ

**แก้ไข**:
- ใช้ `--uc` flag เพื่อบีบอัด output
- แบ่งงานใหญ่เป็นงานย่อย
- ใช้ `references/` สำหรับเอกสารอ้างอิง

---

## แหล่งข้อมูลเพิ่มเติม

### แหล่งอ้างอิงจากการค้นหา:

1. [Code Claude Skills 使用指南](https://apifox.com/apiskills/claude-code-agent-skills-tutorial/) - คู่มือสร้าง Agent Skills พร้อมตัวอย่าง
2. [Claude Code 操作说明](https://m.runoob.com/claude-code/claude-code-symbols.html) - Slash commands, context injection, bash mode
3. [2026年Claude Code Skills完整指南](https://baijiahao.baidu.com/s?id=1855327721562179061) - Skills guide ฉบับสมบูรณ์
4. [Skills扩展 Claude 的功能](https://www.cnblogs.com/elesos/p/19530055) - การสร้างและจัดการ Skills
5. [Claude Code进阶：手动定制Skill与MCP深度解析](https://m.toutiao.com/a7588006903431610895/) - SKILL.md template structure
6. [MCP开发工具：Context7 安装配置与实战](https://m.blog.csdn.net/qq_34202873/article/details/157064267) - Context7 configuration

### แหล่งข้อมูลอย่างเป็นทางการ

- **Anthropic Skills Repository**: [github.com/anthropics/skills](https://github.com/anthropics/skills)
- **Claude Code Documentation**: [claude.ai/code](https://claude.ai/code)
- **OpenSkills Standard**: [agentskills.io](https://agentskills.io)

---

## สรุป

การสร้าง Skills สำหรับ Claude Code เป็นวิธีที่มีประสิทธิภาพในการขยายความสามารถของ AI assistant ให้ตรงกับความต้องการเฉพาะของโปรเจกต์

**จำไว้**: *"หากคุณทำอะไรมากกว่าสองครั้งต่อวัน ให้ทำเป็น Skill หรือ Slash Command"*

---

*เอกสารนี้สร้างขึ้นโดย Claude Code | วันที่: 23 กุมภาพันธ์ 2026*
