---
description: Reset Database (Drop all data & Re-seed)
---

1. Reset Database Schema (Drop Data)
   - Run `cd backend && npx prisma db push --force-reset`

2. Seed Database
// turbo
   - Run `cd backend && npx prisma db seed`
