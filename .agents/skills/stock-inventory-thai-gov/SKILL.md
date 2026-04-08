---
name: Stock & Inventory Management (Thai Public Sector)
description: ระบบบริหารจัดการพัสดุและคลังสินค้าสำหรับหน่วยงานภาครัฐของไทย
---

# ระบบบริหารจัดการพัสดุและคลังสินค้า

คู่มือนี้ครอบคลุมการพัฒนาระบบจัดการพัสดุสำหรับหน่วยงานภาครัฐของไทย ตาม พ.ร.บ.การจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560

## ภาพรวม

### กฎหมายและระเบียบที่เกี่ยวข้อง

| กฎหมาย/ระเบียบ | เนื้อหา |
|---------------|---------|
| พ.ร.บ.การจัดซื้อจัดจ้างฯ พ.ศ. 2560 | กฎหมายหลักว่าด้วยการจัดซื้อจัดจ้าง |
| ระเบียบกระทรวงการคลัง พ.ศ. 2560 | ระเบียบว่าด้วยการจัดซื้อจัดจ้าง |
| หนังสือเวียนกรมบัญชีกลาง | แนวปฏิบัติและข้อกำหนดเพิ่มเติม |

### ประเภทพัสดุ

| ประเภท | คำอธิบาย | ตัวอย่าง | การจัดการ |
|--------|----------|---------|----------|
| **ครุภัณฑ์ (Durable)** | สิ่งของที่มีลักษณะคงทนถาวร | คอมพิวเตอร์, เครื่องปรับอากาศ | มีเลขครุภัณฑ์, ติดตามการใช้งาน |
| **วัสดุสิ้นเปลือง (Consumable)** | สิ่งของที่ใช้แล้วหมดไป | กระดาษ, หมึกพิมพ์ | ติดตามปริมาณคงเหลือ |
| **วัสดุคงคลัง (Stock)** | วัสดุที่เก็บสำรองไว้ใช้งาน | อุปกรณ์สำนักงาน | ระบบ Min/Max Stock |

---

## 1. โครงสร้างข้อมูล (Data Model)

### Prisma Schema สำหรับพัสดุภาครัฐ

```prisma
// prisma/schema.prisma

// ผู้ใช้งาน
model User {
  id           Int      @id @default(autoincrement())
  employeeId   String   @unique  // รหัสพนักงาน
  email        String   @unique
  password     String
  prefix       String?  // คำนำหน้า (นาย, นาง, นางสาว)
  firstName    String
  lastName     String
  position     String?  // ตำแหน่ง
  department   String?  // หน่วยงาน/ฝ่าย
  role         String   @default("user") // superadmin, admin, hr, procurement, user
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  requests     Request[]
  approvals    Approval[]
  notifications Notification[]
}

// รายการพัสดุ
model InventoryItem {
  id             Int      @id @default(autoincrement())
  itemCode       String   @unique  // รหัสพัสดุ
  name           String   // ชื่อพัสดุ
  description    String?  // รายละเอียด
  category       String   // หมวดหมู่
  type           String   // durable, consumable
  unit           String   // หน่วยนับ (ชิ้น, กล่อง, รีม)
  unitPrice      Float?   // ราคาต่อหน่วย
  
  // สำหรับครุภัณฑ์
  assetNumber    String?  // เลขครุภัณฑ์
  serialNumber   String?  // หมายเลขเครื่อง
  brand          String?  // ยี่ห้อ
  model          String?  // รุ่น
  purchaseDate   DateTime?  // วันที่จัดซื้อ
  warrantyExpiry DateTime?  // วันหมดประกัน
  lifespan       Int?     // อายุการใช้งาน (ปี)
  
  status         String   @default("active") // active, inactive, disposed, under_repair
  location       String?  // สถานที่เก็บ
  imageUrl       String?  // รูปภาพ
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  stockLevels    StockLevel[]
  requestItems   RequestItem[]
  transactions   StockTransaction[]
}

// คลังสินค้า/สถานที่เก็บ
model Warehouse {
  id          Int      @id @default(autoincrement())
  code        String   @unique  // รหัสคลัง
  name        String   // ชื่อคลัง
  location    String?  // ที่ตั้ง
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  stockLevels StockLevel[]
  requests    Request[]
}

// ระดับสต็อกตามคลัง
model StockLevel {
  id          Int      @id @default(autoincrement())
  warehouseId Int
  itemId      Int
  quantity    Int      @default(0)  // จำนวนคงเหลือ
  minStock    Int      @default(0)  // จุดสั่งซื้อ (Reorder Point)
  maxStock    Int      @default(100) // จำนวนสูงสุด
  
  warehouse   Warehouse     @relation(fields: [warehouseId], references: [id])
  item        InventoryItem @relation(fields: [itemId], references: [id])
  
  @@unique([warehouseId, itemId])
}

// ใบเบิก/ใบขอ
model Request {
  id             Int      @id @default(autoincrement())
  requestNumber  String   @unique  // เลขที่ใบเบิก (เช่น REQ-2567-0001)
  userId         Int
  warehouseId    Int?
  type           String   // withdraw (เบิก), borrow (ยืม), return (คืน), adjust (ปรับปรุง)
  status         String   @default("pending") // pending, approved, rejected, completed, cancelled
  purpose        String?  // วัตถุประสงค์การเบิก
  projectCode    String?  // รหัสโครงการ/กิจกรรม
  notes          String?  // หมายเหตุ
  
  requestedAt    DateTime @default(now())
  approvedAt     DateTime?
  completedAt    DateTime?
  
  user           User         @relation(fields: [userId], references: [id])
  warehouse      Warehouse?   @relation(fields: [warehouseId], references: [id])
  requestItems   RequestItem[]
  approvals      Approval[]
  
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

// รายการในใบเบิก
model RequestItem {
  id             Int      @id @default(autoincrement())
  requestId      Int
  itemId         Int
  quantityRequested Int   // จำนวนที่ขอ
  quantityApproved  Int?  // จำนวนที่อนุมัติ
  quantityIssued    Int?  // จำนวนที่จ่ายจริง
  notes          String?
  
  request        Request       @relation(fields: [requestId], references: [id], onDelete: Cascade)
  item           InventoryItem @relation(fields: [itemId], references: [id])
}

// การอนุมัติ
model Approval {
  id          Int      @id @default(autoincrement())
  requestId   Int
  approverId  Int
  level       Int      // ลำดับการอนุมัติ (1, 2, 3)
  action      String   // approved, rejected
  comments    String?
  approvedAt  DateTime @default(now())
  
  request     Request  @relation(fields: [requestId], references: [id])
  approver    User     @relation(fields: [approverId], references: [id])
}

// ประวัติการเคลื่อนไหวสต็อก
model StockTransaction {
  id          Int      @id @default(autoincrement())
  itemId      Int
  warehouseId Int?
  type        String   // inbound (รับเข้า), outbound (จ่ายออก), adjust (ปรับปรุง), transfer (โอน)
  quantity    Int      // จำนวน (+/-)
  balance     Int      // ยอดคงเหลือหลังทำรายการ
  reference   String?  // เลขที่อ้างอิง (เลขใบเบิก, เลขใบรับ)
  reason      String?  // เหตุผล
  userId      Int?     // ผู้ทำรายการ
  
  createdAt   DateTime @default(now())
  
  item        InventoryItem @relation(fields: [itemId], references: [id])
}
```

---

## 2. ขั้นตอนการทำงาน (Workflows)

### 2.1 ขั้นตอนการเบิกพัสดุ

```
1. ผู้ขอ (User) → สร้างใบเบิก → สถานะ: pending
2. หัวหน้างาน (HR) → ตรวจสอบ/อนุมัติ → สถานะ: approved (level 1)
3. เจ้าหน้าที่พัสดุ (Procurement) → ตรวจสอบ → สถานะ: approved (level 2)
4. ผู้อนุมัติสูงสุด (Admin) → อนุมัติ → สถานะ: completed
5. ปรับปรุงสต็อก → บันทึกประวัติการเคลื่อนไหว
```

### 2.2 Server Action สำหรับเบิกพัสดุ

```typescript
// lib/actions/requests.ts
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// สร้างใบเบิก
export async function createWithdrawRequest(data: {
  warehouseId: number;
  purpose: string;
  projectCode?: string;
  items: { itemId: number; quantity: number }[];
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'ไม่ได้รับอนุญาต' };
  }

  try {
    // สร้างเลขที่ใบเบิก
    const year = new Date().getFullYear() + 543; // พ.ศ.
    const count = await prisma.request.count({
      where: {
        requestNumber: { startsWith: `REQ-${year}` }
      }
    });
    const requestNumber = `REQ-${year}-${(count + 1).toString().padStart(4, '0')}`;

    // ตรวจสอบสต็อก
    for (const item of data.items) {
      const stockLevel = await prisma.stockLevel.findFirst({
        where: { 
          itemId: item.itemId, 
          warehouseId: data.warehouseId 
        }
      });
      
      if (!stockLevel || stockLevel.quantity < item.quantity) {
        const itemInfo = await prisma.inventoryItem.findUnique({
          where: { id: item.itemId }
        });
        return { 
          error: `สินค้า "${itemInfo?.name}" มีไม่เพียงพอ (คงเหลือ: ${stockLevel?.quantity || 0})` 
        };
      }
    }

    // สร้างใบเบิก
    const request = await prisma.request.create({
      data: {
        requestNumber,
        userId: parseInt(session.user.id),
        warehouseId: data.warehouseId,
        type: 'withdraw',
        purpose: data.purpose,
        projectCode: data.projectCode,
        requestItems: {
          create: data.items.map(item => ({
            itemId: item.itemId,
            quantityRequested: item.quantity
          }))
        }
      },
      include: {
        requestItems: { include: { item: true } }
      }
    });

    revalidatePath('/dashboard/requests');
    return { success: true, requestNumber };
  } catch (error) {
    console.error('Create request error:', error);
    return { error: 'เกิดข้อผิดพลาดในการสร้างใบเบิก' };
  }
}

// อนุมัติใบเบิก
export async function approveRequest(
  requestId: number, 
  action: 'approved' | 'rejected',
  comments?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'ไม่ได้รับอนุญาต' };
  }

  try {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { 
        approvals: true,
        requestItems: true
      }
    });

    if (!request) {
      return { error: 'ไม่พบใบเบิก' };
    }

    const currentLevel = request.approvals.length + 1;

    // บันทึกการอนุมัติ
    await prisma.approval.create({
      data: {
        requestId,
        approverId: parseInt(session.user.id),
        level: currentLevel,
        action,
        comments
      }
    });

    // อัพเดทสถานะใบเบิก
    if (action === 'rejected') {
      await prisma.request.update({
        where: { id: requestId },
        data: { status: 'rejected' }
      });
    } else if (action === 'approved') {
      // ถ้าครบทุก level แล้ว ทำการตัดสต็อก
      const totalLevels = 2; // จำนวน level ที่ต้องอนุมัติ
      
      if (currentLevel >= totalLevels) {
        // ตัดสต็อก
        for (const item of request.requestItems) {
          const quantityToDeduct = item.quantityApproved || item.quantityRequested;
          
          await prisma.stockLevel.updateMany({
            where: {
              warehouseId: request.warehouseId!,
              itemId: item.itemId
            },
            data: {
              quantity: { decrement: quantityToDeduct }
            }
          });

          // บันทึกประวัติ
          const stockLevel = await prisma.stockLevel.findFirst({
            where: {
              warehouseId: request.warehouseId!,
              itemId: item.itemId
            }
          });

          await prisma.stockTransaction.create({
            data: {
              itemId: item.itemId,
              warehouseId: request.warehouseId,
              type: 'outbound',
              quantity: -quantityToDeduct,
              balance: stockLevel?.quantity || 0,
              reference: request.requestNumber,
              userId: parseInt(session.user.id)
            }
          });
        }

        await prisma.request.update({
          where: { id: requestId },
          data: { 
            status: 'completed',
            completedAt: new Date()
          }
        });
      } else {
        await prisma.request.update({
          where: { id: requestId },
          data: { status: 'approved' }
        });
      }
    }

    revalidatePath('/dashboard/requests');
    revalidatePath('/dashboard/approvals');
    return { success: true };
  } catch (error) {
    console.error('Approve request error:', error);
    return { error: 'เกิดข้อผิดพลาดในการอนุมัติ' };
  }
}
```

---

## 3. รายงาน (Reports)

### 3.1 รายงานพัสดุคงเหลือ

```typescript
// lib/actions/reports.ts
'use server';

import prisma from '@/lib/prisma';

export async function getStockReport(warehouseId?: number) {
  const stockLevels = await prisma.stockLevel.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    include: {
      item: true,
      warehouse: true
    },
    orderBy: { item: { name: 'asc' } }
  });

  return stockLevels.map(sl => ({
    รหัสพัสดุ: sl.item.itemCode,
    ชื่อพัสดุ: sl.item.name,
    หมวดหมู่: sl.item.category,
    ประเภท: sl.item.type === 'durable' ? 'ครุภัณฑ์' : 'วัสดุสิ้นเปลือง',
    หน่วยนับ: sl.item.unit,
    คลัง: sl.warehouse.name,
    คงเหลือ: sl.quantity,
    จุดสั่งซื้อ: sl.minStock,
    สถานะ: sl.quantity <= sl.minStock ? '⚠️ ต่ำกว่าจุดสั่งซื้อ' : '✅ ปกติ'
  }));
}

// รายงานการเคลื่อนไหวสต็อก
export async function getTransactionReport(
  itemId?: number,
  startDate?: Date,
  endDate?: Date
) {
  const transactions = await prisma.stockTransaction.findMany({
    where: {
      ...(itemId && { itemId }),
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      })
    },
    include: { item: true },
    orderBy: { createdAt: 'desc' }
  });

  return transactions.map(t => ({
    วันที่: t.createdAt.toLocaleDateString('th-TH'),
    รหัสพัสดุ: t.item.itemCode,
    ชื่อพัสดุ: t.item.name,
    ประเภทรายการ: {
      inbound: 'รับเข้า',
      outbound: 'จ่ายออก',
      adjust: 'ปรับปรุง',
      transfer: 'โอน'
    }[t.type],
    จำนวน: t.quantity,
    คงเหลือ: t.balance,
    อ้างอิง: t.reference,
    เหตุผล: t.reason
  }));
}

// รายงานครุภัณฑ์
export async function getAssetReport() {
  const assets = await prisma.inventoryItem.findMany({
    where: { type: 'durable' },
    orderBy: { assetNumber: 'asc' }
  });

  return assets.map(a => ({
    เลขครุภัณฑ์: a.assetNumber,
    ชื่อครุภัณฑ์: a.name,
    ยี่ห้อ: a.brand,
    รุ่น: a.model,
    หมายเลขเครื่อง: a.serialNumber,
    วันที่จัดซื้อ: a.purchaseDate?.toLocaleDateString('th-TH'),
    ราคา: a.unitPrice?.toLocaleString('th-TH'),
    สถานะ: {
      active: 'ใช้งานปกติ',
      inactive: 'ไม่ใช้งาน',
      disposed: 'จำหน่ายแล้ว',
      under_repair: 'ซ่อมบำรุง'
    }[a.status],
    ที่ตั้ง: a.location
  }));
}
```

### 3.2 Export เป็น CSV

```typescript
// lib/utils/export.ts

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    // BOM for Thai encoding
    '\ufeff',
    headers.join(','),
    ...data.map(row => 
      headers.map(h => `"${row[h] ?? ''}"`.replace(/"/g, '""')).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
```

---

## 4. การกำหนดเลขครุภัณฑ์ (Asset Number)

### รูปแบบมาตรฐาน

```
[หมวดหมู่]-[ปี พ.ศ.]-[ลำดับ]

ตัวอย่าง:
- 7440-2567-0001 (อุปกรณ์คอมพิวเตอร์)
- 7110-2567-0001 (เครื่องเรือน)
- 7730-2567-0001 (อุปกรณ์ไฟฟ้า)
```

### หมวดหมู่ครุภัณฑ์ (ตามรหัส GFMIS)

| รหัส | หมวดหมู่ |
|------|----------|
| 7110 | เครื่องเรือน |
| 7120 | ตู้เหล็ก |
| 7310 | อุปกรณ์สำนักงาน |
| 7440 | คอมพิวเตอร์และอุปกรณ์ |
| 7730 | เครื่องไฟฟ้าและวิทยุ |
| 7830 | ยานพาหนะ |

### การสร้างเลขครุภัณฑ์อัตโนมัติ

```typescript
// lib/utils/assetNumber.ts

export async function generateAssetNumber(
  categoryCode: string,
  prisma: PrismaClient
): Promise<string> {
  const year = new Date().getFullYear() + 543; // พ.ศ.
  const prefix = `${categoryCode}-${year}`;
  
  // หาลำดับสุดท้าย
  const lastAsset = await prisma.inventoryItem.findFirst({
    where: {
      assetNumber: { startsWith: prefix }
    },
    orderBy: { assetNumber: 'desc' }
  });

  let sequence = 1;
  if (lastAsset?.assetNumber) {
    const lastSeq = parseInt(lastAsset.assetNumber.split('-')[2]);
    sequence = lastSeq + 1;
  }

  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
}
```

---

## 5. การแจ้งเตือน (Notifications)

### การแจ้งเตือนที่ควรมี

```typescript
// ประเภทการแจ้งเตือน
const notificationTypes = {
  LOW_STOCK: 'พัสดุใกล้หมด',
  REQUEST_PENDING: 'มีใบเบิกรอดำเนินการ',
  REQUEST_APPROVED: 'ใบเบิกได้รับการอนุมัติ',
  REQUEST_REJECTED: 'ใบเบิกถูกปฏิเสธ',
  WARRANTY_EXPIRING: 'ครุภัณฑ์ใกล้หมดประกัน',
  ASSET_MAINTENANCE: 'ถึงกำหนดบำรุงรักษา'
};

// ตรวจสอบสต็อกต่ำ
export async function checkLowStock(prisma: PrismaClient) {
  const lowStockItems = await prisma.stockLevel.findMany({
    where: {
      quantity: { lte: prisma.raw('minStock') }
    },
    include: { item: true, warehouse: true }
  });

  for (const item of lowStockItems) {
    // สร้างการแจ้งเตือน
    await prisma.notification.create({
      data: {
        type: 'LOW_STOCK',
        title: 'พัสดุใกล้หมด',
        message: `"${item.item.name}" คงเหลือ ${item.quantity} ${item.item.unit} (ต่ำกว่าจุดสั่งซื้อ ${item.minStock})`,
        targetRole: 'procurement'
      }
    });
  }
}
```

---

## 6. ตัวเลือกสถานะ (Status Options)

```typescript
// lib/constants/status.ts

export const REQUEST_STATUS = {
  pending: { label: 'รอดำเนินการ', color: 'yellow' },
  approved: { label: 'อนุมัติแล้ว', color: 'blue' },
  rejected: { label: 'ไม่อนุมัติ', color: 'red' },
  completed: { label: 'เสร็จสิ้น', color: 'green' },
  cancelled: { label: 'ยกเลิก', color: 'gray' }
} as const;

export const ITEM_STATUS = {
  active: { label: 'ใช้งานปกติ', color: 'green' },
  inactive: { label: 'ไม่ใช้งาน', color: 'gray' },
  disposed: { label: 'จำหน่ายแล้ว', color: 'red' },
  under_repair: { label: 'ซ่อมบำรุง', color: 'yellow' }
} as const;

export const TRANSACTION_TYPE = {
  inbound: { label: 'รับเข้า', color: 'green' },
  outbound: { label: 'จ่ายออก', color: 'red' },
  adjust: { label: 'ปรับปรุง', color: 'blue' },
  transfer: { label: 'โอนย้าย', color: 'purple' }
} as const;
```

---

## 7. UI Components

### ใบเบิกฟอร์ม

```tsx
// components/warehouse/RequestForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createWithdrawRequest } from '@/lib/actions/requests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';

const schema = z.object({
  warehouseId: z.number({ required_error: 'กรุณาเลือกคลัง' }),
  purpose: z.string().min(1, 'กรุณาระบุวัตถุประสงค์'),
  projectCode: z.string().optional(),
  items: z.array(z.object({
    itemId: z.number(),
    quantity: z.number().min(1, 'จำนวนต้องมากกว่า 0')
  })).min(1, 'กรุณาเพิ่มรายการพัสดุ')
});

export function RequestForm({ 
  warehouses, 
  items 
}: { 
  warehouses: Warehouse[]; 
  items: InventoryItem[] 
}) {
  const [loading, setLoading] = useState(false);
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: []
    }
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true);
    try {
      const result = await createWithdrawRequest(data);
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      toast.success(`สร้างใบเบิกสำเร็จ: ${result.requestNumber}`);
      form.reset();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Form fields */}
    </form>
  );
}
```

---

## 8. สิทธิ์การเข้าถึง (RBAC)

```typescript
// lib/permissions.ts

export const ROLES = {
  superadmin: {
    label: 'ผู้ดูแลระบบสูงสุด',
    permissions: ['*'] // ทุกสิทธิ์
  },
  admin: {
    label: 'ผู้ดูแลระบบ',
    permissions: [
      'inventory:read', 'inventory:write',
      'request:read', 'request:approve',
      'report:read', 'user:read'
    ]
  },
  procurement: {
    label: 'เจ้าหน้าที่พัสดุ',
    permissions: [
      'inventory:read', 'inventory:write',
      'request:read', 'request:approve',
      'report:read'
    ]
  },
  hr: {
    label: 'หัวหน้างาน',
    permissions: [
      'inventory:read',
      'request:read', 'request:approve:level1',
      'report:read'
    ]
  },
  user: {
    label: 'ผู้ใช้งานทั่วไป',
    permissions: [
      'inventory:read',
      'request:create', 'request:read:own'
    ]
  }
} as const;

export function hasPermission(role: string, permission: string): boolean {
  const rolePermissions = ROLES[role as keyof typeof ROLES]?.permissions || [];
  return rolePermissions.includes('*') || rolePermissions.includes(permission);
}
```

---

## แนวปฏิบัติที่ดีที่สุด

1. ✅ ใช้เลขที่เอกสารอ้างอิงเสมอ (เลขใบเบิก, เลขครุภัณฑ์)
2. ✅ บันทึกประวัติการเคลื่อนไหวทุกครั้ง (Audit Trail)
3. ✅ ตรวจสอบสต็อกก่อนอนุมัติเบิก
4. ✅ แจ้งเตือนเมื่อสต็อกต่ำกว่าจุดสั่งซื้อ
5. ✅ สำรองข้อมูลเป็นประจำ
6. ✅ จัดทำรายงานประจำเดือน/ปี
7. ❌ อย่าลบข้อมูลพัสดุ ให้เปลี่ยนสถานะแทน
8. ❌ อย่าแก้ไขประวัติการเคลื่อนไหว

---

## อ้างอิงอย่างรวดเร็ว

| ประเภทเอกสาร | รูปแบบเลขที่ | ตัวอย่าง |
|-------------|--------------|---------|
| ใบเบิก | REQ-[ปี พ.ศ.]-[ลำดับ] | REQ-2567-0001 |
| ใบรับ | RCV-[ปี พ.ศ.]-[ลำดับ] | RCV-2567-0001 |
| ครุภัณฑ์ | [หมวด]-[ปี]-[ลำดับ] | 7440-2567-0001 |

| บทบาท | สิทธิ์หลัก |
|-------|----------|
| superadmin | ทุกสิทธิ์ |
| admin | จัดการพัสดุ, อนุมัติ, รายงาน |
| procurement | จัดการพัสดุ, อนุมัติ level 2 |
| hr | อนุมัติ level 1 |
| user | เบิกพัสดุ, ดูประวัติตนเอง |
