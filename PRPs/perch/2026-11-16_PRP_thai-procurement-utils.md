# PRP: ชุดเครื่องมือพัสดุราชการไทย (`lib/thai-procurement/`)

> **For agentic workers:** แผนนี้ทำ task-by-task ตาม checkbox แต่ละ task จบด้วยเทสต์ที่รันได้จริง

**Goal:** ให้ HR-IMS มี pure function ชุดเดียวสำหรับสูตรและตารางราชการที่ทุกโมดูลพัสดุเรียกใช้ร่วมกัน

**Architecture:** library บริสุทธิ์ 6 โมดูลใต้ `frontend/next-app/lib/thai-procurement/` (money, baht-text, tax-id, fiscal, vat-wht, thresholds) + `index.ts` เป็น barrel ไม่มี I/O ไม่มี Prisma ไม่ผูกกับ framework คำนวณเงินภายในด้วย integer สตางค์แล้วแปลงกลับที่ขอบ

**Tech Stack:** TypeScript, Vitest, Zod (v4 ตาม frontend)

**เอกสารอ้างอิง:** `PRPs/perch/2026-11-16_PRD_thai-procurement-utils.md`

## NOT Building (ขอบเขตที่ห้ามทำในเฟสนี้)

ส่วนนี้ผูกกับ Non-Goals ของ PRD §2 เพื่อกัน scope creep

| ห้ามทำ | เหตุผล |
|---|---|
| `Asset` model / ค่าเสื่อม / ราคาซาก | ต้องแก้ schema |
| ชั้นต้นทุน/ล็อต (`StockLot`) | ต้องแก้ schema |
| งบประมาณ / กันเบิกเกิน | ยังไม่ได้ไฟล์ PlanBudget |
| เอกสารพิมพ์ A4 | งานคนละเฟส |
| UI / component / route ใด ๆ | เฟสนี้เป็น library ล้วน |
| migration ข้อมูลจาก Google Sheets | ยังไม่ตัดสินใจ |
| **`priceCalcMode` (`PER_LINE` / `ON_TOTAL`) และ VAT รายบรรทัด** | **ต้องมีตาราง line item — `computeVat` รับยอดรวมก้อนเดียว (PRD §4.3)** |
| แก้ `schema.prisma`, `lib/date-utils.ts`, Server Action, `auth` | ตาม Global Constraints |

**ถ้าพบว่าต้องเพิ่ม `priceCalcMode` หรือ loop รายบรรทัดใน `computeVat` — หยุด** เพราะอยู่นอกขอบเขตเฟสนี้ ให้เปิด PRD ใหม่

---

## Source documents

แผนนี้อ้างอิง spec 4 ไฟล์ด้วยชื่อย่อ ด้านล่างคือ path จริง

| ชื่อย่อในแผน | path จริง | บรรทัดที่ใช้ |
|---|---|---|
| `egp/SPEC.md` | `secrets/examples/egp/SPEC.md` | 680-684, 686-707, 737-744, 746-755, 757-762, 934 |
| `SchoolProc` | `secrets/examples/egp/SPEC-egp-school-procurement.md` | 904, 906, 907 |
| `ProcureHub` | `secrets/examples/ระบบบริหารงานพัสดุ/SPEC-procurement-system.md` | 570-587, 902, 904, 906 |
| `FixTrack` | `secrets/examples/ระบบทะเบียนรับพัสดุครุภัณฑ์และแจ้งซ่อม/SPEC-repair-maintenance.md` | 688-712, 902, 905-921 |
| `StockReq` | `secrets/examples/ระบบคลังพัสดุ/SPEC.md` | — (อ้างเชิงบริบทเท่านั้น) |

หมายเหตุ: `egp/SPEC.md` กับ `egp/SPEC-egp-school-procurement.md` เป็นไฟล์เดียวกัน (MD5 ตรงกัน)

## Existing codebase references

| ไฟล์ | บรรทัด | ใช้เป็นแบบอย่างเรื่อง |
|---|---|---|
| `frontend/next-app/lib/date-utils.ts` | 1-73 | รูปแบบ named export ของ util วันที่ |
| `frontend/next-app/vitest.config.ts` | 1-50 | alias `@` → next-app root, `include` pattern |
| `frontend/next-app/lib/role-access.ts` | 1-52 | รูปแบบ const table + lookup function |
| `frontend/next-app/tests/actions/settings.test.ts` | 1-40 | รูปแบบไฟล์เทสต์ Vitest ของโปรเจค |

## Global Constraints

- ทุกไฟล์อยู่ใต้ `frontend/next-app/lib/thai-procurement/`
- เทสต์อยู่ใต้ `frontend/next-app/tests/lib/thai-procurement/`
- ห้าม import `@/lib/prisma`, `next/*`, `@/lib/actions/*`, `@/auth`
- ห้ามแก้ `backend/prisma/schema.prisma`
- ห้ามแก้ `lib/date-utils.ts` (ของเดิมยังใช้ได้ ปล่อยไว้)
- เงินคำนวณภายในด้วย integer สตางค์ (`Math.round(value * 100)`) แปลงกลับเป็น number ที่ return
- ทุกฟังก์ชันมี comment อ้างบรรทัด spec ต้นทางในรูปแบบ `// spec: egp/SPEC.md:759`
- อัตรา/เกณฑ์ที่ระเบียบกำหนดต้องเป็น parameter ที่ override ได้ ไม่ hard-code
- การปัดเศษทำที่ระดับสตางค์ด้วย `Math.round` (integer satang) — ไม่มี helper ปัดเศษแยก
- UX: N/A — internal library change ไม่มี user-visible surface ในเฟสนี้

---

### Task 1: ตั้งโครงโมดูลและ helper เงิน

**Files:**
- Create: `frontend/next-app/lib/thai-procurement/money.ts`
- Create: `frontend/next-app/tests/lib/thai-procurement/money.test.ts`

**Interfaces:**
- Produces: `toSatang(value: number | string): number`, `fromSatang(satang: number): number`

**ACTION:** สร้าง helper เงินที่คำนวณด้วย integer สตางค์
**IMPLEMENT:** `toSatang`, `fromSatang` ใน `money.ts`
**MIRROR:** รูปแบบ named export ของ util ตาม `lib/date-utils.ts:1-73` (export function เดี่ยว ไม่มี default export)
**VALIDATE:** `npm test -- tests/lib/thai-procurement/money.test.ts` (5 tests)

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

```ts
// frontend/next-app/tests/lib/thai-procurement/money.test.ts
import { describe, it, expect } from 'vitest';
import { toSatang, fromSatang } from '@/lib/thai-procurement/money';

describe('money', () => {
  it('converts baht to satang without float drift', () => {
    expect(toSatang(32394.39)).toBe(3239439);
    expect(toSatang('305.61')).toBe(30561);
    expect(toSatang(0.5)).toBe(50);
    expect(toSatang(0)).toBe(0);
  });

  it('converts satang back to baht', () => {
    expect(fromSatang(3239439)).toBe(32394.39);
    expect(fromSatang(50)).toBe(0.5);
  });

  it('rejects non-finite input', () => {
    expect(() => toSatang(NaN)).toThrow();
    expect(() => toSatang(Infinity)).toThrow();
  });

  it('rejects empty and whitespace strings', () => {
    expect(() => toSatang('')).toThrow();
    expect(() => toSatang('   ')).toThrow();
  });

  it('rejects non-finite satang on the way back', () => {
    expect(() => fromSatang(NaN)).toThrow();
    expect(() => fromSatang(Infinity)).toThrow();
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าล้ม**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/money.test.ts`
Expected: FAIL — ไม่พบ module `@/lib/thai-procurement/money`

- [ ] **Step 3: เขียน implementation**

```ts
// frontend/next-app/lib/thai-procurement/money.ts
/**
 * เงินในระบบนี้คำนวณภายในด้วย integer สตางค์
 * เพื่อกัน floating point drift ที่ทำให้ยอดสตางค์เพี้ยน
 *
 * spec: egp/SPEC.md:688 (lineAmount round 2, ROUND_HALF_UP)
 *       egp/SPEC.md:693 (wht = round2(whtBase × rate))
 * หมายเหตุ: ไม่มี helper ปัดเศษแยก — ปัดที่ระดับสตางค์ด้วย Math.round
 */

const SATANG_PER_BAHT = 100;

export function toSatang(value: number | string): number {
  if (typeof value === 'string' && value.trim() === '') {
    throw new TypeError('toSatang: ไม่รับสตริงว่าง');
  }
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) {
    throw new TypeError(`toSatang: ต้องเป็นจำนวนจำกัด ได้รับ ${String(value)}`);
  }
  return Math.round(n * SATANG_PER_BAHT);
}

export function fromSatang(satang: number): number {
  if (!Number.isFinite(satang)) {
    throw new TypeError(`fromSatang: ต้องเป็นจำนวนจำกัด ได้รับ ${String(satang)}`);
  }
  return satang / SATANG_PER_BAHT;
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/money.test.ts`
Expected: PASS 5 tests

แล้วรัน lint: `cd frontend/next-app; npm run lint` — ต้องไม่มี error ใหม่

- [ ] **Step 5: commit**

```bash
# Iron Rule 1 ของ AGENTS.md: ห้าม commit บน main — สร้าง branch ก่อน (ครั้งแรกครั้งเดียว)
git checkout -b feat/thai-procurement-money
git add frontend/next-app/lib/thai-procurement/money.ts frontend/next-app/tests/lib/thai-procurement/money.test.ts
git commit -m "feat(thai-procurement): add satang money helpers"
```

---

### Task 2: `bahtText` — จำนวนเงินเป็นตัวอักษรไทย

**Files:**
- Create: `frontend/next-app/lib/thai-procurement/baht-text.ts`
- Create: `frontend/next-app/tests/lib/thai-procurement/baht-text.test.ts`

**Interfaces:**
- Consumes: `toSatang` จาก Task 1
- Produces: `bahtText(amount: number | string): string`

**ACTION:** สร้างตัวแปลงจำนวนเงินเป็นตัวอักษรไทย
**IMPLEMENT:** `bahtText` + helper `readSixDigits` / `readIntegerBaht` ใน `baht-text.ts`
**MIRROR:** ใช้ `toSatang` จาก Task 1 เป็นขอบเขตความแม่นยำ
**VALIDATE:** `npm test -- tests/lib/thai-procurement/baht-text.test.ts` (12 tests)
- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน (fixture จาก spec ทุกตัว)**

```ts
// frontend/next-app/tests/lib/thai-procurement/baht-text.test.ts
import { describe, it, expect } from 'vitest';
import { bahtText } from '@/lib/thai-procurement/baht-text';

describe('bahtText', () => {
  // fixture ทั้ง 5 ตัวจาก spec: egp/SPEC.md:759
  it('handles baht and satang', () => {
    expect(bahtText(32394.39)).toBe(
      'สามหมื่นสองพันสามร้อยเก้าสิบสี่บาทสามสิบเก้าสตางค์'
    );
  });

  it('handles เอ็ด in units position', () => {
    expect(bahtText(305.61)).toBe('สามร้อยห้าบาทหกสิบเอ็ดสตางค์');
  });

  it('handles ยี่สิบ and บาทถ้วน', () => {
    expect(bahtText(21)).toBe('ยี่สิบเอ็ดบาทถ้วน');
  });

  it('handles satang only (no baht)', () => {
    expect(bahtText(0.5)).toBe('ห้าสิบสตางค์');
  });

  it('handles ล้าน with เอ็ด', () => {
    expect(bahtText(1000001)).toBe('หนึ่งล้านเอ็ดบาทถ้วน');
  });

  // เคสขอบที่กันการถอยหลัง: หน่วย 1 เดี่ยว ๆ ต้องเป็น "หนึ่ง" ไม่ใช่ "เอ็ด"
  it('keeps หนึ่ง for a bare unit', () => {
    expect(bahtText(1)).toBe('หนึ่งบาทถ้วน');
    expect(bahtText(1000000)).toBe('หนึ่งล้านบาทถ้วน');
  });

  it('handles เอ็ด after a million group', () => {
    expect(bahtText(2000001)).toBe('สองล้านเอ็ดบาทถ้วน');
  });

  it('handles สิบเอ็ด', () => {
    expect(bahtText(11)).toBe('สิบเอ็ดบาทถ้วน');
  });

  it('handles zero', () => {
    expect(bahtText(0)).toBe('ศูนย์บาทถ้วน');
  });

  it('accepts string input', () => {
    expect(bahtText('21.00')).toBe('ยี่สิบเอ็ดบาทถ้วน');
  });

  // หมายเหตุ: 21.005 ผ่านเพราะ floating point บังเอิญ (Math.round(21.005*100) = 2101)
  // ไม่ใช่เพราะ logic ตั้งใจ — ถ้าต้องการความแม่นยำจริงให้ส่งเป็น string
  it('rounds to 2 decimals before converting', () => {
    expect(bahtText(21.004)).toBe('ยี่สิบเอ็ดบาทถ้วน');
    expect(bahtText(21.005)).toBe('ยี่สิบเอ็ดบาทหนึ่งสตางค์');
    expect(bahtText('21.005')).toBe('ยี่สิบเอ็ดบาทหนึ่งสตางค์');
  });

  it('rejects negative amounts', () => {
    expect(() => bahtText(-1)).toThrow();
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าล้ม**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/baht-text.test.ts`
Expected: FAIL — ไม่พบ module `@/lib/thai-procurement/baht-text`

- [ ] **Step 3: เขียน implementation**

```ts
// frontend/next-app/lib/thai-procurement/baht-text.ts
/**
 * จำนวนเงินเป็นตัวอักษรไทย
 * spec: egp/SPEC.md:759 (§4.10)
 */

import { toSatang } from './money';

const DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

/** แปลงกลุ่ม 6 หลัก (0..999999) เป็นคำไทย
 *  hasPreceding = มีหลักนำหน้ามาแล้ว (เช่น กลุ่มล้าน) → หน่วย 1 อ่าน "เอ็ด" */
function readSixDigits(n: number, hasPreceding = false): string {
  if (n === 0) return '';
  let out = '';
  const s = String(n).padStart(6, '0');

  for (let i = 0; i < 6; i++) {
    const d = Number(s[i]);
    if (d === 0) continue;
    const place = 5 - i; // 5=แสน .. 0=หน่วย

    if (place === 0) {
      // หลักหน่วย: 1 ที่มีหลักอื่นนำหน้า → เอ็ด
      // ต้องเช็คทั้งหลักในกลุ่มนี้ (n > 1) และกลุ่มที่นำหน้ามาแล้ว (hasPreceding)
      out += d === 1 && (n > 1 || hasPreceding) ? 'เอ็ด' : DIGITS[d];
    } else if (place === 1) {
      // หลักสิบ: 2 → ยี่สิบ, 1 → สิบ (ไม่ใช่หนึ่งสิบ)
      if (d === 2) out += 'ยี่สิบ';
      else if (d === 1) out += 'สิบ';
      else out += DIGITS[d] + 'สิบ';
    } else {
      out += DIGITS[d] + PLACES[place];
    }
  }
  return out;
}

/** แปลงจำนวนเต็มบาทเป็นคำไทย (รองรับเกินล้าน อ่านซ้ำชุดละ 6 หลัก) */
function readIntegerBaht(baht: number, hasPreceding = false): string {
  if (baht === 0) return DIGITS[0];

  const millions = Math.floor(baht / 1_000_000);
  const rest = baht % 1_000_000;

  let out = '';
  if (millions > 0) {
    out += readIntegerBaht(millions) + 'ล้าน';
  }
  out += readSixDigits(rest, hasPreceding || millions > 0);
  return out;
}

export function bahtText(amount: number | string): string {
  const satang = toSatang(amount);

  if (satang < 0) {
    throw new RangeError('bahtText: ไม่รองรับจำนวนติดลบ');
  }

  const baht = Math.floor(satang / 100);
  const satangPart = satang % 100;

  const bahtWords = readIntegerBaht(baht);

  if (satangPart === 0) {
    return `${bahtWords}บาทถ้วน`;
  }

  const satangWords = readSixDigits(satangPart);

  // ไม่มีบาท (0 บาท) → ขึ้นต้นด้วยสตางค์ตรง ๆ
  if (baht === 0) {
    return `${satangWords}สตางค์`;
  }

  return `${bahtWords}บาท${satangWords}สตางค์`;
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/baht-text.test.ts`
Expected: PASS 12 tests

แล้วรัน lint: `cd frontend/next-app; npm run lint` — ต้องไม่มี error ใหม่

- [ ] **Step 5: commit**

```bash
# ถ้าทำครบทุก task ในรอบเดียว ให้อยู่บน branch เดียวกันได้
# ถ้าแยก PR ตาม PR Strategy ให้สร้าง branch ใหม่: git checkout -b feat/thai-procurement-baht-text
git add frontend/next-app/lib/thai-procurement/baht-text.ts frontend/next-app/tests/lib/thai-procurement/baht-text.test.ts
git commit -m "feat(thai-procurement): add bahtText with spec fixtures"
```

---

### Task 3: `taxId` checksum 13 หลัก

**Files:**
- Create: `frontend/next-app/lib/thai-procurement/tax-id.ts`
- Create: `frontend/next-app/tests/lib/thai-procurement/tax-id.test.ts`

**Interfaces:**
- Produces: `normalizeTaxId(input: string): string`, `isValidTaxId(input: string): boolean`, `taxIdSchema` (Zod)

**ACTION:** สร้างตัวตรวจเลขผู้เสียภาษี 13 หลัก
**IMPLEMENT:** `normalizeTaxId`, `isValidTaxId`, `taxIdSchema` ใน `tax-id.ts`
**MIRROR:** ใช้ `z` จาก `zod` v4 ตามที่ frontend ติดตั้ง (`^4.3.5`)
**VALIDATE:** `npm test -- tests/lib/thai-procurement/tax-id.test.ts` (6 tests)

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

```ts
// frontend/next-app/tests/lib/thai-procurement/tax-id.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeTaxId, isValidTaxId, taxIdSchema } from '@/lib/thai-procurement/tax-id';

describe('taxId', () => {
  it('strips dashes and spaces', () => {
    expect(normalizeTaxId('0-1055-12345-67-1')).toBe('0105512345671');
    expect(normalizeTaxId(' 0105512345671 ')).toBe('0105512345671');
  });

  it('accepts a valid 13-digit tax id', () => {
    // 0105512345671 — คำนวณด้วยสูตรในไฟล์นี้แล้ว checksum ผ่าน (checkDigit = 1)
    // เป็นเลขสังเคราะห์สำหรับเทสต์ ไม่ใช่เลขหน่วยงานจริง
    expect(isValidTaxId('0105512345671')).toBe(true);
    // 0107537000882 — เลขจริงของ บริษัท ปตท. จำกัด (มหาชน) ที่ผ่าน checksum
    expect(isValidTaxId('0107537000882')).toBe(true);
  });

  it('rejects a wrong check digit', () => {
    // 0105512345678 มีหลักสุดท้ายผิด (ควรเป็น 1)
    expect(isValidTaxId('0105512345678')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidTaxId('010551234567')).toBe(false);
    expect(isValidTaxId('01055123456789')).toBe(false);
  });

  it('rejects non-digits', () => {
    expect(isValidTaxId('01055123456ab')).toBe(false);
  });

  it('works through the Zod schema', () => {
    expect(taxIdSchema.safeParse('0-1055-12345-67-1').success).toBe(true);
    expect(taxIdSchema.safeParse('0105512345678').success).toBe(false);
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าล้ม**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/tax-id.test.ts`
Expected: FAIL — ไม่พบ module

- [ ] **Step 3: เขียน implementation**

```ts
// frontend/next-app/lib/thai-procurement/tax-id.ts
/**
 * เลขประจำตัวผู้เสียภาษี 13 หลัก
 * spec: egp/SPEC.md:758 (§4.10)
 *   sum = Σ d[i] × (13 − i)  สำหรับ i = 0..11
 *   check = (11 − sum mod 11) mod 10  ต้องเท่ากับ d[12]
 */

import { z } from 'zod';

export function normalizeTaxId(input: string): string {
  return input.replace(/[\s-]/g, '');
}

export function isValidTaxId(input: string): boolean {
  const id = normalizeTaxId(input);
  if (!/^\d{13}$/.test(id)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(id[i]) * (13 - i);
  }

  const check = (11 - (sum % 11)) % 10;
  return check === Number(id[12]);
}

export const taxIdSchema = z
  .string()
  .transform(normalizeTaxId)
  .refine(isValidTaxId, { message: 'เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง' });
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/tax-id.test.ts`
Expected: PASS 6 tests

แล้วรัน lint: `cd frontend/next-app; npm run lint` — ต้องไม่มี error ใหม่

- [ ] **Step 5: commit**

```bash
# อยู่บน branch ของ Task 1 หรือสร้างใหม่ถ้าแยก PR
git add frontend/next-app/lib/thai-procurement/tax-id.ts frontend/next-app/tests/lib/thai-procurement/tax-id.test.ts
git commit -m "feat(thai-procurement): add tax id checksum validator"
```

---

### Task 4: `fiscal` — ปีงบประมาณและวันทำการ

**Files:**
- Create: `frontend/next-app/lib/thai-procurement/fiscal.ts`
- Create: `frontend/next-app/tests/lib/thai-procurement/fiscal.test.ts`

**Interfaces:**
- Produces: `fiscalYearOf(date: Date): number`, `fiscalQuarterOf(date: Date): 1 | 2 | 3 | 4`, `addWorkingDays(date: Date, n: number, holidays?: Date[]): Date`, `addCalendarDays(date: Date, n: number): Date`, `bangkokDateKey(date: Date): string`

**ACTION:** สร้างตัวคำนวณปีงบประมาณและวันทำการตามปฏิทินไทย
**IMPLEMENT:** `bangkokYmd`, `fromBangkokYmd`, `bangkokDateKey`, `fiscalYearOf`, `fiscalQuarterOf`, `addWorkingDays`, `addCalendarDays` ใน `fiscal.ts`
**MIRROR:** ใช้ `Intl.DateTimeFormat` เพื่อดึงปี/เดือน/วันตาม timezone — ต่างจาก `lib/date-utils.ts:1-73` ที่ใช้ `date-fns` + locale `th` และพึ่ง timezone ของเครื่อง (ซึ่งเป็นเหตุที่ต้องเขียนใหม่)
**VALIDATE:** `npm test -- tests/lib/thai-procurement/fiscal.test.ts` (11 tests)

**GOTCHA — อ่านก่อนเขียน:** อย่าใช้ `getUTCDay()` หรือ `setUTCDate()` กับ Date ที่แทนเวลาไทย
เที่ยงคืนไทย = 17:00 UTC ของวันก่อนหน้า ดังนั้น `getUTCDay()` จะคืนวันในสัปดาห์ของ **เมื่อวาน**
ผลคือวันจันทร์เวลาไทยถูกนับเป็นวันอาทิตย์ → ถูกมองเป็นวันหยุด

พิสูจน์แล้วด้วยการรันจริง:

```
new Date('2026-11-16T00:00:00+07:00')   = จันทร์ 16 พ.ย. เวลาไทย
getUTCDay()                              = 0  (อาทิตย์ใน UTC)
isWeekend() แบบใช้ getUTCDay()           = true   ← ผิด

addWorkingDays(13 พ.ย. +07:00, 5) แบบเดิม
  ผลลัพธ์เวลาไทย                         = ศ. 20 พ.ย. (ถูก)
  แต่ toISOString().slice(0,10)          = '2026-11-19'  ← เทสต์พัง
```

วิธีที่ถูกคือ **ยึดปฏิทินไทยเป็นหลัก** แล้วคำนวณใน date-only space:

1. แปลง Date → ปี/เดือน/วัน ตาม `Asia/Bangkok` ด้วย `Intl.DateTimeFormat`
2. คำนวณวันในสัปดาห์และบวกวันบน `Date.UTC(y, m-1, d)` ซึ่งเป็น date-only ปลอดภัยจาก timezone/DST
3. แปลงกลับเป็น Date จริงที่เที่ยงคืนไทย (`Date.UTC(...) - 7h`)
4. เทียบวันหยุดด้วย date key ของไทย ไม่ใช่ `toISOString()`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

```ts
// frontend/next-app/tests/lib/thai-procurement/fiscal.test.ts
import { describe, it, expect } from 'vitest';
import {
  fiscalYearOf,
  fiscalQuarterOf,
  addWorkingDays,
  addCalendarDays,
  bangkokDateKey,
} from '@/lib/thai-procurement/fiscal';

describe('fiscal', () => {
  // spec: egp/SPEC.md:681 — 14 พ.ย. 2026 = ปีงบ 2570
  it('computes fiscal year starting in October', () => {
    expect(fiscalYearOf(new Date('2026-11-14T00:00:00+07:00'))).toBe(2570);
    expect(fiscalYearOf(new Date('2026-09-30T00:00:00+07:00'))).toBe(2569);
    expect(fiscalYearOf(new Date('2026-10-01T00:00:00+07:00'))).toBe(2570);
  });

  // spec: egp/SPEC.md:682 — Q1 ต.ค.–ธ.ค.
  it('computes fiscal quarter', () => {
    expect(fiscalQuarterOf(new Date('2026-11-14T00:00:00+07:00'))).toBe(1);
    expect(fiscalQuarterOf(new Date('2027-01-15T00:00:00+07:00'))).toBe(2);
    expect(fiscalQuarterOf(new Date('2027-04-15T00:00:00+07:00'))).toBe(3);
    expect(fiscalQuarterOf(new Date('2027-07-15T00:00:00+07:00'))).toBe(4);
  });

  // spec: egp/SPEC.md:755 — ซื้อ ศ. 13 พ.ย. 2569 + 5 วันทำการ = ศ. 20 พ.ย. 2569
  it('adds working days skipping weekends', () => {
    const friday = new Date('2026-11-13T00:00:00+07:00');
    const result = addWorkingDays(friday, 5);
    // เทียบด้วย date key ของไทย ไม่ใช่ toISOString ซึ่งเป็น UTC
    expect(bangkokDateKey(result)).toBe('2026-11-20');
  });

  it('skips provided holidays', () => {
    const friday = new Date('2026-11-13T00:00:00+07:00');
    const holiday = new Date('2026-11-16T00:00:00+07:00');
    const result = addWorkingDays(friday, 5, [holiday]);
    expect(bangkokDateKey(result)).toBe('2026-11-23');
  });

  // regression: วันจันทร์เวลาไทยต้องเป็นวันทำการ ไม่ใช่วันหยุด
  it('treats a Bangkok Monday as a working day', () => {
    const monday = new Date('2026-11-16T00:00:00+07:00');
    const result = addWorkingDays(monday, 1);
    expect(bangkokDateKey(result)).toBe('2026-11-17');
  });

  // regression: วันเสาร์-อาทิตย์เวลาไทยต้องถูกข้าม
  it('skips a Bangkok weekend', () => {
    const friday = new Date('2026-11-13T00:00:00+07:00');
    const result = addWorkingDays(friday, 1);
    expect(bangkokDateKey(result)).toBe('2026-11-16'); // ข้าม ส-อา ไปจันทร์
  });

  // spec: egp/SPEC.md:750 — รับเงินยืม 15 พ.ย. 2569 + 15 วัน = จ. 30 พ.ย. 2569
  it('adds calendar days', () => {
    const start = new Date('2026-11-15T00:00:00+07:00');
    const result = addCalendarDays(start, 15);
    expect(bangkokDateKey(result)).toBe('2026-11-30');
  });

  it('keeps the Bangkok calendar date on a zero-day round trip', () => {
    const d = new Date('2026-11-16T00:00:00+07:00');
    expect(bangkokDateKey(addCalendarDays(d, 0))).toBe('2026-11-16');
  });

  it('produces a Bangkok date key, not a UTC one', () => {
    // เที่ยงคืนไทย 16 พ.ย. = 17:00 UTC 15 พ.ย.
    const d = new Date('2026-11-16T00:00:00+07:00');
    expect(bangkokDateKey(d)).toBe('2026-11-16');
    expect(d.toISOString().slice(0, 10)).toBe('2026-11-15'); // ยืนยันว่า UTC ต่างจากไทยจริง
  });

  it('supports negative n for calendar days', () => {
    const d = new Date('2026-11-16T00:00:00+07:00');
    expect(bangkokDateKey(addCalendarDays(d, -5))).toBe('2026-11-11');
  });

  it('rejects negative n for working days', () => {
    expect(() => addWorkingDays(new Date('2026-11-16T00:00:00+07:00'), -1)).toThrow();
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าล้ม**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/fiscal.test.ts`
Expected: FAIL — ไม่พบ module `@/lib/thai-procurement/fiscal`

- [ ] **Step 3: เขียน implementation**

```ts
// frontend/next-app/lib/thai-procurement/fiscal.ts
/**
 * ปีงบประมาณ พ.ศ. และวันทำการ
 * spec: egp/SPEC.md:680-684, :746-755
 *
 * หลักการ: ยึดปฏิทิน Asia/Bangkok เป็นความจริง
 * คำนวณวันในสัปดาห์และบวกวันบน date-only space (Date.UTC) แล้วแปลงกลับเป็นเที่ยงคืนไทย
 * ห้ามใช้ getUTCDay()/setUTCDate() กับ Date ที่แทนเวลาไทยโดยตรง
 * เพราะเที่ยงคืนไทย = 17:00 UTC ของวันก่อนหน้า → วันในสัปดาห์จะเพี้ยนไปหนึ่งวัน
 */

const TZ = 'Asia/Bangkok';
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

interface BangkokYmd {
  year: number;
  month: number;
  day: number;
}

/** ดึงปี/เดือน/วันตามปฏิทินไทย ไม่ขึ้นกับ timezone ของเครื่องที่รัน */
function bangkokYmd(date: Date): BangkokYmd {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === 'year')!.value),
    month: Number(parts.find((p) => p.type === 'month')!.value),
    day: Number(parts.find((p) => p.type === 'day')!.value),
  };
}

/** แปลงปี/เดือน/วันของไทยกลับเป็น Date ที่เที่ยงคืนไทย */
function fromBangkokYmd(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - BKK_OFFSET_MS);
}

/** date key แบบ YYYY-MM-DD ตามปฏิทินไทย ใช้เทียบวันหยุด
 *  spec: egp/SPEC.md:683 (timezone Asia/Bangkok) */
export function bangkokDateKey(date: Date): string {
  const { year, month, day } = bangkokYmd(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** spec: egp/SPEC.md:681 — (เดือน ≥ ต.ค. ? ปี ค.ศ.+1 : ปี ค.ศ.) + 543 */
export function fiscalYearOf(date: Date): number {
  const { year, month } = bangkokYmd(date);
  const fiscalCe = month >= 10 ? year + 1 : year;
  return fiscalCe + 543;
}

/** spec: egp/SPEC.md:682 — Q1 ต.ค.–ธ.ค. */
export function fiscalQuarterOf(date: Date): 1 | 2 | 3 | 4 {
  const { month } = bangkokYmd(date);
  if (month >= 10) return 1;
  if (month >= 7) return 4;
  if (month >= 4) return 3;
  return 2;
}

/** spec: egp/SPEC.md:684 — ข้ามเสาร์-อาทิตย์และ Holiday (รับเฉพาะ n >= 0) */
export function addWorkingDays(date: Date, n: number, holidays: Date[] = []): Date {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError('addWorkingDays: n ต้องเป็นจำนวนเต็มไม่ติดลบ');
  }

  const holidayKeys = new Set(holidays.map(bangkokDateKey));
  const { year, month, day } = bangkokYmd(date);

  // date-only cursor: ปลอดภัยจาก timezone และ DST
  const cursor = new Date(Date.UTC(year, month - 1, day));
  let added = 0;

  while (added < n) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);

    const dow = cursor.getUTCDay();
    if (dow === 0 || dow === 6) continue;

    const key = bangkokDateKey(cursor);
    if (holidayKeys.has(key)) continue;

    added++;
  }

  return fromBangkokYmd(
    cursor.getUTCFullYear(),
    cursor.getUTCMonth() + 1,
    cursor.getUTCDate()
  );
}

/** spec: egp/SPEC.md:750 — นับวันปฏิทิน (รับ n ติดลบได้เพื่อย้อนหลัง) */
export function addCalendarDays(date: Date, n: number): Date {
  if (!Number.isInteger(n)) {
    throw new RangeError('addCalendarDays: n ต้องเป็นจำนวนเต็ม');
  }

  const { year, month, day } = bangkokYmd(date);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  cursor.setUTCDate(cursor.getUTCDate() + n);

  return fromBangkokYmd(
    cursor.getUTCFullYear(),
    cursor.getUTCMonth() + 1,
    cursor.getUTCDate()
  );
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/fiscal.test.ts`
Expected: PASS 11 tests

แล้วรัน lint: `cd frontend/next-app; npm run lint` — ต้องไม่มี error ใหม่

- [ ] **Step 5: commit**

```bash
# อยู่บน branch ของ Task 1 หรือสร้างใหม่ถ้าแยก PR
git add frontend/next-app/lib/thai-procurement/fiscal.ts frontend/next-app/tests/lib/thai-procurement/fiscal.test.ts
git commit -m "feat(thai-procurement): add fiscal year and working day helpers"
```

---

### Task 5: `vat-wht` — VAT 7% และหัก ณ ที่จ่าย 1%

**Files:**
- Create: `frontend/next-app/lib/thai-procurement/vat-wht.ts`
- Create: `frontend/next-app/tests/lib/thai-procurement/vat-wht.test.ts`

**Interfaces:**
- Consumes: `toSatang`, `fromSatang` จาก Task 1
- Produces:
  - `type VatMode = 'INCLUDED' | 'EXCLUDED' | 'EXEMPT'`
  - `type VendorType = 'JURISTIC' | 'INDIVIDUAL'`
  - `computeVat(input: { amount: number; mode: VatMode; rate?: number }): { base: number; vat: number; total: number }`
  - `computeWht(input: { base: number; total: number; vendorType: VendorType; isFarmProduce?: boolean; rate?: number; thresholdBasis?: 'TOTAL' | 'BASE'; threshold?: number }): { applies: boolean; wht: number; netPay: number; form: 'ภ.ง.ด.53' | 'ภ.ง.ด.3' }`

**บริบทที่ต้องอ่านก่อนเขียน:** `ProcureHub:570` ระบุว่าต้นแบบใช้ 3% ซึ่งน่าจะผิดสำหรับหน่วยงานรัฐ
และให้เหตุผล 3 ข้อ (อัตรา 1%, ฐานก่อน VAT, เกณฑ์ขั้นต่ำ) **ห้ามทำ parity ตามต้นแบบ**

**ACTION:** สร้างตัวคำนวณ VAT 7% และหัก ณ ที่จ่าย 1% ตามกฎหน่วยงานรัฐ
**IMPLEMENT:** `computeVat`, `computeWht` + ค่าคงที่ `DEFAULT_VAT_RATE`, `DEFAULT_WHT_RATE`, `WHT_THRESHOLD_JURISTIC`, `WHT_THRESHOLD_INDIVIDUAL` ใน `vat-wht.ts`
**MIRROR:** ใช้ `toSatang`/`fromSatang` จาก Task 1 เป็นขอบเขตความแม่นยำ
**VALIDATE:** `npm test -- tests/lib/thai-procurement/vat-wht.test.ts` (26 tests) — ต้องมีเทสต์ `does NOT reproduce the prototype 3% of gross error` ผ่านด้วย

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน (fixture จาก spec ทุกตัว)**

```ts
// frontend/next-app/tests/lib/thai-procurement/vat-wht.test.ts
import { describe, it, expect } from 'vitest';
import { computeVat, computeWht } from '@/lib/thai-procurement/vat-wht';

describe('computeVat', () => {
  // spec: egp/SPEC.md:690
  it('handles EXCLUDED', () => {
    expect(computeVat({ amount: 10000, mode: 'EXCLUDED' })).toEqual({
      base: 10000, vat: 700, total: 10700,
    });
  });

  // spec: egp/SPEC.md:689
  it('handles INCLUDED', () => {
    expect(computeVat({ amount: 10700, mode: 'INCLUDED' })).toEqual({
      base: 10000, vat: 700, total: 10700,
    });
  });

  // spec: egp/SPEC.md:691
  it('handles EXEMPT', () => {
    expect(computeVat({ amount: 20000, mode: 'EXEMPT' })).toEqual({
      base: 20000, vat: 0, total: 20000,
    });
  });

  // spec: egp/SPEC.md:694 — total 32,700 INCLUDED → base 30,560.75
  it('matches the spec fixture for 32700 INCLUDED', () => {
    const r = computeVat({ amount: 32700, mode: 'INCLUDED' });
    expect(r.base).toBe(30560.75);
    expect(r.total).toBe(32700);
  });

  // spec: egp/SPEC.md:705 — 432,000 INCLUDED → vat 28,261.68 base 403,738.32
  it('matches the spec fixture for 432000 INCLUDED', () => {
    const r = computeVat({ amount: 432000, mode: 'INCLUDED' });
    expect(r.vat).toBe(28261.68);
    expect(r.base).toBe(403738.32);
  });

  // spec: egp/SPEC.md:696 — อัตราต้อง override ได้
  it('honours an overridden rate', () => {
    expect(computeVat({ amount: 10000, mode: 'EXCLUDED', rate: 0.1 })).toEqual({
      base: 10000, vat: 1000, total: 11000,
    });
  });

  it('rejects an unknown mode', () => {
    // @ts-expect-error ทดสอบ runtime guard
    expect(() => computeVat({ amount: 100, mode: 'BOGUS' })).toThrow();
  });});

describe('computeWht', () => {
  // spec: egp/SPEC.md:694 — wht 305.61 net 32,394.39
  it('matches the spec fixture for 32700 INCLUDED juristic', () => {
    const r = computeWht({
      base: 30560.75, total: 32700, vendorType: 'JURISTIC',
    });
    expect(r.applies).toBe(true);
    expect(r.wht).toBe(305.61);
    expect(r.netPay).toBe(32394.39);
    expect(r.form).toBe('ภ.ง.ด.53');
  });

  // spec: egp/SPEC.md:705 — 432,000 INCLUDED → wht 4,037.38 net 427,962.62
  it('matches the spec fixture for 432000 INCLUDED juristic', () => {
    const r = computeWht({
      base: 403738.32, total: 432000, vendorType: 'JURISTIC',
    });
    expect(r.wht).toBe(4037.38);
    expect(r.netPay).toBe(427962.62);
  });

  // spec: egp/SPEC.md:705 — 10,700 INCLUDED → wht 100 net 10,600
  it('matches the spec fixture for 10700 INCLUDED juristic', () => {
    const r = computeWht({
      base: 10000, total: 10700, vendorType: 'JURISTIC',
    });
    expect(r.wht).toBe(100);
    expect(r.netPay).toBe(10600);
  });

  // spec: egp/SPEC.md:705 — บุคคลธรรมดา 20,000 EXEMPT → wht 200 net 19,800
  it('matches the spec fixture for 20000 EXEMPT individual', () => {
    const r = computeWht({
      base: 20000, total: 20000, vendorType: 'INDIVIDUAL',
    });
    expect(r.wht).toBe(200);
    expect(r.netPay).toBe(19800);
    expect(r.form).toBe('ภ.ง.ด.3');
  });

  // spec: egp/SPEC.md:705 — บุคคลธรรมดา 4,500 → ไม่หัก
  it('does not withhold below the individual threshold', () => {
    const r = computeWht({
      base: 4500, total: 4500, vendorType: 'INDIVIDUAL',
    });
    expect(r.applies).toBe(false);
    expect(r.wht).toBe(0);
    expect(r.netPay).toBe(4500);
  });

  it('does not withhold below the juristic threshold', () => {
    const r = computeWht({
      base: 400, total: 400, vendorType: 'JURISTIC',
    });
    expect(r.applies).toBe(false);
    expect(r.wht).toBe(0);
  });

  // spec: egp/SPEC.md:702 — พืชผลเกษตรยกเว้น
  it('exempts farm produce', () => {
    const r = computeWht({
      base: 100000, total: 100000, vendorType: 'INDIVIDUAL', isFarmProduce: true,
    });
    expect(r.applies).toBe(false);
    expect(r.wht).toBe(0);
  });

  // กันการถอยหลัง: ต้องไม่ตรงกับตัวเลขต้นแบบ 3% ของยอดรวม
  // spec: ProcureHub:585 — ต้นแบบ 289,000 → wht 8,670 (ผิด)
  it('does NOT reproduce the prototype 3% of gross error', () => {
    const r = computeWht({
      base: 270093.46, total: 289000, vendorType: 'JURISTIC',
    });
    expect(r.wht).toBe(2700.93);
    expect(r.wht).not.toBe(8670);
  });

  // spec: egp/SPEC.md:696 — อัตราต้อง override ได้
  it('honours an overridden rate', () => {
    const r = computeWht({
      base: 10000, total: 10700, vendorType: 'JURISTIC', rate: 0.03,
    });
    expect(r.wht).toBe(300);
  });

  // spec: SchoolProc:904 — เกณฑ์เทียบยอดก่อนหรือรวม VAT ยังเปิดอยู่ → ต้องเลือกได้
  it('supports thresholdBasis BASE', () => {
    const withTotal = computeWht({ base: 9000, total: 12000, vendorType: 'INDIVIDUAL' });
    expect(withTotal.applies).toBe(true);

    const withBase = computeWht({
      base: 9000, total: 12000, vendorType: 'INDIVIDUAL', thresholdBasis: 'BASE',
    });
    expect(withBase.applies).toBe(false);
  });

  it('honours an overridden threshold', () => {
    const r = computeWht({
      base: 1000, total: 1000, vendorType: 'JURISTIC', threshold: 100,
    });
    expect(r.applies).toBe(true);
    expect(r.wht).toBe(10);
  });

  it('rejects an unknown vendorType', () => {
    // @ts-expect-error ทดสอบ runtime guard
    expect(() => computeWht({ base: 1000, total: 1000, vendorType: 'BOGUS' })).toThrow();
  });

  it('rejects an unknown thresholdBasis', () => {
    expect(() =>
      computeWht({
        base: 1000, total: 1000, vendorType: 'JURISTIC',
        // @ts-expect-error ทดสอบ runtime guard
        thresholdBasis: 'BOGUS',
      })
    ).toThrow();
  });

  it('rejects negative amounts', () => {
    expect(() => computeWht({ base: -1000, total: 1000, vendorType: 'JURISTIC' })).toThrow();
    expect(() => computeWht({ base: 1000, total: -1000, vendorType: 'JURISTIC' })).toThrow();
  });

  it('rejects base greater than total', () => {
    expect(() => computeWht({ base: 2000, total: 1000, vendorType: 'JURISTIC' })).toThrow();
  });

  it('rejects wht greater than total', () => {
    // rate สูงเกินจริงทำให้ wht > total → netPay ติดลบ ต้อง throw
    expect(() =>
      computeWht({ base: 1000, total: 1000, vendorType: 'JURISTIC', rate: 2 })
    ).toThrow();
  });

  it('applies the exact 500 juristic boundary', () => {
    expect(computeWht({ base: 500, total: 500, vendorType: 'JURISTIC' }).applies).toBe(true);
    expect(computeWht({ base: 499.99, total: 499.99, vendorType: 'JURISTIC' }).applies).toBe(false);
  });

  it('applies the exact 10000 individual boundary', () => {
    expect(computeWht({ base: 10000, total: 10000, vendorType: 'INDIVIDUAL' }).applies).toBe(true);
    expect(computeWht({ base: 9999.99, total: 9999.99, vendorType: 'INDIVIDUAL' }).applies).toBe(false);
  });

  // chain: computeVat -> computeWht ต้องต่อกันได้จริง ไม่ใช่ hard-code base
  it('chains computeVat into computeWht end to end', () => {
    const vat = computeVat({ amount: 289000, mode: 'INCLUDED' });
    const wht = computeWht({
      base: vat.base, total: vat.total, vendorType: 'JURISTIC',
    });
    expect(vat.base).toBe(270093.46);
    expect(wht.wht).toBe(2700.93);
    expect(wht.netPay).toBe(286299.07);
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าล้ม**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/vat-wht.test.ts`
Expected: FAIL — ไม่พบ module

- [ ] **Step 3: เขียน implementation**

```ts
// frontend/next-app/lib/thai-procurement/vat-wht.ts
/**
 * VAT 7% และหัก ณ ที่จ่าย
 * spec: egp/SPEC.md:686-707 (§4.4) + ProcureHub:570-587 (§5.2)
 *
 * สำคัญ: ต้นแบบ ProcureHub ใช้ WHT 3% ของยอดรวม VAT ซึ่ง spec ระบุว่าผิด
 * หน่วยงานของรัฐหัก 1% ของยอดก่อน VAT (ม.69 ทวิ / ม.50(4))
 */

import { toSatang, fromSatang } from './money';

export type VatMode = 'INCLUDED' | 'EXCLUDED' | 'EXEMPT';
export type VendorType = 'JURISTIC' | 'INDIVIDUAL';

/** ค่าตั้งต้นตาม spec — override ได้เสมอ ไม่ใช่ค่าตายตัว */
export const DEFAULT_VAT_RATE = 0.07;
export const DEFAULT_WHT_RATE = 0.01;
export const WHT_THRESHOLD_JURISTIC = 500;
export const WHT_THRESHOLD_INDIVIDUAL = 10000;

/** spec: egp/SPEC.md:688-691 */
export function computeVat(input: {
  amount: number;
  mode: VatMode;
  rate?: number;
}): { base: number; vat: number; total: number } {
  const rate = input.rate ?? DEFAULT_VAT_RATE;
  const amount = toSatang(input.amount);

  if (amount < 0) throw new RangeError('computeVat: ไม่รองรับจำนวนติดลบ');

  const VALID_MODES: readonly VatMode[] = ['INCLUDED', 'EXCLUDED', 'EXEMPT'];
  if (!VALID_MODES.includes(input.mode)) {
    throw new RangeError(`computeVat: mode ไม่ถูกต้อง ได้รับ ${String(input.mode)}`);
  }

  if (input.mode === 'EXEMPT') {
    return { base: fromSatang(amount), vat: 0, total: fromSatang(amount) };
  }

  if (input.mode === 'EXCLUDED') {
    const vat = Math.round(amount * rate);
    return {
      base: fromSatang(amount),
      vat: fromSatang(vat),
      total: fromSatang(amount + vat),
    };
  }

  // INCLUDED: total = amount, base = total / (1 + rate)
  const base = Math.round(amount / (1 + rate));
  return {
    base: fromSatang(base),
    vat: fromSatang(amount - base),
    total: fromSatang(amount),
  };
}

/** spec: egp/SPEC.md:693, :697-703 + ProcureHub:578-581 */
export function computeWht(input: {
  base: number;
  total: number;
  vendorType: VendorType;
  isFarmProduce?: boolean;
  rate?: number;
  thresholdBasis?: 'TOTAL' | 'BASE';
  /** เกณฑ์ขั้นต่ำ override ได้ตาม spec: egp/SPEC.md:696 (config ไม่ hard-code) */
  threshold?: number;
}): {
  applies: boolean;
  wht: number;
  netPay: number;
  form: 'ภ.ง.ด.53' | 'ภ.ง.ด.3';
} {
  const rate = input.rate ?? DEFAULT_WHT_RATE;
  const basis = input.thresholdBasis ?? 'TOTAL';

  const VALID_VENDORS: readonly VendorType[] = ['JURISTIC', 'INDIVIDUAL'];
  if (!VALID_VENDORS.includes(input.vendorType)) {
    throw new RangeError(`computeWht: vendorType ไม่ถูกต้อง ได้รับ ${String(input.vendorType)}`);
  }
  const VALID_BASES = ['TOTAL', 'BASE'] as const;
  if (!VALID_BASES.includes(basis)) {
    throw new RangeError(`computeWht: thresholdBasis ไม่ถูกต้อง ได้รับ ${String(basis)}`);
  }

  const form = input.vendorType === 'JURISTIC' ? 'ภ.ง.ด.53' : 'ภ.ง.ด.3';

  const totalSatang = toSatang(input.total);
  const baseSatang = toSatang(input.base);

  if (totalSatang < 0 || baseSatang < 0) {
    throw new RangeError('computeWht: ไม่รองรับจำนวนติดลบ');
  }
  if (baseSatang > totalSatang) {
    throw new RangeError('computeWht: base ต้องไม่มากกว่า total');
  }

  const basisSatang = basis === 'TOTAL' ? totalSatang : baseSatang;

  const defaultThreshold =
    input.vendorType === 'JURISTIC'
      ? WHT_THRESHOLD_JURISTIC
      : WHT_THRESHOLD_INDIVIDUAL;
  const threshold = toSatang(input.threshold ?? defaultThreshold);

  const applies =
    !input.isFarmProduce && basisSatang >= threshold;

  if (!applies) {
    return { applies: false, wht: 0, netPay: fromSatang(totalSatang), form };
  }

  const whtSatang = Math.round(baseSatang * rate);

  if (whtSatang > totalSatang) {
    throw new RangeError('computeWht: wht ต้องไม่มากกว่า total (netPay จะติดลบ)');
  }

  return {
    applies: true,
    wht: fromSatang(whtSatang),
    netPay: fromSatang(totalSatang - whtSatang),
    form,
  };
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/vat-wht.test.ts`
Expected: PASS 26 tests

แล้วรัน lint: `cd frontend/next-app; npm run lint` — ต้องไม่มี error ใหม่

- [ ] **Step 5: commit**

```bash
# อยู่บน branch ของ Task 1 หรือสร้างใหม่ถ้าแยก PR
git add frontend/next-app/lib/thai-procurement/vat-wht.ts frontend/next-app/tests/lib/thai-procurement/vat-wht.test.ts
git commit -m "feat(thai-procurement): add VAT and WHT with 1% base-before-VAT rule"
```

---

### Task 6: `thresholds` — เกณฑ์วงเงิน 4 ระดับ

**Files:**
- Create: `frontend/next-app/lib/thai-procurement/thresholds.ts`
- Create: `frontend/next-app/tests/lib/thai-procurement/thresholds.test.ts`

**Interfaces:**
- Produces: `type ThresholdTier`, `ThresholdRule`, `thresholdRules(amount: number, table?: readonly ThresholdRule[]): ThresholdRule`, `THRESHOLD_TABLE`

**ACTION:** สร้างตารางเกณฑ์วงเงิน 4 ระดับพร้อมฟังก์ชันเลือกแถว
**IMPLEMENT:** `THRESHOLD_TABLE` + `thresholdRules` ใน `thresholds.ts`
**MIRROR:** โครง const table + lookup function ตาม `lib/role-access.ts:1-52`
**VALIDATE:** `npm test -- tests/lib/thai-procurement/thresholds.test.ts` (10 tests)

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

```ts
// frontend/next-app/tests/lib/thai-procurement/thresholds.test.ts
import { describe, it, expect } from 'vitest';
import { thresholdRules } from '@/lib/thai-procurement/thresholds';

describe('thresholdRules', () => {
  // spec: egp/SPEC.md:740-743 — ขอบเขตทั้ง 4 ระดับ
  it('classifies <= 5000 as tier 1', () => {
    expect(thresholdRules(5000).tier).toBe(1);
    expect(thresholdRules(0).tier).toBe(1);
  });

  it('classifies 5001-100000 as tier 2', () => {
    expect(thresholdRules(5001).tier).toBe(2);
    expect(thresholdRules(100000).tier).toBe(2);
  });

  it('classifies 100001-500000 as tier 3', () => {
    expect(thresholdRules(100001).tier).toBe(3);
    expect(thresholdRules(500000).tier).toBe(3);
  });

  it('classifies > 500000 as tier 4', () => {
    expect(thresholdRules(500001).tier).toBe(4);
  });

  it('returns the full rule row for tier 4', () => {
    const r = thresholdRules(600000);
    expect(r.egpRequired).toBe(true);
    expect(r.planAnnouncementRequired).toBe(true);
    expect(r.inspectionCommitteeMin).toBe(3);
    expect(r.guaranteePercent).toBe(5);
  });

  it('returns the full rule row for tier 1', () => {
    const r = thresholdRules(3000);
    expect(r.egpRequired).toBe(false);
    expect(r.planAnnouncementRequired).toBe(false);
    expect(r.inspectionCommitteeMin).toBe(1);
  });

  it('rejects negative amounts', () => {
    expect(() => thresholdRules(-1)).toThrow();
  });

  // regression: ยอดที่มีสตางค์ติดขอบต้องไม่ throw
  // บั๊กเดิม: minAmount 5001 / maxAmount 5000 ทำให้ 5000.50 ตกทุกแถว
  it('handles satang amounts at tier boundaries', () => {
    expect(thresholdRules(5000.5).tier).toBe(2);
    expect(thresholdRules(100000.5).tier).toBe(3);
    expect(thresholdRules(500000.5).tier).toBe(4);
    expect(thresholdRules(0.01).tier).toBe(1);
  });

  it('covers every amount without gaps', () => {
    for (const a of [0, 0.01, 4999.99, 5000, 5000.01, 100000, 100000.01, 500000, 500000.01, 1e9]) {
      expect(() => thresholdRules(a), `amount ${a} ต้องไม่ throw`).not.toThrow();
    }
  });

  it('accepts an overridden table', () => {
    const custom = [
      {
        tier: 1 as const, minAmount: 0, maxAmount: null,
        egpRequired: false, egpNote: 'custom', planAnnouncementRequired: false,
        contractForm: 'custom', inspectionCommitteeMin: 1, guaranteePercent: null, note: 'custom',
      },
    ];
    expect(thresholdRules(999999, custom).tier).toBe(1);
    expect(thresholdRules(999999).tier).toBe(4);
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าล้ม**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/thresholds.test.ts`
Expected: FAIL — ไม่พบ module

- [ ] **Step 3: เขียน implementation**

```ts
// frontend/next-app/lib/thai-procurement/thresholds.ts
/**
 * เกณฑ์วงเงิน 4 ระดับ
 * spec: egp/SPEC.md:737-744 (§4.8)
 *
 * ⚠️ คำเตือน: ตัวเลขชุดนี้มาจาก "คู่มือต้นแบบ" ไม่ใช่ตัวพระราชบัญญัติ
 * (spec: egp/SPEC.md:744, :934) ต้องตรวจกับระเบียบ/กฎกระทรวงฉบับล่าสุด
 * ก่อนใช้ตัดสินใจจัดซื้อจริง — ค่าที่นี่เป็น "ค่าตั้งต้นที่ override ได้"
 */

export type ThresholdTier = 1 | 2 | 3 | 4;

export interface ThresholdRule {
  tier: ThresholdTier;
  /** ขอบเขตล่างแบบ half-open: amount >= minAmount */
  minAmount: number;
  /** ขอบเขตบนแบบ half-open: amount < maxAmount · null = ไม่มีขอบเขตบน */
  maxAmount: number | null;
  egpRequired: boolean;
  egpNote: string;
  planAnnouncementRequired: boolean;
  contractForm: string;
  inspectionCommitteeMin: number;
  guaranteePercent: number | null;
  note: string;
}

/** spec: egp/SPEC.md:738-743 */
export const THRESHOLD_TABLE: readonly ThresholdRule[] = [
  {
    tier: 1,
    minAmount: 0,
    maxAmount: 5000.01,
    egpRequired: false,
    egpNote: 'ไม่ต้องลง (กรมบัญชีกลาง ว 322)',
    planAnnouncementRequired: false,
    contractForm: 'ใบเสร็จ/ใบส่งของแทนสัญญาได้',
    inspectionCommitteeMin: 1,
    guaranteePercent: null,
    note: 'เจ้าหน้าที่ตรวจรับเองได้',
  },
  {
    tier: 2,
    minAmount: 5000.01,
    maxAmount: 100000.01,
    egpRequired: true,
    egpNote: 'ลง e-GP (เฉพาะเจาะจง)',
    planAnnouncementRequired: false,
    contractForm: 'PO/ข้อตกลงเป็นหนังสือ หรือใบเสร็จแทนได้ (ม.96)',
    inspectionCommitteeMin: 1,
    guaranteePercent: null,
    note: '≤ 50,000 (ซื้อ) เลือก ว.804 ได้',
  },
  {
    tier: 3,
    minAmount: 100000.01,
    maxAmount: 500000.01,
    egpRequired: true,
    egpNote: 'ลงครบทุกขั้น',
    planAnnouncementRequired: false,
    contractForm: 'PO หรือสัญญาตามแบบ',
    inspectionCommitteeMin: 1,
    guaranteePercent: null,
    note: 'สืบราคาอย่างน้อย 3 ราย',
  },
  {
    tier: 4,
    minAmount: 500000.01,
    maxAmount: null,
    egpRequired: true,
    egpNote: 'e-market/e-bidding',
    planAnnouncementRequired: true,
    contractForm: 'สัญญาเต็มรูป (ม.93)',
    inspectionCommitteeMin: 3,
    guaranteePercent: 5,
    note: 'ต้องประกาศแผน (ม.11) + ร่าง TOR รับฟังความเห็น ≥ 3 วัน · ห้ามแบ่งซื้อให้ต่ำกว่าเกณฑ์',
  },
];

/** spec: egp/SPEC.md:744 — รับตาราง override ได้เพื่อให้ "config ไม่ hard-code" เป็นจริง */
export function thresholdRules(
  amount: number,
  table: readonly ThresholdRule[] = THRESHOLD_TABLE
): ThresholdRule {
  if (!Number.isFinite(amount)) {
    throw new TypeError(`thresholdRules: ต้องเป็นจำนวนจำกัด ได้รับ ${String(amount)}`);
  }
  if (amount < 0) {
    throw new RangeError('thresholdRules: ไม่รองรับจำนวนติดลบ');
  }

  // half-open: minAmount <= amount < maxAmount
  // ใช้ < ไม่ใช่ <= เพื่อกันช่องว่างระหว่างระดับ (บั๊กเดิม: 5000.50 บาท throw)
  const rule = table.find(
    (r) => amount >= r.minAmount && (r.maxAmount === null || amount < r.maxAmount)
  );

  if (!rule) {
    throw new Error(`thresholdRules: ไม่พบเกณฑ์สำหรับจำนวน ${amount}`);
  }

  return rule;
}
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/thresholds.test.ts`
Expected: PASS 10 tests

แล้วรัน lint: `cd frontend/next-app; npm run lint` — ต้องไม่มี error ใหม่

- [ ] **Step 5: commit**

```bash
# อยู่บน branch ของ Task 1 หรือสร้างใหม่ถ้าแยก PR
git add frontend/next-app/lib/thai-procurement/thresholds.ts frontend/next-app/tests/lib/thai-procurement/thresholds.test.ts
git commit -m "feat(thai-procurement): add procurement threshold rules"
```

---

### Task 7: Barrel export และการตรวจสอบขอบเขต

**Files:**
- Create: `frontend/next-app/lib/thai-procurement/index.ts`
- Create: `frontend/next-app/tests/lib/thai-procurement/boundary.test.ts`

**Interfaces:**
- Produces: re-export ทุกอย่างจาก 6 โมดูล (money, baht-text, tax-id, fiscal, vat-wht, thresholds)

**ACTION:** รวม public surface และกันการหลุดขอบเขต
**IMPLEMENT:** `index.ts` re-export 6 โมดูล + `boundary.test.ts` สแกน source
**MIRROR:** barrel export แบบ `lib/actions/` ที่ import จากไฟล์ย่อย (ดูโครง import/export ที่หัวไฟล์ `lib/actions/audit.ts:1-8`)
**VALIDATE:** `npm test -- tests/lib/thai-procurement/boundary.test.ts` (2 tests)

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน**

```ts
// frontend/next-app/tests/lib/thai-procurement/boundary.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import * as barrel from '@/lib/thai-procurement';

// อ้างอิงจากตำแหน่งไฟล์เทสต์เอง ไม่ใช่ process.cwd()
// เพราะ cwd ขึ้นกับว่าใครรัน Vitest จากที่ไหน
// หมายเหตุ: ห้ามใช้ import.meta.url — Vitest แปลงเป็น path ธรรมดาทำให้ new URL() พัง
const HERE = dirname(__filename);
const DIR = join(HERE, '..', '..', '..', 'lib', 'thai-procurement');

const FORBIDDEN = [
  '@/lib/prisma',
  '@/lib/actions',
  '@/auth',
  '@/lib/',
  'next/',
  'server-only',
];

describe('thai-procurement boundary', () => {
  it('has no server-only or prisma imports', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const src = readFileSync(join(DIR, file), 'utf8');
      for (const bad of FORBIDDEN) {
        expect(src, `${file} ไม่ควร import ${bad}`).not.toContain(bad);
      }
    }
  });

  // static import แทน dynamic — dynamic import ใน Vitest ช้าจนชน timeout 5s
  it('exports the public surface from the barrel', () => {
    expect(typeof barrel.bahtText).toBe('function');
    expect(typeof barrel.isValidTaxId).toBe('function');
    expect(typeof barrel.computeVat).toBe('function');
    expect(typeof barrel.computeWht).toBe('function');
    expect(typeof barrel.thresholdRules).toBe('function');
    expect(typeof barrel.fiscalYearOf).toBe('function');
    expect(typeof barrel.bangkokDateKey).toBe('function');
  });
});
```

- [ ] **Step 2: รันเทสต์ให้เห็นว่าล้ม**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/boundary.test.ts`
Expected: FAIL — ไม่พบ `@/lib/thai-procurement`

- [ ] **Step 3: เขียน implementation**

```ts
// frontend/next-app/lib/thai-procurement/index.ts
/**
 * ชุดเครื่องมือพัสดุราชการไทย
 * pure functions ล้วน ไม่มี I/O ไม่มี Prisma ไม่ผูกกับ framework
 */

export { toSatang, fromSatang } from './money';
export { bahtText } from './baht-text';
export { normalizeTaxId, isValidTaxId, taxIdSchema } from './tax-id';
export {
  computeVat,
  computeWht,
  DEFAULT_VAT_RATE,
  DEFAULT_WHT_RATE,
  WHT_THRESHOLD_JURISTIC,
  WHT_THRESHOLD_INDIVIDUAL,
} from './vat-wht';
export type { VatMode, VendorType } from './vat-wht';
export { thresholdRules, THRESHOLD_TABLE } from './thresholds';
export type { ThresholdRule, ThresholdTier } from './thresholds';
export {
  fiscalYearOf,
  fiscalQuarterOf,
  addWorkingDays,
  addCalendarDays,
  bangkokDateKey,
} from './fiscal';
```

- [ ] **Step 4: รันเทสต์ให้ผ่าน**

Run: `cd frontend/next-app; npm test -- tests/lib/thai-procurement/boundary.test.ts`
Expected: PASS 2 tests

แล้วรัน lint: `cd frontend/next-app; npm run lint` — ต้องไม่มี error ใหม่

- [ ] **Step 5: commit**

```bash
# อยู่บน branch ของ Task 1 หรือสร้างใหม่ถ้าแยก PR
git add frontend/next-app/lib/thai-procurement/index.ts frontend/next-app/tests/lib/thai-procurement/boundary.test.ts
git commit -m "feat(thai-procurement): add barrel export and boundary test"
```

---

## Testing Strategy

### ตารางความครอบคลุม

| โมดูล | ฟังก์ชัน | เทสต์ | เคสขอบที่ต้องมี |
|---|---|---|---|
| `money` | `toSatang`, `fromSatang` | 5 | 0, 0.5, 32394.39, `'305.61'`, `NaN`, `Infinity`, `''`, `'   '`, `fromSatang(NaN)` |
| `baht-text` | `bahtText` | 12 | 0, 0.50, 1, 11, 21, 305.61, 32394.39, 1000000, 1000001, 2000001, 21.004, 21.005, ติดลบ |
| `tax-id` | `normalizeTaxId`, `isValidTaxId`, `taxIdSchema` | 6 | ขีด/ช่องว่าง, 12 หลัก, 14 หลัก, ตัวอักษร, check digit ผิด, ผ่าน Zod |
| `fiscal` | 5 ฟังก์ชัน | 11 | 30 ก.ย./1 ต.ค., 4 ไตรมาส, ศุกร์+5 วันทำการ, วันหยุด, จันทร์ไทย, เสาร์-อาทิตย์, +15 วันปฏิทิน, n=0, n ติดลบ (calendar รับ / working ปฏิเสธ) |
| `vat-wht` | `computeVat`, `computeWht` | 26 | 3 mode, 4 fixture จาก spec, rate override, threshold override, thresholdBasis BASE, ขอบ 500/10,000, พืชผลเกษตร, mode/vendorType/thresholdBasis ผิด, ค่าติดลบ, base>total, wht>total, chain VAT→WHT |
| `thresholds` | `thresholdRules` | 10 | 4 ชั้น, ขอบ 5000/100000/500000, **ยอดมีสตางค์ติดขอบ**, ตาราง override, ติดลบ |
| `index` + boundary | barrel | 2 | surface ครบ, ไม่มี import ต้องห้าม |

**รวม 72 เทสต์** — รันแล้วผ่านทั้งหมด 7 ไฟล์

### หลักการที่ใช้

1. **ทุกฟังก์ชันมี input/expected pair** จาก fixture ของ spec ไม่ใช่ค่าที่แต่งขึ้น
2. **มี regression test สำหรับบั๊กที่เคยเจอ** — เช่น `handles satang amounts at tier boundaries` กันบั๊ก 5000.50 throw
3. **มีเทสต์ที่พิสูจน์ว่าเราไม่ตรงกับต้นแบบที่ผิด** — `does NOT reproduce the prototype 3% of gross error`
4. **มีเทสต์ chain ข้ามโมดูล** — `chains computeVat into computeWht end to end` กันการ hard-code base
5. **ทดสอบ runtime guard** — mode ผิด, ค่าติดลบ, สตริงว่าง ต้อง throw ไม่ใช่คืนค่าเงียบ ๆ

### คำสั่งที่ใช้

```bash
cd frontend/next-app
npm test -- tests/lib/thai-procurement/     # ทั้งหมด (72 เทสต์)
npm run lint                                 # static analysis
npm run build                                # build gate
```

---

## PR Strategy

| PR | Task | หัวข้อ |
|---|---|---|
| 1 | 1 | `feat/thai-procurement-money` — helper เงิน |
| 2 | 2 | `feat/thai-procurement-baht-text` — bahtText |
| 3 | 3-4 | `feat/thai-procurement-taxid-fiscal` — taxId + ปีงบ |
| 4 | 5 | `feat/thai-procurement-vat-wht` — VAT/WHT |
| 5 | 6-7 | `feat/thai-procurement-thresholds` — เกณฑ์วงเงิน + barrel |

ทุก PR เปิดเป็น draft ตาม Iron Rules ของ `AGENTS.md`

---

## Risks & Open Questions

### Risks

| ความเสี่ยง | ลดด้วย |
|---|---|
| ตัวเลขเกณฑ์วงเงินผิดจากระเบียบจริง | `THRESHOLD_TABLE` เป็น export ที่ override ได้ + comment เตือนที่หัวไฟล์ |
| WHT คำนวณผิดฐาน | เทสต์ `does NOT reproduce the prototype 3% of gross error` กันการถอยหลัง |
| floating point ทำให้สตางค์เพี้ยน | คำนวณด้วย integer สตางค์ทุกจุด |
| มีคน import prisma เข้า library | boundary test สแกน source จริง |

### Open Questions (ไม่บล็อกการเขียนโค้ด)

| # | คำถาม | ค่าตั้งต้น | ที่มา |
|---|---|---|---|
| 1 | เกณฑ์ 500/10,000 เทียบยอดก่อนหรือรวม VAT | `thresholdBasis: 'TOTAL'` | `SchoolProc:904` |
| 2 | นับต่อครั้งหรือต่อใบสั่ง | ต่อครั้ง | `SchoolProc:904` |
| 3 | หน่วยงานใช้ 1% หรือ 3% จริง | 1% + override ได้ | `ProcureHub:576` |
| 4 | "หนึ่งล้านเอ็ดบาท" หรือ "หนึ่งล้านหนึ่งบาท" | เอ็ด ตาม fixture | `egp:759` |

---

## Validation Checklist

- [ ] `cd frontend/next-app; npm test -- tests/lib/thai-procurement/` ผ่านทุกไฟล์
- [ ] `cd frontend/next-app; npm run lint` ผ่าน
- [ ] `cd frontend/next-app; npm run build` ผ่าน
- [ ] `git diff --stat backend/prisma/schema.prisma` ว่าง
- [ ] ไม่มีไฟล์ใน `lib/thai-procurement/` ที่ import prisma หรือ next
- [ ] ทุกไฟล์มี comment อ้างบรรทัด spec

---

## Resume Instructions for Next Session

1. อ่าน PRD ที่ `PRPs/perch/2026-11-16_PRD_thai-procurement-utils.md`
2. อ่านแผนนี้ตั้งแต่ Task ที่ยังไม่ติ๊ก
3. เริ่มจาก Task แรกที่ยังไม่เสร็จ ทำตาม step 1-5 ให้ครบ
4. ห้ามข้าม step 2 (รันเทสต์ให้เห็นว่าล้ม) — เป็นการพิสูจน์ว่าเทสต์วัดของจริง

---

*ตรวจจากโค้ดจริง: `lib/date-utils.ts` 73 บรรทัด · `vitest.config.ts` ใช้ alias `@` → root ของ next-app ·
`schema.prisma` ไม่มี budget/vendor/depreciation/taxId · ไม่ได้แก้ไฟล์ใดใน HR-IMS*
