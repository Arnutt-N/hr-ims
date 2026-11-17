// frontend/next-app/tests/lib/thai-procurement/boundary.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import * as barrel from '@/lib/thai-procurement';

// อ้างอิงจากตำแหน่งไฟล์เทสต์เอง ไม่ใช่ process.cwd()
// เพราะ cwd ขึ้นกับว่าใครรัน Vitest จากที่ไหน
// หมายเหตุ: ห้ามใช้ import.meta.url — Vitest แปลงเป็น path ธรรมดาทำให้ new URL() พัง
const HERE = dirname(__filename);
const DIR = join(HERE, '..', '..', '..', 'lib', 'thai-procurement');

const FORBIDDEN = [
  '@/lib/prisma',
  '@/lib/actions',
  '@/auth',
  '@/lib/',
  'next/',
  'server-only',
];

describe('thai-procurement boundary', () => {
  it('has no server-only or prisma imports', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const src = readFileSync(join(DIR, file), 'utf8');
      for (const bad of FORBIDDEN) {
        expect(src, `${file} ไม่ควร import ${bad}`).not.toContain(bad);
      }
    }
  });

  // static import แทน dynamic — dynamic import ใน Vitest ช้าจนชน timeout 5s
  it('exports the public surface from the barrel', () => {
    expect(typeof barrel.bahtText).toBe('function');
    expect(typeof barrel.isValidTaxId).toBe('function');
    expect(typeof barrel.computeVat).toBe('function');
    expect(typeof barrel.computeWht).toBe('function');
    expect(typeof barrel.thresholdRules).toBe('function');
    expect(typeof barrel.fiscalYearOf).toBe('function');
    expect(typeof barrel.bangkokDateKey).toBe('function');
  });
});
