@echo off
setlocal
cd /d "%~dp0"

echo Starting test nooki battles backend.py...
start "Nooki Test Backend (backend.py)" cmd /k "cd /d "%~dp0" && python backend.py"

echo Starting frontend on port 3010...
start "Nooki Test Frontend" cmd /k "cd /d "%~dp0" && set PORT=3010 && npm start"

timeout /t 4 >nul
start "" http://localhost:3010

endlocal
