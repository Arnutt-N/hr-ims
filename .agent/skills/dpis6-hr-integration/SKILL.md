---
name: DPIS6 HR Integration
description: การเชื่อมต่อและนำเข้าข้อมูลบุคลากรจากระบบ DPIS6 สำนักงาน ก.พ.
---

# การเชื่อมต่อระบบ DPIS6 (HR Integration)

คู่มือนี้ช่วยในการเชื่อมต่อและนำเข้าข้อมูลบุคลากรจากระบบสารสนเทศทรัพยากรบุคคล DPIS6 ของสำนักงาน ก.พ.

## ภาพรวม

**DPIS6** (Departmental Personnel Information System Level 6) คือระบบสารสนเทศทรัพยากรบุคคลเวอร์ชันที่ 6 ที่พัฒนาโดยสำนักงานคณะกรรมการข้าราชการพลเรือน (สำนักงาน ก.พ. - Office of the Civil Service Commission) ใช้สำหรับจัดการข้อมูลข้าราชการ พนักงานราชการ และลูกจ้างของหน่วยงานภาครัฐ

### วัตถุประสงค์

> **หมายเหตุ:** เอกสารนี้ใช้เป็น Reference สำหรับการออกแบบฐานข้อมูลบุคลากรและเตรียมความพร้อมสำหรับการเชื่อมต่อระบบ DPIS6 ในอนาคต

1. **ใช้เป็นต้นแบบออกแบบฐานข้อมูล** - โครงสร้างข้อมูลบุคลากรตามมาตรฐาน DPIS6
2. **เตรียมพร้อมสำหรับ Integration** - สามารถเชื่อมต่อนำเข้าข้อมูลจาก DPIS6 ในอนาคต
3. **Sync ข้อมูลบุคลากรระหว่างระบบ** - เมื่อมีการเชื่อมต่อจริง

### เกี่ยวกับ DPIS6

- **พัฒนาโดย**: สำนักงาน ก.พ. (Office of the Civil Service Commission - OCSC)
- **เริ่มต้น**: พัฒนาครั้งแรกปี 2531 ภายใต้โครงการระบบสารสนเทศกำลังคนภาครัฐ
- **กฎหมายอ้างอิง**: พระราชบัญญัติระเบียบข้าราชการพลเรือน พ.ศ. 2551
- **ผู้ใช้งาน**: หน่วยงานภาครัฐทุกหน่วยงาน
- **ระดับข้อมูล**: จัดเก็บข้อมูลลงไปถึง 5 ระดับ (กรม/จังหวัด/กอง/ฝ่าย/งาน)

### ฟังก์ชันหลักของ DPIS6

1. **การจัดการข้อมูลบุคลากร** - ข้อมูลข้าราชการ พนักงานราชการ ลูกจ้าง
2. **การลา** - ระบบบันทึกและอนุมัติการลา
3. **การประเมินผล** - การประเมินผลการปฏิบัติงาน
4. **บำเหน็จบำนาญ** - คำนวณสิทธิบำเหน็จบำนาญ
5. **เอกสารแนบ** - แนบเอกสารสำคัญ (รูปถ่าย, ทะเบียนบ้าน, etc.)

### ข้อมูลที่นำเข้า

| ข้อมูล | จาก DPIS6 | ไปยัง HR-IMS |
|--------|-----------|--------------|
| รหัสพนักงาน | PID | employeeId |
| ชื่อ-สกุล | PNAME, PLNAME | firstName, lastName |
| คำนำหน้า | PTITLE | prefix |
| ตำแหน่ง | PPOSITION | position |
| หน่วยงาน | PDEPARTMENT | department |
| อีเมล | PEMAIL | email |
| เลขบัตรประชาชน | PIDCARD | idCard |

---

## 1. โครงสร้างข้อมูล DPIS6

### ตัวอย่างข้อมูลจาก DPIS6 (CSV/Excel)

```csv
PID,PTITLE,PNAME,PLNAME,PPOSITION,PDEPARTMENT,PEMAIL,PIDCARD,PSTATUS
10001,นาย,สมชาย,ใจดี,นักวิชาการคอมพิวเตอร์,กลุ่มงานเทคโนโลยีสารสนเทศ,somchai@agency.go.th,1234567890123,1
10002,นางสาว,สมหญิง,รักงาน,เจ้าหน้าที่บริหารงานทั่วไป,กลุ่มงานบริหารทั่วไป,somying@agency.go.th,1234567890124,1
10003,นาง,วิไล,มานะ,หัวหน้ากลุ่มงาน,กลุ่มงานพัสดุ,wilai@agency.go.th,1234567890125,1
```

### สถานะพนักงาน (PSTATUS)

| รหัส | ความหมาย |
|------|----------|
| 1 | ปฏิบัติงานปกติ |
| 2 | ลาศึกษาต่อ |
| 3 | โอนย้าย |
| 9 | เกษียณอายุ/ลาออก |

---

## 2. Prisma Schema สำหรับ DPIS6

```prisma
// เพิ่มใน schema.prisma

model User {
  id           Int      @id @default(autoincrement())
  employeeId   String   @unique  // PID จาก DPIS6
  idCard       String?  @unique  // PIDCARD
  email        String   @unique
  password     String
  
  // ข้อมูลจาก DPIS6
  prefix       String?  // PTITLE (นาย, นาง, นางสาว)
  firstName    String   // PNAME
  lastName     String   // PLNAME
  position     String?  // PPOSITION
  department   String?  // PDEPARTMENT
  status       String   @default("active") // PSTATUS → active, inactive
  
  // ข้อมูลเพิ่มเติม
  role         String   @default("user")
  lastSyncAt   DateTime? // วันที่ sync ล่าสุด
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// บันทึกประวัติการ Sync
model SyncLog {
  id          Int      @id @default(autoincrement())
  syncType    String   // import, update, delete
  totalRecords Int     // จำนวนทั้งหมด
  successCount Int     // สำเร็จ
  failedCount  Int     // ล้มเหลว
  errors      String?  // ข้อผิดพลาด (JSON)
  syncedAt    DateTime @default(now())
  syncedBy    Int?     // ผู้ทำการ sync
}
```

---

## 3. การนำเข้าข้อมูลจาก DPIS6

### 3.1 อ่านไฟล์ CSV/Excel

```typescript
// lib/dpis6/import.ts
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

interface DPIS6Record {
  PID: string;
  PTITLE: string;
  PNAME: string;
  PLNAME: string;
  PPOSITION: string;
  PDEPARTMENT: string;
  PEMAIL: string;
  PIDCARD: string;
  PSTATUS: string;
}

// อ่าน CSV
export async function parseCSV(file: File): Promise<DPIS6Record[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as DPIS6Record[]);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

// อ่าน Excel
export async function parseExcel(file: File): Promise<DPIS6Record[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<DPIS6Record>(firstSheet);
  return data;
}
```

### 3.2 แปลงข้อมูล DPIS6 เป็น User

```typescript
// lib/dpis6/transform.ts

export function transformDPIS6ToUser(record: DPIS6Record) {
  // แปลงสถานะ
  const status = ['1', '2'].includes(record.PSTATUS) ? 'active' : 'inactive';
  
  // สร้าง email ถ้าไม่มี
  const email = record.PEMAIL || 
    `${record.PID}@temp.agency.go.th`;
  
  // รหัสผ่านเริ่มต้น = เลขบัตรประชาชน 4 ตัวท้าย
  const defaultPassword = record.PIDCARD?.slice(-4) || '1234';
  
  return {
    employeeId: record.PID,
    idCard: record.PIDCARD,
    email: email,
    password: bcrypt.hashSync(defaultPassword, 10),
    prefix: record.PTITLE,
    firstName: record.PNAME,
    lastName: record.PLNAME,
    position: record.PPOSITION,
    department: record.PDEPARTMENT,
    status: status,
    role: determineRole(record.PPOSITION),
    lastSyncAt: new Date()
  };
}

// กำหนด role ตามตำแหน่ง
function determineRole(position: string): string {
  if (position.includes('ผู้อำนวยการ') || position.includes('หัวหน้า')) {
    return 'admin';
  }
  if (position.includes('พัสดุ')) {
    return 'procurement';
  }
  if (position.includes('บุคคล') || position.includes('HR')) {
    return 'hr';
  }
  return 'user';
}
```

### 3.3 Server Action สำหรับ Import

```typescript
// lib/actions/dpis6.ts
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { transformDPIS6ToUser } from '@/lib/dpis6/transform';

export async function importDPIS6Data(records: DPIS6Record[]) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'superadmin') {
    return { error: 'ไม่ได้รับอนุญาต' };
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  try {
    for (const record of records) {
      try {
        const userData = transformDPIS6ToUser(record);
        
        // ตรวจสอบว่ามีผู้ใช้อยู่แล้วหรือไม่
        const existingUser = await prisma.user.findUnique({
          where: { employeeId: userData.employeeId }
        });

        if (existingUser) {
          // อัปเดทข้อมูล
          await prisma.user.update({
            where: { employeeId: userData.employeeId },
            data: {
              prefix: userData.prefix,
              firstName: userData.firstName,
              lastName: userData.lastName,
              position: userData.position,
              department: userData.department,
              status: userData.status,
              lastSyncAt: new Date()
            }
          });
        } else {
          // สร้างใหม่
          await prisma.user.create({
            data: userData
          });
        }
        
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`${record.PID}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // บันทึก log
    await prisma.syncLog.create({
      data: {
        syncType: 'import',
        totalRecords: records.length,
        successCount,
        failedCount,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
        syncedBy: parseInt(session.user.id)
      }
    });

    return { 
      success: true, 
      message: `นำเข้าสำเร็จ ${successCount} รายการ, ล้มเหลว ${failedCount} รายการ`,
      successCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Import error:', error);
    return { error: 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล' };
  }
}

// Sync ข้อมูลจาก DPIS6 (เฉพาะที่มีอยู่แล้ว)
export async function syncDPIS6Data(records: DPIS6Record[]) {
  const session = await auth();
  if (!session?.user || !['superadmin', 'admin'].includes(session.user.role)) {
    return { error: 'ไม่ได้รับอนุญาต' };
  }

  let successCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  try {
    for (const record of records) {
      try {
        const existingUser = await prisma.user.findUnique({
          where: { employeeId: record.PID }
        });

        if (existingUser) {
          const userData = transformDPIS6ToUser(record);
          await prisma.user.update({
            where: { employeeId: record.PID },
            data: {
              prefix: userData.prefix,
              firstName: userData.firstName,
              lastName: userData.lastName,
              position: userData.position,
              department: userData.department,
              status: userData.status,
              lastSyncAt: new Date()
            }
          });
          successCount++;
        }
      } catch (error) {
        failedCount++;
        errors.push(`${record.PID}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    await prisma.syncLog.create({
      data: {
        syncType: 'update',
        totalRecords: records.length,
        successCount,
        failedCount,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
        syncedBy: parseInt(session.user.id)
      }
    });

    return { 
      success: true, 
      message: `Sync สำเร็จ ${successCount} รายการ`,
      successCount,
      failedCount
    };
  } catch (error) {
    console.error('Sync error:', error);
    return { error: 'เกิดข้อผิดพลาดในการ sync ข้อมูล' };
  }
}
```

---

## 4. UI Component สำหรับ Import

### 4.1 Import Form

```tsx
// components/dpis6/ImportForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseCSV, parseExcel } from '@/lib/dpis6/import';
import { importDPIS6Data } from '@/lib/actions/dpis6';
import { toast } from 'sonner';

export function DPIS6ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      // อ่านและแสดง preview
      let data;
      if (selectedFile.name.endsWith('.csv')) {
        data = await parseCSV(selectedFile);
      } else if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        data = await parseExcel(selectedFile);
      } else {
        toast.error('รองรับเฉพาะไฟล์ .csv, .xlsx, .xls');
        return;
      }

      setPreview(data.slice(0, 5)); // แสดง 5 รายการแรก
      toast.success(`พบข้อมูล ${data.length} รายการ`);
    } catch (error) {
      toast.error('ไม่สามารถอ่านไฟล์ได้');
      console.error(error);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      let data;
      if (file.name.endsWith('.csv')) {
        data = await parseCSV(file);
      } else {
        data = await parseExcel(file);
      }

      const result = await importDPIS6Data(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      
      if (result.errors && result.errors.length > 0) {
        console.log('Import errors:', result.errors);
      }

      setFile(null);
      setPreview([]);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          อัปโหลดไฟล์ DPIS6 (.csv, .xlsx)
        </label>
        <Input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          disabled={loading}
        />
      </div>

      {preview.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            ตัวอย่างข้อมูล (5 รายการแรก):
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1">รหัสพนักงาน</th>
                  <th className="border px-2 py-1">ชื่อ-สกุล</th>
                  <th className="border px-2 py-1">ตำแหน่ง</th>
                  <th className="border px-2 py-1">หน่วยงาน</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1">{row.PID}</td>
                    <td className="border px-2 py-1">
                      {row.PTITLE}{row.PNAME} {row.PLNAME}
                    </td>
                    <td className="border px-2 py-1">{row.PPOSITION}</td>
                    <td className="border px-2 py-1">{row.PDEPARTMENT}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Button
        onClick={handleImport}
        disabled={!file || loading}
        className="w-full"
      >
        {loading ? 'กำลังนำเข้า...' : 'นำเข้าข้อมูล'}
      </Button>
    </div>
  );
}
```

---

## 5. รายงานการ Sync

### ดูประวัติการ Sync

```typescript
// lib/actions/dpis6.ts (เพิ่มเติม)

export async function getSyncLogs(limit = 10) {
  const logs = await prisma.syncLog.findMany({
    take: limit,
    orderBy: { syncedAt: 'desc' }
  });

  return logs.map(log => ({
    id: log.id,
    ประเภท: {
      import: 'นำเข้าใหม่',
      update: 'อัปเดท',
      delete: 'ลบ'
    }[log.syncType] || log.syncType,
    ทั้งหมด: log.totalRecords,
    สำเร็จ: log.successCount,
    ล้มเหลว: log.failedCount,
    วันที่: log.syncedAt.toLocaleString('th-TH'),
    ข้อผิดพลาด: log.errors ? JSON.parse(log.errors) : null
  }));
}
```

---

## 6. การจัดการข้อมูลบุคลากร

### 6.1 ตรวจสอบข้อมูลที่ไม่ได้ Sync

```typescript
export async function getOutdatedUsers(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { lastSyncAt: null },
        { lastSyncAt: { lt: cutoffDate } }
      ]
    },
    select: {
      employeeId: true,
      firstName: true,
      lastName: true,
      department: true,
      lastSyncAt: true
    }
  });

  return users;
}
```

### 6.2 ปิดการใช้งาน User ที่ออกจากงาน

```typescript
export async function deactivateUser(employeeId: string) {
  const session = await auth();
  if (!session?.user || !['superadmin', 'admin'].includes(session.user.role)) {
    return { error: 'ไม่ได้รับอนุญาต' };
  }

  await prisma.user.update({
    where: { employeeId },
    data: { 
      status: 'inactive',
      lastSyncAt: new Date()
    }
  });

  return { success: true };
}
```

---

## 7. การติดตั้ง Dependencies

```bash
# สำหรับอ่าน CSV
npm install papaparse
npm install -D @types/papaparse

# สำหรับอ่าน Excel
npm install xlsx
```

---

## 8. Cron Job สำหรับ Auto Sync

### 8.1 ตั้งค่า Cron (ถ้าใช้ Node.js)

```typescript
// lib/cron/dpis6-sync.ts
import cron from 'node-cron';
import { syncDPIS6Data } from '@/lib/actions/dpis6';

// Sync ทุกวันเวลา 02:00 น.
export function scheduleDPIS6Sync() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[DPIS6 Sync] Starting scheduled sync...');
    
    try {
      // ดึงข้อมูลจาก DPIS6 API หรือไฟล์
      // const records = await fetchDPIS6Data();
      // const result = await syncDPIS6Data(records);
      // console.log('[DPIS6 Sync] Completed:', result);
    } catch (error) {
      console.error('[DPIS6 Sync] Error:', error);
    }
  });
}
```

---

## แนวปฏิบัติที่ดีที่สุด

1. ✅ สำรองข้อมูลก่อน Import ทุกครั้ง
2. ✅ ตรวจสอบความถูกต้องของข้อมูลก่อนนำเข้า
3. ✅ บันทึก Log ทุกครั้งที่ Sync
4. ✅ ใช้ Transaction สำหรับการ Import/Update
5. ✅ กำหนดรหัสผ่านเริ่มต้นที่ปลอดภัย
6. ✅ แจ้งให้ผู้ใช้เปลี่ยนรหัสผ่านเมื่อ Login ครั้งแรก
7. ✅ Sync ข้อมูลเป็นประจำ (auto/manual)
8. ❌ อย่าลบข้อมูล User เก่า ให้เปลี่ยนสถานะเป็น inactive
9. ❌ อย่าเก็บข้อมูลส่วนบุคคลที่ไม่จำเป็น

---

## อ้างอิงอย่างรวดเร็ว

| ฟิลด์ DPIS6 | ฟิลด์ HR-IMS | ประเภทข้อมูล |
|-------------|--------------|--------------|
| PID | employeeId | String (unique) |
| PTITLE | prefix | String |
| PNAME | firstName | String |
| PLNAME | lastName | String |
| PPOSITION | position | String |
| PDEPARTMENT | department | String |
| PEMAIL | email | String (unique) |
| PIDCARD | idCard | String (unique) |
| PSTATUS | status | active/inactive |

| การทำงาน | คำอธิบาย |
|----------|----------|
| Import | นำเข้าข้อมูลใหม่ทั้งหมด (สร้าง + อัปเดท) |
| Sync | อัปเดทเฉพาะที่มีอยู่แล้ว |
| Deactivate | ปิดการใช้งาน (status = inactive) |
