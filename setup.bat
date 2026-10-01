@echo off
cd /d "%~dp0"
echo ===== STEM Outreach: one-time setup =====
if not exist server\.env copy server\.env.example server\.env
call npm install
if errorlevel 1 goto fail
call npm run seed
if errorlevel 1 goto fail
echo.
echo Setup finished. Now double-click start.bat
pause
exit /b 0
:fail
echo.
echo Something went wrong. Check that Node.js and MongoDB are installed and MongoDB is running.
pause
