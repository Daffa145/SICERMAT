@echo off
chcp 65001 > nul
echo ==============================================================================
echo  CERMAT - Status Layanan Lokal
echo ==============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { $res = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/api/health' -TimeoutSec 2; Write-Host '[AKTIF] CERMAT Berjalan Normal' -ForegroundColor Green; Write-Host ('Aplikasi : ' + $res.app); Write-Host ('Versi    : ' + $res.version); Write-Host ('Waktu    : ' + $res.time); Write-Host 'URL      : http://localhost:3000' -ForegroundColor Cyan } catch { Write-Host '[TIDAK AKTIF] Layanan CERMAT belum berjalan di port 3000.' -ForegroundColor Yellow; Write-Host 'Jalankan start-cermat.vbs untuk memulai.' }"

echo.
pause
