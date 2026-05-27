@echo off
REM Core Delight - One-Click Demo Starter (Dummy-Proof Edition)
REM This script installs missing dependencies automatically and starts both servers.

echo.
echo ========================================
echo   Core Delight - Demo Starter
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [X] ERROR: Python is not installed or not in PATH
    echo     Please install Python 3.10+ from https://www.python.org
    echo     IMPORTANT: Check "Add Python to PATH" during installation!
    pause
    exit /b 1
)
echo [OK] Python found.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [X] ERROR: Node.js is not installed or not in PATH
    echo     Please install Node.js LTS from https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found.

echo.
echo [1/3] Installing / updating Python packages...
echo     (this is fast if already installed)
cd backend
python -m pip install -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo [X] ERROR: Failed to install Python packages.
    echo     Try running this manually:
    echo         cd backend
    echo         pip install -r requirements.txt
    pause
    exit /b 1
)
echo [OK] Python packages ready.
cd ..

echo.
echo [2/3] Installing / updating Node.js packages...
cd frontend
if not exist node_modules (
    echo     node_modules not found. Running npm install...
    call npm install
    if errorlevel 1 (
        echo [X] ERROR: npm install failed.
        pause
        exit /b 1
    )
) else (
    echo     node_modules already exists.
)
echo [OK] Node.js packages ready.
cd ..

echo.
echo ========================================
echo   Starting servers...
echo ========================================
echo.
echo Backend will start on: http://localhost:8000
echo Frontend will start on: http://localhost:5173
echo.
echo [3/3] Opening backend and frontend...
echo.

REM Start backend in a new window
start "Core Delight Backend" cmd /k "cd backend && echo Starting backend... && python -m uvicorn app.main:app --reload --host localhost --port 8000"

REM Wait longer for backend to initialize
echo     Waiting 5 seconds for backend to warm up...
timeout /t 5 /nobreak >nul

REM Start frontend in a new window
start "Core Delight Frontend" cmd /k "cd frontend && echo Starting frontend... && npm run dev"

REM Wait a bit, then open browser
timeout /t 3 /nobreak >nul
echo     Opening browser...
start http://localhost:5173

echo.
echo ========================================
echo   All done! Your browser should open.
echo ========================================
echo.
echo If the browser didn't open, visit:
echo   - Frontend: http://localhost:5173
echo   - Backend Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C in the server windows to stop.
echo.
pause
