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
