@echo off
cd /d "%~dp0"

echo Closing old listeners on 3000, 3010, 5000, 6789...
for %%P in (3000 3010 5000 6789) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING') do (
    taskkill /PID %%A /F >nul 2>nul
  )
)

timeout /t 1 >nul
call "%~dp0RUN_GITHUB_LATEST.cmd"
