const { ethers } = require("hardhat");

async function main() {
    // Get the deployed PlayGame contract
    const PlayGame = await ethers.getContractFactory("PlayGame");
    const playGame = PlayGame.attach("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");

    console.log("🔍 Debug: PlayGame Contract Analysis");
    console.log("Contract Address:", playGame.target);
    
    // Check some common match IDs
    const commonMatchIds = [
        "0x0000000000000000000000000000000000000000000000000000000000000000", // null bytes32
        "0x0000000000000000000000000000000000000000000000000000000000000001", // 1
        ethers.encodeBytes32String("test"),  // "test" string
    ];

    console.log("\n📊 Checking common match IDs:");
    
    for (let matchId of commonMatchIds) {
        try {
            const match = await playGame.matches(matchId);
            console.log(`\nMatch ID: ${matchId}`);
            console.log(`  P1: ${match.p1}`);
            console.log(`  P2: ${match.p2}`);
            console.log(`  Stake: ${ethers.formatEther(match.stake)} GT`);
            console.log(`  Status: ${match.status} (${getStatusName(match.status)})`);
            console.log(`  Start Time: ${match.startTime}`);
            console.log(`  Winner: ${match.winner}`);
            
            if (match.status != 0) {
                console.log(`  ✅ Found active match!`);
            }
        } catch (error) {
            console.log(`Match ID ${matchId}: No data`);
        }
    }
    
    // Check if we can query recent events
    console.log("\n📝 Recent Match Events:");
    try {
        const filter = playGame.filters.MatchCreated();
        const currentBlock = await ethers.provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 100);
        const events = await playGame.queryFilter(filter, fromBlock, currentBlock);
        
        if (events.length > 0) {
            console.log(`Found ${events.length} recent match creation(s):`);
            events.forEach((event, i) => {
                console.log(`  ${i + 1}. Match ID: ${event.args.matchId}`);
                console.log(`     P1: ${event.args.p1}`);
                console.log(`     P2: ${event.args.p2}`);
                console.log(`     Stake: ${ethers.formatEther(event.args.stake)} GT`);
            });
        } else {
            console.log("No recent matches found.");
        }
    } catch (error) {
        console.log("Could not query recent events:", error.message);
    }

    // Check operator and owner
    console.log("\n👥 Contract Permissions:");
    try {
        const operator = await playGame.operator();
        const owner = await playGame.owner();
        console.log(`Operator: ${operator}`);
        console.log(`Owner: ${owner}`);
        
        // Check current signer
        const [signer] = await ethers.getSigners();
        console.log(`Current Signer: ${signer.address}`);
        console.log(`Is Operator: ${signer.address.toLowerCase() === operator.toLowerCase()}`);
        console.log(`Is Owner: ${signer.address.toLowerCase() === owner.toLowerCase()}`);
    } catch (error) {
        console.log("Could not check permissions:", error.message);
    }
}

function getStatusName(status) {
    const statuses = ["NONE", "CREATED", "STAKED", "SETTLED", "REFUNDED"];
    return statuses[status] || "UNKNOWN";
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
