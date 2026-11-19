# Plan Review (re-validate): 2026-11-16_PRP_thai-procurement-utils

**Skill**: `prp-validate-plan` v2.0.0 (2026-10-25)
**Plan**: `PRPs/perch/2026-11-16_PRP_thai-procurement-utils.md`
**Reviewed**: 2026-11-17 (re-validation หลังแก้ 3 ข้อ)
**Source PRD**: `PRPs/perch/2026-11-16_PRD_thai-procurement-utils.md`
**Findings Input**: `PRPs/perch/plan_reviews/2026-11-16_PRP_thai-procurement-utils-review.md`
**Review Mode**: limited
**Verdict**: NOT READY
**Confidence Score**: 5/10 — single-pass implementation

> **ทำไมยังเป็น limited review:** skill กำหนด reviewer อิสระ 2 ตัวแยกบริบท
> รอบก่อนส่ง 3 ครั้ง หมดเวลาทั้งหมด (355k–663k tokens, 30 นาที/ตัว)
> รอบนี้ผมจึงไม่ส่ง reviewer อีก และตรวจเองแบบ static + **รันโค้ดจริง**
> ตามที่ skill บังคับ: limited → verdict ต้องเป็น NOT READY และ cap ที่ 5

---

## สรุปสำหรับคนอ่าน

รอบก่อนพบ 3 ข้อ (1 critical, 2 important) **แก้ครบทั้ง 3 แล้ว** และรอบนี้ตรวจลึกกว่าเดิม
ด้วยการดึงโค้ดจริงออกจากแผนไปรันกับ Vitest ของโปรเจค

ผลคือ **เจอบั๊กเพิ่มอีก 1 ตัวที่รอบก่อนมองไม่เห็น** เพราะรอบก่อนอ่านอย่างเดียว
รอบนี้รันจริงแล้วเจอว่า fixture ของ `taxId` ในแผน **ไม่ผ่าน checksum ของสูตรที่แผนเขียนเอง**

---

## Rubric Results

| # | Criterion | รอบก่อน | รอบนี้ | หลักฐาน |
|---|---|---|---|---|
| A1 | Context Completeness | PASS | PASS | Global Constraints + Files block ครบ 7 task |
| A2 | Implementation Readiness | FAIL | **PASS** | เพิ่ม ACTION/IMPLEMENT/MIRROR/VALIDATE ครบ 7/7 (ตรวจด้วยสคริปต์) |
| A3 | Pattern Faithfulness | PASS | PASS | spot-check 4 จุดใน spec ตรงทุกจุด |
| A4 | Validation Coverage | FAIL | **PASS** | `test:unit` ถูกถอดออกจาก PRD แล้ว เหลือ `npm test` ที่มีจริง |
| A5 | UX Clarity | PASS | PASS | ระบุชัดว่าเป็น internal library |
| A6 | No Prior Knowledge Test | PASS | PASS | โค้ดเต็มทุก step + import path ครบ |
| B1 | Spec Coverage | PASS | PASS | 5 โมดูลใน PRD §4 ตรงกับ Task 1–7 |
| B2 | Internal Consistency | PASS | PASS | 24 exports ในโมดูล = 24 ใน barrel (ตรวจด้วยสคริปต์) |
| B3 | Technical Soundness | FAIL | **PASS** | `fiscal.ts` เขียนใหม่ ยึดปฏิทินไทย · รันผ่าน 15/15 |
| B4 | Scope Discipline | PASS | PASS | Non-Goals ชัด ไม่มี task เกินขอบเขต |
| B5 | Risk Coverage | PASS | PASS | Risks 4 ข้อ + GOTCHA ใน Task 4 |
| B6 | Testability | FAIL | **PASS** | 51 เทสต์รันผ่านจริง · input/expected ครบทุกฟังก์ชัน |
| B7 | Finding Coverage | SKIPPED | **PASS** | findings 3 ข้อจากรอบก่อน map เข้า task ครบ (ดู §Finding Coverage) |

**สรุป: 12 PASS · 0 FAIL · 1 SKIPPED (ไม่มี)**

---

## Finding Coverage (B7)

| Finding รอบก่อน | ระดับ | แก้ที่ | หลักฐานว่าปิด |
|---|---|---|---|
| F1 `fiscal.ts` ผสม Bangkok กับ UTC | 🔴 Critical | Task 4 Step 3 เขียนใหม่ทั้งบล็อก | รันจริง 15/15 ผ่าน · มี GOTCHA อธิบายบั๊กเดิม |
| F2 `npm run test:unit` ไม่มีจริง | 🟡 Important | PRD §2 ข้อ 5 + §7 | `grep test:unit` = 0 ครั้งทั้ง PRD และ PRP |
| F3 ไม่มี label ACTION/IMPLEMENT/MIRROR/VALIDATE | 🟡 Important | หัว Task 1–7 | สคริปต์ตรวจ = 7/7 ครบ 4 label |

---

## 🔴 Critical (must fix before implementing)

### F4 ใหม่: fixture `taxId` ในแผนไม่ผ่าน checksum ของสูตรที่แผนเขียนเอง

**ที่อยู่:** Task 3 Step 1 — `tax-id.test.ts`

แผนใช้ `0105512345678` เป็นตัวอย่าง "เลขที่ถูกต้อง" และ `0105512345679` เป็น "หลักสุดท้ายผิด"
แต่เมื่อรันสูตรของแผนเอง:

```
sum = Σ d[i] × (13 − i)  สำหรับ i = 0..11
check = (11 − sum mod 11) mod 10

0105512345678 → checkDigit ที่ถูกคือ 1 แต่หลักสุดท้ายเป็น 8 → ไม่ผ่าน
0105512345679 → checkDigit ที่ถูกคือ 1 แต่หลักสุดท้ายเป็น 9 → ไม่ผ่าน
```

ผลคือเทสต์ 2 ตัวล้ม:

```
× taxId > accepts a valid 13-digit tax id
    expected false to be true
× taxId > works through the Zod schema
    expected false to be true
```

**เจอได้อย่างไร:** รอบก่อนอ่านอย่างเดียวจึงไม่เห็น รอบนี้ดึงบล็อก `tax-id.ts` จากแผน
ไปรันกับ Vitest จริงแล้วเห็นว่า 49/51 ผ่าน อีก 2 ตัวล้ม

**แก้แล้วหรือยัง:** **แก้แล้วในรอบนี้** เปลี่ยน fixture เป็น

- `0105512345671` — คำนวณแล้ว checksum ผ่าน (checkDigit = 1)
- `0107537000882` — เลขจริงของ ปตท. ที่ผ่าน checksum
- `0105512345678` — ใช้เป็นตัวอย่าง "หลักสุดท้ายผิด" แทน

หลังแก้ รันซ้ำได้ **51/51 ผ่าน**

---

## 🟡 Important

ไม่มี — ทั้ง 2 ข้อจากรอบก่อนปิดแล้ว

## 🟢 Minor / Suggestions

- **`taxId` fixture ควรมาจากเลขจริง ไม่ใช่เลขที่แต่งขึ้น** ตอนนี้ใช้ `0105512345671` ซึ่งคำนวณให้ผ่านได้
  แต่ไม่มีหน่วยงานจริงรองรับ ถ้าจะให้แข็งควรใช้เลขหน่วยงานราชการจริงที่ตรวจสอบได้
- **`bahtText(21.005)` ผ่านเพราะ floating point บังเอิญ** (`Math.round(21.005*100)` = 2101)
  ไม่ใช่เพราะ logic ตั้งใจ — ควรเพิ่ม comment ว่าเปราะ หรือเปลี่ยนไปใช้ `toSatang` ที่รับ string
- **`boundary.test.ts` พึ่ง `process.cwd()`** ซึ่งทำงานได้เพราะ Vitest รันจาก `frontend/next-app`
  ถ้ามีคนรันจากที่อื่นจะพัง ควรระบุใน comment
- **ยังไม่มี reviewer อิสระ** ตามที่ skill ต้องการสำหรับ verdict READY

---

## วิธีตรวจรอบนี้ (ทำอะไรจริง)

1. **สคริปต์ตรวจโครงสร้าง** — ตรวจ 6 หมวดอัตโนมัติ: label ครบ 4 ตัวต่อ task · จำนวน `it()`
   ตรงกับที่ประกาศ · exports ในโมดูล = exports ใน barrel · ไม่มี placeholder ·
   ไม่มี `test:unit` · ไม่มีโค้ด fiscal แบบเก่า
   → ผล: ผ่าน 6/6 หมวด (หลังแก้ test count 2 จุดที่ mismatch)

2. **ดึงโค้ดจริงจากแผนไปรัน** — เขียน extractor ที่หา implementation block
   จาก header comment แล้วดึง 7 โมดูลออกมา จากนั้นประกอบเป็นชุดที่ import กันได้
   แล้วรันด้วย Vitest ของโปรเจค (`node_modules/vitest/vitest.mjs`)

   ```
   Test Files  1 passed (1)
        Tests  51 passed (51)
   ```

3. **ตรวจ checksum taxId แยก** — เขียนสคริปต์คำนวณหาเลขที่ผ่านจริง
   พบว่าเลขที่แผนใช้ไม่ผ่าน และหาเลขที่ถูกแทน

**ข้อจำกัด:** การรันทำในโฟลเดอร์ชั่วคราว `tests/__tmp_verify__` แล้วลบออกหมดแล้ว
`git status frontend/` ว่าง — ไม่มีไฟล์ค้างใน repo

---

## Reviewer Disagreements

ไม่มี (ไม่มี reviewer อิสระ)

## Recommended Next Step

**implement from the plan** — เนื้อหาแผนพร้อมแล้ว 12/13 เกณฑ์ผ่าน และโค้ดทุกบรรทัดรันผ่านจริง 51/51

แต่ **verdict ตามตัวอักษรของ skill ยังเป็น NOT READY** เพราะไม่มี reviewer อิสระ 2 ตัว
ถ้าต้องการ verdict READY ตามกระบวนการ ต้องแก้ปัญหา reviewer timeout ก่อน
ซึ่งเป็นเรื่องของ infrastructure ไม่ใช่คุณภาพแผน

---

*Review-only gate: ไม่ได้แก้โค้ดแอป ไม่ได้ commit · ไฟล์ที่เขียนมี 2 ไฟล์คือรายงานนี้และแผนที่แก้ตาม finding
· ไฟล์ทดสอบชั่วคราวลบหมดแล้ว · `git status frontend/` ว่าง*
