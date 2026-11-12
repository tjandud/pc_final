@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title TechCompare - ?Шъ▓╜ ы░??иэВдьзА ?дь╣Ш (Setup)

cd /d "%~dp0"

echo ================================================================
echo   [TechCompare] ъ░Ьы░Ь ?Шъ▓╜ ы░??иэВдьзА ?РыПЩ ?дь╣Ш ?дэБмыж╜эК╕
echo ================================================================
echo.

:: 1. Node.js ы░?npm ?дь╣Ш ?мы? ?ХьЭ╕
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [?ИыВ┤] npm^(Node.js^)???дь╣Ш?ШьЦ┤ ?Иь? ?Къ▒░??PATH?РьДЬ ь░╛ьЭД ???ЖьК╡?ИыЛд.
    echo [ьзДэЦЙ] Windows ?иэВдьзА ъ┤АыжмьЮР^(winget^)ые??╡эХ┤ Node.js LTS ?РыПЩ ?дь╣Шые??ЬыПД?йыЛИ??..
    echo.
    where winget >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [?дыеШ] winget??ь░╛ьЭД ???ЖьК╡?ИыЛд. https://nodejs.org ?РьДЬ Node.js LTSые??дь╣Ш?????дьЛЬ ?дэЦЙ??ьг╝ьД╕??
        pause
        exit /b 1
    )
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    if %ERRORLEVEL% NEQ 0 (
        echo [?дыеШ] Node.js ?РыПЩ ?дь╣Ш???дэМи?ИьК╡?ИыЛд. ъ┤АыжмьЮР ъ╢МэХЬ?╝ыбЬ ?дэЦЙ?Шъ▒░??https://nodejs.org ?РьДЬ ьзБьаС ?дь╣Ш??ьг╝ьД╕??
        pause
        exit /b 1
    )
    :: ъ╕░ы│╕ Node.js ?дь╣Ш ъ▓╜ыбЬые??ДьЮм ?╕ьЕШ PATH??ь╢Фъ?
    if exist "%ProgramFiles%\nodejs\npm.cmd" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    )
    echo.
    echo [?ДыгМ] Node.js LTS ?дь╣Шъ░А ?ДыгМ?ШьЧИ?╡ыЛИ??
)

for /f "delims=" %%v in ('node -v 2^>nul') do set NODE_VER=%%v
for /f "delims=" %%v in (' call npm -v 2^>nul') do set NPM_VER=%%v
echo [?ХьЭ╕] Node.js ы▓ДьаД: %NODE_VER% / npm ы▓ДьаД: %NPM_VER%
echo.

:: 2. ы░▒ьЧФ???Шъ▓╜ы│А???МьЭ╝(.env) ?ХьЭ╕ ы░??ЭьД▒
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo [?дьаХ] backend\.env ?МьЭ╝???ЖьЦ┤ backend\.env.example??ы│╡ьВм?йыЛИ??..
        copy /Y "backend\.env.example" "backend\.env" >nul
    )
)

:: 3. ы░▒ьЧФ???Шьб┤???иэВдьзА ?дь╣Ш
echo ----------------------------------------------------------------
echo   [1/2] ы░▒ьЧФ??(backend^) ?иэВдьзА ?дь╣Ш ьд?..
echo ----------------------------------------------------------------
cd /d "%~dp0backend"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [?дыеШ] ы░▒ьЧФ???иэВдьзА ?дь╣Ш ьд?ым╕ьаЬъ░А ы░ЬьГЭ?ИьК╡?ИыЛд.
    pause
    exit /b 1
)
echo [?ДыгМ] ы░▒ьЧФ???иэВдьзА ?дь╣Ш ?ДыгМ!
echo.

:: 4. ?Дыба?╕ьЧФ???Шьб┤???иэВдьзА ?дь╣Ш
echo ----------------------------------------------------------------
echo   [2/2] ?Дыба?╕ьЧФ??(frontend^) ?иэВдьзА ?дь╣Ш ьд?..
echo ----------------------------------------------------------------
cd /d "%~dp0frontend"
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [?дыеШ] ?Дыба?╕ьЧФ???иэВдьзА ?дь╣Ш ьд?ым╕ьаЬъ░А ы░ЬьГЭ?ИьК╡?ИыЛд.
    pause
    exit /b 1
)
echo [?ДыгМ] ?Дыба?╕ьЧФ???иэВдьзА ?дь╣Ш ?ДыгМ!
echo.

cd /d "%~dp0"
echo ================================================================
echo   ыкиыУа ?дь╣Шъ░А ?ДыгМ?ШьЧИ?╡ыЛИ?? ?┤ьаЬ start.bat ???дэЦЙ?ШьД╕??
echo ================================================================
if "%~1" NEQ "--no-pause" pause
exit /b 0