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
