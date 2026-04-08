---
name: Learning & Coaching Guide
description: คู่มือเรียนรู้และสอนโปรเจค HR-IMS สำหรับผู้เริ่มต้น ครอบคลุมการเขียนโปรแกรม แก้ไข Deploy และ DevSecOps
---

# คู่มือเรียนรู้และสอน HR-IMS

คู่มือนี้สำหรับผู้ที่มีพื้นฐานโปรแกรมมิ่งน้อย เพื่อเรียนรู้การพัฒนา แก้ไข และ deploy โปรเจค HR-IMS

## ภาพรวม

### กลุ่มเป้าหมาย
- ผู้ที่มีพื้นฐานโปรแกรมมิ่งน้อย
- ต้องการเรียนรู้การพัฒนา Web Application
- ต้องการเข้าใจ HR-IMS project

### สิ่งที่จะได้เรียนรู้
1. โครงสร้างโปรเจค HR-IMS
2. การเขียนโปรแกรมพื้นฐาน (TypeScript, React)
3. การแก้ไขโค้ด
4. การ Deploy
5. DevSecOps พื้นฐาน

---

## 🚀 1. เริ่มต้นกับ HR-IMS

### 1.1 โครงสร้างโปรเจค

```
hr-ims/
├── backend/              # Backend (Express + Prisma)
│   ├── prisma/          # Database Schema
│   ├── src/
│   │   ├── routes/      # API Routes
│   │   ├── controllers/ # Business Logic
│   │   └── middleware/  # Authentication, RBAC
│   └── package.json
│
├── frontend/            # Frontend (Next.js)
│   └── next-app/
│       ├── app/         # App Router (หน้าเว็บ)
│       ├── components/  # UI Components
│       ├── lib/         # Utilities, Server Actions
│       └── package.json
│
└── .agents/
    ├── skills/          # เอกสารนี้!
    └── workflows/       # คำสั่งที่ใช้บ่อย
```

### 1.2 เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี | ทำอะไร |
|------|-----------|--------|
| Backend | Express.js | สร้าง API |
| Backend | Prisma | เชื่อมต่อ Database |
| Backend | Zod | ตรวจสอบข้อมูล |
| Frontend | Next.js 14+ | สร้างหน้าเว็บ |
| Frontend | Shadcn UI | คอมโพเนนต์ UI สำเร็จรูป |
| Frontend | TailwindCSS | จัดสไตล์ |
| Database | SQLite | ฐานข้อมูล (dev) |
| Auth | NextAuth v5 | Login/Logout |

---

## 🔧 2. การติดตั้งและรันโปรเจค

### 2.1 ติดตั้งครั้งแรก

```bash
# 1. Clone โปรเจค (ถ้ามี)
git clone <repository-url>
cd hr-ims

# 2. ติดตั้ง dependencies
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend/next-app
npm install
cd ../..

# 3. Setup database
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..
```

### 2.2 รันโปรเจค

```bash
# เปิด 2 terminals:

# Terminal 1: Backend
cd backend
npm run dev
# ✅ รันที่ http://localhost:5000

# Terminal 2: Frontend
cd frontend/next-app
npm run dev
# ✅ รันที่ http://localhost:3000
```

### 2.3 ใช้ Workflow (ง่ายกว่า!)

```bash
# ดู workflow ที่มี
ls .agents/workflows/

# รันทั้ง Backend + Frontend
# ใช้คำสั่ง: /start_dev
```

---

## 💻 3. เริ่มสอนเขียนโค้ด

### 3.1 สอน TypeScript พื้นฐาน

```typescript
// ตัวแปรและชนิดข้อมูล
const name: string = "สมชาย";        // ข้อความ
const age: number = 25;               // ตัวเลข
const isActive: boolean = true;       // true/false

// Array
const items: string[] = ["กระดาษ", "ปากกา"];

// Object
const user = {
  id: 1,
  name: "สมชาย",
  email: "somchai@example.com"
};

// Function
function greet(name: string): string {
  return `สวัสดี ${name}`;
}
```

### 3.2 สอนสร้าง API ง่ายๆ

```typescript
// backend/src/routes/hello.ts
import { Router } from 'express';

const router = Router();

// GET /api/hello
router.get('/hello', (req, res) => {
  res.json({ message: "สวัสดี!" });
});

// GET /api/hello/:name
router.get('/hello/:name', (req, res) => {
  const { name } = req.params;
  res.json({ message: `สวัสดี ${name}!` });
});

export default router;
```

**ลงทะเบียน route:**
```typescript
// backend/src/index.ts
import helloRoutes from './routes/hello';

app.use('/api', helloRoutes);
```

**ทดสอบ:**
```bash
# เรียก API
curl http://localhost:5000/api/hello
# ได้: {"message": "สวัสดี!"}

curl http://localhost:5000/api/hello/สมชาย
# ได้: {"message": "สวัสดี สมชาย!"}
```

### 3.3 สอนสร้างหน้าเว็บง่ายๆ

```tsx
// frontend/next-app/app/hello/page.tsx
export default function HelloPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">สวัสดี!</h1>
      <p className="mt-4">นี่คือหน้าเว็บแรกของคุณ</p>
    </div>
  );
}
```

**เข้าดู:** http://localhost:3000/hello

---

## ✏️ 4. การแก้ไขโค้ด

### 4.1 เปลี่ยนข้อความในหน้าเว็บ

```tsx
// ก่อนแก้ไข
<h1>Welcome</h1>

// หลังแก้ไข
<h1>ยินดีต้อนรับสู่ระบบ HR-IMS</h1>
```

### 4.2 เพิ่มปุ่ม

```tsx
import { Button } from '@/components/ui/button';

export default function MyPage() {
  return (
    <div>
      <Button onClick={() => alert('คลิกแล้ว!')}>
        กดที่นี่
      </Button>
    </div>
  );
}
```

### 4.3 แก้สี

```tsx
// ใช้ TailwindCSS classes
<div className="bg-blue-500 text-white p-4">
  พื้นหลังสีน้ำเงิน ตัวหนังสีขาว
</div>

// สีที่ใช้บ่อย:
bg-blue-500    // พื้นหลังน้ำเงิน
text-white     // ตัวหนังสีขาว
text-gray-600  // ตัวหนังสีเทา
border-red-500 // ขอบสีแดง
```

---

## 🐛 5. การ Debug (แก้ Bug)

### 5.1 วิธีหา Bug

```typescript
// 1. ใช้ console.log ดูค่า
function calculateTotal(items: any[]) {
  console.log('Items:', items); // ดูว่า items มีอะไรบ้าง
  
  const total = items.reduce((sum, item) => sum + item.price, 0);
  console.log('Total:', total); // ดูผลรวม
  
  return total;
}

// 2. ตรวจสอบ error message
try {
  const result = someFunction();
} catch (error) {
  console.error('เกิดข้อผิดพลาด:', error);
  // อ่าน error message เพื่อเข้าใจปัญหา
}
```

### 5.2 ปัญหาที่พบบ่อย (Bug & Security)

| ประเภท | ปัญหา | สาเหตุ | วิธีแก้ |
|--------|-------|--------|---------|
| 🐛 Bug | `Cannot read property 'x' of undefined` | ตัวแปรเป็น `undefined` | ตรวจสอบว่าตัวแปรมีค่าก่อนใช้งาน |
| 🐛 Bug | `Module not found` | ไม่ได้ install package | `npm install <package-name>` |
| 🐛 Bug | Port already in use | Port ถูกใช้งานอยู่ | ปิดโปรแกรมที่ใช้ port หรือเปลี่ยน port |
| 🐛 Bug | CORS error | Backend ไม่อนุญาตให้ Frontend เข้าถึง | ตั้งค่า CORS ใน backend |
| 🛡️ Security | Hard-coded secrets | มี API key ในโค้ด | ใช้ environment variables |
| 🛡️ Security | ไม่ validate input | รับข้อมูลจาก user โดยตรง | ใช้ Zod หรือ validation library |
| 🛡️ Security | Commit .env file | ไฟล์ sensitive ใน Git | เพิ่มใน .gitignore |

### 5.3 เครื่องมือช่วย Debug

```bash
# ดู log ของ Backend
cd backend
npm run dev
# ดู console output

# ดู error ของ Frontend
# เปิด Browser DevTools (F12)
# ดู tab Console

# ตรวจสอบ network requests
# ใน DevTools → Network tab
```

---

## 🚢 6. การ Deploy

### 6.1 Deploy ด้วย Docker (แนะนำ)

```bash
# คำสั่งพื้นฐาน
docker-compose build              # Build images
docker-compose up -d              # รันในพื้นหลัง
docker-compose ps                 # ตรวจสอบสถานะ
docker-compose logs -f            # ดู logs
docker-compose down               # หยุด
```

> **ดูรายละเอียดเพิ่มเติม:** [cicd-containerization skill](file:///d:/02%20genAI/hr-ims/.agents/skills/cicd-containerization/SKILL.md)

### 6.2 Deploy ไปยัง Production

```bash
# 1. สร้าง production build
# Backend
cd backend
npm run build

# Frontend
cd frontend/next-app
npm run build

# 2. ตั้งค่า environment variables
cp .env.example .env.production
# แก้ไขค่าใน .env.production

# 3. Deploy ด้วย PM2 (สำหรับ Node.js apps)
pm2 start ecosystem.config.js --env production
```

### 6.3 Checklist ก่อน Deploy

- [ ] แก้ไข environment variables (DATABASE_URL, SECRET_KEY, etc.)
- [ ] รัน `npm run build` สำเร็จ
- [ ] ทดสอบในเครื่องก่อน
- [ ] Backup database
- [ ] ตรวจสอบ security settings
- [ ] เตรียม rollback plan

---

## 🛡️ 7. DevSecOps พื้นฐาน

### 7.1 Security Best Practices

```typescript
// ❌ อย่าทำ - เก็บ secrets ใน code
const apiKey = "sk_live_abc123xyz";

// ✅ ทำ - ใช้ environment variables
const apiKey = process.env.API_KEY;

// ❌ อย่าทำ - ไม่ validate input
app.post('/user', (req, res) => {
  const user = req.body;
  await prisma.user.create({ data: user });
});

// ✅ ทำ - validate input ด้วย Zod
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1)
});

app.post('/user', (req, res) => {
  const data = userSchema.parse(req.body);
  await prisma.user.create({ data });
});
```

### 7.2 ไฟล์ที่ห้าม commit

```bash
# .gitignore
.env
.env.local
*.db
node_modules/
dist/
.next/
```

### 7.3 การใช้ Git อย่างปลอดภัย

```bash
# 1. ตรวจสอบก่อน commit
git status
git diff

# 2. Commit เฉพาะไฟล์ที่ต้องการ
git add src/components/MyComponent.tsx
git commit -m "Add MyComponent"

# 3. อย่า commit ไฟล์ sensitive
# ตรวจสอบว่าไม่มี .env หรือ secrets
git log --stat
```

---

## 📅 8. ขั้นตอนการเรียนรู้แบบ Step-by-Step

### สัปดาห์ที่ 1: พื้นฐาน
- [ ] เข้าใจโครงสร้างโปรเจค
- [ ] ติดตั้งและรันโปรเจคได้
- [ ] เข้าใจ TypeScript พื้นฐาน
- [ ] สร้าง API GET แรก
- [ ] สร้างหน้าเว็บแรก

> **สรุปสัปดาห์ 1:** เข้าใจพื้นฐาน TypeScript, โครงสร้างโปรเจค, รัน Backend + Frontend ได้ และสร้าง API + หน้าเว็บง่ายๆ แรกสำเร็จ

### สัปดาห์ที่ 2: CRUD Operations
- [ ] เข้าใจ Prisma Schema
- [ ] สร้าง API POST (create)
- [ ] สร้าง API PUT (update)
- [ ] สร้าง API DELETE
- [ ] เชื่อมต่อ Frontend กับ API

> **สรุปสัปดาห์ 2:** สามารถทำ CRUD (สร้าง/อ่าน/แก้/ลบ) ข้อมูลผ่าน API ได้ และเชื่อมต่อ Frontend กับ Backend สำเร็จ

### สัปดาห์ที่ 3: Authentication & Forms
- [ ] เข้าใจ NextAuth
- [ ] ทำ Login/Logout
- [ ] สร้างฟอร์มด้วย React Hook Form
- [ ] Validate ข้อมูลด้วย Zod
- [ ] จัดการ errors

> **สรุปสัปดาห์ 3:** สร้างระบบ Login/Logout ด้วย NextAuth ได้ และสร้างฟอร์มพร้อม validation ที่ครบถ้วน

### สัปดาห์ที่ 4: Deploy & DevOps
- [ ] Build production
- [ ] Deploy ด้วย Docker
- [ ] ตั้งค่า environment variables
- [ ] Monitor logs
- [ ] Backup database

> **สรุปสัปดาห์ 4:** Deploy แอปพลิเคชันขึ้น production ด้วย Docker สำเร็จ และเข้าใจการ monitor, backup พื้นฐาน

---

## 📚 9. แหล่งเรียนรู้เพิ่มเติม

### เอกสารภายใน HR-IMS
1. **prisma-schema** - เรียนรู้การจัดการ database
2. **api-development** - สร้าง API
3. **frontend-components** - สร้าง UI
4. **auth-rbac** - ระบบ Login และสิทธิ์
5. **debugging-troubleshooting** - แก้ Bug

### เว็บไซต์แนะนำ
- [TypeScript Docs](https://www.typescriptlang.org/docs/) - เรียน TypeScript
- [Next.js Learn](https://nextjs.org/learn) - เรียน Next.js
- [Prisma Docs](https://www.prisma.io/docs) - เรียน Prisma
- [TailwindCSS Docs](https://tailwindcss.com/docs) - เรียน TailwindCSS

---

## ❓ 10. คำถามที่พบบ่อย (FAQ)

### Q: ต้องรู้อะไรก่อนเริ่มเรียน?
**A:** พื้นฐาน HTML, CSS, JavaScript นิดหน่อย แต่ไม่รู้ก็เรียนไปด้วยได้

### Q: ถ้าติด error ทำยังไง?
**A:** 
1. อ่าน error message ให้ละเอียด
2. Google error message
3. ดู debugging-troubleshooting skill
4. ถามคนอื่น

### Q: ทำไมโค้ดไม่ work?
**A:**
1. ตรวจสอบว่า Backend และ Frontend รันอยู่
2. ดู console logs
3. ตรวจสอบ Network tab ใน DevTools
4. เช็คว่า syntax ถูกต้อง

### Q: Deploy แล้ว error ทำไง?
**A:**
1. ดู logs: `docker-compose logs -f`
2. ตรวจสอบ environment variables
3. เช็ค database connection
4. Rollback ถ้าจำเป็น

---

## ✍️ 11. แบบฝึกหัด

### แบบฝึกหัดที่ 1: สร้าง Hello API
```
เป้าหมาย: สร้าง API ที่รับชื่อและส่งคำทักทายกลับ

1. สร้างไฟล์ backend/src/routes/greeting.ts
2. สร้าง GET /api/greeting/:name
3. ส่ง response: { message: "สวัสดี ${name}!" }
4. ทดสอบด้วย browser: http://localhost:5000/api/greeting/สมชาย
```

### แบบฝึกหัดที่ 2: สร้างหน้าโปรไฟล์
```
เป้าหมาย: สร้างหน้าแสดงข้อมูลโปรไฟล์

1. สร้างไฟล์ frontend/next-app/app/profile/page.tsx
2. แสดงชื่อ, อีเมล, ตำแหน่ง
3. ใช้ Shadcn UI Card component
4. จัดสไตล์ด้วย TailwindCSS
```

### แบบฝึกหัดที่ 3: เชื่อมต่อ API
```
เป้าหมาย: ดึงข้อมูล user จาก API มาแสดง

1. สร้าง API GET /api/users/:id ใน backend
2. สร้าง Server Action ใน frontend
3. แสดงข้อมูลบนหน้าเว็บ
4. จัดการกรณี loading และ error
```

---

## สรุป

### จำไว้เสมอ:
1. ✅ เริ่มจากเรื่องง่ายก่อน
2. ✅ ทำผิดไม่เป็นไร เรียนรู้จากความผิดพลาด
3. ✅ Google เป็นเพื่อนที่ดีที่สุด
4. ✅ อ่าน error message ให้ละเอียด
5. ✅ ฝึกบ่อยๆ จะเก่งขึ้นเอง

### Resources สำคัญ:
- 📚 Skills อื่นๆ ใน `.agents/skills/`
- 🔧 Workflows ใน `.agents/workflows/`
- 💻 Source code ใน `backend/` และ `frontend/`
- 📖 Documentation ของแต่ละ library

**ขอให้สนุกกับการเรียนรู้!** 🚀
