const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Approving USDT for TokenStore Contract...\n");
    
    // Get signers
    const [deployer, player1, player2] = await ethers.getSigners();
    
    // Get contracts
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = MockUSDT.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");
    
    const tokenStoreAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    
    // Accounts to approve USDT for
    const accounts = [
        { name: "Deployer", signer: deployer },
        { name: "Player 1", signer: player1 },
        { name: "Player 2", signer: player2 }
    ];
    
    console.log("Available accounts:");
    accounts.forEach((acc, i) => {
        console.log(`  ${i}: ${acc.name} (${acc.signer.address})`);
    });
    
    // Approve USDT for TokenStore for all accounts
    const approveAmount = ethers.parseUnits("10000", 6); // Approve 10,000 USDT
    
    for (const account of accounts) {
        try {
            console.log(`\n📝 Approving USDT for ${account.name} (${account.signer.address})...`);
            
            // Check current USDT balance
            const balance = await mockUSDT.balanceOf(account.signer.address);
            console.log(`  Current USDT balance: ${ethers.formatUnits(balance, 6)}`);
            
            // If account has no USDT, mint some first
            if (balance == 0) {
                console.log("  🏦 Minting USDT tokens first...");
                const mintTx = await mockUSDT.connect(deployer).mint(account.signer.address, ethers.parseUnits("1000", 6));
                await mintTx.wait();
                console.log(`  ✅ Minted 1000 USDT tokens`);
            }
            
            // Check current allowance for TokenStore
            const currentAllowance = await mockUSDT.allowance(account.signer.address, tokenStoreAddress);
            console.log(`  Current TokenStore allowance: ${ethers.formatUnits(currentAllowance, 6)}`);
            
            if (currentAllowance < ethers.parseUnits("100", 6)) { // If less than 100 USDT approved
                const tx = await mockUSDT.connect(account.signer).approve(tokenStoreAddress, approveAmount);
                await tx.wait();
                
                const newAllowance = await mockUSDT.allowance(account.signer.address, tokenStoreAddress);
                console.log(`  ✅ Approval successful! New allowance: ${ethers.formatUnits(newAllowance, 6)} USDT`);
                console.log(`  Transaction hash: ${tx.hash}`);
            } else {
                console.log(`  ✅ Already has sufficient allowance`);
            }
            
        } catch (error) {
            console.log(`  ❌ Error approving for ${account.name}: ${error.message}`);
        }
    }
    
    console.log("\n🎯 USDT Approval Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("All accounts should now have sufficient USDT allowances");
    console.log("for the TokenStore contract to spend on their behalf.");
    console.log("\nThe /purchase API endpoint should now work without allowance errors!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
