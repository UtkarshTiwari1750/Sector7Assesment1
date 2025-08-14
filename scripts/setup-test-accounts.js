const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Setting up test accounts with GT tokens...\n");
    
    // Get signers
    const [deployer, account1, account2] = await ethers.getSigners();
    
    // Get contracts
    const GameToken = await ethers.getContractFactory("GameToken");
    const gameToken = GameToken.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    
    // Check deployer balance and mint more if needed
    const deployerBalance = await gameToken.balanceOf(deployer.address);
    console.log(`Deployer balance: ${ethers.formatEther(deployerBalance)} GT`);
    
    if (deployerBalance < ethers.parseEther("10000")) {
        console.log("Minting more GT tokens to deployer...");
        const mintTx = await gameToken.connect(deployer).mint(deployer.address, ethers.parseEther("50000"));
        await mintTx.wait();
        const newBalance = await gameToken.balanceOf(deployer.address);
        console.log(`New deployer balance: ${ethers.formatEther(newBalance)} GT\n`);
    }
    
    const testAccounts = [
        { name: "Account 1 (Player 1)", address: account1.address, signer: account1 },
        { name: "Account 2 (Player 2)", address: account2.address, signer: account2 },
        { name: "Default MetaMask Account", address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
        { name: "Second MetaMask Account", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" }
    ];
    
    const tokenAmount = ethers.parseEther("1000"); // 1000 GT tokens per account
    
    console.log("📊 Current token distribution:");
    
    for (const account of testAccounts) {
        try {
            const balance = await gameToken.balanceOf(account.address);
            console.log(`  ${account.name}: ${ethers.formatEther(balance)} GT`);
            
            if (balance < ethers.parseEther("100")) { // If less than 100 GT
                console.log(`  ⚠️  ${account.name} needs more tokens, transferring 1000 GT...`);
                const tx = await gameToken.connect(deployer).transfer(account.address, tokenAmount);
                await tx.wait();
                console.log(`  ✅ Transferred 1000 GT to ${account.address}`);
                
                const newBalance = await gameToken.balanceOf(account.address);
                console.log(`  💰 New balance: ${ethers.formatEther(newBalance)} GT`);
            } else {
                console.log(`  ✅ ${account.name} has sufficient tokens`);
            }
        } catch (error) {
            console.log(`  ❌ Error checking/transferring to ${account.address}: ${error.message}`);
        }
        console.log();
    }
    
    console.log("🎯 Test Account Setup Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Account 1 (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266):");
    console.log("  - Use this as Player 1 in MetaMask");
    console.log("  - This account creates matches and stakes first");
    console.log();
    console.log("Account 2 (0x70997970C51812dc3A010C7d01b50e0d17dc79C8):");
    console.log("  - Use this as Player 2 in MetaMask"); 
    console.log("  - Switch to this account to stake as Player 2");
    console.log();
    console.log("📝 Testing Steps:");
    console.log("1. Open http://localhost:8080/test-game-flow.html");
    console.log("2. Connect MetaMask with Account 1");
    console.log("3. Create a match");
    console.log("4. Stake as Player 1");
    console.log("5. Switch MetaMask to Account 2");
    console.log("6. Stake as Player 2");
    console.log("7. Submit match result");
    console.log();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
