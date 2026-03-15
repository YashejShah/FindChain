@echo off
title FindChain - Auto Setup ^& Run
color 0B
cd /d "%~dp0"

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║      FindChain - AI-Powered Decentralized Lost ^& Found   ║
echo  ║              Automatic Setup ^& Launch                     ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

:: ========== STEP 1: Check Node.js ==========
echo  [1/9] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  ERROR: Node.js is not installed!
    echo  Download it from: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo         Found Node.js %%i

:: ========== STEP 2: Check Python (optional) ==========
echo.
echo  [2/9] Checking Python (optional - for AI service)...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo         Python not found - AI service won't run (optional)
    echo         Install from https://python.org if needed
) else (
    for /f "tokens=*" %%i in ('python --version') do echo         Found %%i
)

:: ========== STEP 3: Install root deps ==========
echo.
echo  [3/9] Checking root dependencies (Hardhat, OpenZeppelin, dotenv)...
if not exist "node_modules\" (
    echo         Installing...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo  ERROR: npm install failed!
        pause
        exit /b 1
    )
    echo         Installed successfully!
) else (
    echo         Already installed.
)

:: ========== STEP 4: Install frontend deps ==========
echo.
echo  [4/9] Checking frontend dependencies (React, Vite, ethers.js, recharts)...
if not exist "frontend\node_modules\" (
    echo         Installing...
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo  ERROR: Frontend npm install failed!
        pause
        exit /b 1
    )
    cd ..
    echo         Installed successfully!
) else (
    echo         Already installed.
)

:: ========== STEP 5: Compile smart contracts ==========
echo.
echo  [5/9] Compiling smart contracts...
if not exist "artifacts\contracts\FindChain.sol\" (
    call npx hardhat compile
    if %errorlevel% neq 0 (
        color 0C
        echo  ERROR: Contract compilation failed!
        pause
        exit /b 1
    )
) else (
    echo         Already compiled.
)

:: ========== STEP 6: Run unit tests ==========
echo.
echo  [6/9] Running unit tests...
echo  ─────────────────────────────────────────────
call npx hardhat test
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  ERROR: Unit tests failed! Fix issues before running.
    echo.
    pause
    exit /b 1
)
echo  ─────────────────────────────────────────────

:: ========== STEP 7: Start Hardhat Blockchain Node ==========
echo.
echo  [7/9] Starting local Hardhat blockchain node...

:: Kill any existing Hardhat node on port 8545
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8545 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Start Hardhat node in a new GREEN terminal window
start "FindChain - Hardhat Node" cmd /k "cd /d %~dp0 && color 0A && echo. && echo  ╔═════════════════════════════════════════╗ && echo  ║   FindChain - Local Blockchain Node     ║ && echo  ║   http://127.0.0.1:8545  Chain: 1337   ║ && echo  ║   DO NOT CLOSE THIS WINDOW             ║ && echo  ╚═════════════════════════════════════════╝ && echo. && npx hardhat node"

echo         Waiting for node to start...
timeout /t 6 /nobreak >nul
echo         Hardhat node running on http://127.0.0.1:8545

:: ========== STEP 8: Deploy contract to local node ==========
echo.
echo  [8/9] Deploying FindChain contract to local blockchain...
call npx hardhat run scripts/deploy.js --network localhost
if %errorlevel% neq 0 (
    echo         WARNING: Deploy failed. Retrying in 5 seconds...
    timeout /t 5 /nobreak >nul
    call npx hardhat run scripts/deploy.js --network localhost
    if %errorlevel% neq 0 (
        echo         Deploy failed again. You can deploy manually later:
        echo         npx hardhat run scripts/deploy.js --network localhost
    )
)

:: ========== STEP 9: Launch Frontend ==========
echo.
echo  [9/9] Starting frontend dev server...

:: Start frontend in a new YELLOW terminal window
start "FindChain - Frontend" cmd /k "cd /d %~dp0\frontend && color 0E && echo. && echo  ╔═════════════════════════════════════════╗ && echo  ║   FindChain - Frontend Dev Server       ║ && echo  ║   http://localhost:3000                 ║ && echo  ║   DO NOT CLOSE THIS WINDOW             ║ && echo  ╚═════════════════════════════════════════╝ && echo. && npx vite --port 3000 --open"

timeout /t 3 /nobreak >nul

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║                 ALL SYSTEMS RUNNING!                      ║
echo  ╠═══════════════════════════════════════════════════════════╣
echo  ║                                                           ║
echo  ║   Hardhat Node:   http://127.0.0.1:8545  (Chain 1337)   ║
echo  ║   Frontend:       http://localhost:3000                   ║
echo  ║                                                           ║
echo  ╠═══════════════════════════════════════════════════════════╣
echo  ║                                                           ║
echo  ║   MetaMask Setup:                                         ║
echo  ║     Network Name:  Hardhat Local                          ║
echo  ║     RPC URL:       http://127.0.0.1:8545                 ║
echo  ║     Chain ID:      1337                                   ║
echo  ║     Symbol:        ETH                                    ║
echo  ║                                                           ║
echo  ╠═══════════════════════════════════════════════════════════╣
echo  ║                                                           ║
echo  ║   Two terminal windows opened:                            ║
echo  ║     GREEN  window = Hardhat blockchain node               ║
echo  ║     YELLOW window = Frontend dev server                   ║
echo  ║                                                           ║
echo  ║   Close both windows to stop everything.                  ║
echo  ║                                                           ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.
pause
