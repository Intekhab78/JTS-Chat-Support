@echo off
SETLOCAL EnableDelayedExpansion

echo ====================================================
echo JTS CRM: Automated MongoDB Backup Service
echo ====================================================

:: Resolve root directory (.env location)
set "ROOT_DIR=%~dp0..\.."
set "ENV_FILE=%ROOT_DIR%\.env"
set "BACKUPS_DIR=%ROOT_DIR%\backups"

:: Load MONGODB_URI from .env
if not exist "%ENV_FILE%" (
    echo [ERROR] .env file not found at %ENV_FILE%
    exit /b 1
)

for /f "tokens=1,2 delims==" %%i in ('findstr /i "MONGODB_URI" "%ENV_FILE%"') do (
    set "DB_URI=%%j"
)

:: Clean whitespace
set "DB_URI=!DB_URI: =!"

if "!DB_URI!"=="" (
    echo [ERROR] MONGODB_URI not defined in .env
    exit /b 1
)

:: Create backups folder if not exists
if not exist "%BACKUPS_DIR%" (
    mkdir "%BACKUPS_DIR%"
)

:: Generate timestamp using powershell
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"`) do (
    set "TIMESTAMP=%%i"
)

set "BACKUP_PATH=%BACKUPS_DIR%\backup_!TIMESTAMP!"

echo [INFO] Starting database backup...
echo [INFO] Target URI: !DB_URI!
echo [INFO] Output path: !BACKUP_PATH!

:: Run mongodump
mongodump --uri="!DB_URI!" --out="!BACKUP_PATH!"

if %ERRORLEVEL% equ 0 (
    echo ====================================================
    echo [SUCCESS] Backup completed successfully!
    echo [SUCCESS] Backup directory: !BACKUP_PATH!
    echo ====================================================
) else (
    echo [ERROR] Backup execution failed.
    echo [ERROR] Please check if MongoDB Database Tools (mongodump) are installed in path.
)
