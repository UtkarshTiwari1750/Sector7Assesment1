const { ethers } = require("hardhat");

describe("TokenStore", () => {
  let owner, buyer;
  let usdt, gameToken, tokenStore;

  beforeEach(async () => {
    [owner, buyer] = await ethers.getSigners();

    // Mock USDT
    const ERC20 = await ethers.getContractFactory("ERC20PresetMinterPauser");
    usdt = await ERC20.deploy("Tether USD", "USDT");

    const GameToken = await ethers.getContractFactory("GameToken");
    gameToken = await GameToken.deploy();

    const TokenStore = await ethers.getContractFactory("TokenStore");
    tokenStore = await TokenStore.deploy(
      usdt.target,
      gameToken.target,
      ethers.parseUnits("1", 18) // 1 GT per USDT
    );

    await gameToken.setTokenStore(tokenStore.target);

    // Give buyer some USDT
    await usdt.mint(buyer.address, ethers.parseUnits("100", 6));
  });

  test("buy mints GT correctly", async () => {
    const amount = ethers.parseUnits("10", 6);
    await usdt.connect(buyer).approve(tokenStore.target, amount);

    await tokenStore.connect(buyer).buy(amount);

    const gtBal = await gameToken.balanceOf(buyer.address);
    expect(gtBal).toBe(ethers.parseUnits("10", 18));
  });

  test("withdraw USDT by owner", async () => {
    const amount = ethers.parseUnits("5", 6);
    await usdt.mint(tokenStore.target, amount);

    await tokenStore.withdrawUSDT(owner.address, amount);
    expect(await usdt.balanceOf(owner.address)).toBe(amount);
  });
});
