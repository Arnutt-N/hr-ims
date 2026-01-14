---
description: Setup Database (Generate Client, Push Schema, Seed)
---

1. Install Dependencies (Backend)
// turbo
   - Run `cd backend && npm install`

2. Generate Prisma Client
// turbo
   - Run `cd backend && npx prisma generate`

3. Push Database Schema (Update DB structure)
// turbo
   - Run `cd backend && npx prisma db push`

4. Seed Database
// turbo
   - Run `cd backend && npx prisma db seed`
