const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying contracts with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // 1. Deploy a mock USDT token (6 decimals for testing)
  console.log("\n📝 Deploying MockUSDT...");
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddr = await usdt.getAddress();
  console.log("✅ Mock USDT deployed to:", usdtAddr);

  // 2. Deploy GameToken
  console.log("\n🎮 Deploying GameToken...");
  const GameToken = await ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy();
  await gameToken.waitForDeployment();
  const gameTokenAddr = await gameToken.getAddress();
  console.log("✅ GameToken deployed to:", gameTokenAddr);

  // 3. Deploy TokenStore
  console.log("\n🏪 Deploying TokenStore...");
  const gtPerUsdt = ethers.parseUnits("1", 18); // 1 GT per 1 USDT
  const TokenStore = await ethers.getContractFactory("TokenStore");
  const tokenStore = await TokenStore.deploy(usdtAddr, gameTokenAddr, gtPerUsdt);
  await tokenStore.waitForDeployment();
  const tokenStoreAddr = await tokenStore.getAddress();
  console.log("✅ TokenStore deployed to:", tokenStoreAddr);

  // 4. Deploy PlayGame
  console.log("\n⚔️ Deploying PlayGame...");
  const PlayGame = await ethers.getContractFactory("PlayGame");
  const playGame = await PlayGame.deploy(gameTokenAddr, deployer.address);
  await playGame.waitForDeployment();
  const playGameAddr = await playGame.getAddress();
  console.log("✅ PlayGame deployed to:", playGameAddr);

  // 5. Setup contract relationships
  console.log("\n🔗 Setting up contract relationships...");
  
  // Set TokenStore as the minter in GameToken
  await gameToken.setTokenStore(tokenStoreAddr);
  console.log("✅ GameToken minter set to TokenStore");

  // 6. Generate and copy ABI files
  console.log("\n📋 Generating ABI files...");
  await generateABIFiles();

  // 7. Update .env file with all contract addresses
  console.log("\n📝 Updating .env file...");
  const envPath = path.join(__dirname, "..", ".env");
  let envConfig = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

  // Update all contract addresses
  envConfig = updateEnvVar(envConfig, "MOCKUSDT_ADDR", usdtAddr);
  envConfig = updateEnvVar(envConfig, "GAMETOKEN_ADDR", gameTokenAddr);
  envConfig = updateEnvVar(envConfig, "TOKENSTORE_ADDR", tokenStoreAddr);
  envConfig = updateEnvVar(envConfig, "PLAYGAME_ADDR", playGameAddr);

  fs.writeFileSync(envPath, envConfig, "utf-8");
  console.log("✅ Updated .env file with all deployed contract addresses");

  // 8. Print deployment summary
  console.log("\n🎉 Deployment Summary:");
  console.log("========================");
  console.log("MockUSDT:    ", usdtAddr);
  console.log("GameToken:   ", gameTokenAddr);
  console.log("TokenStore:  ", tokenStoreAddr);
  console.log("PlayGame:    ", playGameAddr);
  console.log("Deployer:    ", deployer.address);
  console.log("Network:     ", (await ethers.provider.getNetwork()).name);
  console.log("\n🎯 Next steps:");
  console.log("1. Start services: npm start");
  console.log("2. Open frontend: http://localhost:8080");
  console.log("3. Fund accounts with mock USDT for testing");
}

async function generateABIFiles() {
  const contractNames = ["MockUSDT", "GameToken", "TokenStore", "PlayGame"];
  const abiDir = path.join(__dirname, "..", "api", "abis");
  
  // Ensure ABI directory exists
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  for (const contractName of contractNames) {
    try {
      const artifactPath = path.join(
        __dirname, 
        "..", 
        "artifacts", 
        "contracts", 
        `${contractName}.sol`, 
        `${contractName}.json`
      );
      
      if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
        const abiPath = path.join(abiDir, `${contractName}.json`);
        
        // Write just the ABI array to the file
        fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
        console.log(`✅ Generated ABI: api/abis/${contractName}.json`);
      } else {
        console.log(`⚠️ Artifact not found for ${contractName}`);
      }
    } catch (error) {
      console.error(`❌ Failed to generate ABI for ${contractName}:`, error.message);
    }
  }
}

function updateEnvVar(envContent, key, value) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(envContent)) {
    return envContent.replace(regex, `${key}=${value}`);
  } else {
    return envContent.trim() + `\n${key}=${value}\n`;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
