const { ethers } = require("hardhat");

async function main() {
    const PlayGame = await ethers.getContractFactory("PlayGame");
    const playGame = PlayGame.attach("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");

    const matchId = "0x3100000000000000000000000000000000000000000000000000000000000000";
    
    console.log(`🔍 Debug: Staking Events for Match ${matchId}`);
    
    try {
        // Check Staked events
        const filter = playGame.filters.Staked(matchId);
        const currentBlock = await ethers.provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 1000);
        const events = await playGame.queryFilter(filter, fromBlock, currentBlock);
        
        console.log(`\n📝 Found ${events.length} Staked events:`);
        events.forEach((event, i) => {
            console.log(`  ${i + 1}. Player: ${event.args.player}`);
            console.log(`     Block: ${event.blockNumber}`);
            console.log(`     Tx: ${event.transactionHash}`);
        });
        
        // Get current match state
        const match = await playGame.matches(matchId);
        console.log(`\n📊 Current Match State:`);
        console.log(`  Status: ${match.status} (${getStatusName(match.status)})`);
        console.log(`  Start Time: ${match.startTime}`);
        
        // Try to manually check staking status by calling a transaction simulation
        console.log(`\n🧪 Testing staking completion logic:`);
        console.log(`  P1: ${match.p1}`);
        console.log(`  P2: ${match.p2}`);
        
        // The issue might be that both players haven't actually successfully staked
        // Let's check by trying to stake again
        console.log(`\n🔄 Attempting to understand current state...`);
        
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
}

function getStatusName(status) {
    const statuses = ["NONE", "CREATED", "STAKED", "SETTLED", "REFUNDED"];
    return statuses[status] || "UNKNOWN";
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
