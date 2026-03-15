@echo off
title FindChain - Live Test
color 0B
echo.
echo  FindChain Live Blockchain Test
echo  ================================
echo.
echo  [1/3] Compiling contracts...
call npx hardhat compile
if %errorlevel% neq 0 (
    echo  ERROR: Compilation failed!
    pause
    exit /b 1
)
echo.
echo  [2/3] Running unit tests...
call npx hardhat test
echo.
echo  [3/3] Running full live simulation...
call npx hardhat run scripts/test-live.js
echo.
pause
