# 🎮 TriX Gaming Platform - Complete Integration

A fully integrated blockchain gaming platform featuring **real-time matchmaking**, **Tic-Tac-Toe gameplay**, and **automatic GT token payouts**.

## 🚀 What's New - Round 2 Integration

This project now includes a complete **2-player gaming experience** with:

### ✨ Game Features
- **Real-time Tic-Tac-Toe** with Socket.IO
- **Smart Matchmaking** - automatically pairs players with same stake
- **Blockchain Integration** - stakes are held in smart contracts
- **Instant Payouts** - winner gets 2× stake automatically
- **Live Leaderboards** - real-time ranking updates
- **Multi-stake Support** - 1, 5, 10, or 25 GT stakes

### 🔗 Complete Flow Integration

```
[Connect Wallet] → [Get USDT] → [Buy GT] → [Find Match] → [Auto-Stake] → [Play Game] → [Winner Gets 2× GT]
```

## 🎯 Game Source & Architecture

### Game Choice: **Tic-Tac-Toe**
- **Simple but engaging** 2-player game
- **Fast rounds** (1-3 minutes average)  
- **Clear win conditions** - perfect for blockchain automation
- **Familiar gameplay** - no learning curve

### Technical Architecture
```
Frontend (Web)          Backend (Node.js)           Blockchain
┌─────────────────┐    ┌──────────────────────┐    ┌─────────────────┐
│ • Wallet Conn.  │    │ • Socket.IO Server   │    │ • GameToken     │
│ • Game UI       │◄──►│ • Matchmaking Queue  │◄──►│ • TokenStore    │
│ • Real-time     │    │ • Game State Mgmt    │    │ • PlayGame      │
│ • Leaderboards  │    │ • Blockchain Calls   │    │ • MockUSDT      │
└─────────────────┘    └──────────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Blockchain
```bash
npm run node
```

### 3. Deploy All Contracts
```bash
npm run deploy
```
*Automatically generates ABIs and updates .env*

### 4. Start Gaming Platform
```bash
npm start
```

### 5. Open Game Interface
- **🎮 Play Games**: http://localhost:8080/game.html
- **📊 Admin Panel**: http://localhost:8080/index.html

## 🎮 How to Play

### Step 1: Setup
1. **Connect MetaMask** to local network
2. **Get USDT** from faucet (1000 USDT)
3. **Buy GT tokens** with your USDT

### Step 2: Find Match
1. **Choose stake amount** (1, 5, 10, or 25 GT)
2. **Click "Find Match"** - waits for opponent
3. **Auto-matching** pairs you with player using same stake

### Step 3: Play
1. **Both players auto-stake** their GT tokens
2. **Game starts** when both stakes confirmed
3. **Play Tic-Tac-Toe** - click cells to make moves
4. **Real-time updates** - see opponent moves instantly

### Step 4: Win & Earn
1. **Winner determined** automatically
2. **2× stake transferred** to winner on blockchain
3. **Transaction proof** shown with Etherscan link
4. **Leaderboard updated** in real-time

## 🔧 API Integration Points

### Core Blockchain APIs
```javascript
// Token Operations
GET  /purchase?amount=10              // Buy GT with USDT
POST /faucet/usdt                     // Get test USDT
GET  /balance/:address                // Check GT balance

// Matchmaking 
POST /matchmaking/join                // Join queue
POST /matchmaking/leave               // Leave queue
GET  /stats/games                     // Active games stats

// Game Management
GET  /game/:matchId                   // Get game state
POST /game/:matchId/move              // Make game move
```

### Socket.IO Events
```javascript
// Client → Server
socket.emit('joinGame', {matchId, playerAddress})
socket.emit('playerStaked', {matchId, txHash})

// Server → Client  
socket.on('matchFound', data)         // Opponent found
socket.on('gameStarted', data)        // Both staked, game on
socket.on('gameMove', data)           // Opponent moved
socket.on('gameEnded', data)          // Game finished
```

## 🧠 Matchmaking Logic

### Queue System
```javascript
// Players queued by stake amount
{
  "1":  [player1, player2, ...],     // 1 GT stake
  "5":  [player3, player4, ...],     // 5 GT stake  
  "10": [player5],                   // 10 GT stake
  "25": []                           // 25 GT stake
}
```

### Matching Algorithm
1. **Player joins queue** for specific stake
2. **Check existing queue** for that stake amount
3. **If opponent found** → instant match creation
4. **If no opponent** → add to queue, wait for next player
5. **Match timeout** → return to queue after 10 minutes

### Game Room Management
```javascript
// Active game state
{
  matchId: "match_uuid",
  player1: "0x123...",
  player2: "0x456...", 
  stake: "5",
  status: "playing",        // created → staking → playing → finished
  board: [null,null,"X"...], // Tic-tac-toe board
  currentPlayer: "0x123...",
  winner: null
}
```

## 🔗 Smart Contract Integration

### Contract Flow
1. **TokenStore.buy()** - Convert USDT to GT
2. **PlayGame.createMatch()** - Create match on blockchain  
3. **GameToken.approve()** - Allow PlayGame to spend GT
4. **PlayGame.stake()** - Lock player's GT in escrow
5. **PlayGame.commitResult()** - Transfer 2× stake to winner

### On-Chain Security
- ✅ **Reentrancy guards** on all functions
- ✅ **Proper access control** - only backend can commit results  
- ✅ **Status validations** - prevent double staking/payouts
- ✅ **Timeout protection** - refunds after 24h if unresolved

## 📊 Real-Time Features

### Live Updates
- **Player balances** refresh after each transaction
- **Game board** updates in real-time via Socket.IO  
- **Leaderboards** refresh every 30 seconds
- **Queue status** shows position and wait time

### Event Logging
- **Transaction hashes** for all blockchain operations
- **Game moves** with timestamps
- **Win/loss records** with payout amounts
- **System status** updates

## 🌐 Vercel Deployment

### Automatic Deployment
```bash
# Deploy to Vercel
vercel --prod

# Environment variables needed:
# - RPC_URL (blockchain RPC)
# - PRIVATE_KEY (backend wallet)  
# - Contract addresses (auto-set by deploy script)
```

### Production Configuration
```json
{
  "builds": [
    {"src": "api/game-server.js", "use": "@vercel/node"},
    {"src": "tools/leaderboard.js", "use": "@vercel/node"},
    {"src": "web/**/*", "use": "@vercel/static"}
  ],
  "routes": [
    {"src": "/api/(.*)", "dest": "/api/game-server.js"},
    {"src": "/socket.io/(.*)", "dest": "/api/game-server.js"},
    {"src": "/(.*)", "dest": "/web/$1"}
  ]
}
```

## 🧪 Testing the Complete Flow

### Automated Testing
```bash
# Test smart contracts
npm test

# Test API endpoints
curl http://localhost:3000/health
curl http://localhost:3000/stats/games
```

### Manual Testing (2 Browser Windows)
1. **Window 1**: Connect wallet A, get tokens, find match (5 GT)
2. **Window 2**: Connect wallet B, get tokens, find match (5 GT)  
3. **Both windows**: Auto-staking happens, game starts
4. **Play the game**: Take turns clicking Tic-Tac-Toe cells
5. **Winner**: Automatically receives 10 GT (2× stake)
6. **Verify**: Check balances and leaderboard updates

## 📈 Game Statistics

### Real-Time Metrics
- **Active Games**: Currently playing matches
- **Players Online**: Connected via Socket.IO
- **Queue Status**: Players waiting by stake level
- **Total Volume**: GT tokens wagered today
- **Win Rates**: Player statistics and rankings

### Leaderboard Tracking
- **Wins/Losses** per player
- **Total GT Won** (lifetime)
- **Win Rate Percentage**  
- **Games Played** count
- **Average Stake** per game

## 🔮 Future Enhancements

### Additional Games
- **Rock Paper Scissors** - instant results
- **Connect 4** - strategy-based gameplay
- **Coin Flip** - simple 50/50 betting

### Advanced Features
- **Tournaments** - multi-player brackets
- **Betting Pools** - spectators can bet on games
- **NFT Rewards** - special prizes for top players
- **Mobile App** - native iOS/Android versions

## 🛠️ Developer Notes

### Code Organization
```
api/
├── game-server.js      # Main server with Socket.IO + APIs
├── index.js           # Original API (legacy)
└── abis/              # Contract ABIs (auto-generated)

web/
├── game.html          # Main gaming interface  
├── index.html         # Admin/management panel
└── package.json       # Frontend dependencies

tools/
└── leaderboard.js     # Event indexer + leaderboard API

contracts/
├── GameToken.sol      # ERC-20 game token
├── TokenStore.sol     # USDT → GT exchange
├── PlayGame.sol       # Game escrow & payouts  
└── MockUSDT.sol       # Test USDT token
```

### Socket.IO Architecture
- **Namespaces**: Default namespace for all game rooms
- **Rooms**: One room per active match (matchId)
- **Events**: Custom events for game state changes
- **Cleanup**: Auto-remove completed games after 5 minutes

## 📄 License

MIT License - Build, modify, and deploy freely!

---

**🎮 Ready to play and earn? Start the platform and challenge other players! 🏆**
