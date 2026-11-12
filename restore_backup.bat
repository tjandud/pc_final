@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================================
echo   TechCompare - ?�업 ??백업 복구 ?�크립트 (restore_backup.bat)
echo ========================================================
echo.
echo [?�내] UI ?�이�?�??�니메이???�업 직전 ?�태(pre-ui-motion)�?echo        ?�론?�엔??�?백엔???�스코드�?즉시 복원?�니??
echo.

if not exist "%~dp0backups\pre-ui-motion\frontend\src" (
    echo [?�류] 백업 ?�더(backups\pre-ui-motion)�?찾을 ???�습?�다.
    pause
    exit /b 1
)

set /p CONFIRM="?�말�?백업 ?�점(pre-ui-motion)?�로 복원?�시겠습?�까? (Y/N): "
if /i not "!CONFIRM!"=="Y" (
    echo 복원??취소?�었?�니??
    pause
    exit /b 0
)

echo.
echo [1/3] frontend/src 복원 �?..
robocopy "%~dp0backups\pre-ui-motion\frontend\src" "%~dp0frontend\src" /MIR /NFL /NDL /NJH /NJS >nul

echo [2/3] frontend/public 복원 �?..
robocopy "%~dp0backups\pre-ui-motion\frontend\public" "%~dp0frontend\public" /MIR /NFL /NDL /NJH /NJS >nul

echo [3/3] backend/src 복원 �?..
robocopy "%~dp0backups\pre-ui-motion\backend\src" "%~dp0backend\src" /MIR /NFL /NDL /NJH /NJS >nul

echo.
echo ========================================================
echo   복원???�료?�었?�니?? (Git ?�그: backup-pre-ui-motion)
echo   브라?��?�??�로고침?�면 ?�전 ?�면?�로 즉시 ?�아갑니??
echo ========================================================
pause