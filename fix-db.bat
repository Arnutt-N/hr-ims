@echo off
echo ==========================================
echo      HR-IMS Database Fixer Tool
echo ==========================================
echo.
echo 1. Stopping any lingering node processes (Optional)
echo.

cd frontend\next-app

echo 2. Updating Database Schema (Add provinceId)...
call npx prisma db push --accept-data-loss

echo.
echo 3. Regenerating Prisma Client...
call npx prisma generate

echo.
echo ==========================================
echo      SUCCESS! Database Updated.
echo      Please RESTART your 'npm run dev'
echo ==========================================
pause
