require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { ethers } = require("ethers");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(cors());

// Blockchain setup
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Load ABIs
const tokenStoreAbi = require("./abis/TokenStore.json");
const playGameAbi = require("./abis/PlayGame.json");
const gameTokenAbi = require("./abis/GameToken.json");
const mockUSDTAbi = require("./abis/MockUSDT.json");

// Initialize contracts
const tokenStore = new ethers.Contract(process.env.TOKENSTORE_ADDR, tokenStoreAbi, wallet);
const playGame = new ethers.Contract(process.env.PLAYGAME_ADDR, playGameAbi, wallet);
const gameToken = new ethers.Contract(process.env.GAMETOKEN_ADDR, gameTokenAbi, provider);
const mockUSDT = new ethers.Contract(process.env.MOCKUSDT_ADDR, mockUSDTAbi, provider);

// Game state management
const matchmakingQueue = new Map(); // stake -> [players]
const activeGames = new Map(); // matchId -> gameState
const playerSockets = new Map(); // address -> socketId
const socketPlayers = new Map(); // socketId -> playerData

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============= EXISTING API ENDPOINTS =============

// Get purchase information (for frontend to make the actual purchase)
app.get("/purchase-info", asyncHandler(async (req, res) => {
  const amount = req.query.amount;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  
  const usdtAmount = ethers.parseUnits(amount, 6);
  const gtAmount = (usdtAmount * ethers.parseEther("1")) / ethers.parseUnits("1", 6); // 1:1 ratio
  
  res.json({ 
    usdtAmount: amount,
    usdtAmountWei: usdtAmount.toString(),
    gtAmount: ethers.formatEther(gtAmount),
    gtAmountWei: gtAmount.toString(),
    tokenStoreAddress: process.env.TOKENSTORE_ADDR,
    usdtAddress: process.env.MOCKUSDT_ADDR,
    message: "Purchase calculation successful"
  });
}));

// Admin purchase (for testing - uses API server's wallet)
app.post("/admin/purchase", asyncHandler(async (req, res) => {
  const { amount, recipient } = req.body;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  
  const recipientAddress = recipient || wallet.address;
  if (!ethers.isAddress(recipientAddress)) {
    return res.status(400).json({ error: "Invalid recipient address" });
  }
  
  try {
    const usdtAmount = ethers.parseUnits(amount, 6);
    
    // Check USDT allowance first
    const allowance = await mockUSDT.allowance(wallet.address, tokenStore.target);
    if (allowance < usdtAmount) {
      return res.status(400).json({ 
        error: "Insufficient USDT allowance",
        required: amount,
        current: ethers.formatUnits(allowance, 6),
        message: "API server needs to approve USDT spending for TokenStore"
      });
    }
    
    const tx = await tokenStore.buy(usdtAmount);
    await tx.wait();
    
    res.json({ 
      txHash: tx.hash,
      usdtAmount: amount,
      recipient: recipientAddress,
      message: "Admin purchase successful"
    });
  } catch (error) {
    console.error("Admin purchase error:", error);
    res.status(500).json({ 
      error: "Purchase failed",
      message: error.message,
      details: error.reason || "Unknown error"
    });
  }
}));

// Get GT balance
app.get("/balance/:address", asyncHandler(async (req, res) => {
  const address = req.params.address;
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  
  const balance = await gameToken.balanceOf(address);
  res.json({ 
    address: address,
    balance: ethers.formatEther(balance),
    balanceWei: balance.toString()
  });
}));

// Get USDT and GT balances (combined endpoint)
app.get("/usdt-balance/:address", asyncHandler(async (req, res) => {
  const address = req.params.address;
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  
  try {
    // Get both balances simultaneously
    const [usdtBalance, gtBalance] = await Promise.all([
      mockUSDT.balanceOf(address),
      gameToken.balanceOf(address)
    ]);
    
    res.json({ 
      address: address,
      usdt: {
        balance: ethers.formatUnits(usdtBalance, 6), // USDT has 6 decimals
        balanceWei: usdtBalance.toString(),
        symbol: "USDT"
      },
      gt: {
        balance: ethers.formatEther(gtBalance), // GT has 18 decimals
        balanceWei: gtBalance.toString(),
        symbol: "GT"
      },
      // Legacy support - keep old format for backward compatibility
      balance: ethers.formatUnits(usdtBalance, 6),
      balanceWei: usdtBalance.toString()
    });
  } catch (error) {
    console.error("Balance check error:", error);
    res.status(500).json({ 
      error: "Failed to get balances", 
      message: error.message,
      contractAddresses: {
        mockUSDT: process.env.MOCKUSDT_ADDR,
        gameToken: process.env.GAMETOKEN_ADDR
      }
    });
  }
}));

// USDT Faucet
app.post("/faucet/usdt", asyncHandler(async (req, res) => {
  const { address, amount } = req.body;
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  
  const faucetAmount = amount ? ethers.parseUnits(amount, 6) : ethers.parseUnits("1000", 6);
  const usdtWithWallet = new ethers.Contract(process.env.MOCKUSDT_ADDR, mockUSDTAbi, wallet);
  const tx = await usdtWithWallet.mint(address, faucetAmount);
  await tx.wait();
  
  res.json({ 
    txHash: tx.hash,
    address: address,
    amount: ethers.formatUnits(faucetAmount, 6),
    message: "USDT tokens minted successfully"
  });
}));

// Get contract addresses and network info
app.get("/contracts", (req, res) => {
  res.json({
    network: "localhost",
    rpcUrl: process.env.RPC_URL,
    contracts: {
      TokenStore: process.env.TOKENSTORE_ADDR,
      PlayGame: process.env.PLAYGAME_ADDR,
      GameToken: process.env.GAMETOKEN_ADDR,
      MockUSDT: process.env.MOCKUSDT_ADDR
    },
    apiWallet: wallet.address
  });
});

// Get allowances for an address
app.get("/allowances/:address", asyncHandler(async (req, res) => {
  const address = req.params.address;
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  
  try {
    const [gtAllowance, usdtAllowance] = await Promise.all([
      gameToken.allowance(address, process.env.PLAYGAME_ADDR),
      mockUSDT.allowance(address, process.env.TOKENSTORE_ADDR)
    ]);
    
    res.json({
      address,
      allowances: {
        GT: {
          spender: process.env.PLAYGAME_ADDR,
          spenderName: "PlayGame",
          allowance: ethers.formatEther(gtAllowance),
          allowanceWei: gtAllowance.toString()
        },
        USDT: {
          spender: process.env.TOKENSTORE_ADDR,
          spenderName: "TokenStore",
          allowance: ethers.formatUnits(usdtAllowance, 6),
          allowanceWei: usdtAllowance.toString()
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get allowances", message: error.message });
  }
}));

// ============= NEW GAME API ENDPOINTS =============

// Join matchmaking queue
app.post("/matchmaking/join", asyncHandler(async (req, res) => {
  const { address, stake, socketId } = req.body;
  
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  
  if (!stake || parseFloat(stake) <= 0) {
    return res.status(400).json({ error: "Invalid stake amount" });
  }
  
  // Check if player has enough GT balance
  const balance = await gameToken.balanceOf(address);
  const stakeAmount = ethers.parseEther(stake);
  
  if (balance < stakeAmount) {
    return res.status(400).json({ error: "Insufficient GT balance" });
  }
  
  const stakeKey = stake;
  
  // Initialize queue for this stake if it doesn't exist
  if (!matchmakingQueue.has(stakeKey)) {
    matchmakingQueue.set(stakeKey, []);
  }
  
  const queue = matchmakingQueue.get(stakeKey);
  
  // Check if player is already in queue
  if (queue.find(p => p.address === address)) {
    return res.json({ message: "Already in queue", position: queue.findIndex(p => p.address === address) + 1 });
  }
  
  const playerData = {
    address,
    stake,
    stakeWei: stakeAmount.toString(),
    socketId,
    joinTime: Date.now()
  };
  
  // Add player to queue
  queue.push(playerData);
  
  // Try to match immediately
  if (queue.length >= 2) {
    const player1 = queue.shift();
    const player2 = queue.shift();
    
    // Create match
    const matchId = `match_${uuidv4()}`;
    await createGameMatch(matchId, player1, player2);
    
    res.json({ 
      message: "Match found!", 
      matchId,
      opponent: player2.address === address ? player1.address : player2.address
    });
  } else {
    res.json({ 
      message: "Added to queue", 
      position: queue.length,
      queueSize: queue.length 
    });
  }
}));

// Leave matchmaking queue
app.post("/matchmaking/leave", asyncHandler(async (req, res) => {
  const { address } = req.body;
  
  // Remove player from all queues
  for (const [stakeKey, queue] of matchmakingQueue.entries()) {
    const playerIndex = queue.findIndex(p => p.address === address);
    if (playerIndex !== -1) {
      queue.splice(playerIndex, 1);
      break;
    }
  }
  
  res.json({ message: "Left matchmaking queue" });
}));

// Get game state
app.get("/game/:matchId", asyncHandler(async (req, res) => {
  const matchId = req.params.matchId;
  const gameState = activeGames.get(matchId);
  
  if (!gameState) {
    return res.status(404).json({ error: "Game not found" });
  }
  
  res.json(gameState);
}));

// Make game move
app.post("/game/:matchId/move", asyncHandler(async (req, res) => {
  const matchId = req.params.matchId;
  const { player, move } = req.body;
  
  const gameState = activeGames.get(matchId);
  if (!gameState) {
    return res.status(404).json({ error: "Game not found" });
  }
  
  if (gameState.currentPlayer !== player) {
    return res.status(400).json({ error: "Not your turn" });
  }
  
  if (gameState.status !== "playing") {
    return res.status(400).json({ error: "Game is not active" });
  }
  
  // Process move (Tic-Tac-Toe logic)
  const result = processTicTacToeMove(gameState, move);
  
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  
  // Update game state
  activeGames.set(matchId, result.gameState);
  
  // Broadcast move to both players
  io.to(matchId).emit("gameMove", {
    matchId,
    move,
    player,
    gameState: result.gameState
  });
  
  // Check if game ended
  if (result.gameState.status === "finished") {
    await handleGameEnd(matchId, result.gameState);
  }
  
  res.json(result.gameState);
}));

// ============= GAME LOGIC FUNCTIONS =============

async function createGameMatch(matchId, player1, player2) {
  const gameState = {
    matchId,
    player1: player1.address,
    player2: player2.address,
    stake: player1.stake,
    stakeWei: player1.stakeWei,
    status: "created", // created -> staking -> playing -> finished
    currentPlayer: player1.address,
    board: Array(9).fill(null), // Tic-Tac-Toe board
    winner: null,
    startTime: Date.now(),
    player1Staked: false,
    player2Staked: false,
    moves: []
  };
  
  activeGames.set(matchId, gameState);
  
  // Create match on blockchain
  try {
    const matchIdBytes = ethers.formatBytes32String(matchId);
    const tx = await playGame.createMatch(matchIdBytes, player1.address, player2.address, player1.stakeWei);
    await tx.wait();
    
    gameState.createTx = tx.hash;
    console.log(`✅ Match ${matchId} created on blockchain: ${tx.hash}`);
  } catch (error) {
    console.error(`❌ Failed to create match on blockchain:`, error);
    gameState.error = error.message;
  }
  
  // Notify both players
  if (player1.socketId) {
    io.to(player1.socketId).emit("matchFound", {
      matchId,
      opponent: player2.address,
      gameState
    });
  }
  
  if (player2.socketId) {
    io.to(player2.socketId).emit("matchFound", {
      matchId,
      opponent: player1.address,
      gameState
    });
  }
  
  console.log(`🎮 Match created: ${matchId} between ${player1.address} and ${player2.address}`);
}

function processTicTacToeMove(gameState, move) {
  const { position } = move;
  
  // Validate move
  if (position < 0 || position > 8) {
    return { error: "Invalid position" };
  }
  
  if (gameState.board[position] !== null) {
    return { error: "Position already taken" };
  }
  
  // Make move
  const symbol = gameState.currentPlayer === gameState.player1 ? 'X' : 'O';
  gameState.board[position] = symbol;
  gameState.moves.push({ player: gameState.currentPlayer, position, symbol, timestamp: Date.now() });
  
  // Check for winner
  const winner = checkTicTacToeWinner(gameState.board);
  
  if (winner) {
    gameState.status = "finished";
    gameState.winner = winner === 'X' ? gameState.player1 : gameState.player2;
  } else if (gameState.board.every(cell => cell !== null)) {
    // Draw
    gameState.status = "finished";
    gameState.winner = null;
  } else {
    // Switch turns
    gameState.currentPlayer = gameState.currentPlayer === gameState.player1 ? gameState.player2 : gameState.player1;
  }
  
  return { gameState };
}

function checkTicTacToeWinner(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  
  return null;
}

async function handleGameEnd(matchId, gameState) {
  console.log(`🏁 Game ${matchId} ended. Winner: ${gameState.winner || 'Draw'}`);
  
  // Only commit result if there's a winner (no payout for draws)
  if (gameState.winner) {
    try {
      const matchIdBytes = ethers.formatBytes32String(matchId);
      const tx = await playGame.commitResult(matchIdBytes, gameState.winner);
      await tx.wait();
      
      gameState.payoutTx = tx.hash;
      console.log(`💰 Payout completed for ${gameState.winner}: ${tx.hash}`);
      
      // Notify both players
      io.to(matchId).emit("gameEnded", {
        matchId,
        winner: gameState.winner,
        payoutTx: tx.hash,
        gameState
      });
      
    } catch (error) {
      console.error(`❌ Failed to commit result:`, error);
      gameState.payoutError = error.message;
    }
  } else {
    // Draw - notify players but no payout
    io.to(matchId).emit("gameEnded", {
      matchId,
      winner: null,
      draw: true,
      gameState
    });
  }
  
  // Clean up after 5 minutes
  setTimeout(() => {
    activeGames.delete(matchId);
  }, 5 * 60 * 1000);
}

// ============= SOCKET.IO HANDLERS =============

io.on("connection", (socket) => {
  console.log(`🔌 Player connected: ${socket.id}`);
  
  socket.on("joinGame", (data) => {
    const { matchId, playerAddress } = data;
    
    socket.join(matchId);
    socketPlayers.set(socket.id, { address: playerAddress, matchId });
    playerSockets.set(playerAddress, socket.id);
    
    console.log(`👤 ${playerAddress} joined game room ${matchId}`);
    
    // Send current game state
    const gameState = activeGames.get(matchId);
    if (gameState) {
      socket.emit("gameState", gameState);
    }
  });
  
  socket.on("playerStaked", async (data) => {
    const { matchId, playerAddress, txHash } = data;
    const gameState = activeGames.get(matchId);
    
    if (gameState) {
      if (playerAddress === gameState.player1) {
        gameState.player1Staked = true;
        gameState.player1StakeTx = txHash;
      } else if (playerAddress === gameState.player2) {
        gameState.player2Staked = true;
        gameState.player2StakeTx = txHash;
      }
      
      // Check if both players have staked
      if (gameState.player1Staked && gameState.player2Staked) {
        gameState.status = "playing";
        gameState.gameStartTime = Date.now();
        
        io.to(matchId).emit("gameStarted", {
          matchId,
          gameState
        });
        
        console.log(`🎮 Game ${matchId} started - both players staked`);
      }
      
      activeGames.set(matchId, gameState);
    }
  });
  
  socket.on("disconnect", () => {
    console.log(`🔌 Player disconnected: ${socket.id}`);
    
    const playerData = socketPlayers.get(socket.id);
    if (playerData) {
      playerSockets.delete(playerData.address);
      socketPlayers.delete(socket.id);
      
      // Remove from matchmaking queues
      for (const [stakeKey, queue] of matchmakingQueue.entries()) {
        const playerIndex = queue.findIndex(p => p.address === playerData.address);
        if (playerIndex !== -1) {
          queue.splice(playerIndex, 1);
          break;
        }
      }
    }
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    activeGames: activeGames.size,
    queuedPlayers: Array.from(matchmakingQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
    connectedPlayers: socketPlayers.size
  });
});

// Game statistics
app.get("/stats/games", (req, res) => {
  const stats = {
    activeGames: activeGames.size,
    totalQueued: Array.from(matchmakingQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
    connectedPlayers: socketPlayers.size,
    queuesByStake: Object.fromEntries(
      Array.from(matchmakingQueue.entries()).map(([stake, queue]) => [stake, queue.length])
    )
  };
  
  res.json(stats);
});

// Error handling
app.use((error, req, res, next) => {
  console.error("API Error:", error);
  res.status(500).json({ error: "Internal server error: " + error.message });
});

const PORT = process.env.GAME_SERVER_PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Game Server with Socket.IO listening on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Game stats: http://localhost:${PORT}/stats/games`);
});
