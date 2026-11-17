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
