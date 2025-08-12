const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy a mock USDT token (6 decimals for testing)
  const MockUSDT = await ethers.getContractFactory("MockUSDT");
  const usdt = await MockUSDT.deploy();
  await usdt.waitForDeployment();
  const usdtAddr = await usdt.getAddress();
  console.log("Mock USDT deployed to:", usdtAddr);

  // 2. Deploy GameToken
  const GameToken = await ethers.getContractFactory("GameToken");
  const gameToken = await GameToken.deploy();
  await gameToken.waitForDeployment();
  const gameTokenAddr = await gameToken.getAddress();
  console.log("GameToken deployed to:", gameTokenAddr);

  // 3. Deploy TokenStore
  const gtPerUsdt = ethers.parseUnits("1", 18); // 1 GT per 1 USDT
  const TokenStore = await ethers.getContractFactory("TokenStore");
  const tokenStore = await TokenStore.deploy(usdtAddr, gameTokenAddr, gtPerUsdt);
  await tokenStore.waitForDeployment();
  const tokenStoreAddr = await tokenStore.getAddress();
  console.log("TokenStore deployed to:", tokenStoreAddr);

  // 4. Deploy PlayGame
  const PlayGame = await ethers.getContractFactory("PlayGame");
  const playGame = await PlayGame.deploy(gameTokenAddr, deployer.address);
  await playGame.waitForDeployment();
  const playGameAddr = await playGame.getAddress();
  console.log("PlayGame deployed to:", playGameAddr);

  // 5. Update .env file
  const envPath = path.join(__dirname, "..", ".env");
  let envConfig = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

  envConfig = updateEnvVar(envConfig, "TOKENSTORE_ADDR", tokenStoreAddr);
  envConfig = updateEnvVar(envConfig, "PLAYGAME_ADDR", playGameAddr);

  fs.writeFileSync(envPath, envConfig, "utf-8");
  console.log("✅ Updated .env file with deployed contract addresses");
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
