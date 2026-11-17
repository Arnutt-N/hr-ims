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
