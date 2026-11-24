@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js with npm, then run this file again.
  pause
  exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js with npm, then run this file again.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
  echo Project dependencies are missing.
  echo Open a terminal in this folder and run: npm ci
  echo Then run Start-Yasno.cmd again.
  pause
  exit /b 1
)
echo Starting Yasno...
echo Open http://127.0.0.1:5187/ in your browser.
echo Keep this window open. Press Ctrl+C to stop the server.
call npm.cmd run dev
if errorlevel 1 (
  echo The server could not start. Read the error above.
  echo If port 5187 is in use, open the existing Yasno server or stop it first.
  pause
  exit /b 1
)
endlocal
