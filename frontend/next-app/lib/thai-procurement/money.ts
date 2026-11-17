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
