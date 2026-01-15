---
name: API Documentation
description: การจัดทำเอกสาร API ด้วย OpenAPI/Swagger และแนวทางการเขียนเอกสาร
---

# การจัดทำเอกสาร API

คู่มือนี้ช่วยให้คุณสร้างเอกสาร API ที่ชัดเจนและครบถ้วน

## ภาพรวม

การจัดทำเอกสาร API ที่ดีช่วยให้:
- นักพัฒนาเข้าใจวิธีใช้ API ได้รวดเร็ว
- ลดเวลาในการถาม-ตอบ
- ทำให้ API ใช้งานง่ายขึ้น

## OpenAPI/Swagger

### การติดตั้ง

```bash
cd backend
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

### การตั้งค่า

**ไฟล์:** `backend/src/swagger.ts`

```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HR-IMS API',
      version: '1.0.0',
      description: 'API สำหรับระบบจัดการคลังสินค้าและทรัพยากรบุคคล',
      contact: {
        name: 'ทีมพัฒนา',
        email: 'dev@hr-ims.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development Server'
      }
    ],
    components: {
      securitySchemes: {
        userIdHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-id',
          description: 'User ID for authentication'
        },
        userRoleHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-role',
          description: 'User Role for authorization'
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (req, res) => {
    res.json(swaggerSpec);
  });
};
```

### การใช้งานใน index.ts

```typescript
import express from 'express';
import { setupSwagger } from './swagger';

const app = express();

// ตั้งค่า Swagger
setupSwagger(app);

// เข้าถึงได้ที่ http://localhost:5000/api-docs
```

## การเขียน JSDoc Comments

### Endpoint พื้นฐาน

```typescript
/**
 * @openapi
 * /api/inventory:
 *   get:
 *     summary: ดึงรายการสินค้าทั้งหมด
 *     description: ดึงรายการสินค้าคงคลังทั้งหมด พร้อมข้อมูลระดับสต็อก
 *     tags:
 *       - Inventory
 *     responses:
 *       200:
 *         description: สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/InventoryItem'
 *       500:
 *         description: เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
export const getItems = async (req: Request, res: Response) => {
  // ...
};
```

### Endpoint พร้อม Parameters

```typescript
/**
 * @openapi
 * /api/inventory/{id}:
 *   get:
 *     summary: ดึงข้อมูลสินค้าตาม ID
 *     tags:
 *       - Inventory
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: รหัสสินค้า
 *     responses:
 *       200:
 *         description: สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryItem'
 *       404:
 *         description: ไม่พบสินค้า
 */
export const getItemById = async (req: Request, res: Response) => {
  // ...
};
```

### Endpoint พร้อม Request Body

```typescript
/**
 * @openapi
 * /api/inventory:
 *   post:
 *     summary: สร้างสินค้าใหม่
 *     tags:
 *       - Inventory
 *     security:
 *       - userIdHeader: []
 *       - userRoleHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 description: ชื่อสินค้า
 *                 example: "Laptop Dell XPS 15"
 *               category:
 *                 type: string
 *                 description: หมวดหมู่
 *                 example: "Electronics"
 *               type:
 *                 type: string
 *                 enum: [durable, consumable]
 *                 description: ประเภทสินค้า
 *               stock:
 *                 type: integer
 *                 default: 1
 *                 description: จำนวนเริ่มต้น
 *     responses:
 *       201:
 *         description: สร้างสำเร็จ
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       401:
 *         description: ไม่ได้รับอนุญาต
 */
export const createItem = async (req: Request, res: Response) => {
  // ...
};
```

### Schema Definitions

```typescript
/**
 * @openapi
 * components:
 *   schemas:
 *     InventoryItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: รหัสสินค้า
 *         name:
 *           type: string
 *           description: ชื่อสินค้า
 *         category:
 *           type: string
 *           description: หมวดหมู่
 *         type:
 *           type: string
 *           enum: [durable, consumable]
 *           description: ประเภทสินค้า
 *         stock:
 *           type: integer
 *           description: จำนวนคงเหลือ
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: วันที่สร้าง
 *       example:
 *         id: 1
 *         name: "Laptop Dell XPS 15"
 *         category: "Electronics"
 *         type: "durable"
 *         stock: 10
 *         createdAt: "2024-01-15T08:00:00Z"
 */
```

## โครงสร้างเอกสาร API

### รูปแบบมาตรฐาน

```markdown
## [ชื่อ Endpoint]

**Method:** GET/POST/PUT/DELETE
**URL:** `/api/resource`

### คำอธิบาย
อธิบายว่า endpoint นี้ทำอะไร

### Headers
| ชื่อ | ประเภท | จำเป็น | คำอธิบาย |
|------|--------|--------|----------|
| x-user-id | string | ✅ | รหัสผู้ใช้ |
| x-user-role | string | ✅ | บทบาทผู้ใช้ |

### Parameters
| ชื่อ | ประเภท | จำเป็น | คำอธิบาย |
|------|--------|--------|----------|
| id | integer | ✅ | รหัสสินค้า |

### Request Body
```json
{
  "name": "string",
  "category": "string"
}
```

### Response
```json
{
  "id": 1,
  "name": "Laptop"
}
```

### Error Responses
| Status | คำอธิบาย |
|--------|----------|
| 400 | ข้อมูลไม่ถูกต้อง |
| 404 | ไม่พบข้อมูล |
```

## ตัวอย่าง API Endpoints สำหรับ HR-IMS

### Inventory API

| Method | Endpoint | คำอธิบาย | สิทธิ์ |
|--------|----------|----------|--------|
| GET | /api/inventory | ดึงรายการสินค้าทั้งหมด | ทุกคน |
| GET | /api/inventory/:id | ดึงสินค้าตาม ID | ทุกคน |
| POST | /api/inventory | สร้างสินค้าใหม่ | admin |
| PATCH | /api/inventory/:id | แก้ไขสินค้า | admin |
| DELETE | /api/inventory/:id | ลบสินค้า | superadmin |

### Request API

| Method | Endpoint | คำอธิบาย | สิทธิ์ |
|--------|----------|----------|--------|
| GET | /api/requests | ดึงคำขอทั้งหมด | ทุกคน |
| POST | /api/requests | สร้างคำขอใหม่ | user |
| PATCH | /api/requests/:id/approve | อนุมัติคำขอ | admin |
| PATCH | /api/requests/:id/reject | ปฏิเสธคำขอ | admin |

## แนวปฏิบัติที่ดีที่สุด

1. ✅ เขียนคำอธิบายเป็นภาษาที่เข้าใจง่าย
2. ✅ ใส่ตัวอย่าง Request/Response
3. ✅ ระบุ Error codes และความหมาย
4. ✅ บอกสิทธิ์ที่ต้องการ (Auth/RBAC)
5. ✅ อัพเดทเอกสารเมื่อ API เปลี่ยน
6. ✅ ใช้ Tags จัดกลุ่ม endpoints
7. ❌ อย่าเปิดเผยข้อมูลลับในตัวอย่าง
8. ❌ อย่าละเลยกรณี Error

## อ้างอิงอย่างรวดเร็ว

| เครื่องมือ | คำอธิบาย |
|-----------|----------|
| Swagger UI | Interactive API documentation |
| swagger-jsdoc | Generate OpenAPI from JSDoc |
| Postman | API testing + documentation |
| Insomnia | API client |

| HTTP Status | ความหมาย |
|-------------|----------|
| 200 | สำเร็จ |
| 201 | สร้างสำเร็จ |
| 400 | ข้อมูลไม่ถูกต้อง |
| 401 | ไม่ได้รับอนุญาต |
| 403 | ไม่มีสิทธิ์ |
| 404 | ไม่พบข้อมูล |
| 500 | เซิร์ฟเวอร์ผิดพลาด |
