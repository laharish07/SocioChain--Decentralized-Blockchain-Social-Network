#!/bin/bash
# SocioChain Quick Start Script
# Run this from the project root directory

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════╗"
echo "║     SocioChain — Quick Start Setup       ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "❌ npm not found."; exit 1; }
echo -e "${GREEN}✓ Node $(node -v)${NC}"

# Install blockchain deps
echo -e "\n${YELLOW}Installing blockchain dependencies...${NC}"
cd blockchain && npm install
echo -e "${GREEN}✓ Blockchain deps installed${NC}"

# Install backend deps
echo -e "\n${YELLOW}Installing backend dependencies...${NC}"
cd ../backend && npm install
echo -e "${GREEN}✓ Backend deps installed${NC}"

# Install frontend deps
echo -e "\n${YELLOW}Installing frontend dependencies...${NC}"
cd ../frontend && npm install
echo -e "${GREEN}✓ Frontend deps installed${NC}"

cd ..

# Copy env files
echo -e "\n${YELLOW}Setting up .env files...${NC}"
[ ! -f backend/.env ]  && cp backend/.env.example  backend/.env  && echo "Created backend/.env"
[ ! -f frontend/.env ] && cp frontend/.env.example frontend/.env && echo "Created frontend/.env"

# Compile contracts
echo -e "\n${YELLOW}Compiling smart contracts...${NC}"
cd blockchain && npx hardhat compile
echo -e "${GREEN}✓ Contracts compiled${NC}"

cd ..

echo -e "\n${GREEN}╔══════════════════════════════════════════╗"
echo "║         Setup Complete! 🎉               ║"
echo "╚══════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo ""
echo -e "  ${CYAN}Terminal 1${NC} — Start local Ethereum node:"
echo "    cd blockchain && npx hardhat node"
echo ""
echo -e "  ${CYAN}Terminal 2${NC} — Deploy contracts:"
echo "    cd blockchain && npx hardhat run scripts/deploy.js --network localhost"
echo "    (copy the contract addresses into backend/.env and frontend/.env)"
echo ""
echo -e "  ${CYAN}Terminal 3${NC} — Start backend:"
echo "    cd backend && npm run dev"
echo ""
echo -e "  ${CYAN}Terminal 4${NC} — Start frontend:"
echo "    cd frontend && npm run dev"
echo ""
echo -e "  Open ${CYAN}http://localhost:5173${NC} in your browser"
echo "  Connect MetaMask → Hardhat Local (chainId: 31337)"
echo ""
