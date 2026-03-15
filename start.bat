@echo off
title FindChain - Quick Start
color 0B
echo.
echo  FindChain - Starting all services...
echo  =====================================
echo.

:: Start Hardhat local node in new terminal
echo [1/3] Starting local Ethereum node...
start "FindChain - Hardhat Node" cmd /k "cd /d %~dp0 && npx hardhat node"
timeout /t 5 /nobreak >nul

:: Deploy contracts to local node
echo [2/3] Deploying smart contracts...
start "FindChain - Deploy" cmd /k "cd /d %~dp0 && timeout /t 3 /nobreak >nul && npx hardhat run scripts/deploy.js --network localhost && echo. && echo Contracts deployed! You can close this window. && pause"

:: Start frontend dev server
echo [3/3] Starting frontend...
start "FindChain - Frontend" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo  All services starting!
echo  =======================
echo  Hardhat Node:  http://localhost:8545
echo  Frontend:      http://localhost:3000
echo.
echo  (This window can be closed)
timeout /t 5
