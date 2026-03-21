@echo off
cd /d "%~dp0"
if not exist node_modules (
  npm install
)
start "Nooki Auth API" cmd /k "cd /d ""%~dp0backend"" && python auth.py"
start "Nooki WebSocket" cmd /k "cd /d ""%~dp0backend"" && python websocket_server.py"
timeout /t 2 >nul
set PORT=3010
start "" http://localhost:3010
npm start
