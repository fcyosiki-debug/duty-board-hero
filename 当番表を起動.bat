@echo off
chcp 65001 >nul
title 当番表 Hero & Harmony Edition

echo ========================================
echo   当番表 Hero ^& Harmony Edition
echo   起動しています...
echo ========================================
echo.

cd /d "%~dp0"

echo ブラウザで以下のURLを開いてください:
echo   http://localhost:3000
echo.
echo 終了するにはこのウィンドウを閉じてください。
echo ========================================

start http://localhost:3000

npx -y serve out -l 3000
