# SocioChain — Decentralized Blockchain Social Network

A full-stack decentralized social media platform built on Ethereum with React frontend, Node.js backend, and IPFS for content storage.

---

## Architecture Overview

```
sociochain/
├── blockchain/          # Solidity smart contracts (Hardhat)
├── frontend/            # React + ethers.js UI
├── backend/             # Node.js REST API + WebSocket
└── docker-compose.yml   # One-command local stack
```

---

## Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Blockchain   | Ethereum (Hardhat local / Sepolia testnet)      |
| Smart Contracts | Solidity 0.8.x                              |
| Frontend     | React 18, ethers.js v6, TailwindCSS             |
| Backend      | Node.js, Express, Socket.io, JWT                |
| Storage      | IPFS (via Pinata or local IPFS node)            |
| Database     | MongoDB (off-chain metadata cache)              |
| Auth         | MetaMask wallet-based (EIP-712 signatures)      |

---

## Prerequisites

Install the following before proceeding:

1. **Node.js** v18+ — https://nodejs.org
2. **npm** v9+
3. **MetaMask** browser extension — https://metamask.io
4. **MongoDB** (local or Atlas free tier) — https://www.mongodb.com
5. **Git** — https://git-scm.com

Optional (for IPFS):
- **IPFS Desktop** — https://docs.ipfs.tech/install/ipfs-desktop/
- Or a free **Pinata** account — https://www.pinata.cloud

---

## Step-by-Step Setup (Clean Path)

Follow these steps in order on a fresh clone.

### Step 1 — Clone the repo

```bash
git clone <your-repo-url> sociochain
cd sociochain
```

---

### Step 2 — Set up blockchain (compile + deploy)

```bash
cd blockchain
npm install
```

Compile contracts:
```bash
npm run compile
```

Start local chain (keep this terminal running):
```bash
npx hardhat node
```

In a new terminal, deploy contracts:
```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

Save these values from deploy output:
- `CONTRACT_ADDRESS_SOCIAL`
- `CONTRACT_ADDRESS_TOKEN`

---

### Step 3 — Set up backend

```bash
cd backend
npm install
```

Create `.env` from example:

**macOS/Linux**
```bash
cp .env.example .env
```

**Windows PowerShell**
```powershell
Copy-Item .env.example .env
```

Edit `backend/.env` and set:
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/sociochain
JWT_SECRET=change_this_to_a_long_random_secret_string
FRONTEND_URL=http://localhost:5173
RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
CONTRACT_ADDRESS_SOCIAL=0x...   # from deploy output
CONTRACT_ADDRESS_TOKEN=0x...    # from deploy output
PINATA_API_KEY=                 # optional
PINATA_SECRET_KEY=              # optional
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

Make sure MongoDB is running, then start backend:
```bash
npm run dev
```

---

### Step 4 — Set up frontend

```bash
cd frontend
npm install
```

If `frontend/package.json` still has only a placeholder script, run this one-time bootstrap:
```bash
npm install react react-dom react-router-dom ethers axios socket.io-client
npm install -D vite @vitejs/plugin-react tailwindcss postcss autoprefixer
npm pkg set scripts.dev="vite"
npm pkg set scripts.build="vite build"
npm pkg set scripts.preview="vite preview"
```

Create `.env` from example:

**macOS/Linux**
```bash
cp .env.example .env
```

**Windows PowerShell**
```powershell
Copy-Item .env.example .env
```

Edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:4000
VITE_CHAIN_ID=31337
VITE_CONTRACT_SOCIAL=0x...   # from deploy output
VITE_CONTRACT_TOKEN=0x...    # from deploy output
VITE_IPFS_GATEWAY=https://ipfs.io/ipfs/
```

Copy ABIs to frontend:

**macOS/Linux**
```bash
cp ../blockchain/artifacts/contracts/SocioChain.sol/SocioChain.json src/abi/
cp ../blockchain/artifacts/contracts/SocToken.sol/SocToken.json src/abi/
```

**Windows PowerShell**
```powershell
Copy-Item ..\blockchain\artifacts\contracts\SocioChain.sol\SocioChain.json .\src\abi\
Copy-Item ..\blockchain\artifacts\contracts\SocToken.sol\SocToken.json .\src\abi\
```

Start frontend:
```bash
npm run dev
```

App URL: `http://localhost:5173`

---

### Step 5 — Connect MetaMask

Add local Hardhat network:
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Import any test private key shown by `npx hardhat node`.

---

### Step 6 — Quick check

- Backend health endpoint: [http://localhost:4000/health](http://localhost:4000/health)
- Frontend opens at: [http://localhost:5173](http://localhost:5173)
- Wallet connects and signs

---

## Run All Services (4 terminals)

| Terminal | Directory | Command |
|----------|-----------|---------|
| 1 | `blockchain/` | `npx hardhat node` |
| 2 | `blockchain/` | `npx hardhat run scripts/deploy.js --network localhost` |
| 3 | `backend/` | `npm run dev` |
| 4 | `frontend/` | `npm run dev` |

Docker alternative:
```bash
docker-compose up --build
```

---

## Key Features

- 🔐 **Wallet Auth** — Sign in with MetaMask, no passwords
- 📝 **On-chain Posts** — Posts stored as IPFS hashes on Ethereum
- 💰 **SOC Token** — Earn tokens for quality content (upvotes)
- 🔒 **Encrypted DMs** — End-to-end encrypted messaging
- 👥 **Groups** — Decentralized communities with on-chain membership
- 🗳️ **DAO Moderation** — Community voting on content disputes
- 🌐 **IPFS Storage** — Media files stored on IPFS, not centralized servers
- 📊 **Profile NFTs** — User profiles as soulbound NFTs

---

## Smart Contract Addresses (Localhost)

After running deploy, addresses are saved to:
```
blockchain/deployments/localhost.json
```

---

## Troubleshooting

**MetaMask shows wrong network:**
→ Switch to "Hardhat Local" network in MetaMask

**Contract not found error:**
→ Re-deploy contracts and update `.env` addresses

**IPFS upload fails:**
→ Set up Pinata keys or run local IPFS node: `ipfs daemon`

**MongoDB connection error:**
→ Ensure MongoDB is running:
  - Linux: `sudo systemctl start mongod`
  - macOS (Homebrew): `brew services start mongodb-community`
  - Windows (Admin PowerShell): `net start MongoDB`
