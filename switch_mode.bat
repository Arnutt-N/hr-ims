@echo off
if "%1"=="" (
    echo Usage: switch_mode [pro^|zai]
    echo   pro : Switch to Pro/Max Plan ^(Default^)
    echo   zai : Switch to Z AI API settings
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0secrets\switch_claude_mode.ps1" -mode %1
pause
