#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     FindChain - AI Decentralized Lost & Found    ║"
echo "║              Local Setup Script                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Check Node.js
echo "[1/6] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "  ERROR: Node.js not found! Install from https://nodejs.org"
    exit 1
fi
echo "  Found $(node --version)"

# Check Python
echo "[2/6] Checking Python..."
if command -v python3 &> /dev/null; then
    echo "  Found $(python3 --version)"
elif command -v python &> /dev/null; then
    echo "  Found $(python --version)"
else
    echo "  WARNING: Python not found. AI service won't run."
fi

# Install root dependencies
echo ""
echo "[3/6] Installing Hardhat & Solidity dependencies..."
npm install
echo "  Done!"

# Install frontend dependencies
echo ""
echo "[4/6] Installing frontend dependencies..."
cd frontend && npm install && cd ..
echo "  Done!"

# Compile contracts
echo ""
echo "[5/6] Compiling smart contracts..."
npx hardhat compile || echo "  WARNING: Compilation failed"

# Setup .env
echo ""
echo "[6/6] Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  Created .env from template"
else
    echo "  .env already exists"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║              SETUP COMPLETE!                     ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "║  Start frontend:    cd frontend && npm run dev   ║"
echo "║  Start blockchain:  npx hardhat node             ║"
echo "║  Deploy contracts:  npx hardhat run              ║"
echo "║                     scripts/deploy.js            ║"
echo "║                     --network localhost           ║"
echo "║  Run tests:         npx hardhat test             ║"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
