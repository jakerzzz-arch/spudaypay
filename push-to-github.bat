@echo off
title Push Spudaypay to GitHub (Standalone APK Build)
cd /d "%~dp0"
echo ========================================================
echo   PUSH SPUDAYPAY TO GITHUB (STANDALONE ANDROID APK)
echo ========================================================
echo.
set REPO_URL=https://github.com/jakerzzz-arch/spudaypay.git

git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO_URL%
echo Pushing Spudaypay code to %REPO_URL% ...
git push -u origin main

echo.
echo ========================================================
echo Done! GitHub Actions is now building your standalone APK.
echo Check build progress: https://github.com/jakerzzz-arch/spudaypay/actions
echo Direct APK download (once build completes):
echo   https://github.com/jakerzzz-arch/spudaypay/releases/latest/download/Spudaypay.apk
echo ========================================================
pause
