const { ethers } = require("hardhat");

async function main() {
    // Get accounts
    const [owner, player2] = await ethers.getSigners();
    console.log("Player 2 address:", player2.address);
    
    // Get contracts
    const PlayGame = await ethers.getContractFactory("PlayGame");
    const playGame = PlayGame.attach("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
    
    const GameToken = await ethers.getContractFactory("GameToken"); 
    const gameToken = GameToken.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    
    const matchId = "0x3100000000000000000000000000000000000000000000000000000000000000";
    const stakeAmount = ethers.parseEther("10"); // 10 GT tokens
    
    console.log("🎯 Making Player 2 stake...");
    
    try {
        // Check Player 2's GT balance
        const balance = await gameToken.balanceOf(player2.address);
        console.log(`Player 2 GT Balance: ${ethers.formatEther(balance)} GT`);
        
        if (balance < stakeAmount) {
            console.log("❌ Player 2 doesn't have enough GT tokens!");
            console.log("Transferring GT tokens from owner to Player 2...");
            
            // Transfer from owner to player2
            const transferTx = await gameToken.connect(owner).transfer(player2.address, stakeAmount);
            await transferTx.wait();
            console.log("✅ GT tokens transferred to Player 2");
        }
        
        // Approve PlayGame contract to spend Player 2's GT tokens
        console.log("Approving PlayGame contract...");
        const approveTx = await gameToken.connect(player2).approve(playGame.target, stakeAmount);
        await approveTx.wait();
        console.log("✅ Approval successful");
        
        // Player 2 stakes
        console.log("Player 2 staking...");
        const stakeTx = await playGame.connect(player2).stake(matchId);
        await stakeTx.wait();
        console.log("✅ Player 2 staked successfully!");
        console.log("Transaction hash:", stakeTx.hash);
        
        // Check match status
        const match = await playGame.matches(matchId);
        console.log(`\n📊 Updated Match Status: ${match.status} (${getStatusName(match.status)})`);
        console.log(`Start Time: ${match.startTime}`);
        
        if (match.status == 2) {
            console.log("🎉 Match is now ready for result submission!");
        }
        
    } catch (error) {
        console.error("❌ Error:", error.message);
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
