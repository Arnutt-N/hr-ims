/**
 * เกณฑ์วงเงิน 4 ระดับ
 * spec: egp/SPEC.md:737-744 (§4.8)
 *
 * ⚠️ คำเตือน: ตัวเลขชุดนี้มาจาก "คู่มือต้นแบบ" ไม่ใช่ตัวพระราชบัญญัติ
 * (spec: egp/SPEC.md:744, :934) ต้องตรวจกับระเบียบ/กฎกระทรวงฉบับล่าสุด
 * ก่อนใช้ตัดสินใจจัดซื้อจริง — ค่าที่นี่เป็น "ค่าตั้งต้นที่ override ได้"
 */

export type ThresholdTier = 1 | 2 | 3 | 4;

export interface ThresholdRule {
  tier: ThresholdTier;
  /** ขอบเขตล่างแบบ half-open: amount >= minAmount */
  minAmount: number;
  /** ขอบเขตบนแบบ half-open: amount < maxAmount · null = ไม่มีขอบเขตบน */
  maxAmount: number | null;
  egpRequired: boolean;
  egpNote: string;
  planAnnouncementRequired: boolean;
  contractForm: string;
  inspectionCommitteeMin: number;
  guaranteePercent: number | null;
  note: string;
}

/** spec: egp/SPEC.md:738-743 */
export const THRESHOLD_TABLE: readonly ThresholdRule[] = [
  {
    tier: 1,
    minAmount: 0,
    maxAmount: 5000.01,
    egpRequired: false,
    egpNote: 'ไม่ต้องลง (กรมบัญชีกลาง ว 322)',
    planAnnouncementRequired: false,
    contractForm: 'ใบเสร็จ/ใบส่งของแทนสัญญาได้',
    inspectionCommitteeMin: 1,
    guaranteePercent: null,
    note: 'เจ้าหน้าที่ตรวจรับเองได้',
  },
  {
    tier: 2,
    minAmount: 5000.01,
    maxAmount: 100000.01,
    egpRequired: true,
    egpNote: 'ลง e-GP (เฉพาะเจาะจง)',
    planAnnouncementRequired: false,
    contractForm: 'PO/ข้อตกลงเป็นหนังสือ หรือใบเสร็จแทนได้ (ม.96)',
    inspectionCommitteeMin: 1,
    guaranteePercent: null,
    note: '≤ 50,000 (ซื้อ) เลือก ว.804 ได้',
  },
  {
    tier: 3,
    minAmount: 100000.01,
    maxAmount: 500000.01,
    egpRequired: true,
    egpNote: 'ลงครบทุกขั้น',
    planAnnouncementRequired: false,
    contractForm: 'PO หรือสัญญาตามแบบ',
    inspectionCommitteeMin: 1,
    guaranteePercent: null,
    note: 'สืบราคาอย่างน้อย 3 ราย',
  },
  {
    tier: 4,
    minAmount: 500000.01,
    maxAmount: null,
    egpRequired: true,
    egpNote: 'e-market/e-bidding',
    planAnnouncementRequired: true,
    contractForm: 'สัญญาเต็มรูป (ม.93)',
    inspectionCommitteeMin: 3,
    guaranteePercent: 5,
    note: 'ต้องประกาศแผน (ม.11) + ร่าง TOR รับฟังความเห็น ≥ 3 วัน · ห้ามแบ่งซื้อให้ต่ำกว่าเกณฑ์',
  },
];

/** spec: egp/SPEC.md:744 — รับตาราง override ได้เพื่อให้ "config ไม่ hard-code" เป็นจริง */
export function thresholdRules(
  amount: number,
  table: readonly ThresholdRule[] = THRESHOLD_TABLE
): ThresholdRule {
  if (!Number.isFinite(amount)) {
    throw new TypeError(`thresholdRules: ต้องเป็นจำนวนจำกัด ได้รับ ${String(amount)}`);
  }
  if (amount < 0) {
    throw new RangeError('thresholdRules: ไม่รองรับจำนวนติดลบ');
  }

  // half-open: minAmount <= amount < maxAmount
  // ใช้ < ไม่ใช่ <= เพื่อกันช่องว่างระหว่างระดับ (บั๊กเดิม: 5000.50 บาท throw)
  const rule = table.find(
    (r) => amount >= r.minAmount && (r.maxAmount === null || amount < r.maxAmount)
  );

  if (!rule) {
    throw new Error(`thresholdRules: ไม่พบเกณฑ์สำหรับจำนวน ${amount}`);
  }

  return rule;
}
