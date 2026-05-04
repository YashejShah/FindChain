@echo off
title FindChain - Setup and Launch
color 0B
cd /d "%~dp0"
chcp 65001 >nul 2>&1

echo.
echo  =========================================================
echo    FindChain - AI-Powered Decentralized Lost and Found
echo    Automatic Setup and Launch
echo  =========================================================
echo.

:: Check Node.js
echo  [1/6] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo         ERROR: Node.js not installed! Get it from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo         Found Node.js %%i

:: Install dependencies
echo.
echo  [2/6] Installing dependencies...
if not exist "node_modules\" (
    call npm install
    if %errorlevel% neq 0 ( echo  ERROR: npm install failed! & pause & exit /b 1 )
) else ( echo         Root deps already installed. )

if not exist "frontend\node_modules\" (
    cd frontend && call npm install --legacy-peer-deps && cd ..
    if %errorlevel% neq 0 ( echo  ERROR: Frontend install failed! & pause & exit /b 1 )
) else ( echo         Frontend deps already installed. )

:: Compile contracts
echo.
echo  [3/6] Compiling smart contracts...
call npx hardhat compile
if %errorlevel% neq 0 ( echo  ERROR: Compilation failed! & pause & exit /b 1 )

:: Kill old processes on port 8545
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8545 ^| findstr LISTENING 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Start Hardhat Node
echo.
echo  [4/6] Starting Hardhat blockchain node...
start "FindChain - Blockchain" cmd /k "cd /d %~dp0 && color 0A && echo. && echo  FindChain - Local Blockchain Node && echo  http://127.0.0.1:8545  Chain ID: 31337 && echo  DO NOT CLOSE THIS WINDOW && echo. && npx hardhat node"

echo         Waiting for node to start...
timeout /t 6 /nobreak >nul

:: Deploy Contract
echo.
echo  [5/6] Deploying FindChain contract...
call npx hardhat run scripts/deploy.js --network localhost
if %errorlevel% neq 0 (
    timeout /t 5 /nobreak >nul
    call npx hardhat run scripts/deploy.js --network localhost
)

:: Start Frontend
echo.
echo  [6/6] Starting frontend...
start "FindChain - Frontend" cmd /k "cd /d %~dp0\frontend && color 0E && echo. && echo  FindChain - Frontend Dev Server && echo  http://localhost:3000 && echo  DO NOT CLOSE THIS WINDOW && echo. && npx vite --port 3000 --open"

timeout /t 3 /nobreak >nul

echo.
echo  =========================================================
echo                    ALL SYSTEMS RUNNING
echo  =========================================================
echo.
echo    Blockchain:  http://127.0.0.1:8545
echo    Frontend:    http://localhost:3000
echo    Contract:    0x5FbDB2315678afecb367f032d93F642f64180aa3
echo.
echo  ---------------------------------------------------------
echo    MetaMask Setup:
echo      Network:   Hardhat Local
echo      RPC URL:   http://127.0.0.1:8545
echo      Chain ID:  31337
echo      Symbol:    ETH
echo  ---------------------------------------------------------
echo    Test Accounts (import private key in MetaMask):
echo      Alice: 0x59c6995e998f97a5a0044966f094538...
echo      Bob:   0x5de4111afa1a4b94908f83103eb1f17...
echo  ---------------------------------------------------------
echo.
echo    GREEN  window = Blockchain node
echo    YELLOW window = Frontend server
echo    Close both windows to stop.
echo.
echo  =========================================================
echo.
pause
