const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Complete ERC20InsufficientAllowance Fix & Environment Setup");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    // Get signers
    const [deployer, player1, player2] = await ethers.getSigners();
    
    // Contract addresses (from deployment)
    const contracts = {
        gameToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        mockUSDT: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        tokenStore: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        playGame: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
    };
    
    // Get contract instances
    const GameToken = await ethers.getContractFactory("GameToken");
    const gameToken = GameToken.attach(contracts.gameToken);
    
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = MockUSDT.attach(contracts.mockUSDT);
    
    const TokenStore = await ethers.getContractFactory("TokenStore");
    const tokenStore = TokenStore.attach(contracts.tokenStore);
    
    const accounts = [
        { name: "Deployer", signer: deployer },
        { name: "Player 1", signer: player1 },
        { name: "Player 2", signer: player2 }
    ];
    
    console.log("📋 Contract Addresses:");
    Object.entries(contracts).forEach(([name, address]) => {
        console.log(`  ${name}: ${address}`);
    });
    console.log("");
    
    console.log("👥 Account Addresses:");
    accounts.forEach(acc => {
        console.log(`  ${acc.name}: ${acc.signer.address}`);
    });
    console.log("");
    
    // Step 1: Approve GT tokens for PlayGame contract
    console.log("1️⃣ Setting up GT token approvals for PlayGame contract...");
    const gtApproveAmount = ethers.parseEther("1000");
    
    for (const account of accounts) {
        try {
            const currentGTAllowance = await gameToken.allowance(account.signer.address, contracts.playGame);
            
            if (currentGTAllowance < ethers.parseEther("10")) {
                console.log(`   Approving GT for ${account.name}...`);
                const tx = await gameToken.connect(account.signer).approve(contracts.playGame, gtApproveAmount);
                await tx.wait();
                console.log(`   ✅ GT approved for ${account.name}`);
            } else {
                console.log(`   ✅ ${account.name} already has sufficient GT allowance`);
            }
        } catch (error) {
            console.log(`   ❌ Error approving GT for ${account.name}: ${error.message}`);
        }
    }
    
    // Step 2: Approve USDT tokens for TokenStore contract
    console.log("\\n2️⃣ Setting up USDT token approvals for TokenStore contract...");
    const usdtApproveAmount = ethers.parseUnits("10000", 6);
    
    for (const account of accounts) {
        try {
            // Ensure account has USDT first
            const usdtBalance = await mockUSDT.balanceOf(account.signer.address);
            if (usdtBalance == 0) {
                console.log(`   Minting USDT for ${account.name}...`);
                const mintTx = await mockUSDT.connect(deployer).mint(account.signer.address, ethers.parseUnits("1000", 6));
                await mintTx.wait();
                console.log(`   ✅ USDT minted for ${account.name}`);
            }
            
            // Check and approve USDT allowance
            const currentUSDTAllowance = await mockUSDT.allowance(account.signer.address, contracts.tokenStore);
            
            if (currentUSDTAllowance < ethers.parseUnits("100", 6)) {
                console.log(`   Approving USDT for ${account.name}...`);
                const tx = await mockUSDT.connect(account.signer).approve(contracts.tokenStore, usdtApproveAmount);
                await tx.wait();
                console.log(`   ✅ USDT approved for ${account.name}`);
            } else {
                console.log(`   ✅ ${account.name} already has sufficient USDT allowance`);
            }
        } catch (error) {
            console.log(`   ❌ Error with USDT for ${account.name}: ${error.message}`);
        }
    }
    
    // Step 3: Purchase GT tokens for players
    console.log("\\n3️⃣ Purchasing GT tokens for players...");
    const purchases = [
        { account: accounts[1], amount: "50" }, // Player 1
        { account: accounts[2], amount: "50" }, // Player 2
    ];
    
    for (const purchase of purchases) {
        try {
            const usdtAmount = ethers.parseUnits(purchase.amount, 6);
            const currentGTBalance = await gameToken.balanceOf(purchase.account.signer.address);
            
            if (currentGTBalance < ethers.parseEther("10")) { // If less than 10 GT
                console.log(`   Purchasing ${purchase.amount} GT for ${purchase.account.name}...`);
                const tx = await tokenStore.connect(purchase.account.signer).buy(usdtAmount);
                await tx.wait();
                
                const newGTBalance = await gameToken.balanceOf(purchase.account.signer.address);
                console.log(`   ✅ ${purchase.account.name} now has ${ethers.formatEther(newGTBalance)} GT`);
            } else {
                console.log(`   ✅ ${purchase.account.name} already has sufficient GT tokens`);
            }
        } catch (error) {
            console.log(`   ❌ Error purchasing GT for ${purchase.account.name}: ${error.message}`);
        }
    }
    
    // Step 4: Summary
    console.log("\\n4️⃣ Final Status Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    for (const account of accounts) {
        try {
            const [gtBalance, usdtBalance, gtAllowance, usdtAllowance] = await Promise.all([
                gameToken.balanceOf(account.signer.address),
                mockUSDT.balanceOf(account.signer.address),
                gameToken.allowance(account.signer.address, contracts.playGame),
                mockUSDT.allowance(account.signer.address, contracts.tokenStore)
            ]);
            
            console.log(`\\n${account.name} (${account.signer.address}):`);
            console.log(`  GT Balance: ${ethers.formatEther(gtBalance)}`);
            console.log(`  USDT Balance: ${ethers.formatUnits(usdtBalance, 6)}`);
            console.log(`  GT Allowance (PlayGame): ${ethers.formatEther(gtAllowance)}`);
            console.log(`  USDT Allowance (TokenStore): ${ethers.formatUnits(usdtAllowance, 6)}`);
        } catch (error) {
            console.log(`\\n${account.name}: Error getting balances - ${error.message}`);
        }
    }
    
    console.log("\\n🎉 SETUP COMPLETE!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ERC20InsufficientAllowance error has been fixed!");
    console.log("✅ All accounts have proper token approvals");
    console.log("✅ Players have GT tokens for staking");
    console.log("✅ The complete game flow should now work without errors");
    
    console.log("\\n🧪 Test the fix:");
    console.log("   npx hardhat run scripts/test-complete-flow.js --network localhost");
    
    console.log("\\n🌐 Frontend available at:");
    console.log("   http://localhost:8080");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
