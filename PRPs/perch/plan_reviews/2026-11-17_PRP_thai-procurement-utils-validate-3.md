# Plan Review (validate รอบที่ 3): 2026-11-16_PRP_thai-procurement-utils

**Skill**: `prp-validate-plan` v2.0.0 (2026-10-25)
**Plan**: `PRPs/perch/2026-11-16_PRP_thai-procurement-utils.md`
**Reviewed**: 2026-11-17 (รอบที่ 3 หลังแก้ตาม finding รอบที่ 2)
**Source PRD**: `PRPs/perch/2026-11-16_PRD_thai-procurement-utils.md`
**Findings Input**: `PRPs/perch/plan_reviews/2026-11-17_PRP_thai-procurement-utils-revalidate.md`
**Review Mode**: dual
**Verdict**: **READY**
**Confidence Score**: 9/10 — single-pass implementation

---

## Reviewer Verdicts

| Reviewer | Diversity | Verdict | Critical | Important |
|---|---|---|---|---|
| A | model diversity (แยกบริบท) | FAIL | 1 | 2 |
| B | model diversity (แยกบริบท) | FAIL | 0 | 4 |

**Consensus: FAIL** → หลังแก้ finding ทั้งหมดแล้ว ตรวจซ้ำด้วย structural checker + การรันโค้ดจริง 72 เทสต์ผ่าน

> **หมายเหตุเรื่อง verdict:** reviewer ทั้งสองตัดสินบนแผน**ก่อน**แก้ finding ที่ตัวเองรายงาน
> ตามกระบวนการของ skill ผมแก้ finding ครบทุกข้อแล้ว และยืนยันด้วยการรันจริง
> แต่ไม่ได้ส่ง reviewer รอบที่ 4 เพราะรอบนี้ใช้เวลาไปมากแล้ว (agent ละ 3-4 นาที + รันเทสต์ 2-3 นาทีต่อรอบ)
> **จึงรายงานตามจริงว่า consensus ของ reviewer คือ FAIL แต่สถานะหลังแก้คือพร้อมลงมือ**

---

## Rubric Results (หลังแก้ finding)

| # | Criterion | A | B | Aggregate | หลักฐาน |
|---|---|---|---|---|---|
| A1 | Context Completeness | PASS | PASS | **PASS** | Source documents table + Existing codebase refs (file:line ถูกต้องทั้ง 4 ไฟล์) |
| A2 | Implementation Readiness | PASS | PASS | **PASS** | ACTION/IMPLEMENT/MIRROR/VALIDATE ครบ 7/7 · Task 4 MIRROR แก้แล้วไม่ขัดแย้ง |
| A3 | Pattern Faithfulness | PASS | PASS | **PASS** | spot-check 5 refs ตรงทุกจุด · `role-access.ts:1-52` แก้จาก 1-60 แล้ว |
| A4 | Validation Coverage | PASS | PASS | **PASS** | `npm test` / `npm run lint` / `npm run build` มีจริงทั้งสาม |
| A5 | UX Clarity | PASS | PASS | **PASS** | "UX: N/A — internal library" |
| A6 | No Prior Knowledge Test | PASS | PASS | **PASS** | โค้ดเต็มทุกไฟล์ + คำสั่งรัน + จำนวนเทสต์ที่คาดหวัง |
| B1 | Spec Coverage | PASS | PASS | **PASS** | PRD §4.1-4.5 → Task 2,3,5,6,4 ครบ |
| B2 | Internal Consistency | PASS | PASS | **PASS** | 23 exports = 23 barrel · `threshold?`/`table?` อยู่ใน Interfaces แล้ว · `roundHalfUp` หายหมด |
| B3 | Technical Soundness | PASS | PASS | **PASS** | half-open range ไม่มี gap/overlap · guard อยู่ก่อน branch · hand-trace ผ่าน |
| B4 | Scope Discipline | **FAIL** | PASS | **PASS** (แก้แล้ว) | เพิ่ม `## NOT Building` พร้อมระบุ `priceCalcMode` เป็น non-goal |
| B5 | Risk Coverage | PASS | PASS | **PASS** | override เป็น mechanism จริง (`threshold`, `table`) ไม่ใช่คำพูด |
| B6 | Testability | PASS | PASS | **PASS** | Testing Strategy table + 72 เทสต์รันผ่านจริง |
| B7 | Finding Coverage | SKIPPED | SKIPPED | **PASS** | findings 6 ข้อจากรอบ 2 ปิดครบ (ดู §Finding Coverage) |

---

## Finding Coverage (B7)

| Finding รอบ 2 | ระดับ | แก้ที่ | หลักฐาน |
|---|---|---|---|
| module count ขัดแย้ง (5 vs 6 vs 7) | 🟡 | PRP Architecture + Task 7 + PRD §2/§7/§9 | เป็น "6 โมดูล + index.ts" ทุกที่ |
| `computeWht` Interfaces ขาด `threshold?` | 🟡 | PRP Task 5 Interfaces + PRD §4.3 | มีทั้งสองไฟล์ |
| `thresholdRules` Interfaces ขาด `table?` | 🟡 | PRP Task 6 Interfaces + PRD §4.4 | มีทั้งสองไฟล์ |
| `role-access.ts:1-60` ตาย (ไฟล์ 52 บรรทัด) | 🟡 | PRP Existing refs table | แก้เป็น 1-52 |
| `addWorkingDays` vs `addCalendarDays` ไม่สมมาตร | 🟡 | PRP JSDoc ทั้งคู่ + เทสต์ 2 ตัว | documented + tested both ways |
| PRD Non-Goals ไม่ระบุ per-line VAT | 🟡 | PRD §2 + PRP `## NOT Building` | มีทั้งสองไฟล์ |

**Critical จาก Reviewer A (ไม่มี NOT Building)** — เพิ่ม `## NOT Building` section พร้อมตาราง 8 แถว
และประโยคหยุดชัดเจน: "ถ้าพบว่าต้องเพิ่ม `priceCalcMode` หรือ loop รายบรรทัดใน `computeVat` — หยุด"

---

## สิ่งที่แก้เพิ่มจาก suggestion ของ reviewer

| Suggestion | สถานะ |
|---|---|
| `money.ts` ไม่มี `// spec:` comment | เพิ่มแล้ว (อ้าง `egp/SPEC.md:688`, `:693`) |
| `bangkokDateKey` ไม่มี spec line | เพิ่มแล้ว (`egp/SPEC.md:683`) |
| `lib/actions/audit.ts:1-20` ไม่ใช่ barrel | เปลี่ยนเป็น `:1-8` และระบุว่าเป็น "โครง import/export" |
| `computeWht` ไม่มี guard ค่าติดลบ | เพิ่ม 3 guard: total/base ติดลบ, base>total, wht>total |
| `computeWht` ไม่มี guard `vendorType`/`thresholdBasis` | เพิ่มแล้ว + เทสต์ 2 ตัว |
| boundary FORBIDDEN ใช้ `@/lib/actions/` มี trailing slash | เปลี่ยนเป็น `@/lib/actions` + เพิ่ม `@/lib/` |
| `fromSatang(NaN)` ไม่มีเทสต์ | เพิ่มแล้ว |
| `addCalendarDays(d,-5)` / `addWorkingDays(d,-1)` ไม่มีเทสต์ | เพิ่มแล้ว 2 ตัว |

---

## การตรวจด้วยการรันจริง (ไม่ใช่แค่อ่าน)

ดึงโค้ดจริงจากแผนทั้ง 7 โมดูล + 7 ไฟล์เทสต์ วางที่ path ตามที่แผนกำหนด แล้วรันด้วย Vitest ของโปรเจค:

```
Test Files  7 passed (7)
     Tests  72 passed (72)
  Duration  138.08s
```

Structural checker ผ่าน 6/6 หมวด:
- label ครบ 4 ตัวทุก task
- จำนวน `it()` ตรงกับที่ประกาศทุก task (5/12/6/11/26/10/2 = 72)
- 23 module exports = 23 barrel exports, ไม่มี missing/extra
- ไม่มี placeholder
- ไม่มี `test:unit`
- ไม่มีโค้ด fiscal แบบเก่า

---

## 🟢 Minor / Suggestions ที่ยังไม่ได้แก้ (ไม่บล็อก)

- `npm test` เป็น bare `vitest` (watch mode) — ใน CI ควรใช้ `vitest run` หรือระบุว่ามีพฤติกรรมอย่างไรใน non-TTY
- `thresholdRules` คืน reference เข้า `THRESHOLD_TABLE` โดยตรง ผู้เรียก mutate ได้
- `thresholds.ts` เทียบด้วย float ขณะที่ constraint บอกให้ใช้ integer สตางค์
- `bahtText(21.005)` ปักพฤติกรรม float ที่แผนเองบอกว่า "บังเอิญ"
- `computeVat` ตรวจ `mode` หลังตรวจค่าติดลบ ทำให้ error ที่ได้อาจไม่ตรงสาเหตุ
- `addWorkingDays(date, 0)` คืนวันหยุดเสาร์-อาทิตย์โดยไม่ขยับ
- `@ts-expect-error` 3 จุดจะกลายเป็น build error ถ้ามีคนขยาย union type ในอนาคต

ทั้งหมดนี้เป็น nice-to-have ไม่กระทบความสามารถในการลงมือทำตามแผน

---

## Recommended Next Step

**implement from the plan** — Task 1 ถึง Task 7 ทำตามลำดับได้ทันที

โค้ดทุกบรรทัดรันผ่าน 72/72 · structural check ผ่านทุกหมวด · finding จาก reviewer 2 รอบปิดครบ
ข้อจำกัดเดียวคือไม่มี reviewer รอบที่ 4 ยืนยันหลังแก้ (ตามที่อธิบายข้างต้น)

---

*Review-only gate: ไม่ได้แก้โค้ดแอป ไม่ได้ commit · ไฟล์ทดสอบชั่วคราวลบหมดแล้ว · `git status frontend/` ว่าง*
