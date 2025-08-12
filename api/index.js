require("dotenv").config();
const express = require("express");
const { ethers } = require("ethers");
const app = express();
app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const tokenStoreAbi = require("./abis/TokenStore.json");
const playGameAbi = require("./abis/PlayGame.json");

const tokenStore = new ethers.Contract(process.env.TOKENSTORE_ADDR, tokenStoreAbi, wallet);
const playGame = new ethers.Contract(process.env.PLAYGAME_ADDR, playGameAbi, wallet);

app.get("/purchase", async (req, res) => {
  const amount = ethers.parseUnits(req.query.amount, 6); // USDT decimals
  const tx = await tokenStore.buy(amount);
  res.json({ txHash: tx.hash });
});

app.post("/match/start", async (req, res) => {
  const { matchId, p1, p2, stake } = req.body;
  const tx = await playGame.createMatch(matchId, p1, p2, stake);
  res.json({ txHash: tx.hash });
});

app.post("/match/result", async (req, res) => {
  const { matchId, winner } = req.body;
  const tx = await playGame.commitResult(matchId, winner);
  res.json({ txHash: tx.hash });
});

app.listen(3000, () => console.log("API listening on port 3000"));
