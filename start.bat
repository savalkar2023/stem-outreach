@echo off
cd /d "%~dp0"
echo Starting STEM Outreach... Chrome will open in a few seconds.
start "" cmd /c "timeout /t 5 >nul & (start chrome http://localhost:5000 || start http://localhost:5000)"
call npm start
pause
