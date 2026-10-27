# ==============================================================================
# Script Instalasi Shortcut & Startup Windows untuk CERMAT
# ==============================================================================

$projectDir = "d:\Project dvl\CERMAT"
$desktopDir = [System.IO.Path]::Combine($env:USERPROFILE, "Desktop")
$startMenuDir = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs")
$startupDir = [System.IO.Path]::Combine($startMenuDir, "Startup")

$wshShell = New-Object -ComObject WScript.Shell
$iconPath = Join-Path $projectDir "public\cermat.ico"
$launcherVbs = Join-Path $projectDir "buka-cermat.vbs"
$startupVbs = Join-Path $projectDir "start-cermat.vbs"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  MENGATUR AKSES WINDOWS & SHORTCUT CERMAT" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Shortcut di Start Menu (Agar bisa dicari lewat Windows Search / Edge)
$startMenuShortcutPath = Join-Path $startMenuDir "CERMAT.lnk"
$startMenuShortcut = $wshShell.CreateShortcut($startMenuShortcutPath)
$startMenuShortcut.TargetPath = "wscript.exe"
$startMenuShortcut.Arguments = "`"$launcherVbs`""
$startMenuShortcut.WorkingDirectory = $projectDir
$startMenuShortcut.IconLocation = "$iconPath,0"
$startMenuShortcut.Description = "Sistem Internal Evaluasi & Telaah Kepatuhan Dokumen Mutu Obat (Modul 3) CTD/ACTD"
$startMenuShortcut.Save()
Write-Host "[OK] Shortcut Start Menu dibuat: $startMenuShortcutPath" -ForegroundColor Green

# 2. Shortcut di Desktop
$desktopShortcutPath = Join-Path $desktopDir "CERMAT.lnk"
$desktopShortcut = $wshShell.CreateShortcut($desktopShortcutPath)
$desktopShortcut.TargetPath = "wscript.exe"
$desktopShortcut.Arguments = "`"$launcherVbs`""
$desktopShortcut.WorkingDirectory = $projectDir
$desktopShortcut.IconLocation = "$iconPath,0"
$desktopShortcut.Description = "Buka Sistem CERMAT"
$desktopShortcut.Save()
Write-Host "[OK] Shortcut Desktop dibuat: $desktopShortcutPath" -ForegroundColor Green

# 3. Startup Shortcut (Agar server otomatis berjalan saat komputer/laptop dinyalakan)
$startupShortcutPath = Join-Path $startupDir "CERMAT Background Service.lnk"
$startupShortcut = $wshShell.CreateShortcut($startupShortcutPath)
$startupShortcut.TargetPath = "wscript.exe"
$startupShortcut.Arguments = "`"$startupVbs`""
$startupShortcut.WorkingDirectory = $projectDir
$startupShortcut.Description = "CERMAT Background Service Auto-start"
$startupShortcut.Save()
Write-Host "[OK] Shortcut Startup dibuat: $startupShortcutPath" -ForegroundColor Green

Write-Host "----------------------------------------------------------"
Write-Host "Semua shortcut berhasil diintegrasikan dengan Windows!" -ForegroundColor Green
Write-Host "Anda kini bisa membuka CERMAT cukup dengan menekan tombol Windows dan mengetik 'CERMAT'." -ForegroundColor Yellow
