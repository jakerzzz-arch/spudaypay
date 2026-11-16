@echo off
title Push Spudaypay to GitHub (For Render.com + APK)
cd /d "%~dp0"
echo ========================================================
echo   🚀 PUSH SPUDAYPAY TO GITHUB (FOR RENDER.COM)
echo ========================================================
echo.
echo 1. Go to https://github.com/new and create a new repository
echo    (Name it e.g. "spudaypay" and leave it empty).
echo 2. Copy the repository URL (e.g. https://github.com/yourname/spudaypay.git)
echo.
set /p REPO_URL="Paste your GitHub Repository URL here: "

if "%REPO_URL%"=="" (
    echo No URL entered. Exiting...
    pause
    exit /b
)

git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO_URL%
echo.
echo Pushing Spudaypay code to GitHub...
git push -u origin main

echo.
echo ========================================================
echo ✅ Done! Now go to https://dashboard.render.com:
echo    1. Click "+ New" -> "Static Site" (or "Blueprint")
echo    2. Select your "spudaypay" repo and click Deploy!
echo    3. Paste your live Render URL into https://www.pwabuilder.com
echo       to download your signed Spudaypay Android .apk!
echo ========================================================
pause
