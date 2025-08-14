const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Simple GT Token Setup for Testing...\n");
    
    // Get signers
    const [deployer] = await ethers.getSigners();
    
    // Get GameToken contract
    const GameToken = await ethers.getContractFactory("GameToken");
    const gameToken = GameToken.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    
    // Check deployer's current balance
    const deployerBalance = await gameToken.balanceOf(deployer.address);
    console.log(`Deployer current GT balance: ${ethers.formatEther(deployerBalance)}`);
    
    // Test accounts that need GT tokens
    const testAccounts = [
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Second hardhat account
    ];
    
    const transferAmount = ethers.parseEther("50"); // 50 GT tokens
    
    for (const address of testAccounts) {
        try {
            const balance = await gameToken.balanceOf(address);
            console.log(`\n${address} current balance: ${ethers.formatEther(balance)} GT`);
            
            if (balance < ethers.parseEther("20")) { // If less than 20 GT
                if (deployerBalance >= transferAmount) {
                    console.log(`Transferring 50 GT tokens to ${address}...`);
                    const tx = await gameToken.connect(deployer).transfer(address, transferAmount);
                    await tx.wait();
                    
                    const newBalance = await gameToken.balanceOf(address);
                    console.log(`✅ Transfer successful! New balance: ${ethers.formatEther(newBalance)} GT`);
                } else {
                    console.log(`❌ Deployer doesn't have enough GT tokens to transfer`);
                }
            } else {
                console.log(`✅ Account already has sufficient GT tokens`);
            }
        } catch (error) {
            console.log(`❌ Error with ${address}: ${error.message}`);
        }
    }
    
    console.log("\n🎯 Manual Setup Instructions:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("If accounts still need GT tokens, follow these steps:");
    console.log("1. Use the USDT faucet for each account:");
    console.log("   curl -X POST http://localhost:3000/faucet/usdt \\");
    console.log("   -H 'Content-Type: application/json' \\");
    console.log("   -d '{\"address\": \"ACCOUNT_ADDRESS\", \"amount\": \"1000\"}'");
    console.log();
    console.log("2. Then purchase GT tokens using the web interface at:");
    console.log("   http://localhost:8080");
    console.log();
    console.log("🌐 Testing URL: http://localhost:8080/test-game-flow.html");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
