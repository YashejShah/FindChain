# FindChain — AI-Powered Decentralized Lost & Found

![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=flat-square&logo=solidity)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![TensorFlow](https://img.shields.io/badge/TensorFlow-ResNet50-FF6F00?style=flat-square&logo=tensorflow)
![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-3C3C3D?style=flat-square&logo=ethereum)

A decentralized lost-and-found platform that uses computer vision to automatically match lost items with found ones, and smart contracts to handle escrow rewards and dispute resolution.

---

## Why this exists

Traditional lost-and-found is broken — every location runs its own system, matching is manual, there's no incentive for finders, and no way to verify ownership claims. FindChain fixes this by combining AI visual matching with blockchain-based trust.

**How it works:**
1. Someone loses an item, reports it with a photo and optional ETH reward
2. Someone finds an item, reports it with a photo
3. The AI engine (ResNet50) extracts visual features and scores similarity
4. If there's a match, the smart contract proposes it on-chain
5. The owner confirms, reward is released from escrow to the finder
6. If there's a disagreement, the community votes to resolve the dispute

---

## Architecture

```
                    React Frontend (Vite)
                          |
            +-------------+-------------+
            |             |             |
     AI Service      IPFS/Pinata    Ethereum
     (Flask +        (images &      (FindChain.sol)
      ResNet50)       metadata)
```

- **Smart Contract** — Solidity 0.8.20 with OpenZeppelin (Ownable, ReentrancyGuard). Handles registration, item reporting, match proposals, escrow, disputes, and reputation.
- **AI Service** — Python Flask server running ResNet50 for feature extraction. Matching uses a weighted score: 60% visual similarity + 20% category match + 20% GPS proximity.
- **Frontend** — Single-page React 18 app with Recharts for analytics, Lucide for icons, ethers.js for wallet interaction.
- **Storage** — Images and metadata go to IPFS via Pinata. Only the CID hashes are stored on-chain.

---

## Project Structure

```
findchain/
├── contracts/
│   └── FindChain.sol            # main smart contract
├── scripts/
│   ├── deploy.js                # deployment script
│   └── test-live.js             # full-flow live simulation
├── test/
│   └── FindChain.test.js        # hardhat unit tests
├── ai-service/
│   ├── app.py                   # flask AI matching server
│   └── requirements.txt         # python deps
├── frontend/
│   ├── src/
│   │   ├── FindChain.jsx        # main react app
│   │   └── main.jsx             # entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── hardhat.config.js
├── package.json
├── run.bat                      # one-click setup + launch (windows)
├── setup.bat / setup.sh         # install dependencies
├── start.bat                    # quick start (windows)
└── test-live.bat                # run live blockchain test
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+ (optional, for AI service)
- MetaMask browser extension

### Quick Start (Windows)

Just run `run.bat` — it handles everything: dependency install, contract compilation, unit tests, hardhat node, deployment, and frontend launch.

### Manual Setup

```bash
# clone
git clone https://github.com/YashejShah/FindChain.git
cd FindChain

# install dependencies
npm install
cd frontend && npm install && cd ..

# compile contracts
npx hardhat compile

# run tests
npx hardhat test

# start local blockchain (terminal 1)
npx hardhat node

# deploy to local node (terminal 2)
npx hardhat run scripts/deploy.js --network localhost

# start frontend (terminal 3)
cd frontend && npm run dev
```

### AI Service (optional)

```bash
cd ai-service
pip install -r requirements.txt
python app.py
# runs on http://localhost:5000
```

### Environment

Copy `.env.example` to `.env` and fill in your keys if deploying to Sepolia:
- `PRIVATE_KEY` — your wallet private key
- `SEPOLIA_RPC_URL` — Infura or Alchemy endpoint
- `ETHERSCAN_API_KEY` — for contract verification
- `PINATA_API_KEY` / `PINATA_SECRET_KEY` — for IPFS uploads

---

## Smart Contract

The `FindChain.sol` contract handles:

| Function | What it does | Who can call |
|----------|-------------|-------------|
| `registerUser()` | Create user profile with base reputation (500) | Anyone |
| `reportLostItem(...)` | Report lost item, lock ETH reward in escrow | Registered users |
| `reportFoundItem(...)` | Report found item | Registered users |
| `proposeMatch(...)` | Propose AI-detected match with similarity score | Contract owner |
| `confirmMatch(id)` | Confirm match, release reward to finder (minus 2% fee) | Lost item reporter |
| `openDispute(...)` | Dispute a proposed match with evidence | Match parties |
| `voteOnDispute(...)` | Community vote on dispute (3-day window) | Users with 100+ reputation |
| `resolveDispute(id)` | Finalize dispute after voting period | Anyone |

The contract uses `ReentrancyGuard` for reward payouts, `Ownable` for admin functions, and a reputation system (0-10,000) that gates dispute voting to prevent Sybil attacks.

---

## AI Matching

The matching algorithm combines three signals:

```
score = (visual_similarity * 0.6) + (category_match * 0.2) + (location_proximity * 0.2)
```

- **Visual similarity** — ResNet50 extracts a 2048-dim feature vector from each image, compared via cosine similarity
- **Category match** — exact match bonus (auto-categorized from description keywords)
- **Location proximity** — Haversine distance scoring, 1.0 within 1km decaying to 0 at 50km

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Service health check |
| `/api/extract-features` | POST | Extract and store visual features for an item |
| `/api/find-matches` | POST | Find potential matches above a threshold |
| `/api/compare` | POST | Direct comparison between two images |
| `/api/categorize` | POST | Auto-categorize from description text |

---

## Testing

```bash
# unit tests (hardhat)
npx hardhat test

# full live simulation (deploy + register + report + match + reward + dispute)
npx hardhat run scripts/test-live.js
```

The live test runs through the complete flow: deploy contract, register 3 users, report lost/found items, propose AI match at 92% similarity, confirm match with escrow payout, and open a dispute with community voting.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Smart Contracts | Solidity 0.8.20, OpenZeppelin 5.x |
| Blockchain | Ethereum (Hardhat local / Sepolia testnet) |
| Dev Framework | Hardhat, Ethers.js v6 |
| AI/ML | TensorFlow, Keras, ResNet50 |
| Backend | Python Flask |
| Frontend | React 18, Vite 5, Recharts, Lucide |
| Storage | IPFS via Pinata |
| Wallet | MetaMask |

---

## License

MIT
