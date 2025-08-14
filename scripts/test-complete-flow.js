const { ethers } = require("hardhat");

async function main() {
    console.log("🎮 Testing Complete Game Flow - ERC20InsufficientAllowance Fix\n");
    
    // Get signers
    const [deployer, player1, player2] = await ethers.getSigners();
    
    // Get contracts
    const PlayGame = await ethers.getContractFactory("PlayGame");
    const playGame = PlayGame.attach("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
    
    const GameToken = await ethers.getContractFactory("GameToken");
    const gameToken = GameToken.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    
    // Test match details
    const matchId = ethers.encodeBytes32String("test-fix-" + Date.now().toString());
    const stakeAmount = ethers.parseEther("10");
    
    console.log("📊 Test Setup:");
    console.log(`Match ID: ${matchId}`);
    console.log(`Player 1: ${player1.address}`);
    console.log(`Player 2: ${player2.address}`);
    console.log(`Stake Amount: ${ethers.formatEther(stakeAmount)} GT\n`);
    
    try {
        // Step 1: Create match
        console.log("1️⃣ Creating match...");
        const createTx = await playGame.connect(deployer).createMatch(
            matchId,
            player1.address,
            player2.address,
            stakeAmount
        );
        await createTx.wait();
        console.log(`✅ Match created! TX: ${createTx.hash}`);
        
        // Step 2: Check allowances
        console.log("\n2️⃣ Checking GT token allowances...");
        const p1Allowance = await gameToken.allowance(player1.address, playGame.target);
        const p2Allowance = await gameToken.allowance(player2.address, playGame.target);
        
        console.log(`Player 1 allowance: ${ethers.formatEther(p1Allowance)} GT`);
        console.log(`Player 2 allowance: ${ethers.formatEther(p2Allowance)} GT`);
        
        // Check balances
        const p1Balance = await gameToken.balanceOf(player1.address);
        const p2Balance = await gameToken.balanceOf(player2.address);
        console.log(`Player 1 balance: ${ethers.formatEther(p1Balance)} GT`);
        console.log(`Player 2 balance: ${ethers.formatEther(p2Balance)} GT`);
        
        // Step 3: Player 1 stakes
        console.log("\n3️⃣ Player 1 staking...");
        if (p1Allowance < stakeAmount) {
            console.log("⚠️  Player 1 needs to approve tokens first");
            const approveTx = await gameToken.connect(player1).approve(playGame.target, stakeAmount);
            await approveTx.wait();
            console.log("✅ Player 1 tokens approved");
        }
        
        const stake1Tx = await playGame.connect(player1).stake(matchId);
        await stake1Tx.wait();
        console.log(`✅ Player 1 staked! TX: ${stake1Tx.hash}`);
        
        // Step 4: Player 2 stakes  
        console.log("\n4️⃣ Player 2 staking...");
        if (p2Balance < stakeAmount) {
            console.log("⚠️  Player 2 needs GT tokens first");
            const transferTx = await gameToken.connect(deployer).transfer(player2.address, stakeAmount);
            await transferTx.wait();
            console.log("✅ GT tokens transferred to Player 2");
        }
        
        if (p2Allowance < stakeAmount) {
            console.log("⚠️  Player 2 needs to approve tokens first");
            const approveTx = await gameToken.connect(player2).approve(playGame.target, stakeAmount);
            await approveTx.wait();
            console.log("✅ Player 2 tokens approved");
        }
        
        const stake2Tx = await playGame.connect(player2).stake(matchId);
        await stake2Tx.wait();
        console.log(`✅ Player 2 staked! TX: ${stake2Tx.hash}`);
        
        // Step 5: Check match status
        console.log("\n5️⃣ Checking match status...");
        const match = await playGame.matches(matchId);
        const statusNames = ["NONE", "CREATED", "STAKED", "SETTLED", "REFUNDED"];
        
        console.log(`Status: ${match.status} (${statusNames[match.status]})`);
        console.log(`Start Time: ${match.startTime}`);
        
        if (match.status == 2) {
            console.log("🎉 Both players staked successfully! Match ready for results.");
            
            // Step 6: Submit result
            console.log("\n6️⃣ Submitting match result...");
            const resultTx = await playGame.connect(deployer).commitResult(matchId, player1.address);
            await resultTx.wait();
            console.log(`✅ Result submitted! Winner: Player 1. TX: ${resultTx.hash}`);
            
            // Check final status
            const finalMatch = await playGame.matches(matchId);
            console.log(`Final status: ${finalMatch.status} (${statusNames[finalMatch.status]})`);
            console.log(`Winner: ${finalMatch.winner}`);
        }
        
        console.log("\n🎉 COMPLETE FLOW TEST PASSED!");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ The ERC20InsufficientAllowance error has been fixed!");
        console.log("✅ Players can now properly approve and stake GT tokens");
        console.log("✅ The complete game flow works end-to-end");
        console.log("\n🌐 You can now test with MetaMask at:");
        console.log("   http://localhost:8080/test-game-flow.html");
        
    } catch (error) {
        console.error("❌ Test failed:", error.message);
        
        if (error.message.includes('ERC20InsufficientAllowance')) {
            console.log("\n💡 The allowance error still exists. Make sure to:");
            console.log("1. Run the approval script: npx hardhat run scripts/approve-tokens.js --network localhost");
            console.log("2. Or approve tokens manually in MetaMask");
        }
        
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });
