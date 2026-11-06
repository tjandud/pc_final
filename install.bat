@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title TechCompare - 환경 및 패키지 설치 (Setup)

cd /d "%~dp0"

echo ================================================================
echo   [TechCompare] 개발 환경 및 패키지 자동 설치 스크립트
echo ================================================================
echo.

:: 1. Node.js 및 npm 설치 여부 확인
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [안내] npm^(Node.js^)이 설치되어 있지 않거나 PATH에서 찾을 수 없습니다.
    echo [진행] Windows 패키지 관리자^(winget^)를 통해 Node.js LTS 자동 설치를 시도합니다...
    echo.
    where winget >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [오류] winget을 찾을 수 없습니다. https://nodejs.org 에서 Node.js LTS를 설치한 뒤 다시 실행해 주세요.
        pause
        exit /b 1
    )
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    if %ERRORLEVEL% NEQ 0 (
        echo [오류] Node.js 자동 설치에 실패했습니다. 관리자 권한으로 실행하거나 https://nodejs.org 에서 직접 설치해 주세요.
        pause
        exit /b 1
    )
    :: 기본 Node.js 설치 경로를 현재 세션 PATH에 추가
    if exist "%ProgramFiles%\nodejs\npm.cmd" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    )
    echo.
    echo [완료] Node.js LTS 설치가 완료되었습니다.
)

for /f "delims=" %%v in ('node -v 2^>nul') do set NODE_VER=%%v
for /f "delims=" %%v in (' call npm -v 2^>nul') do set NPM_VER=%%v
echo [확인] Node.js 버전: %NODE_VER% / npm 버전: %NPM_VER%
echo.

:: 2. 백엔드 환경변수 파일(.env) 확인 및 생성
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo [설정] backend\.env 파일이 없어 backend\.env.example을 복사합니다...
        copy /Y "backend\.env.example" "backend\.env" >nul
    )
)

:: 3. 백엔드 의존성 패키지 설치
echo ----------------------------------------------------------------
echo   [1/2] 백엔드^(backend^) 패키지 설치 중...
echo ----------------------------------------------------------------
cd /d "%~dp0backend"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [오류] 백엔드 패키지 설치 중 문제가 발생했습니다.
    pause
    exit /b 1
)
echo [완료] 백엔드 패키지 설치 완료!
echo.

:: 4. 프론트엔드 의존성 패키지 설치
echo ----------------------------------------------------------------
echo   [2/2] 프론트엔드^(frontend^) 패키지 설치 중...
echo ----------------------------------------------------------------
cd /d "%~dp0frontend"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [오류] 프론트엔드 패키지 설치 중 문제가 발생했습니다.
    pause
    exit /b 1
)
echo [완료] 프론트엔드 패키지 설치 완료!
echo.

cd /d "%~dp0"
echo ================================================================
echo   모든 설치가 완료되었습니다! 이제 start.bat 을 실행하세요.
echo ================================================================
if "%~1" NEQ "--no-pause" pause
exit /b 0
