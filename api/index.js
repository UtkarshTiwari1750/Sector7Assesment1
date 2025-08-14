require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const app = express();
app.use(express.json());
app.use(cors());

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

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Approve USDT for purchase (user must call this from frontend)
app.post("/approve-usdt", asyncHandler(async (req, res) => {
  const { userAddress, amount } = req.body;
  
  if (!userAddress || !ethers.isAddress(userAddress)) {
    return res.status(400).json({ error: "Invalid user address" });
  }
  
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  
  const usdtAmount = ethers.parseUnits(amount, 6); // USDT has 6 decimals
  
  // Return the transaction data for the frontend to sign
  res.json({
    contractAddress: process.env.MOCKUSDT_ADDR,
    spenderAddress: process.env.TOKENSTORE_ADDR,
    amount: usdtAmount.toString(),
    message: "Approve this transaction in MetaMask to allow USDT spending"
  });
}));

// Purchase GT tokens (assumes USDT is already approved)
app.get("/purchase", asyncHandler(async (req, res) => {
  const amount = req.query.amount;
  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }
  
  const usdtAmount = ethers.parseUnits(amount, 6); // USDT has 6 decimals
  const tx = await tokenStore.buy(usdtAmount);
  await tx.wait(); // Wait for confirmation
  
  res.json({ 
    txHash: tx.hash,
    usdtAmount: amount,
    message: "Purchase successful"
  });
}));

// Check USDT allowance for TokenStore
app.get("/allowance/:address", asyncHandler(async (req, res) => {
  const address = req.params.address;
  
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  
  try {
    const allowance = await mockUSDT.allowance(address, process.env.TOKENSTORE_ADDR);
    
    res.json({ 
      address: address,
      spender: process.env.TOKENSTORE_ADDR,
      allowance: ethers.formatUnits(allowance, 6),
      allowanceWei: allowance.toString()
    });
  } catch (error) {
    console.error("USDT Allowance check error:", error);
    res.status(500).json({ 
      error: "Failed to get USDT allowance", 
      message: error.message,
      contractAddress: process.env.MOCKUSDT_ADDR
    });
  }
}));

// Check GT token allowance for PlayGame contract
app.get("/gt-allowance/:address", asyncHandler(async (req, res) => {
  const address = req.params.address;
  
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  
  try {
    const allowance = await gameToken.allowance(address, process.env.PLAYGAME_ADDR);
    
    res.json({ 
      address: address,
      spender: process.env.PLAYGAME_ADDR,
      allowance: ethers.formatEther(allowance),
      allowanceWei: allowance.toString()
    });
  } catch (error) {
    console.error("GT Allowance check error:", error);
    res.status(500).json({ 
      error: "Failed to get GT allowance", 
      message: error.message,
      contractAddress: process.env.GAMETOKEN_ADDR
    });
  }
}));

// Create match
app.post("/match/start", asyncHandler(async (req, res) => {
  const { matchId, p1, p2, stake } = req.body;
  
  if (!matchId || !p1 || !p2 || !stake) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  if (!ethers.isAddress(p1) || !ethers.isAddress(p2)) {
    return res.status(400).json({ error: "Invalid player addresses" });
  }
  
  const tx = await playGame.createMatch(matchId, p1, p2, stake);
  await tx.wait();
  
  res.json({ 
    txHash: tx.hash,
    matchId: ethers.decodeBytes32String(matchId),
    message: "Match created successfully"
  });
}));

// Stake in match
app.post("/match/stake", asyncHandler(async (req, res) => {
  const { matchId, player, privateKey } = req.body;
  
  if (!matchId || !player) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  if (!ethers.isAddress(player)) {
    return res.status(400).json({ error: "Invalid player address" });
  }
  
  // Note: In production, you should handle player authentication properly
  // This is a simplified approach for development
  let playerWallet;
  if (privateKey) {
    playerWallet = new ethers.Wallet(privateKey, provider);
  } else {
    // Fallback to default wallet (current behavior)
    playerWallet = wallet;
  }
  
  const playGameWithPlayer = playGame.connect(playerWallet);
  const tx = await playGameWithPlayer.stake(matchId);
  await tx.wait();
  
  res.json({ 
    txHash: tx.hash,
    matchId: ethers.decodeBytes32String(matchId),
    player: player,
    message: "Staked successfully"
  });
}));

// Submit match result
app.post("/match/result", asyncHandler(async (req, res) => {
  const { matchId, winner } = req.body;
  
  if (!matchId || !winner) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  if (!ethers.isAddress(winner)) {
    return res.status(400).json({ error: "Invalid winner address" });
  }
  
  const tx = await playGame.commitResult(matchId, winner);
  await tx.wait();
  
  res.json({ 
    txHash: tx.hash,
    matchId: ethers.decodeBytes32String(matchId),
    winner: winner,
    message: "Result submitted successfully"
  });
}));

// Get GT balance for an address
app.get("/balance/:address", asyncHandler(async (req, res) => {
  const address = req.params.address;
  
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  
  try {
    // Check if contract exists first
    const code = await provider.getCode(process.env.GAMETOKEN_ADDR);
    if (code === '0x') {
      return res.status(500).json({ 
        error: "GameToken contract not deployed", 
        contractAddress: process.env.GAMETOKEN_ADDR 
      });
    }
    
    const balance = await gameToken.balanceOf(address);
    
    res.json({ 
      address: address,
      balance: ethers.formatEther(balance),
      balanceWei: balance.toString()
    });
  } catch (error) {
    console.error("Balance check error:", error);
    res.status(500).json({ 
      error: "Failed to get balance", 
      message: error.message,
      contractAddress: process.env.GAMETOKEN_ADDR
    });
  }
}));

// Get match details
app.get("/match/:matchId", asyncHandler(async (req, res) => {
  const matchId = req.params.matchId;
  
  try {
    const matchIdBytes = ethers.formatBytes32String(matchId);
    const matchData = await playGame.matches(matchIdBytes);
    
    res.json({
      matchId: matchId,
      p1: matchData.p1,
      p2: matchData.p2,
      stake: ethers.formatEther(matchData.stake),
      startTime: matchData.startTime.toString(),
      status: matchData.status,
      winner: matchData.winner
    });
  } catch (error) {
    res.status(404).json({ error: "Match not found" });
  }
}));

// Refund match (if timeout exceeded)
app.post("/match/refund", asyncHandler(async (req, res) => {
  const { matchId } = req.body;
  
  if (!matchId) {
    return res.status(400).json({ error: "Missing match ID" });
  }
  
  const tx = await playGame.refund(matchId);
  await tx.wait();
  
  res.json({ 
    txHash: tx.hash,
    matchId: ethers.decodeBytes32String(matchId),
    message: "Match refunded successfully"
  });
}));

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    contracts: {
      tokenStore: process.env.TOKENSTORE_ADDR,
      playGame: process.env.PLAYGAME_ADDR,
      gameToken: process.env.GAMETOKEN_ADDR
    }
  });
});

// Get USDT and GT balances for an address (combined endpoint)
app.get("/usdt-balance/:address", asyncHandler(async (req, res) => {
  const address = req.params.address;
  
  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  
  try {
    // Check if contracts exist first
    const [usdtCode, gtCode] = await Promise.all([
      provider.getCode(process.env.MOCKUSDT_ADDR),
      provider.getCode(process.env.GAMETOKEN_ADDR)
    ]);
    
    if (usdtCode === '0x') {
      return res.status(500).json({ 
        error: "MockUSDT contract not deployed", 
        contractAddress: process.env.MOCKUSDT_ADDR 
      });
    }
    
    if (gtCode === '0x') {
      return res.status(500).json({ 
        error: "GameToken contract not deployed", 
        contractAddress: process.env.GAMETOKEN_ADDR 
      });
    }
    
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

// Faucet - Get test USDT (only for development)
app.post("/faucet/usdt", asyncHandler(async (req, res) => {
  const { address, amount } = req.body;
  
  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }
  
  const faucetAmount = amount ? ethers.parseUnits(amount, 6) : ethers.parseUnits("1000", 6); // Default 1000 USDT
  
  // Use wallet to call the faucet function (assuming MockUSDT has a faucet)
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

// Get contract addresses (for frontend)
app.get("/contracts", (req, res) => {
  res.json({
    tokenStore: process.env.TOKENSTORE_ADDR,
    playGame: process.env.PLAYGAME_ADDR,
    gameToken: process.env.GAMETOKEN_ADDR,
    mockUSDT: process.env.MOCKUSDT_ADDR,
    rpcUrl: process.env.RPC_URL
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("API Error:", error);
  
  if (error.code === 'BAD_DATA') {
    return res.status(500).json({ 
      error: "Contract call returned invalid data", 
      message: "The smart contract call returned empty or invalid data. Contract may not be deployed or the method doesn't exist.",
      details: error.message
    });
  }
  
  if (error.code === 'CALL_EXCEPTION') {
    return res.status(400).json({ error: "Smart contract call failed: " + error.reason });
  }
  
  if (error.code === 'INSUFFICIENT_FUNDS') {
    return res.status(400).json({ error: "Insufficient funds for transaction" });
  }
  
  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    return res.status(400).json({ error: "Transaction would fail - check contract state" });
  }
  
  res.status(500).json({ error: "Internal server error: " + error.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

const PORT = process.env.PORT || 5173;
app.listen(PORT, () => {
  console.log(`🚀 Backend API listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Contracts: http://localhost:${PORT}/contracts`);
});
