---
description: Clean Install (Delete node_modules & Reinstall)
---

1. Clean & Install Root (Frontend) Dependencies
// turbo
   - Run `rmdir /s /q node_modules`
   - Run `del package-lock.json`
   - Run `npm install`

2. Clean & Install Backend Dependencies
// turbo
   - Run `cd backend && rmdir /s /q node_modules`
   - Run `cd backend && del package-lock.json`
   - Run `cd backend && npm install`
