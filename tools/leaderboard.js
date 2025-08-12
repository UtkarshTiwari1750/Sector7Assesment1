require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");

// Initialize Express app for leaderboard API
const app = express();
app.use(cors());
app.use(express.json());

// Blockchain setup
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Load contract ABIs
const playGameAbi = require("../api/abis/PlayGame.json");
const tokenStoreAbi = require("../api/abis/TokenStore.json");

// Initialize contracts
const playGame = new ethers.Contract(process.env.PLAYGAME_ADDR, playGameAbi, provider);
const tokenStore = new ethers.Contract(process.env.TOKENSTORE_ADDR, tokenStoreAbi, provider);

// In-memory database (use SQLite or MongoDB in production)
let leaderboard = {};
let eventHistory = [];
let totalPurchases = {};

// Initialize leaderboard data structure
function initializePlayer(address) {
    if (!leaderboard[address]) {
        leaderboard[address] = {
            address: address,
            wins: 0,
            losses: 0,
            gtWon: 0n,
            gtLost: 0n,
            matchesPlayed: 0,
            totalStaked: 0n
        };
    }
    return leaderboard[address];
}

function initializePurchaser(address) {
    if (!totalPurchases[address]) {
        totalPurchases[address] = {
            address: address,
            totalUSDTSpent: 0n,
            totalGTReceived: 0n,
            purchaseCount: 0
        };
    }
    return totalPurchases[address];
}

// Event listeners
console.log("🚀 Starting Leaderboard Event Listener...");
console.log(`PlayGame Contract: ${process.env.PLAYGAME_ADDR}`);
console.log(`TokenStore Contract: ${process.env.TOKENSTORE_ADDR}`);

// Listen to Purchase events from TokenStore
tokenStore.on("Purchase", (buyer, usdtAmount, gtOut, event) => {
    console.log(`💰 Purchase Event: ${buyer} bought ${ethers.formatEther(gtOut)} GT for ${ethers.formatUnits(usdtAmount, 6)} USDT`);
    
    const purchaser = initializePurchaser(buyer);
    purchaser.totalUSDTSpent += BigInt(usdtAmount.toString());
    purchaser.totalGTReceived += BigInt(gtOut.toString());
    purchaser.purchaseCount += 1;

    const eventData = {
        type: "Purchase",
        timestamp: new Date().toISOString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        buyer: buyer,
        usdtAmount: usdtAmount.toString(),
        gtOut: gtOut.toString()
    };
    
    eventHistory.push(eventData);
    keepRecentEvents();
    
    console.log(`Updated purchase stats for ${buyer}:`, purchaser);
});

// Listen to MatchCreated events
playGame.on("MatchCreated", (matchId, p1, p2, stake, event) => {
    console.log(`⚔️ Match Created: ${ethers.decodeBytes32String(matchId)} between ${p1} and ${p2} with stake ${ethers.formatEther(stake)} GT`);
    
    const eventData = {
        type: "MatchCreated",
        timestamp: new Date().toISOString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        matchId: matchId,
        p1: p1,
        p2: p2,
        stake: stake.toString()
    };
    
    eventHistory.push(eventData);
    keepRecentEvents();
});

// Listen to Staked events
playGame.on("Staked", (matchId, player, event) => {
    console.log(`🎯 Player Staked: ${player} staked in match ${ethers.decodeBytes32String(matchId)}`);
    
    const playerData = initializePlayer(player);
    
    const eventData = {
        type: "Staked",
        timestamp: new Date().toISOString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        matchId: matchId,
        player: player
    };
    
    eventHistory.push(eventData);
    keepRecentEvents();
});

// Listen to Settled events (most important for leaderboard)
playGame.on("Settled", (matchId, winner, amount, event) => {
    console.log(`🏆 Match Settled: ${winner} won ${ethers.formatEther(amount)} GT in match ${ethers.decodeBytes32String(matchId)}`);
    
    const winnerData = initializePlayer(winner);
    winnerData.wins += 1;
    winnerData.gtWon += BigInt(amount.toString());
    winnerData.matchesPlayed += 1;
    winnerData.totalStaked += BigInt(amount.toString()) / 2n; // Half of the prize is their original stake

    const eventData = {
        type: "Settled",
        timestamp: new Date().toISOString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        matchId: matchId,
        winner: winner,
        amount: amount.toString()
    };
    
    eventHistory.push(eventData);
    keepRecentEvents();
    
    console.log(`Updated leaderboard for winner ${winner}:`, winnerData);
    
    // Try to determine the loser from recent events
    const recentStakedEvents = eventHistory
        .filter(e => e.type === "Staked" && e.matchId === matchId)
        .slice(-2); // Get last 2 staked events for this match
    
    const loser = recentStakedEvents.find(e => e.player !== winner)?.player;
    if (loser) {
        const loserData = initializePlayer(loser);
        loserData.losses += 1;
        loserData.gtLost += BigInt(amount.toString()) / 2n; // They lost their stake
        loserData.matchesPlayed += 1;
        loserData.totalStaked += BigInt(amount.toString()) / 2n;
        
        console.log(`Updated leaderboard for loser ${loser}:`, loserData);
    }
    
    // Log current top 3
    const top3 = getTopPlayers(3);
    console.log("🏅 Current Top 3:", top3.map(p => `${p.address.slice(0,6)}...${p.address.slice(-4)} (${p.wins} wins, ${ethers.formatEther(p.gtWon)} GT)`));
});

// Listen to Refunded events
playGame.on("Refunded", (matchId, event) => {
    console.log(`💸 Match Refunded: ${ethers.decodeBytes32String(matchId)}`);
    
    const eventData = {
        type: "Refunded",
        timestamp: new Date().toISOString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        matchId: matchId
    };
    
    eventHistory.push(eventData);
    keepRecentEvents();
});

// Utility functions
function keepRecentEvents(maxEvents = 1000) {
    if (eventHistory.length > maxEvents) {
        eventHistory = eventHistory.slice(-maxEvents);
    }
}

function getTopPlayers(limit = 10) {
    return Object.values(leaderboard)
        .sort((a, b) => {
            // Primary sort: by GT won (descending)
            if (b.gtWon !== a.gtWon) {
                return b.gtWon > a.gtWon ? 1 : -1;
            }
            // Secondary sort: by wins (descending)
            if (b.wins !== a.wins) {
                return b.wins - a.wins;
            }
            // Tertiary sort: by matches played (ascending - more efficient players)
            return a.matchesPlayed - b.matchesPlayed;
        })
        .slice(0, limit)
        .map(player => ({
            ...player,
            gtWon: player.gtWon.toString(),
            gtLost: player.gtLost.toString(),
            totalStaked: player.totalStaked.toString(),
            winRate: player.matchesPlayed > 0 ? (player.wins / player.matchesPlayed * 100).toFixed(1) : "0.0"
        }));
}

function getTopPurchasers(limit = 10) {
    return Object.values(totalPurchases)
        .sort((a, b) => {
            // Sort by total GT received (descending)
            return b.totalGTReceived > a.totalGTReceived ? 1 : -1;
        })
        .slice(0, limit)
        .map(purchaser => ({
            ...purchaser,
            totalUSDTSpent: purchaser.totalUSDTSpent.toString(),
            totalGTReceived: purchaser.totalGTReceived.toString()
        }));
}

// API Endpoints

// Get leaderboard
app.get("/leaderboard", (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const topPlayers = getTopPlayers(limit);
    
    res.json(topPlayers);
});

// Get purchase leaderboard
app.get("/purchases", (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const topPurchasers = getTopPurchasers(limit);
    
    res.json(topPurchasers);
});

// Get player stats
app.get("/player/:address", (req, res) => {
    const address = req.params.address;
    const player = leaderboard[address];
    const purchaser = totalPurchases[address];
    
    if (!player && !purchaser) {
        return res.status(404).json({ error: "Player not found" });
    }
    
    const response = {
        gaming: player ? {
            ...player,
            gtWon: player.gtWon.toString(),
            gtLost: player.gtLost.toString(),
            totalStaked: player.totalStaked.toString(),
            winRate: player.matchesPlayed > 0 ? (player.wins / player.matchesPlayed * 100).toFixed(1) : "0.0"
        } : null,
        purchases: purchaser ? {
            ...purchaser,
            totalUSDTSpent: purchaser.totalUSDTSpent.toString(),
            totalGTReceived: purchaser.totalGTReceived.toString()
        } : null
    };
    
    res.json(response);
});

// Get recent events
app.get("/events", (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type;
    
    let filteredEvents = eventHistory;
    
    if (type) {
        filteredEvents = eventHistory.filter(event => event.type === type);
    }
    
    const recentEvents = filteredEvents
        .slice(-limit)
        .reverse(); // Most recent first
    
    res.json(recentEvents);
});

// Get statistics
app.get("/stats", (req, res) => {
    const totalPlayers = Object.keys(leaderboard).length;
    const totalMatches = Object.values(leaderboard).reduce((sum, player) => sum + player.matchesPlayed, 0) / 2; // Divide by 2 since each match has 2 players
    const totalGTInCirculation = Object.values(totalPurchases).reduce((sum, purchaser) => sum + purchaser.totalGTReceived, 0n);
    const totalUSDTSpent = Object.values(totalPurchases).reduce((sum, purchaser) => sum + purchaser.totalUSDTSpent, 0n);
    const totalPurchasers = Object.keys(totalPurchases).length;
    
    res.json({
        gaming: {
            totalPlayers,
            totalMatches,
            totalGTWon: Object.values(leaderboard).reduce((sum, player) => sum + player.gtWon, 0n).toString(),
            totalGTLost: Object.values(leaderboard).reduce((sum, player) => sum + player.gtLost, 0n).toString()
        },
        purchases: {
            totalPurchasers,
            totalGTInCirculation: totalGTInCirculation.toString(),
            totalUSDTSpent: totalUSDTSpent.toString(),
            totalPurchases: Object.values(totalPurchases).reduce((sum, purchaser) => sum + purchaser.purchaseCount, 0)
        },
        events: {
            totalEvents: eventHistory.length,
            eventTypes: {
                Purchase: eventHistory.filter(e => e.type === "Purchase").length,
                MatchCreated: eventHistory.filter(e => e.type === "MatchCreated").length,
                Staked: eventHistory.filter(e => e.type === "Staked").length,
                Settled: eventHistory.filter(e => e.type === "Settled").length,
                Refunded: eventHistory.filter(e => e.type === "Refunded").length
            }
        }
    });
});

// Health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        playersTracked: Object.keys(leaderboard).length,
        eventsProcessed: eventHistory.length
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error("API Error:", error);
    res.status(500).json({ error: "Internal server error" });
});

// Start the leaderboard API server
const PORT = process.env.LEADERBOARD_PORT || 3001;
app.listen(PORT, () => {
    console.log(`📊 Leaderboard API listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Leaderboard: http://localhost:${PORT}/leaderboard`);
    console.log(`Events: http://localhost:${PORT}/events`);
    console.log(`Stats: http://localhost:${PORT}/stats`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down leaderboard service...');
    console.log(`Final stats: ${Object.keys(leaderboard).length} players, ${eventHistory.length} events processed`);
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

console.log("✅ Leaderboard service initialized and listening for events...");
