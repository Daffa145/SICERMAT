@echo off
chcp 65001 > nul
echo ==============================================================================
echo  CERMAT - Menghentikan Layanan Background
echo ==============================================================================
echo.

setlocal enabledelayedexpansion
set FOUND=0

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set PID=%%a
    if not "!PID!"=="" (
        echo Menemukan proses CERMAT dengan PID !PID!...
        taskkill /F /PID !PID! > nul 2>&1
        set FOUND=1
    )
)

if "%FOUND%"=="1" (
    echo [SUKSES] Layanan CERMAT berhasil dihentikan.
) else (
    echo [INFO] Tidak ada layanan CERMAT yang sedang berjalan di port 3000.
)

echo.
timeout /t 3 > nul
