const { ethers } = require("hardhat");

describe("GameToken", () => {
  let owner, store, user;
  let gameToken;

  beforeEach(async () => {
    [owner, store, user] = await ethers.getSigners();
    const GameToken = await ethers.getContractFactory("GameToken");
    gameToken = await GameToken.deploy();
    await gameToken.setTokenStore(store.address);
  });

  test("only token store can mint", async () => {
    await expect(gameToken.connect(user).mint(user.address, 1000n)).rejects.toThrow(
      /Not TokenStore/
    );

    await expect(gameToken.connect(store).mint(user.address, 1000n)).resolves.not.toThrow();
  });

  test("mint increases balance", async () => {
    await gameToken.connect(store).mint(user.address, 500n);
    expect(await gameToken.balanceOf(user.address)).toBe(500n);
  });

  test("emits Minted event", async () => {
    await expect(gameToken.connect(store).mint(user.address, 123n))
      .toEmit(gameToken, "Minted")
      .withArgs(user.address, 123n);
  });
});
