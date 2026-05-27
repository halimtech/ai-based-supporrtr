# Core Delight - PowerShell Demo Starter (Dummy-Proof Edition)

Write-Host ""
Write-Host "========================================"
Write-Host "  Core Delight - Demo Starter"
Write-Host "========================================"
Write-Host ""

# Check if Python is installed
Write-Host "[Check] Looking for Python..."
try {
    $pyVersion = python --version 2>$null
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host "[OK] Python found: $pyVersion"
} catch {
    Write-Host "[X] ERROR: Python is not installed or not in PATH"
    Write-Host "    Please install Python 3.10+ from https://www.python.org"
    Write-Host "    IMPORTANT: Check 'Add Python to PATH' during installation!"
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if Node.js is installed
Write-Host "[Check] Looking for Node.js..."
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host "[OK] Node.js found: $nodeVersion"
} catch {
    Write-Host "[X] ERROR: Node.js is not installed or not in PATH"
    Write-Host "    Please install Node.js LTS from https://nodejs.org"
    Read-Host "Press Enter to exit"
    exit 1
}

# Install Python dependencies
Write-Host ""
Write-Host "[1/3] Installing / updating Python packages..."
Write-Host "        (this is fast if already installed)"
try {
    Set-Location backend
    python -m pip install -r requirements.txt | Out-Null
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Host "[OK] Python packages ready."
    Set-Location ..
} catch {
    Write-Host "[X] ERROR: Failed to install Python packages."
    Write-Host "    Try running this manually:"
    Write-Host "        cd backend"
    Write-Host "        pip install -r requirements.txt"
    Read-Host "Press Enter to exit"
    exit 1
}

# Install Node.js dependencies
Write-Host ""
Write-Host "[2/3] Installing / updating Node.js packages..."
Set-Location frontend
if (!(Test-Path "node_modules")) {
    Write-Host "        node_modules not found. Running npm install..."
    npm install | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] ERROR: npm install failed."
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "        node_modules already exists."
}
Write-Host "[OK] Node.js packages ready."
Set-Location ..

# Start servers
Write-Host ""
Write-Host "========================================"
Write-Host "  Starting servers..."
Write-Host "========================================"
Write-Host ""
Write-Host "Backend will start on: http://localhost:8000"
Write-Host "Frontend will start on: http://localhost:5173"
Write-Host ""
Write-Host "[3/3] Opening backend and frontend..."

# Start backend
Start-Process powershell -WindowStyle Normal -ArgumentList "-NoExit", "-Command", "Set-Location backend; Write-Host 'Starting backend...'; python -m uvicorn app.main:app --reload --host localhost --port 8000"

# Wait for backend to initialize
Write-Host "        Waiting 5 seconds for backend to warm up..."
Start-Sleep -Seconds 5

# Start frontend
Start-Process powershell -WindowStyle Normal -ArgumentList "-NoExit", "-Command", "Set-Location frontend; Write-Host 'Starting frontend...'; npm run dev"

# Open browser
Start-Sleep -Seconds 3
Write-Host "        Opening browser..."
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "========================================"
Write-Host "  All done! Your browser should open."
Write-Host "========================================"
Write-Host ""
Write-Host "If the browser didn't open, visit:"
Write-Host "  - Frontend: http://localhost:5173"
Write-Host "  - Backend Docs: http://localhost:8000/docs"
Write-Host ""
Read-Host "Press Enter to close this window"
