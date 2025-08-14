const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Setting up test accounts with USDT tokens...\n");
    
    // Get signers
    const [deployer] = await ethers.getSigners();
    
    // Get USDT contract
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const mockUSDT = MockUSDT.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");
    
    const testAccounts = [
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Default MetaMask
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Second MetaMask  
        "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  // Third account
        "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
    ];
    
    const usdtAmount = ethers.parseUnits("1000", 6); // 1000 USDT (6 decimals)
    
    console.log("📊 Distributing USDT tokens:");
    
    for (const account of testAccounts) {
        try {
            const balance = await mockUSDT.balanceOf(account);
            console.log(`  ${account}: ${ethers.formatUnits(balance, 6)} USDT`);
            
            if (balance < ethers.parseUnits("100", 6)) { // If less than 100 USDT
                console.log(`  ⚠️  Account needs more USDT, transferring 1000 USDT...`);
                const tx = await mockUSDT.connect(deployer).transfer(account, usdtAmount);
                await tx.wait();
                console.log(`  ✅ Transferred 1000 USDT to ${account}`);
                
                const newBalance = await mockUSDT.balanceOf(account);
                console.log(`  💰 New balance: ${ethers.formatUnits(newBalance, 6)} USDT`);
            } else {
                console.log(`  ✅ Account has sufficient USDT`);
            }
        } catch (error) {
            console.log(`  ❌ Error with ${account}: ${error.message}`);
        }
        console.log();
    }
    
    console.log("✅ USDT setup complete! Users can now purchase GameTokens.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
