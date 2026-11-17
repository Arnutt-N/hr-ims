/**
 * จำนวนเงินเป็นตัวอักษรไทย
 * spec: egp/SPEC.md:759 (§4.10)
 */

import { toSatang } from './money';

const DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

/** แปลงกลุ่ม 6 หลัก (0..999999) เป็นคำไทย
 *  hasPreceding = มีหลักนำหน้ามาแล้ว (เช่น กลุ่มล้าน) → หน่วย 1 อ่าน "เอ็ด" */
function readSixDigits(n: number, hasPreceding = false): string {
  if (n === 0) return '';
  let out = '';
  const s = String(n).padStart(6, '0');

  for (let i = 0; i < 6; i++) {
    const d = Number(s[i]);
    if (d === 0) continue;
    const place = 5 - i; // 5=แสน .. 0=หน่วย

    if (place === 0) {
      // หลักหน่วย: 1 ที่มีหลักอื่นนำหน้า → เอ็ด
      // ต้องเช็คทั้งหลักในกลุ่มนี้ (n > 1) และกลุ่มที่นำหน้ามาแล้ว (hasPreceding)
      out += d === 1 && (n > 1 || hasPreceding) ? 'เอ็ด' : DIGITS[d];
    } else if (place === 1) {
      // หลักสิบ: 2 → ยี่สิบ, 1 → สิบ (ไม่ใช่หนึ่งสิบ)
      if (d === 2) out += 'ยี่สิบ';
      else if (d === 1) out += 'สิบ';
      else out += DIGITS[d] + 'สิบ';
    } else {
      out += DIGITS[d] + PLACES[place];
    }
  }
  return out;
}

/** แปลงจำนวนเต็มบาทเป็นคำไทย (รองรับเกินล้าน อ่านซ้ำชุดละ 6 หลัก) */
function readIntegerBaht(baht: number, hasPreceding = false): string {
  if (baht === 0) return DIGITS[0];

  const millions = Math.floor(baht / 1_000_000);
  const rest = baht % 1_000_000;

  let out = '';
  if (millions > 0) {
    out += readIntegerBaht(millions) + 'ล้าน';
  }
  out += readSixDigits(rest, hasPreceding || millions > 0);
  return out;
}

export function bahtText(amount: number | string): string {
  const satang = toSatang(amount);

  if (satang < 0) {
    throw new RangeError('bahtText: ไม่รองรับจำนวนติดลบ');
  }

  const baht = Math.floor(satang / 100);
  const satangPart = satang % 100;

  const bahtWords = readIntegerBaht(baht);

  if (satangPart === 0) {
    return `${bahtWords}บาทถ้วน`;
  }

  const satangWords = readSixDigits(satangPart);

  // ไม่มีบาท (0 บาท) → ขึ้นต้นด้วยสตางค์ตรง ๆ
  if (baht === 0) {
    return `${satangWords}สตางค์`;
  }

  return `${bahtWords}บาท${satangWords}สตางค์`;
}
