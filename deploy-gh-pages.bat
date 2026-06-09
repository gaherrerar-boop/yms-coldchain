@echo off
setlocal enabledelayedexpansion

cd /d "C:\Users\gherrera\Desktop\YMS-S4"

echo ========================================
echo Deploying to GitHub Pages...
echo ========================================

git push origin gh-pages -u

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Success! Your site is now live at:
    echo https://gaherrerar-boop.github.io/yms-coldchain
    echo.
    pause
) else (
    echo.
    echo ✗ Error: Could not push to GitHub
    echo Check your internet connection and try again
    pause
)
