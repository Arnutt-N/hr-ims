# Reference: Common Patterns for Bilingual Task Handler

Reusable patterns and examples for the skill.

---

## Language Detection Patterns

### Thai Keywords by Domain

```yaml
frontend_th:
  - สร้างหน้า
  - ออกแบบ UI
  - component
  - responsive
  - หน้าจอ
  - ปุ่ม
  - ฟอร์ม
  - ตาราง
  - การ์ด
  - modal

backend_th:
  - สร้าง API
  - endpoint
  - database
  - เชื่อม database
  - server
  - ระบบ
  - backend
  - จัดการข้อมูล
  - query
  - migration

testing_th:
  - ทดสอบ
  - test
  - spec
  - E2E
  - unit test
  - ความครอบคลุม
  - ตรวจสอบ

security_th:
  - ความปลอดภัย
  - ช่องโหว่
  - รักษาความปลอดภัย
  - authentication
  - authorization
  - permission
  - สิทธิ์

analysis_th:
  - วิเคราะห์
  - ตรวจสอบ
  - แก้ไข
  - debug
  - หาสาเหตุ
  - root cause
  - ปัญหา
  - issue

documentation_th:
  - เอกสาร
  - คู่มือ
  - อธิบาย
  - README
  - document
  - guide
```

### English Keywords by Domain

```yaml
frontend_en:
  - create page
  - design UI
  - component
  - responsive
  - screen
  - button
  - form
  - table
  - card
  - modal
  - dialog

backend_en:
  - create API
  - endpoint
  - database
  - connect database
  - server
  - system
  - backend
  - manage data
  - query
  - migration

testing_en:
  - test
  - spec
  - E2E
  - unit test
  - coverage
  - verify

security_en:
  - security
  - vulnerability
  - secure
  - authentication
  - authorization
  - permission

analysis_en:
  - analyze
  - review
  - fix
  - debug
  - find cause
  - root cause
  - problem
  - issue

documentation_en:
  - document
  - manual
  - explain
  - README
  - guide
```

---

## Response Templates

### Thai Response Template

```markdown
{greeting_th}

📋 **สิ่งที่จะทำ**:
{task_list_th}

🔧 **MCP**: {mcp_list}
👤 **Persona**: {persona}

---

{execution_content_th}
```

### English Response Template

```markdown
{greeting_en}

📋 **Tasks**:
{task_list_en}

🔧 **MCP**: {mcp_list}
👤 **Persona**: {persona}

---

{execution_content_en}
```

### Greetings

```yaml
thai_greetings:
  - ได้เลยครับ!
  - ได้ครับ!
  - ตกลงครับ!
  - เริ่มดำเนินการครับ!
  - เข้าใจแล้วครับ!

english_greetings:
  - Sure!
  - Got it!
  - I'll help with that!
  - Let me work on that!
  - Understood!
```

---

## MCP Selection Examples

### Example 1: Simple Frontend Component

**Input**: "Create a button component"

```yaml
analysis:
  language: en
  domain: frontend
  complexity: 0.2
  operations: [create]

mcp_selection:
  selected: [magic]
  reason: "Simple UI component, Magic MCP optimal"

persona: frontend
```

### Example 2: Complex Backend Feature

**Input**: "สร้างระบบ authentication สำหรับ API"

```yaml
analysis:
  language: th
  domain: [backend, security]
  complexity: 0.8
  operations: [create, analyze]

mcp_selection:
  selected: [context7, sequential]
  reason: "Complex auth system needs documentation lookup and systematic planning"

persona: [backend, security]
```

### Example 3: Bug Investigation

**Input**: "Fix the 500 error on inventory page"

```yaml
analysis:
  language: en
  domain: [backend, frontend]
  complexity: 0.6
  operations: [analyze, update]

mcp_selection:
  selected: [sequential]
  reason: "Debug task needs systematic analysis"

persona: [analyzer, backend]
```

### Example 4: Full Feature with Tests

**Input**: "สร้างหน้ารายงานสินค้าคงคลังพร้อม test"

```yaml
analysis:
  language: th
  domain: [frontend, backend, testing]
  complexity: 0.7
  operations: [create, test]

mcp_selection:
  selected: [magic, context7, playwright]
  reason: "Full-stack feature with UI, backend, and testing"

persona: [frontend, backend, qa]
```

---

## Complexity Scoring Guide

```yaml
complexity_factors:
  file_count:
    1-2 files: 0.1
    3-5 files: 0.3
    6-10 files: 0.5
    11-20 files: 0.7
    20+ files: 0.9

  operation_types:
    single_type: 0.1
    2 types: 0.3
    3 types: 0.5
    4+ types: 0.7

  domains:
    single_domain: 0.1
    2 domains: 0.3
    3 domains: 0.5
    4+ domains: 0.7

  security_sensitive:
    yes: +0.3
    no: 0

  database_changes:
    yes: +0.2
    no: 0

  breaking_changes:
    yes: +0.3
    no: 0

formula: |
  complexity = (
    file_count_score * 0.3 +
    operation_score * 0.2 +
    domain_score * 0.2 +
    security_bonus +
    database_bonus +
    breaking_bonus
  )
  complexity = min(1.0, max(0.0, complexity))
```

---

## Task Description Templates

### Thai Templates

```markdown
**หัวข้อ**: {brief_title}
**รายละเอียด**: {detailed_description}
**ประเภท**: {type}  # feature | bugfix | improvement | refactor | test
**ความสำคัญ**: {priority}  # low | medium | high | critical
**โดเมน**: {domains}
**MCP ที่ใช้**: {mcps}
**ขั้นตอน**:
1. {step_1}
2. {step_2}
3. {step_3}
```

### English Templates

```markdown
**Subject**: {brief_title}
**Description**: {detailed_description}
**Type**: {type}  # feature | bugfix | improvement | refactor | test
**Priority**: {priority}  # low | medium | high | critical
**Domains**: {domains}
**MCP Used**: {mcps}
**Steps**:
1. {step_1}
2. {step_2}
3. {step_3}
```

---

## Symbol Quick Reference

### Status Symbols
| Symbol | Meaning |
|--------|---------|
| ✅ | Completed / Passed |
| ❌ | Failed / Error |
| ⚠️ | Warning / Review needed |
| 🔄 | In Progress |
| ⏳ | Pending / Waiting |
| 🚨 | Critical / Urgent |
| 🎯 | Target / Goal |
| 📊 | Metrics / Data |
| 💡 | Insight / Tip |

### Domain Symbols
| Symbol | Domain |
|--------|--------|
| 🎨 | Design / Frontend |
| 🏗️ | Architecture |
| 🔒 | Security |
| ⚡ | Performance |
| 🧪 | Testing |
| 📝 | Documentation |
| 🔧 | Configuration |
| 📦 | Deployment |
| 🌐 | Network / Web |
| 📱 | Mobile / Responsive |

### MCP Symbols
| Symbol | MCP Server |
|--------|------------|
| 📚 | Context7 |
| 🧠 | Sequential |
| ✨ | Magic |
| 🎭 | Playwright |

---

## HR-IMS Project Patterns

### Server Action Pattern

```typescript
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Define schema
const schema = z.object({
  name: z.string().min(1),
  quantity: z.number().positive()
})

export async function createItem(formData: FormData) {
  // 1. Auth check
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  // 2. Role check
  if (!['admin', 'superadmin'].includes(session.user.role)) {
    return { error: 'Forbidden' }
  }

  // 3. Validate input
  const validated = schema.safeParse({
    name: formData.get('name'),
    quantity: Number(formData.get('quantity'))
  })
  if (!validated.success) {
    return { error: 'Invalid input', details: validated.error.flatten() }
  }

  // 4. Database operation
  const item = await prisma.inventoryItem.create({
    data: validated.data
  })

  // 5. Audit log
  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      tableName: 'InventoryItem',
      recordId: item.id.toString(),
      userId: parseInt(session.user.id),
      newData: item
    }
  })

  // 6. Revalidate
  revalidatePath('/inventory')

  return { success: true, data: item }
}
```

### Multi-Role Check Pattern

```typescript
async function checkUserRole(userId: number, requiredRoles: string[]): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: { role: true }
      }
    }
  })

  const hasRole = (slug: string) =>
    user?.userRoles.some(ur => ur.role.slug === slug) ?? false

  return requiredRoles.some(role => hasRole(role))
}
```

---

*Reference Version: 1.0.0*
