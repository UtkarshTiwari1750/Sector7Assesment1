const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Manual GT Token Approval Script...\n");
    
    // Get signers - you can change the index to use different accounts
    const [deployer, player1, player2] = await ethers.getSigners();
    
    // Get contracts
    const GameToken = await ethers.getContractFactory("GameToken");
    const gameToken = GameToken.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    
    const playGameAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
    
    // Choose which account to approve tokens for
    const accounts = [
        { name: "Deployer", signer: deployer },
        { name: "Player 1", signer: player1 },
        { name: "Player 2", signer: player2 }
    ];
    
    console.log("Available accounts:");
    accounts.forEach((acc, i) => {
        console.log(`  ${i}: ${acc.name} (${acc.signer.address})`);
    });
    
    // Approve tokens for all accounts
    const approveAmount = ethers.parseEther("1000"); // Approve 1000 GT tokens
    
    for (const account of accounts) {
        try {
            console.log(`\n📝 Approving GT tokens for ${account.name} (${account.signer.address})...`);
            
            // Check current balance
            const balance = await gameToken.balanceOf(account.signer.address);
            console.log(`  Current GT balance: ${ethers.formatEther(balance)}`);
            
            // Check current allowance
            const currentAllowance = await gameToken.allowance(account.signer.address, playGameAddress);
            console.log(`  Current allowance: ${ethers.formatEther(currentAllowance)}`);
            
            if (currentAllowance < ethers.parseEther("10")) { // If less than 10 GT approved
                const tx = await gameToken.connect(account.signer).approve(playGameAddress, approveAmount);
                await tx.wait();
                
                const newAllowance = await gameToken.allowance(account.signer.address, playGameAddress);
                console.log(`  ✅ Approval successful! New allowance: ${ethers.formatEther(newAllowance)} GT`);
                console.log(`  Transaction hash: ${tx.hash}`);
            } else {
                console.log(`  ✅ Already has sufficient allowance`);
            }
            
        } catch (error) {
            console.log(`  ❌ Error approving for ${account.name}: ${error.message}`);
        }
    }
    
    console.log("\n🎯 Token Approval Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("All accounts should now have sufficient GT token allowances");
    console.log("for the PlayGame contract to spend on their behalf.");
    console.log("\nYou can now test the game flow without allowance errors!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
