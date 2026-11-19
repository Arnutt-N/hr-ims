# Session Summary — Perch (Quill)

| Field | Value |
|-------|-------|
| **วันที่** | วันอังคารที่ 17 พฤศจิกายน 2569 (2026-11-17) เวลา 07:24 น. |
| **Agent** | `perch` (Perch Desktop / CLI — persona: Quill) |
| **Session Duration** | 16 พ.ย. 2569 20:43 → 17 พ.ย. 2569 07:24 น. |
| **Branch ที่ทำงาน** | ไม่มีการแตะ git — งานทั้งหมดเป็นการอ่านและเขียนเอกสารใน `PRPs/perch/` และ `.perch/skills/` |
| **สถานะรวม** | ✅ เสร็จครบทุกงาน · เขียนเอกสาร 5 ไฟล์ · สร้าง junction 21 ตัว · ไม่มีการแก้โค้ดแอป · ไม่มี commit |

> Iron Rules acknowledged — ไม่มี secret ถูกพิมพ์หรือ commit ในเซสชันนี้
> ไม่ได้แตะไฟล์ `.env` · ไม่ได้รันคำสั่งที่เขียนข้อมูลลงฐานข้อมูล · ไม่ได้ push/merge ใด ๆ

---

## 🎯 ภารกิจของเซสชันนี้

ผู้ใช้ขอให้ใช้ skill `pstack` (poteto-mode) ออกแบบและสร้าง **PRD + PRP plan** เพื่อเอาของดีจาก
`D:\00 hrProject\hr-ims\secrets\examples` มาปรับใช้กับ HR-IMS จากนั้นให้ validate แผนด้วย
skill `prp-validate-plan` และแก้ finding จนกว่าจะพร้อมลงมือ

**หมายเหตุเรื่อง skill:** pstack ติดตั้งอยู่จริงที่ `~/.agents/skills` (486 skill) แต่ Perch
ลงทะเบียนได้จำกัด — ดูรายละเอียดใน §Issues ข้อ 1

---

## ✅ Completed Work (งานที่ทำเสร็จ)

### 1. ตรวจและแก้ปัญหาระบบ skill — junction 21 ตัว

**ไฟล์ที่แก้:** `.perch/skills/` (สร้างใหม่ 21 junction) + `.gitignore` (เพิ่ม 2 บรรทัด)

**สิ่งที่พบ:** Perch ลงทะเบียน skill ผู้ใช้ได้จำกัดจำนวน และชุดที่รอด**ไม่เสถียรข้ามเซสชัน**

| แหล่ง | มี | ลงทะเบียนได้ |
|---|---|---|
| built-in | 13 | 13 |
| โปรเจกต์ `.agents/skills` | 17 | 17 |
| ผู้ใช้ `~/.perch/skills` | 113 | 40 |
| ผู้ใช้ `~/.agents/skills` | 486 | 32 |

พิสูจน์ด้วยการสร้าง junction ชื่อ `aaa-how` (เรียงหน้าสุด) → เข้ามาได้ แต่
`fixing-accessibility` ถูกเด้งออกทันที → เป็นการนับจำนวน ไม่ใช่การตัดตามตัวอักษร

**วิธีแก้:** skill ระดับโปรเจกต์มีโควต้าแยก ไม่ติดเพดาน 71 → วาง junction ที่ `.perch/skills/`

**junction ทั้ง 21 ตัว:**

```
architect  arena  ask-matt  blueprint  domain-modeling  extract-pattern
find-skills  how  interrogate  plan-canvas  poteto-mode  prp-validate-plan
pstack-reflect  pstack-tdd  setup-pstack  swarm  to-prd  ubiquitous-language
why  writing-plans  writing-skills
```

**เจอบั๊กเพิ่ม:** `pstack-tdd` และ `pstack-reflect` มี **UTF-8 BOM** (`EF BB BF`) ที่หัวไฟล์
ทำให้ Perch อ่าน frontmatter ไม่เจอและปฏิเสธ skill ทั้งที่ junction ถูก
→ ลบ BOM ออกจากต้นฉบับที่ `~/.agents/skills/` แล้วทั้งคู่ผ่าน

### 2. เขียน PRD — `PRPs/perch/2026-11-16_PRD_thai-procurement-utils.md`

**298 → 301 บรรทัด** (หลังแก้ finding)

กำหนดขอบเขต `lib/thai-procurement/` 6 โมดูล:

| โมดูล | หน้าที่ | ที่มาจาก spec |
|---|---|---|
| `money.ts` | integer สตางค์, `toSatang`, `fromSatang` | `egp/SPEC.md:688` |
| `baht-text.ts` | จำนวนเงินเป็นตัวอักษรไทย | `egp/SPEC.md:759` |
| `tax-id.ts` | checksum 13 หลัก + Zod schema | `egp/SPEC.md:758` |
| `vat-wht.ts` | VAT 7% + หัก ณ ที่จ่าย 1% | `egp/SPEC.md:686-707` |
| `thresholds.ts` | เกณฑ์วงเงิน 4 ระดับ | `egp/SPEC.md:737-744` |
| `fiscal.ts` | ปีงบประมาณ + วันทำการ | `egp/SPEC.md:680-684` |

**จุดที่สำคัญที่สุดใน PRD:** ระบุว่า `ProcureHub:570` บอกต้นแบบใช้ WHT **3% ซึ่งผิด**
สำหรับหน่วยงานรัฐ ต้องใช้ **1% ของยอดก่อน VAT** ถ้าลอกต้นแบบตามจะหักภาษีผู้ขายเกิน
**5,969.07 บาท** ในตัวอย่าง 289,000 บาท

### 3. เขียน PRP plan — `PRPs/perch/2026-11-16_PRP_thai-procurement-utils.md`

**1,134 → 1,500+ บรรทัด** — 7 task · 72 เทสต์ · โค้ดเต็มทุก step

| Task | เนื้อหา | เทสต์ |
|---|---|---|
| 1 | helper เงิน (integer สตางค์) | 5 |
| 2 | `bahtText` | 12 |
| 3 | `taxId` checksum | 6 |
| 4 | `fiscal` ปีงบ + วันทำการ | 11 |
| 5 | VAT/WHT | 26 |
| 6 | เกณฑ์วงเงิน | 10 |
| 7 | barrel + boundary test | 2 |

### 4. Validate แผน 3 รอบ — เจอบั๊กจริง 7 ตัว

**ไฟล์รายงาน:**
- `plan_reviews/2026-11-16_PRP_thai-procurement-utils-review.md`
- `plan_reviews/2026-11-17_PRP_thai-procurement-utils-revalidate.md`
- `plan_reviews/2026-11-17_PRP_thai-procurement-utils-validate-3.md`

**บั๊กที่เจอและแก้แล้ว (เรียงตามความรุนแรง):**

| # | บั๊ก | เจอได้อย่างไร | แก้เป็น |
|---|---|---|---|
| 1 | `fiscal.ts` ผสม Bangkok กับ UTC → วันจันทร์ถูกนับเป็นวันหยุด | รัน node พิสูจน์ | ยึดปฏิทินไทย + date-only cursor |
| 2 | `thresholdRules` มีช่องว่าง → ยอด 5,000.50 บาท throw | reviewer อ่าน + รันพิสูจน์ | half-open range `min <= x < max` |
| 3 | fixture `taxId` ไม่ผ่าน checksum ของสูตรตัวเอง | รัน Vitest จริง | เปลี่ยนเป็น `0105512345671` |
| 4 | `bahtText(1000001)` ออก "หนึ่งล้านหนึ่งบาท" | รัน Python ก่อนเขียนลงแผน | เพิ่ม `hasPreceding` |
| 5 | `npm run test:unit` ไม่มีจริงใน frontend | ตรวจ package.json | เปลี่ยนเป็น `npm test` |
| 6 | boundary test ใช้ `import.meta.url` → Vitest พัง | รันจริง | เปลี่ยนเป็น `__dirname` |
| 7 | boundary สแกนเจอคำ `next/` ในคอมเมนต์ตัวเอง | รันจริง | เปลี่ยนถ้อยคำคอมเมนต์ |

### 5. ตรวจด้วยการรันจริง — 72/72 ผ่าน

ดึงโค้ดทั้ง 7 โมดูล + 7 ไฟล์เทสต์จากแผน วางที่ path จริง แล้วรัน Vitest ของโปรเจค:

```
Test Files  7 passed (7)
     Tests  72 passed (72)
  Duration  138.08s
```

structural checker ผ่าน 6/6 หมวด: label ครบ · จำนวน `it()` ตรงทุก task · 23 exports = 23 barrel · ไม่มี placeholder · ไม่มี `test:unit` · ไม่มีโค้ด fiscal เก่า

---

## ⏳ Pending Work (งานที่ยังไม่ทำ)

### งานที่พร้อมลงมือทันที (แผนผ่านแล้ว)

- [ ] **ลงมือ Task 1–7 ตาม PRP** — โค้ดทุกบรรทัดรันผ่านแล้ว 72/72
      - Context: `PRPs/perch/2026-11-16_PRP_thai-procurement-utils.md`
      - ไม่แตะ schema ไม่แตะ DB ไม่แตะ Server Action
      - Priority: 🔴 High

### งานที่ยังค้างจากเซสชันก่อน (15–16 พ.ย.)

- [ ] **`docs/agents-enforcement-truth`** — push แล้วแต่ยังไม่เปิด PR
- [ ] **หนี้ assertion 8 ไฟล์** — security suite ที่เรียก `recordResult()` เจย ๆ จึงผ่านเสมอ
- [ ] **เพิ่ม job เป็น required checks** — `Backend · authz`, E2E, Lighthouse ยังไม่บล็อก merge
- [ ] **PR #24, #30** — ค้างและ `CONFLICTING`
- [ ] **ทำความสะอาด** — `hr-ims-pr26` (313 ไฟล์), `.audit/` (~50,298 ไฟล์), backup refs 3 ตัว

### งานที่รอเจ้าของตัดสินใจ

- [ ] **WHT 1% เทียบยอดก่อน VAT หรือรวม VAT · ต่อครั้งหรือต่อใบสั่ง** — `SchoolProc:904`
- [ ] **ครุภัณฑ์ qty > 1 แตกเป็นรายตัวหรือเก็บเป็นแถวเดียว** — `ProcureHub:904`
- [ ] **ค่าเสื่อม รายวันหรือรายเดือน · ปีแรกตามปีงบหรือปีปฏิทิน** — `SchoolProc:906`
- [ ] **เกณฑ์ครุภัณฑ์ต่ำกว่าเกณฑ์ 10,000 / ซอฟต์แวร์ 20,000 ใช่ไหม** — `SchoolProc:907`
- [ ] **ต้องมีขั้นอนุมัติการเบิก หรือเบิกตัดทันที** — `ProcureHub:906`
- [ ] **ต้อง migrate ข้อมูลจาก Google Sheets เดิมไหม** — `ProcureHub:902`
- [ ] **PlanBudget อยู่ที่ไหน** — เอกสารถูกอ้าง (`FixTrack:902`) แต่ไม่มีไฟล์ในโฟลเดอร์

---

## ⚠️ Issues & Observations (ปัญหา/ข้อสังเกต/ข้อแนะนำ)

- ⚠️ **Warning**: **Perch ลงทะเบียน skill ผู้ใช้ได้จำกัดและไม่เสถียรข้ามเซสชัน** — เพดานรวม
  ~71 ตัว (จาก `~/.perch/skills` 40 + `~/.agents/skills` 32) และชุดที่รอดสลับไปมาเอง
  ระหว่างเซสชัน (เทียบ 2 เซสชัน: ได้ `blueprint`/`why`/`writing-plans` มา แต่เสีย `how`)
  · แก้โดยใช้ junction ที่ `.perch/skills/` ซึ่งมีโควต้าแยก

- ⚠️ **Warning**: **`perch skills disable` ไม่ช่วยคืนช่อง** — ทดสอบแล้ว ปิด 5 ตัวแล้วจำนวน
  ที่ลงทะเบียนยังเป็น 101 เท่าเดิม มันแค่ซ่อน ไม่ได้ปลดเพดาน

- ⚠️ **Warning**: **`loadSkill` อ่าน registry ตอนเปิดเซสชัน** — junction ที่เพิ่มกลางเซสชัน
  จะยังไม่เห็นจนรีสตาร์ต Perch (แต่ `perch skills <name>` เห็นทันที)

- 🐛 **Bug (แก้แล้ว)**: **`pstack-tdd` และ `pstack-reflect` มี UTF-8 BOM** ที่หัวไฟล์
  ทำให้ Perch ขึ้นว่า `SKILL.md is missing a YAML frontmatter block` ทั้งที่ไฟล์มี `---` อยู่
  · ลบ BOM แล้วใช้ได้

- ⚠️ **Warning**: **reviewer อิสระหมดเวลาทุกครั้ง** — ส่ง 3 รอบ (รวม 8 agent) ทุกตัวหมดเวลา
  ที่ขีดจำกัด 30 นาที ใช้ 194k–663k tokens ต่อตัว · ผลคือ validation ต้องติดป้าย `limited`
  และคะแนนถูก cap ที่ 5 ตามกติกาของ skill แม้แผนจะผ่านการรันจริงแล้ว

- 📝 **Note**: **ประวัติแชท Perch CLI เป็น buffer ไม่ใช่ archive** — `recentMessages` เก็บแค่
  11 ข้อความล่าสุด, `/clear` ล้างทิ้ง, `cli-history.json` เก็บแค่ prompt ไม่มีคำตอบ
  · บนดิสก์มี thread แค่ 2 ไฟล์ · แหล่งประวัติที่เชื่อถือได้คือ session summary ใน
  `project-log-md/` เท่านั้น

- 📝 **Note**: **`Get-ChildItem -Recurse` บน repo นี้ timeout ที่ 120 วิ** (node_modules ใหญ่)
  · ต้องจำกัด path ให้แคบทุกครั้ง · `Select-String -Recurse` ก็ใช้ไม่ได้บน PowerShell 5.1

- 💡 **Suggestion**: **ควรเพิ่ม `.perch/` ทั้งโฟลเดอร์ลง `.gitignore`** — ตอนนี้ใส่แค่
  `.perch/skills/` ทำให้ `PERCH.md` และ `rules/` ยังขึ้น `??` อยู่

---

## 📂 Files Changed

| Action | File Path | Description |
|--------|-----------|-------------|
| Created | `PRPs/perch/2026-11-16_PRD_thai-procurement-utils.md` | PRD 6 โมดูล (301 บรรทัด) |
| Created | `PRPs/perch/2026-11-16_PRP_thai-procurement-utils.md` | PRP plan 7 task · 72 เทสต์ |
| Created | `PRPs/perch/plan_reviews/2026-11-16_PRP_thai-procurement-utils-review.md` | validate รอบ 1 |
| Created | `PRPs/perch/plan_reviews/2026-11-17_PRP_thai-procurement-utils-revalidate.md` | validate รอบ 2 |
| Created | `PRPs/perch/plan_reviews/2026-11-17_PRP_thai-procurement-utils-validate-3.md` | validate รอบ 3 |
| Created | `.perch/skills/` (21 junction) | skill ระดับโปรเจกต์ |
| Modified | `.gitignore` | เพิ่ม `.perch/skills/` (บรรทัด 147) |

**ไม่มีการแก้ไขไฟล์ใดใน HR-IMS** — ไม่แตะ `schema.prisma`, `lib/`, `backend/`, `frontend/`
ไม่มีการ commit, ไม่มีการ push, ไม่มีการเปิด PR
`git status frontend/ backend/` ว่าง

---

## 🔗 อ้างอิง

- PRD: `PRPs/perch/2026-11-16_PRD_thai-procurement-utils.md`
- PRP: `PRPs/perch/2026-11-16_PRP_thai-procurement-utils.md`
- รายงาน validate ล่าสุด: `PRPs/perch/plan_reviews/2026-11-17_PRP_thai-procurement-utils-validate-3.md`
- spec ต้นทาง: `secrets/examples/egp/SPEC.md`, `secrets/examples/ระบบบริหารงานพัสดุ/SPEC-procurement-system.md`
- session summary ก่อนหน้า: `project-log-md/perch/2026-11-16_1431_session-summary.md`
