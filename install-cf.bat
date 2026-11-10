@echo off
echo Installing cloudflared onto this machine with winget.
echo This does not download a binary into the repository.
echo.
winget install --id Cloudflare.cloudflared -e --accept-package-agreements --accept-source-agreements
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo winget install failed. Install cloudflared another way, then open a new terminal:
    echo   choco install cloudflared
    echo   or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
    echo Do not place cloudflared.exe in this repository.
    exit /b 1
)
echo.
echo Installed. Open a new terminal and run: cloudflared --version
echo Start a quick tunnel with: cloudflared tunnel --url http://localhost:3000
