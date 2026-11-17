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
