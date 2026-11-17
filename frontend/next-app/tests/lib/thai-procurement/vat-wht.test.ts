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
  });
});

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
