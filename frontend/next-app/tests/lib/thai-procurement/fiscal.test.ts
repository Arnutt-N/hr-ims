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
