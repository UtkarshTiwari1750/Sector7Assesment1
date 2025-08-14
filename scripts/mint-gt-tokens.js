const { ethers } = require("hardhat");

async function main() {
    console.log("🏦 Minting GT Tokens for Players...\n");
    
    // Get signers
    const [deployer, player1, player2] = await ethers.getSigners();
    
    // Get GameToken contract
    const GameToken = await ethers.getContractFactory("GameToken");
    const gameToken = GameToken.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");
    
    // Players to mint tokens for
    const players = [
        { name: "Player 1", signer: player1 },
        { name: "Player 2", signer: player2 },
        { name: "Deployer", signer: deployer }
    ];
    
    // Mint amount - 100 GT tokens per player
    const mintAmount = ethers.parseEther("100");
    
    console.log("Minting GT tokens for players...");
    console.log(`Amount per player: ${ethers.formatEther(mintAmount)} GT\n`);
    
    for (const player of players) {
        try {
            console.log(`💰 Minting GT tokens for ${player.name} (${player.signer.address})...`);
            
            // Check current balance
            const currentBalance = await gameToken.balanceOf(player.signer.address);
            console.log(`  Current balance: ${ethers.formatEther(currentBalance)} GT`);
            
            // Mint tokens using deployer (who has minter role)
            const tx = await gameToken.connect(deployer).mint(player.signer.address, mintAmount);
            await tx.wait();
            
            // Check new balance
            const newBalance = await gameToken.balanceOf(player.signer.address);
            console.log(`  ✅ Minted! New balance: ${ethers.formatEther(newBalance)} GT`);
            console.log(`  Transaction hash: ${tx.hash}\n`);
            
        } catch (error) {
            console.log(`  ❌ Error minting for ${player.name}: ${error.message}\n`);
        }
    }
    
    console.log("🎯 GT Token Minting Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("All players should now have GT tokens for staking!");
    console.log("\nNow you can test the complete game flow without balance errors!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
