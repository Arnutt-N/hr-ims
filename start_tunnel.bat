@echo off
echo 🌐 Starting Cloudflare Tunnel...
echo 💡 Make sure Next.js is running on http://localhost:3000
echo.
where cloudflared >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ cloudflared is not installed or not on PATH.
    echo    Install it on this machine. See CLOUDFLARE-TUNNEL.md.
    echo    winget install --id Cloudflare.cloudflared -e
    echo    or: choco install cloudflared
    pause
    exit /b 1
)
cloudflared tunnel --url http://localhost:3000
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Failed to start tunnel.
    echo 💡 You can try running this command manually:
    echo    cloudflared tunnel --url http://localhost:3000
)
pause
