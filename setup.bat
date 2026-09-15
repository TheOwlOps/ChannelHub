@echo off
setlocal
cd /d "%~dp0"
title ZaloHub Setup & Launcher

echo ===================================================
echo             ZaloHub - Easy Installer
echo ===================================================
echo.

where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Chua tim thay Bun. Dang tu dong cai dat Bun...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
    set "PATH=%USERPROFILE%\.bun\bin;%PATH%"
)

where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Cai dat Bun that bai. Vui long cai thu cong tai https://bun.sh
    pause
    exit /b 1
)

echo [+] Bun da san sang:
bun --version
echo.

if not exist node_modules (
    echo [*] Dang cai dat thu vien (bun install)...
    bun install
)

if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [+] Da tao file .env tu .env.example
    )
)

:MENU
cls
echo ===================================================
echo             ZaloHub Management Menu
echo ===================================================
echo  1. Dang nhap Zalo ca nhan (Quet QR)
echo  2. Khoi dong ZaloHub Bot (Mode Dev - Hot Reload)
echo  3. Khoi dong ZaloHub Bot (Mode Production)
echo  4. Cap nhat thu vien (Bun Install)
echo  5. Thoat
echo ===================================================
set /p choice="Nhap lua chon (1-5): "

if "%choice%"=="1" (
    echo [*] Dang tao ma QR dang nhap...
    bun run login:personal
    pause
    goto MENU
)
if "%choice%"=="2" (
    echo [*] Dang khoi dong Bot (Dev Mode)...
    bun run dev
    pause
    goto MENU
)
if "%choice%"=="3" (
    echo [*] Dang build va chay Production...
    bun run build
    bun run start:prod
    pause
    goto MENU
)
if "%choice%"=="4" (
    echo [*] Dang cap nhat dependencies...
    bun install
    echo [+] Hoan tat!
    pause
    goto MENU
)
if "%choice%"=="5" exit /b 0

goto MENU
