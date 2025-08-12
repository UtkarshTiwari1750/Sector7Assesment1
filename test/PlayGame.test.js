const { ethers } = require("hardhat");

describe("PlayGame", () => {
  let owner, operator, p1, p2;
  let gameToken, playGame;
  const stakeAmount = ethers.parseUnits("5", 18);

  beforeEach(async () => {
    [owner, operator, p1, p2] = await ethers.getSigners();

    const GameToken = await ethers.getContractFactory("GameToken");
    gameToken = await GameToken.deploy();

    const PlayGame = await ethers.getContractFactory("PlayGame");
    playGame = await PlayGame.deploy(gameToken.target, operator.address);

    await gameToken.transferOwnership(owner.address);

    // Mint stake for players
    await gameToken.connect(owner).setTokenStore(owner.address);
    await gameToken.connect(owner).mint(p1.address, stakeAmount);
    await gameToken.connect(owner).mint(p2.address, stakeAmount);
  });

  test("createMatch sets correct values", async () => {
    const matchId = ethers.keccak256(ethers.toUtf8Bytes("m1"));
    await playGame.createMatch(matchId, p1.address, p2.address, stakeAmount);

    const m = await playGame.matches(matchId);
    expect(m.p1).toBe(p1.address);
    expect(m.p2).toBe(p2.address);
  });

  test("stake flow and settle", async () => {
    const matchId = ethers.keccak256(ethers.toUtf8Bytes("m2"));
    await playGame.createMatch(matchId, p1.address, p2.address, stakeAmount);

    await gameToken.connect(p1).approve(playGame.target, stakeAmount);
    await playGame.connect(p1).stake(matchId);

    await gameToken.connect(p2).approve(playGame.target, stakeAmount);
    await playGame.connect(p2).stake(matchId);

    await playGame.connect(operator).commitResult(matchId, p1.address);

    expect(await gameToken.balanceOf(p1.address)).toBe(ethers.parseUnits("10", 18));
  });

  test("refund after timeout", async () => {
    const matchId = ethers.keccak256(ethers.toUtf8Bytes("m3"));
    await playGame.createMatch(matchId, p1.address, p2.address, stakeAmount);

    await gameToken.connect(p1).approve(playGame.target, stakeAmount);
    await playGame.connect(p1).stake(matchId);

    await gameToken.connect(p2).approve(playGame.target, stakeAmount);
    await playGame.connect(p2).stake(matchId);

    // Increase time
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
    await ethers.provider.send("evm_mine");

    await playGame.connect(p1).refund(matchId);

    expect(await gameToken.balanceOf(p1.address)).toBe(stakeAmount);
    expect(await gameToken.balanceOf(p2.address)).toBe(stakeAmount);
  });
});
