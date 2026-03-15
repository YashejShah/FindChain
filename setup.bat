@echo off
title FindChain - Local Setup
color 0B
echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║     FindChain - AI Decentralized Lost ^& Found    ║
echo  ║              Local Setup Script                   ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: Check Node.js
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js not found! Install from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo   Found Node.js %%i

:: Check Python
echo [2/6] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  WARNING: Python not found. AI service won't run.
    echo  Install from https://python.org ^(optional^)
) else (
    for /f "tokens=*" %%i in ('python --version') do echo   Found %%i
)

:: Install root dependencies (Hardhat + Solidity)
echo.
echo [3/6] Installing Hardhat ^& Solidity dependencies...
call npm install
if %errorlevel% neq 0 (
    echo  ERROR: npm install failed!
    pause
    exit /b 1
)
echo   Done!

:: Install frontend dependencies
echo.
echo [4/6] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo  ERROR: Frontend npm install failed!
    pause
    exit /b 1
)
cd ..
echo   Done!

:: Compile smart contracts
echo.
echo [5/6] Compiling smart contracts...
call npx hardhat compile
if %errorlevel% neq 0 (
    echo  WARNING: Contract compilation failed. Check Solidity setup.
) else (
    echo   Contracts compiled successfully!
)

:: Setup .env
echo.
echo [6/6] Setting up environment...
if not exist .env (
    copy .env.example .env >nul
    echo   Created .env from template
) else (
    echo   .env already exists
)

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║              SETUP COMPLETE!                     ║
echo  ╠══════════════════════════════════════════════════╣
echo  ║                                                  ║
echo  ║  To start the frontend:                          ║
echo  ║    cd frontend ^&^& npm run dev                     ║
echo  ║                                                  ║
echo  ║  To start local blockchain:                      ║
echo  ║    npx hardhat node                              ║
echo  ║                                                  ║
echo  ║  To deploy contracts locally:                    ║
echo  ║    npx hardhat run scripts/deploy.js             ║
echo  ║      --network localhost                         ║
echo  ║                                                  ║
echo  ║  To run tests:                                   ║
echo  ║    npx hardhat test                              ║
echo  ║                                                  ║
echo  ║  To start AI service (optional):                 ║
echo  ║    cd ai-service                                 ║
echo  ║    pip install -r requirements.txt               ║
echo  ║    python app.py                                 ║
echo  ║                                                  ║
echo  ╚══════════════════════════════════════════════════╝
echo.
pause
