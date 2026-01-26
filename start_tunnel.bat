@echo off
echo 🌐 Starting Cloudflare Tunnel...
echo 💡 Make sure Next.js is running on http://localhost:3000
echo.
cloudflared.exe tunnel --url http://localhost:3000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Failed to start tunnel.
    echo 💡 You can try running this command manually in CMD:
    echo    cloudflared.exe tunnel --url http://localhost:3000
)
pause
