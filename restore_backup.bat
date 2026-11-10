@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ========================================================
echo   TechCompare - 작업 전 백업 복구 스크립트 (restore_backup.bat)
echo ========================================================
echo.
echo [안내] UI 아이콘 및 애니메이션 작업 직전 상태(pre-ui-motion)로
echo        프론트엔드 및 백엔드 소스코드를 즉시 복원합니다.
echo.

if not exist "%~dp0backups\pre-ui-motion\frontend\src" (
    echo [오류] 백업 폴더(backups\pre-ui-motion)를 찾을 수 없습니다.
    pause
    exit /b 1
)

set /p CONFIRM="정말로 백업 시점(pre-ui-motion)으로 복원하시겠습니까? (Y/N): "
if /i not "!CONFIRM!"=="Y" (
    echo 복원이 취소되었습니다.
    pause
    exit /b 0
)

echo.
echo [1/3] frontend/src 복원 중...
robocopy "%~dp0backups\pre-ui-motion\frontend\src" "%~dp0frontend\src" /MIR /NFL /NDL /NJH /NJS >nul

echo [2/3] frontend/public 복원 중...
robocopy "%~dp0backups\pre-ui-motion\frontend\public" "%~dp0frontend\public" /MIR /NFL /NDL /NJH /NJS >nul

echo [3/3] backend/src 복원 중...
robocopy "%~dp0backups\pre-ui-motion\backend\src" "%~dp0backend\src" /MIR /NFL /NDL /NJH /NJS >nul

echo.
echo ========================================================
echo   복원이 완료되었습니다! (Git 태그: backup-pre-ui-motion)
echo   브라우저를 새로고침하면 이전 화면으로 즉시 돌아갑니다.
echo ========================================================
pause
