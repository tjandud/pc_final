@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title TechCompare - 백엔드 및 프론트엔드 통합 실행기

cd /d "%~dp0"

echo ================================================================
echo   [TechCompare] 백엔드(4000) + 프론트엔드(5173) 통합 실행
echo ================================================================
echo.

:: 1. npm 미설치 또는 node_modules 누락 시 install.bat 자동 실행
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [안내] npm이 감지되지 않아 install.bat을 먼저 실행합니다...
    call "%~dp0install.bat" --no-pause
    if %ERRORLEVEL% NEQ 0 exit /b 1
    if exist "%ProgramFiles%\nodejs\npm.cmd" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    )
)

if not exist "%~dp0backend\node_modules" (
    echo [안내] 백엔드 패키지가 설치되어 있지 않아 install.bat을 먼저 실행합니다...
    call "%~dp0install.bat" --no-pause
    if %ERRORLEVEL% NEQ 0 exit /b 1
)

if not exist "%~dp0frontend\node_modules" (
    echo [안내] 프론트엔드 패키지가 설치되어 있지 않아 install.bat을 먼저 실행합니다...
    call "%~dp0install.bat" --no-pause
    if %ERRORLEVEL% NEQ 0 exit /b 1
)

:: 2. 기존에 열려 있던 4000 / 5173 포트 프로세스 정리 (포트 충돌 방지)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000 " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    if not "%%a"=="0" taskkill /F /PID %%a >nul 2>nul
)

:: 3. 백엔드 및 프론트엔드 서버 창 실행 (오류 시 자동 npm install 후 재시도)
echo [1/2] 백엔드 API 서버 실행 중... ^(http://localhost:4000^)
start "TechCompare Backend (Port 4000)" cmd /k "chcp 65001 >nul && cd /d "%~dp0backend" && (npm run dev || (echo. && echo [복구] 백엔드 실행 오류 감지 - 패키지 설치 후 재시도합니다... && npm install && npm run dev))"

:: 백엔드 초기화 대기 (2초)
timeout /t 2 /nobreak >nul

echo [2/2] 프론트엔드 웹 서버 실행 중... ^(http://localhost:5173^)
start "TechCompare Frontend (Port 5173)" cmd /k "chcp 65001 >nul && cd /d "%~dp0frontend" && (npm run dev || (echo. && echo [복구] 프론트엔드 실행 오류 감지 - 패키지 설치 후 재시도합니다... && npm install && npm run dev))"

:: 프론트엔드 준비 대기 후 기본 브라우저 열기 (3초)
timeout /t 3 /nobreak >nul
echo.
echo [완료] 기본 브라우저에서 http://localhost:5173 을 엽니다...
start "" "http://localhost:5173"

echo.
echo ================================================================
echo   - 웹사이트 주소 : http://localhost:5173
echo   - 백엔드 API    : http://localhost:4000/api/v1/health
echo   - 종료하려면 새로 열린 Backend / Frontend 콘솔 창을 닫으세요.
echo ================================================================
pause
exit /b 0
