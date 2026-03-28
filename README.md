# CroX MVP

CroX is a UPI-native smart escrow platform powered by Multi-Agent AI and the Monad blockchain. It allows users to convert informal agreements into enforceable financial workflows.

## Features

- **Multi-Agent AI Analysis**: Three specialized AI agents (Parser, Risk Assessment, Compliance) analyze natural language contract descriptions to extract terms, assess risk, and suggest escrow parameters.
- **Smart Escrow Ledger**: Atomic, idempotent financial ledger ensuring funds are securely locked and safely released or refunded based on contract state.
- **Deterministic State Machine**: Strict contract lifecycle (Draft → Pending Acceptance → Active → Funds Locked → Work Submitted → Completed/Disputed).
- **Dispute Resolution**: Dedicated portal for raising disputes and resolving them via full release, full refund, or partial split.
- **Blockchain Verification (Monad)**: Immutable contract registration on the high-performance Monad testnet.

## Architecture

```text
User Input (Natural Language) 
    → [Next.js Frontend]
        → [Django DRF Backend]
            → [Multi-Agent AI System (GPT-4o-mini)]
                1. Parser Agent  → extracts structure
                2. Risk Agent    → scores risk/flags
                3. Compliance     → escrow rules
            ← [Returns structured contract]
        ← [User reviews & confirms]
    → [State Machine] → [Escrow Ledger] → [Monad Blockchain (Web3)]
```

## Tech Stack

- **Frontend**: Next.js (App Router), React, Vanilla CSS (Glassmorphism design)
- **Backend**: Python, Django, Django REST Framework, SQLite
- **AI Integration**: OpenAI API (`gpt-4o-mini`), Agent Orchestrator Pattern
- **Blockchain**: Monad Testnet, Foundry (Solidity), Web3.py

---

## Setup & Execution

### 1. Prerequisites
- Python 3.9+
- Node.js 18+

### 2. Backend Setup
```bash
cd apps/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations (SQLite database will be created automatically)
python manage.py migrate
```

Configure environment variables in `.env` at the root of the project:
```env
# Root .env file
OPENAI_API_KEY=your_openai_api_key
MONAD_PRIVATE_KEY=your_private_key
CONTRACT_REGISTRY_ADDRESS=your_deployed_contract_address
```
*(Note: If OpenAI key or Monad key are missing, the system gracefully falls back to mock responses so the app remains fully functional for demos.)*

Start the backend:
```bash
python manage.py runserver 8000
```

### 3. Frontend Setup
```bash
cd apps/web
npm install
npm run dev
```

### 4. Smart Contract (Optional)
To deploy the registry yourself on Monad testnet:
```bash
cd packages/contracts
forge script script/Deploy.s.sol:DeployScript --rpc-url monad_testnet --private-key $MONAD_PRIVATE_KEY --broadcast
```

## Running the Tests

The backend includes a comprehensive test suite for the State Machine, Escrow Ledger, and API Lifecycle.

```bash
cd apps/backend
source venv/bin/activate
python manage.py test contracts escrow -v2
```
