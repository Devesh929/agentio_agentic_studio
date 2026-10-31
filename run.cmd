@echo off
title TESSERA AI Studio Launcher
echo ===================================================
echo           Starting TESSERA AI Studio
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/4] Launching Main Backend API on http://127.0.0.1:8000 ...
start "Tessera Main Backend (Port 8000)" cmd /k "cd /d "%~dp0" && set PYTHONPATH=. && backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/4] Launching Mock Bank Reference API on http://127.0.0.1:8008 ...
start "Tessera Mock Bank API (Port 8008)" cmd /k "cd /d "%~dp0" && set PYTHONPATH=. && backend\.venv\Scripts\python.exe -m uvicorn app:app --app-dir level2_data/reference_runtime --host 127.0.0.1 --port 8008"

echo [3/4] Launching Frontend UI on http://127.0.0.1:5173 ...
start "Tessera Frontend UI (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --host 127.0.0.1 --port 5173"

echo [4/4] Waiting for services to initialize...
timeout /t 4 /nobreak >nul

echo Opening application in default browser...
start http://localhost:5173

echo.
echo ===================================================
echo Services are now active:
echo   - Frontend:       http://localhost:5173
echo   - Main Studio:    http://127.0.0.1:8000  (Docs: /docs)
echo   - Mock Bank API:  http://127.0.0.1:8008  (Docs: /docs)
echo.
echo Keep the individual terminal windows open.
echo To shut down, close the terminal windows or press Ctrl+C in each.
echo ===================================================
pause
