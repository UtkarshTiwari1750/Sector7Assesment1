# 🎮 TriX Gaming Platform - Round 2 Complete

A **fully integrated blockchain gaming platform** featuring real-time **Tic-Tac-Toe gameplay**, smart matchmaking, automatic GT token staking, and instant winner payouts.

## 🚀 NEW: Complete Game Integration
- ✅ **Real-time Tic-Tac-Toe** with Socket.IO
- ✅ **Smart Matchmaking** - auto-pairs players with same stakes  
- ✅ **Blockchain Escrow** - stakes locked in smart contracts
- ✅ **Instant Payouts** - winner gets 2× stake automatically
- ✅ **Live Events** - real-time game updates and leaderboards

## 🏗️ Architecture

```
📁 contracts/          # Smart contracts (Solidity)
├── GameToken.sol       # ERC-20 game token (18 decimals)
├── TokenStore.sol      # USDT → GT on-ramp exchange
├── PlayGame.sol        # Match escrow & payout system
└── MockUSDT.sol        # Mock USDT for testing

📁 api/                 # Backend API (Node.js + Express)
├── index.js            # Main API server
├── abis/               # Contract ABIs
└── package.json        # Dependencies

📁 web/                 # Frontend (HTML + JS)
└── index.html          # Single-page gaming interface

📁 tools/               # Indexer & Leaderboard
└── leaderboard.js      # Event listener + leaderboard API

📁 scripts/             # Utility scripts
└── start-all.js        # Launch all services
```

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Blockchain
```bash
npx hardhat node
```

### 3. Deploy Contracts
```bash
npm run deploy
# or
npx hardhat run scripts/deploy.js --network localhost
```

### 4. Configure Environment
The deploy script automatically:
- ✅ Generates ABI files for all contracts
- ✅ Updates .env with deployed contract addresses  
- ✅ Sets up contract relationships

No manual configuration needed!

### 5. Start All Services
```bash
node scripts/start-all.js
```

**Service URLs:**
- 🎮 **Game Platform**: http://localhost:8080/game.html
- 📊 **Admin Panel**: http://localhost:8080/index.html
- 🎯 **Game Server**: http://localhost:3000 (API + Socket.IO)
- 📈 **Leaderboard API**: http://localhost:3001

## 🎯 Core Features

### 💰 Token Economy
- **USDT → GT Exchange**: Convert USDT to Game Tokens at configurable rates
- **ERC-20 Standard**: GameToken (GT) with 18 decimals
- **Owner Controls**: TokenStore withdrawal functions

### ⚔️ Competitive Gaming
- **Match Escrow**: Both players must stake before game starts
- **Secure Payouts**: Winner receives 2× stake automatically
- **Timeout Protection**: Refunds available after 24h if unresolved
- **Result Verification**: Only authorized operators can submit results

### 🎮 Real-time Gaming  
- **Tic-Tac-Toe Gameplay**: Classic 3x3 grid game with modern UI
- **Smart Matchmaking**: Auto-pairs players with matching stakes (1, 5, 10, 25 GT)
- **Socket.IO Integration**: Real-time moves, chat, and game updates
- **Multi-stake Support**: Different risk levels for different players

### 📊 Real-time Leaderboard
- **Live Event Tracking**: Purchase, match creation, staking, and settlement events
- **Player Statistics**: Wins, losses, GT won/lost, win rates
- **Purchase Analytics**: Track USDT spending and GT accumulation
- **REST API**: Multiple endpoints for data access

## 🔧 API Reference

### Backend API (Port 3000)

#### Token Operations
```bash
# Purchase GT tokens
GET /purchase?amount=10

# Get player balance
GET /balance/0x123...

# Get USDT balance
GET /usdt-balance/0x123...

# Get test USDT from faucet
POST /faucet/usdt
{
  "address": "0x123...",
  "amount": "1000"
}
```

#### Match Management
```bash
# Create match
POST /match/start
{
  "matchId": "0x...",
  "p1": "0x123...",
  "p2": "0x456...",
  "stake": "1000000000000000000"
}

# Stake in match
POST /match/stake
{
  "matchId": "0x...",
  "player": "0x123..."
}

# Submit result
POST /match/result
{
  "matchId": "0x...",
  "winner": "0x123..."
}

# Get match details
GET /match/game123

# Refund expired match
POST /match/refund
{
  "matchId": "0x..."
}
```

### Leaderboard API (Port 3001)

```bash
# Get top players (gaming)
GET /leaderboard?limit=10

# Get top purchasers
GET /purchases?limit=10

# Get player statistics
GET /player/0x123...

# Get recent events
GET /events?limit=50&type=Settled

# Get platform statistics
GET /stats

# Health check
GET /health
```

## 🎮 Frontend Features

### 🔗 Wallet Integration
- MetaMask connection
- Real-time balance updates
- Transaction status tracking

### 💳 Token Purchase
- USDT to GT conversion
- Transaction confirmation
- Balance updates

### 🎯 Match Management
- Create new matches
- Stake in existing matches
- Submit match results
- View match status

### 🏆 Live Leaderboard
- Top players by GT won
- Win/loss statistics
- Purchase leaderboard
- Auto-refresh capability

### 📜 Event Log
- Real-time transaction history
- Event notifications
- Error handling & feedback

## 🧪 Testing

### Smart Contract Tests
```bash
npx hardhat test
```

### Integration Testing
```bash
# Start local blockchain
npx hardhat node

# Deploy contracts
npx hardhat ignition deploy ./ignition/modules/Deploy.js --network localhost

# Start services and test manually through frontend
node scripts/start-all.js
```

## 📋 Smart Contract Specifications

### GameToken.sol
- **Standard**: ERC-20 with 18 decimals
- **Minting**: Only TokenStore can mint
- **Events**: `Minted(address to, uint256 amount)`

### TokenStore.sol
- **Exchange Rate**: Configurable GT per USDT
- **Purchase Flow**: `transferFrom` USDT → mint GT
- **Security**: Reentrancy guard, CEI pattern
- **Events**: `Purchase(address buyer, uint256 usdtAmount, uint256 gtOut)`

### PlayGame.sol
- **Match States**: CREATED → STAKED → SETTLED/REFUNDED
- **Escrow**: Holds stakes until both players commit
- **Payouts**: Winner gets 2× stake (their stake + opponent's)
- **Timeout**: 24-hour refund window
- **Events**: `MatchCreated`, `Staked`, `Settled`, `Refunded`

## 🔒 Security Features

### Smart Contracts
- ✅ Reentrancy guards on all state-changing functions
- ✅ CEI (Checks-Effects-Interactions) pattern
- ✅ Proper access control (Ownable, operator roles)
- ✅ Input validation and bounds checking
- ✅ Status checks prevent double-spending

### Backend
- ✅ Input validation and sanitization
- ✅ Proper error handling
- ✅ Transaction confirmation waiting
- ✅ Address format validation

### Frontend
- ✅ MetaMask integration for secure signing
- ✅ Real-time balance verification
- ✅ Transaction status tracking
- ✅ Error handling and user feedback

## 🌐 Environment Variables

Create `.env` from `.env.example`:

```bash
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0x...
TOKENSTORE_ADDR=0x...
PLAYGAME_ADDR=0x...
GAMETOKEN_ADDR=0x...
MOCKUSDT_ADDR=0x...
PORT=3000
LEADERBOARD_PORT=3001
```

## 📝 Development Notes

### Technology Stack
- **Blockchain**: Hardhat, Solidity, ethers.js
- **Backend**: Node.js, Express, ethers.js
- **Frontend**: Vanilla HTML/CSS/JS, ethers.js
- **Indexing**: Event listeners, in-memory storage

### Production Considerations
- Replace in-memory storage with PostgreSQL/MongoDB
- Add authentication & authorization
- Implement rate limiting
- Add monitoring & logging
- Use environment-specific configurations
- Add automated testing pipeline

## 🎮 Complete Gaming Flow

### Full End-to-End Experience
1. **Start local blockchain**: `npm run node`
2. **Deploy contracts**: `npm run deploy` (auto-generates ABIs & updates .env)
3. **Start all services**: `npm start`
4. **Open game platform**: http://localhost:8080/game.html

### Single Player Setup
5. **Connect MetaMask** to local network  
6. **Get test USDT** from the faucet (1000 USDT)
7. **Buy GT tokens** with your USDT (e.g., 100 GT)

### Real Gaming Experience (2 Players)
8. **Player 1**: Choose stake (e.g., 5 GT) and click "Find Match"
9. **Player 2** (different browser/account): Choose same stake (5 GT) and "Find Match"
10. **Auto-matching**: System pairs players instantly
11. **Auto-staking**: Both players' GT automatically staked in smart contract
12. **Play Tic-Tac-Toe**: Real-time game with Socket.IO updates
13. **Instant Payout**: Winner automatically receives 10 GT (2× stake)
14. **Blockchain Proof**: Transaction hash shown with Etherscan link
15. **Live Updates**: Leaderboard and balances refresh automatically

### 🎯 Testing Features
- **Multiple Stake Levels**: 1, 5, 10, or 25 GT per game
- **Real-time Matchmaking**: Queue system with position tracking
- **Live Game Updates**: See opponent moves instantly  
- **Automatic Blockchain**: No manual transaction signing needed
- **Complete Integration**: Wallet → Tokens → Match → Play → Win → Payout

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

*Built for the blockchain gaming community* 🎮✨
