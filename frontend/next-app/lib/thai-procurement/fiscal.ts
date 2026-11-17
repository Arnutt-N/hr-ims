/**
 * ปีงบประมาณ พ.ศ. และวันทำการ
 * spec: egp/SPEC.md:680-684, :746-755
 *
 * หลักการ: ยึดปฏิทิน Asia/Bangkok เป็นความจริง
 * คำนวณวันในสัปดาห์และบวกวันบน date-only space (Date.UTC) แล้วแปลงกลับเป็นเที่ยงคืนไทย
 * ห้ามใช้ getUTCDay()/setUTCDate() กับ Date ที่แทนเวลาไทยโดยตรง
 * เพราะเที่ยงคืนไทย = 17:00 UTC ของวันก่อนหน้า → วันในสัปดาห์จะเพี้ยนไปหนึ่งวัน
 */

const TZ = 'Asia/Bangkok';
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

interface BangkokYmd {
  year: number;
  month: number;
  day: number;
}

/** ดึงปี/เดือน/วันตามปฏิทินไทย ไม่ขึ้นกับ timezone ของเครื่องที่รัน */
function bangkokYmd(date: Date): BangkokYmd {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === 'year')!.value),
    month: Number(parts.find((p) => p.type === 'month')!.value),
    day: Number(parts.find((p) => p.type === 'day')!.value),
  };
}

/** แปลงปี/เดือน/วันของไทยกลับเป็น Date ที่เที่ยงคืนไทย */
function fromBangkokYmd(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - BKK_OFFSET_MS);
}

/** date key แบบ YYYY-MM-DD ตามปฏิทินไทย ใช้เทียบวันหยุด
 *  spec: egp/SPEC.md:683 (timezone Asia/Bangkok) */
export function bangkokDateKey(date: Date): string {
  const { year, month, day } = bangkokYmd(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** spec: egp/SPEC.md:681 — (เดือน ≥ ต.ค. ? ปี ค.ศ.+1 : ปี ค.ศ.) + 543 */
export function fiscalYearOf(date: Date): number {
  const { year, month } = bangkokYmd(date);
  const fiscalCe = month >= 10 ? year + 1 : year;
  return fiscalCe + 543;
}

/** spec: egp/SPEC.md:682 — Q1 ต.ค.–ธ.ค. */
export function fiscalQuarterOf(date: Date): 1 | 2 | 3 | 4 {
  const { month } = bangkokYmd(date);
  if (month >= 10) return 1;
  if (month >= 7) return 4;
  if (month >= 4) return 3;
  return 2;
}

/** spec: egp/SPEC.md:684 — ข้ามเสาร์-อาทิตย์และ Holiday (รับเฉพาะ n >= 0) */
export function addWorkingDays(date: Date, n: number, holidays: Date[] = []): Date {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError('addWorkingDays: n ต้องเป็นจำนวนเต็มไม่ติดลบ');
  }

  const holidayKeys = new Set(holidays.map(bangkokDateKey));
  const { year, month, day } = bangkokYmd(date);

  // date-only cursor: ปลอดภัยจาก timezone และ DST
  const cursor = new Date(Date.UTC(year, month - 1, day));
  let added = 0;

  while (added < n) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);

    const dow = cursor.getUTCDay();
    if (dow === 0 || dow === 6) continue;

    const key = bangkokDateKey(cursor);
    if (holidayKeys.has(key)) continue;

    added++;
  }

  return fromBangkokYmd(
    cursor.getUTCFullYear(),
    cursor.getUTCMonth() + 1,
    cursor.getUTCDate()
  );
}

/** spec: egp/SPEC.md:750 — นับวันปฏิทิน (รับ n ติดลบได้เพื่อย้อนหลัง) */
export function addCalendarDays(date: Date, n: number): Date {
  if (!Number.isInteger(n)) {
    throw new RangeError('addCalendarDays: n ต้องเป็นจำนวนเต็ม');
  }

  const { year, month, day } = bangkokYmd(date);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  cursor.setUTCDate(cursor.getUTCDate() + n);

  return fromBangkokYmd(
    cursor.getUTCFullYear(),
    cursor.getUTCMonth() + 1,
    cursor.getUTCDate()
  );
}
