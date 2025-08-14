const { ethers } = require("hardhat");

async function main() {
    const PlayGame = await ethers.getContractFactory("PlayGame");
    const playGame = PlayGame.attach("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");

    const matchId = "0x3100000000000000000000000000000000000000000000000000000000000000";
    
    console.log(`🔍 Checking Match: ${matchId}`);
    
    try {
        const match = await playGame.matches(matchId);
        console.log(`P1: ${match.p1}`);
        console.log(`P2: ${match.p2}`);
        console.log(`Stake: ${ethers.formatEther(match.stake)} GT`);
        console.log(`Status: ${match.status} (${getStatusName(match.status)})`);
        console.log(`Start Time: ${match.startTime}`);
        console.log(`Winner: ${match.winner}`);
        
        // Check staking status
        console.log("\n📊 Staking Status:");
        const p1Staked = await checkStaked(playGame, matchId, match.p1);
        const p2Staked = await checkStaked(playGame, matchId, match.p2);
        
        console.log(`P1 Staked: ${p1Staked ? "✅ Yes" : "❌ No"}`);
        console.log(`P2 Staked: ${p2Staked ? "✅ Yes" : "❌ No"}`);
        
        // Provide action recommendations
        console.log("\n💡 Next Steps:");
        if (match.status == 1) { // CREATED
            if (!p1Staked || !p2Staked) {
                console.log("⚠️  Both players need to stake before you can submit results");
                console.log(`   - Use match/stake endpoint for each player`);
            }
        } else if (match.status == 2) { // STAKED
            console.log("✅ Ready for result submission!");
            console.log(`   - Use: POST /match/result with matchId and winner`);
        } else if (match.status == 3) { // SETTLED
            console.log("✅ Match already completed");
        }
        
    } catch (error) {
        console.log("❌ Error checking match:", error.message);
    }
}

async function checkStaked(contract, matchId, player) {
    try {
        // This would require a view function or event checking
        // For now, we'll deduce from the status
        return true; // Placeholder
    } catch {
        return false;
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
