@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\.bin\vite.cmd" (
    call npm.cmd ci
    if errorlevel 1 goto failed
)

if not exist "public\game\quiz.json" (
    call npm.cmd run import-game
    if errorlevel 1 goto failed
)

call npm.cmd run dev -- --open
if errorlevel 1 goto failed
exit /b 0

:failed
pause
exit /b 1
