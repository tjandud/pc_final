@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================================
echo   TechCompare - 현재 상태 백업 생성 스크립트 (create_backup.bat)
echo ========================================================
echo.

for /f "tokens=1-3 delims=- " %%a in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd-HHmmss'"') do set TS=%%a
set BACKUP_DIR=%~dp0backups\snapshot-!TS!

echo [진행] 백업 폴더 생성 중: !BACKUP_DIR!
mkdir "!BACKUP_DIR!\frontend" 2>nul
mkdir "!BACKUP_DIR!\backend" 2>nul

robocopy "%~dp0frontend\src" "!BACKUP_DIR!\frontend\src" /MIR /NFL /NDL /NJH /NJS >nul
robocopy "%~dp0frontend\public" "!BACKUP_DIR!\frontend\public" /MIR /NFL /NDL /NJH /NJS >nul
robocopy "%~dp0backend\src" "!BACKUP_DIR!\backend\src" /MIR /NFL /NDL /NJH /NJS >nul

echo.
echo ========================================================
echo   현재 상태 백업이 완료되었습니다!
echo   저장 위치: !BACKUP_DIR!
echo ========================================================
pause
