# 💻 คู่มือทางเทคนิค (Technical Guide)

เอกสารสำหรับนักพัฒนาระบบ (Developers) และทีมผู้ดูแลระบบไอที (System Administrators)

---

## 🏗️ 1. เทคโนโลยีที่ใช้ (Tech Stack)
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, Shadcn UI
- **Backend:** Next.js Server Actions (Integrated) + Express.js (Optional for External API)
- **Database:** SQLite (Default for Dev) / PostgreSQL (Production)
- **ORM:** Prisma
- **Authentication:** NextAuth.js (Auth.js v5)
- **Deployment:** Docker, Node.js

---

## 📂 2. โครงสร้างโปรเจกต์ (Project Structure)
```bash
/hr-ims
  ├── /backend            # Express API (Legacy/External)
  ├── /frontend/next-app  # หน้าจอหลักและตรรกะระบบ
  │     ├── /app          # Pages & Routes
  │     ├── /components   # UI Components
  │     ├── /lib          # Business Logic & DB Actions
  │     └── /prisma       # Database Schema
  └── /docs               # เอกสารคู่มือทั้งหมด
```

---

## 🔐 3. ระบบความปลอดภัย (Security)
- **Middleware Role Check:** ใช้ `proxy.ts` (Next.js Middleware) ในการตรวจสอบสิทธิ์การเข้าถึงหน้าเว็บรายเมนู
- **Server Action Protection:** ทุกฟังก์ชันใน `lib/actions` มีการเรียกใช้ `auth()` เพื่อตรวจสอบตัวตนก่อนจัดการข้อมูล
- **Multi-role system:** สิทธิ์การใช้งานถูกเก็บในรูปแบบอาเรย์ (Array) ใน JWT Token เพื่อประมวลผลสิทธิ์ที่ทับซ้อนกันได้

---

## 🔌 4. การเชื่อมต่อและ Tunnel
- **Cloudflare Tunnel:** ใช้ในการเปิดระบบให้ออกอินเทอร์เน็ตโดยไม่ต้อง Forward Port
- **ติดตั้ง cloudflared:** ติดตั้งบนเครื่อง ไม่เก็บไบนารีใน repo — Windows: `winget install --id Cloudflare.cloudflared -e` หรือ `choco install cloudflared` / macOS: `brew install cloudflared` (ดู `CLOUDFLARE-TUNNEL.md`)
- **Configuration:** เรียก `cloudflared` ที่อยู่ใน PATH ผ่าน `start_tunnel.bat` และตั้ง `AUTH_TRUST_HOST=true` ใน `.env`

---

## 🛠️ 5. การดูแลรักษา (Maintenance)
- **Schema Update:** หากมีการเปลี่ยน Schema ใน `schema.prisma` ให้รัน `npx prisma generate` และ `npx prisma db push` ทั้งในฝั่ง backend และ frontend
- **Log Management:** ระบบ Audit Logs จะดักจับคำสั่ง `CREATE`, `UPDATE`, `DELETE` ผ่าน Server Action ทั้งหมด

---
💡 *สำหรับขั้นตอนการติดตั้งโดยละเอียด (Build & Deploy) กรุณาดูที่ไฟล์ README.md บริเวณรากโปรเจกต์*
