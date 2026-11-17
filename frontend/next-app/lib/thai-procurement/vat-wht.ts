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
