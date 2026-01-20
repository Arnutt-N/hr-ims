@echo off
if exist middleware.ts (
    del /f /q middleware.ts
    if exist middleware.ts (
        echo Failed to delete middleware.ts
    ) else (
        echo Successfully deleted middleware.ts
    )
) else (
    echo middleware.ts does not exist
)
