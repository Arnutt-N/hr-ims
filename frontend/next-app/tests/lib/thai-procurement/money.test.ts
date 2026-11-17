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
