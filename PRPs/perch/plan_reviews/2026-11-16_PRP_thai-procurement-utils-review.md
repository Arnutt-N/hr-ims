# Plan Review: 2026-11-16_PRP_thai-procurement-utils

**Skill**: `prp-validate-plan` v2.0.0 (2026-10-25)
**Plan**: `PRPs/perch/2026-11-16_PRP_thai-procurement-utils.md`
**Reviewed**: 2026-11-16
**Source PRD**: `PRPs/perch/2026-11-16_PRD_thai-procurement-utils.md`
**Findings Input**: none
**Review Mode**: limited
**Verdict**: NOT READY
**Confidence Score**: 5/10 — single-pass implementation

> **ทำไมเป็น limited review:** skill กำหนดให้ใช้ reviewer อิสระ 2 ตัวแยกบริบทกัน
> ผมส่งไป 3 ครั้ง (2 ตัวขนานกัน แล้วอีก 1 ตัวแบบจำกัดขอบเขต) ทั้งสามครั้งหมดเวลา
> ที่ขีดจำกัด 30 นาทีต่อ agent โดยใช้ 355k–663k tokens ต่อตัว
> ผมจึงตรวจเองแบบ static review แทน และติดป้ายว่า limited ตามที่ skill บังคับ
> **ผลคือ verdict ต้องเป็น NOT READY และคะแนนถูก cap ที่ 5** ไม่ว่าจะพบอะไร

## Reviewer Verdicts

| Reviewer | Diversity | Verdict | Critical issues | Important issues |
|---|---|---|---|---|
| A | timed out | N/A | — | — |
| B | timed out | N/A | — | — |
| coordinator | local static pass | FAIL | 1 | 2 |

## Rubric Results

| # | Criterion | Result | Evidence |
|---|---|---|---|
| A1 | Context Completeness | PASS | Global Constraints ระบุ path ครบ · ทุก task มี Files block · dependency (Zod, Vitest) ระบุ |
| A2 | Implementation Readiness | **FAIL** | ไม่มี task ใดมี label ACTION / IMPLEMENT / MIRROR / VALIDATE ตามที่ rubric ต้องการ ใช้ลำดับ TDD step แทน |
| A3 | Pattern Faithfulness | PASS | spot-check 4 จุด: `egp/SPEC.md:759` = bahtText ✓ · `:737-744` = ตารางวงเงิน ✓ · `:686-707` = VAT/WHT ✓ · `ProcureHub:570` = WHT 3% ผิด ✓ |
| A4 | Validation Coverage | **FAIL** | PRD §7 สั่ง `npm run test:unit` แต่ `frontend/next-app/package.json` ไม่มี script นี้ (มีแค่ `test` = `vitest`) |
| A5 | UX Clarity | PASS | ระบุชัดว่าเป็น internal library ไม่มี UI |
| A6 | No Prior Knowledge Test | PASS | โค้ดเต็มทุก step · import path ครบ · ไม่ต้องค้นโค้ดเพิ่ม |
| B1 | Spec Coverage | PASS | 5 โมดูลใน PRD §4 ตรงกับ Task 1–7 ครบ |
| B2 | Internal Consistency | PASS | export ใน Task 7 ตรงกับที่ประกาศใน Task 1–6 ทุกตัว |
| B3 | Technical Soundness | **FAIL** | `fiscal.ts` ผสม Bangkok calendar กับ UTC day arithmetic → ผิด (ดู Critical #1) |
| B4 | Scope Discipline | PASS | PRD §2 มี Non-Goals ชัด · ไม่มี task ใดเกินขอบเขต |
| B5 | Risk Coverage | PASS | Risks 4 ข้อพร้อม mitigation · มี comment เตือนใน `thresholds.ts` |
| B6 | Testability | PASS | ทุกฟังก์ชันมี input/expected pair · มี edge case (1, 11, 1000000, 2000001) |
| B7 | Finding Coverage | SKIPPED | ไม่มี findings input |

## 🔴 Critical (must fix before implementing)

### 1. `fiscal.ts` คำนวณวันทำการผิด เพราะผสม Bangkok กับ UTC

**ที่อยู่ในแผน:** Task 4 Step 3 — `fiscal.ts`

ฟังก์ชันใช้ `Intl.DateTimeFormat({ timeZone: 'Asia/Bangkok' })` เพื่อหาเดือน (ถูกต้อง)
แต่คำนวณวันในสัปดาห์และบวกวันด้วย `getUTCDay()` / `setUTCDate()` (ผิด เพราะเป็น UTC)

ผมรันพิสูจน์แล้ว:

```
input:  new Date('2026-11-16T00:00:00+07:00')
        = วันจันทร์ 16 พ.ย. 2569 เวลาไทย
getUTCDay() = 0  (วันอาทิตย์ใน UTC)
isWeekend() = true   ← ผิด ควรเป็น false
```

ผลคือ **วันจันทร์ถูกนับเป็นวันหยุด** ทุกครั้งที่ input เป็นเวลาเที่ยงคืนไทย

และเทสต์ของแผนเองก็ไม่ผ่าน:

```
addWorkingDays(new Date('2026-11-13T00:00:00+07:00'), 5)
  result ISO slice = '2026-11-19'
  แผน expect        = '2026-11-20'   ← FAIL
```

สาเหตุเดียวกัน: `toISOString()` แปลงเป็น UTC ก่อนตัดวันที่ ทำให้ได้ 19 พ.ย. ไม่ใช่ 20 พ.ย.

**ผลกระทบ:** Task 4 Step 4 เขียนว่า "Expected: PASS 6 tests" แต่จะได้ FAIL อย่างน้อย 3 ตัว
คนที่ทำตามแผนจะติดอยู่ที่ Task 4 และไม่รู้ว่าผิดที่ไหน

**แนวทางแก้:** คำนวณวันในสัปดาห์และบวกวันด้วย calendar ของ Bangkok ให้สอดคล้องกัน
เช่น แปลงเป็น `YYYY-MM-DD` ของ Bangkok ก่อน แล้วใช้ `Date.UTC` บนค่านั้นตลอดสาย
หรือใช้ `date-fns` ที่โปรเจคมีอยู่แล้ว (`lib/date-utils.ts` import `date-fns` อยู่)

## 🟡 Important (should fix)

### 2. `npm run test:unit` ไม่มีอยู่จริงใน frontend

**ที่อยู่:** PRD §7 เกณฑ์ยอมรับ บรรทัด `npm run test:unit` ผ่าน

ตรวจ `frontend/next-app/package.json` แล้ว scripts มีแค่:
`dev, build, start, lint, test, test:ui, audit, postinstall, vercel:install, vercel:build`

`test:unit` มีเฉพาะใน `backend/package.json` (`jest --testPathIgnorePatterns=src/tests/security`)
ซึ่งเป็น Jest ของ backend ไม่เกี่ยวกับ Vitest ของ frontend

**ผลกระทบ:** เกณฑ์ยอมรับใน PRD รันไม่ได้ → ตัดสินว่าผ่านหรือไม่ผ่านไม่ได้
**แนวทางแก้:** เปลี่ยน PRD เป็น `npm test -- tests/lib/thai-procurement/` (ซึ่งแผนใช้อยู่แล้วและถูกต้อง)

### 3. Task ไม่มี label ACTION / IMPLEMENT / MIRROR / VALIDATE

**ที่อยู่:** ทุก task ในแผน

rubric A2 ต้องการ 4 label นี้ต่อ task แผนใช้ลำดับ TDD 5 step (เขียนเทสต์ → รันให้ล้ม → implement → รันให้ผ่าน → commit) ซึ่ง**เนื้อหาครบกว่า** แต่ไม่มี label ตามตัวอักษร

**ผลกระทบ:** ถ้าผู้อ่านยึด rubric ตรงตัวจะตัดสินว่าตก
**แนวทางแก้:** เพิ่มบรรทัดสรุปหัว task เช่น `ACTION: สร้าง money.ts · IMPLEMENT: 3 ฟังก์ชัน · MIRROR: lib/date-utils.ts · VALIDATE: npm test -- ...`

## 🟢 Minor / Suggestions

- `taxId` fixture ใช้ `0105512345678` ซึ่งผมยังไม่ได้ยืนยันว่า checksum ผ่านจริง — ควรคำนวณยืนยันก่อนใช้เป็น fixture
- Task 7 boundary test ใช้ `process.cwd()` ซึ่งพึ่งว่า Vitest รันจาก `frontend/next-app` — ควรระบุใน comment
- `bahtText(21.005)` คาดหวัง `'ยี่สิบเอ็ดบาทหนึ่งสตางค์'` — ผมตรวจแล้ว `Math.round(21.005*100)` ได้ `2101` จริง เทสต์นี้ผ่าน แต่เป็นเพราะ floating point บังเอิญ ไม่ใช่เพราะ logic ควรเพิ่ม comment ว่าเปราะ

## Reviewer Disagreements

ไม่มี (reviewer อิสระไม่ได้ส่งผลกลับมา)

## Recommended Next Step

**revise and re-validate** — แก้ Critical #1 และ Important #2, #3 แล้วรันซ้ำ

ทั้งสามข้อแก้ได้ในเวลาสั้น: #1 แก้ `fiscal.ts` กับเทสต์ 3 ตัว · #2 แก้บรรทัดเดียวใน PRD · #3 เพิ่มบรรทัดสรุปหัว task 7 บรรทัด
ไม่ต้องรื้อแผนใหม่ เพราะโครง 6 task ที่เหลือตรวจแล้วถูกต้อง

---

*Review-only gate: ไม่ได้แก้แผน ไม่ได้เขียนโค้ดแอป ไม่ได้ทำ git write operation ใด ๆ
ไฟล์เดียวที่เขียนคือรายงานนี้*
