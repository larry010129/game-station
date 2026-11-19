@echo off
setlocal
rem Starts Command Station on localhost:
rem   - Dashboard + local service : http://localhost:1420  (service on 127.0.0.1:8787)
rem   - CMS                       : http://localhost:1430
rem Each runs in its own window. Close a window (or press Ctrl+C in it) to stop that part.

rem Use the folder this file is in when it sits in the project; otherwise (copied to the Desktop, say) use the project folder.
set "ROOT=%~dp0"
if not exist "%ROOT%app\package.json" set "ROOT=C:\Users\e1253\Documents\personal\game station\"
if not exist "%ROOT%app\package.json" (
  echo Could not find the project folder: %ROOT%
  echo Edit the ROOT line in this file to point at the "game station" folder.
  pause
  exit /b 1
)
cd /d "%ROOT%"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js / npm was not found. Install Node.js from https://nodejs.org and try again.
  pause
  exit /b 1
)

rem Stop early if something already holds the ports (an earlier copy still running).
for %%P in (1420 1430 8787) do (
  netstat -ano | findstr /r /c:":%%P .*LISTENING" >nul && (
    echo Port %%P is already in use. Close the other Command Station / CMS window first.
    pause
    exit /b 1
  )
)

rem First run on this PC: install packages.
if not exist "%ROOT%app\node_modules" (
  echo Installing dashboard packages...
  call npm --prefix "%ROOT%app" install || (pause & exit /b 1)
)
if not exist "%ROOT%cms\node_modules" (
  echo Installing CMS packages...
  call npm --prefix "%ROOT%cms" install || (pause & exit /b 1)
)

start "Command Station - dashboard + service (1420 / 8787)" cmd /k "cd /d "%ROOT%app" && npm run live"
start "Command Station - CMS (1430)" cmd /k "cd /d "%ROOT%cms" && npm run dev"

echo Waiting for the servers to start...
timeout /t 8 /nobreak >nul
start "" http://localhost:1420
start "" http://localhost:1430

echo.
echo Dashboard: http://localhost:1420
echo CMS:       http://localhost:1430
echo Close the two server windows to stop everything.
endlocal
