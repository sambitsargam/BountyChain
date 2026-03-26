# 🧩 BountyChain - Decentralized Task & Bounty Platform

BountyChain is a decentralized task and bounty platform built on OneChain that connects task creators with contributors through AI-powered matching and evaluation.

## Features

- **AI Matching**: Smart recommendations match tasks with skilled contributors
- **Instant Rewards**: Automated payments upon task completion
- **Quality Validation**: AI-powered submission evaluation and ranking
- **Trustless Escrow**: Rewards held securely in smart contracts

## Project Structure

```
BountyChain/
├── contracts/          # Move smart contracts
│   ├── Move.toml
│   └── sources/
│       └── bountychain.move
└── frontend/           # React TypeScript frontend
    ├── src/
    │   ├── App.tsx
    │   ├── App.css
    │   └── main.tsx
    └── .env
```

## Prerequisites

- Rust (stable)
- Node.js 18+
- OneChain CLI installed
- OneChain wallet with testnet ONE tokens

## 🚀 Deployment Status

✅ **DEPLOYED TO ONECHAIN TESTNET**

- **Package ID:** `0x445e41a9e394d5e6a03104de03614888d6d7e21e51d237e617c5bdf8c7b06d4d`
- **Explorer:** [View on OneScan](https://onescan.cc/testnet/object/0x445e41a9e394d5e6a03104de03614888d6d7e21e51d237e617c5bdf8c7b06d4d)
- **Network:** OneChain Testnet
- **Deployment Date:** March 27, 2026

## Installation & Setup

### 1. Setup OneChain

```bash
git clone https://github.com/one-chain-labs/onechain.git
cd onechain
cargo install --path crates/one --locked --features tracing
one client new-env --alias testnet --rpc https://rpc-testnet.onelabs.cc:443
one client switch --env testnet
one client faucet
```

### 2. Run Frontend (Already Configured)

The frontend is already configured with the deployed contract address.

```bash
cd BountyChain/frontend
npm install
npm run dev
```

### 3. (Optional) Deploy Your Own Instance

```bash
cd BountyChain/contracts
one move build
one client publish --gas-budget 50000000 .
```

Then update `frontend/.env` with your Package ID.

## Usage

1. Connect your OneChain wallet
2. Create a bounty task with title, description, category, and reward
3. Contributors discover tasks through AI recommendations
4. Contributors submit work with proof
5. AI scores submissions for quality
6. Task creator awards bounty to winner
7. Winner receives ONE tokens automatically

## Smart Contract Functions

- `create_task`: Create a new bounty task
- `submit_work`: Submit work for a task
- `score_submission`: AI scores submission quality
- `award_bounty`: Award bounty to winner
- `get_task_info`: View task details
- `get_submission_score`: View AI score

## Technology Stack

- **Blockchain**: OneChain (Move language)
- **Frontend**: React + TypeScript + Vite
- **Styling**: Custom CSS with cyberpunk grid effects
- **Wallet Integration**: @onelabs/dapp-kit

## License

MIT License
