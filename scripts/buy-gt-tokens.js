const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Buying GT Tokens for Players via TokenStore...\n");
    
    // Get signers
    const [deployer, player1, player2] = await ethers.getSigners();
    
    // Get contracts
    const TokenStore = await ethers.getContractFactory("TokenStore");
    const tokenStore = TokenStore.attach("0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
    
    const GameToken = await ethers.getContractFactory("GameToken");
    const gameToken = GameToken.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = MockUSDT.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");
    
    // Players to buy GT tokens for
    const players = [
        { name: "Player 1", signer: player1, usdtAmount: "50" }, // 50 USDT = 50 GT
        { name: "Player 2", signer: player2, usdtAmount: "50" },
        { name: "Deployer", signer: deployer, usdtAmount: "100" }
    ];
    
    console.log("Purchasing GT tokens for players...\n");
    
    for (const player of players) {
        try {
            console.log(`🛒 Purchasing GT tokens for ${player.name} (${player.signer.address})...`);
            
            const usdtAmount = ethers.parseUnits(player.usdtAmount, 6);
            
            // Check current USDT balance
            const usdtBalance = await mockUSDT.balanceOf(player.signer.address);
            console.log(`  Current USDT balance: ${ethers.formatUnits(usdtBalance, 6)}`);
            
            // Check current GT balance
            const currentGTBalance = await gameToken.balanceOf(player.signer.address);
            console.log(`  Current GT balance: ${ethers.formatEther(currentGTBalance)}`);
            
            if (usdtBalance < usdtAmount) {
                console.log(`  ⚠️  Insufficient USDT balance. Need ${player.usdtAmount}, have ${ethers.formatUnits(usdtBalance, 6)}`);
                continue;
            }
            
            // Check USDT allowance for TokenStore
            const allowance = await mockUSDT.allowance(player.signer.address, tokenStore.target);
            console.log(`  Current TokenStore allowance: ${ethers.formatUnits(allowance, 6)} USDT`);
            
            if (allowance < usdtAmount) {
                console.log(`  ⚠️  Insufficient allowance. This should have been fixed by our earlier script.`);
                continue;
            }
            
            // Buy GT tokens
            const tx = await tokenStore.connect(player.signer).buy(usdtAmount);
            await tx.wait();
            
            // Check new balances
            const newUSDTBalance = await mockUSDT.balanceOf(player.signer.address);
            const newGTBalance = await gameToken.balanceOf(player.signer.address);
            
            console.log(`  ✅ Purchase successful!`);
            console.log(`  New USDT balance: ${ethers.formatUnits(newUSDTBalance, 6)}`);
            console.log(`  New GT balance: ${ethers.formatEther(newGTBalance)}`);
            console.log(`  Transaction hash: ${tx.hash}\n`);
            
        } catch (error) {
            console.log(`  ❌ Error purchasing for ${player.name}: ${error.message}\n`);
        }
    }
    
    console.log("🎯 GT Token Purchase Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Players should now have GT tokens for staking!");
    console.log("\nYou can now test the complete game flow!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
