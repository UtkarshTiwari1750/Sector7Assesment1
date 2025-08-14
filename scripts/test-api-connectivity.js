const { ethers } = require("ethers");

async function main() {
    console.log("🔍 Testing API Connectivity and Contract Deployment...\n");
    
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // Contract addresses from .env
    const contracts = {
        GameToken: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        MockUSDT: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        TokenStore: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        PlayGame: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
    };
    
    console.log("📋 Testing Contract Deployments:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    for (const [name, address] of Object.entries(contracts)) {
        try {
            console.log(`\n🔍 Testing ${name} at ${address}:`);
            
            const code = await provider.getCode(address);
            if (code === '0x') {
                console.log(`  ❌ ${name} contract not deployed (empty code)`);
            } else {
                console.log(`  ✅ ${name} contract deployed (code length: ${code.length / 2 - 1} bytes)`);
                
                // Test basic contract calls
                if (name === "GameToken" || name === "MockUSDT") {
                    try {
                        const abi = name === "GameToken" ? 
                            require("../api/abis/GameToken.json") : 
                            require("../api/abis/MockUSDT.json");
                        
                        const contract = new ethers.Contract(address, abi, provider);
                        const testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // deployer
                        
                        const balance = await contract.balanceOf(testAddress);
                        const decimals = name === "GameToken" ? 18 : 6;
                        const formatted = ethers.formatUnits(balance, decimals);
                        console.log(`  📊 Balance of deployer: ${formatted} ${name === "GameToken" ? "GT" : "USDT"}`);
                        
                        // Test name and symbol
                        const tokenName = await contract.name();
                        const symbol = await contract.symbol();
                        console.log(`  🏷️  Token: ${tokenName} (${symbol})`);
                        
                    } catch (error) {
                        console.log(`  ⚠️  Contract call failed: ${error.message}`);
                    }
                }
            }
        } catch (error) {
            console.log(`  ❌ Error checking ${name}: ${error.message}`);
        }
    }
    
    console.log("\n\n🌐 Testing Network Connectivity:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    try {
        const network = await provider.getNetwork();
        console.log(`✅ Connected to network: ${network.name} (chainId: ${network.chainId})`);
        
        const blockNumber = await provider.getBlockNumber();
        console.log(`✅ Current block number: ${blockNumber}`);
        
        const accounts = await provider.listAccounts();
        console.log(`✅ Available accounts: ${accounts.length}`);
        
        if (accounts.length > 0) {
            console.log(`   Deployer: ${accounts[0]}`);
            const balance = await provider.getBalance(accounts[0]);
            console.log(`   Deployer ETH balance: ${ethers.formatEther(balance)} ETH`);
        }
        
    } catch (error) {
        console.log(`❌ Network connectivity error: ${error.message}`);
    }
    
    console.log("\n\n🚀 API Server Status:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const testPorts = [3000, 5173, 8080];
    
    for (const port of testPorts) {
        try {
            const response = await fetch(`http://localhost:${port}/health`);
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ API server running on port ${port}`);
                console.log(`   Status: ${data.status}`);
                console.log(`   Timestamp: ${data.timestamp}`);
            } else {
                console.log(`⚠️  Port ${port}: HTTP ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ Port ${port}: ${error.message}`);
        }
    }
    
    console.log("\n\n📝 Recommendations:");
    console.log("━━━━━━━━━━━━━━━━━━━━━");
    
    console.log("1. If contracts are not deployed, run:");
    console.log("   npx hardhat run scripts/deploy.js --network localhost");
    
    console.log("\n2. If API servers are not running, start them with:");
    console.log("   npm run start");
    
    console.log("\n3. If you see BAD_DATA errors, it means:");
    console.log("   - Contract address is wrong");
    console.log("   - Contract is not deployed");
    console.log("   - ABI doesn't match the deployed contract");
    console.log("   - The method being called doesn't exist");
    
    console.log("\n4. To fix allowance issues, run the setup script:");
    console.log("   npx hardhat run scripts/fix-allowance-complete-setup.js --network localhost");
    
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Diagnostic failed:", error);
        process.exit(1);
    });
