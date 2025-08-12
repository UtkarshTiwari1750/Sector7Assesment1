// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./GameToken.sol";

contract TokenStore is Ownable, ReentrancyGuard {
    IERC20 public usdt;
    GameToken public gameToken;
    uint256 public gtPerUsdt; // 1e18 = 1 GT per USDT

    event Purchase(address indexed buyer, uint256 usdtAmount, uint256 gtOut);

    constructor(address _usdt, address _gameToken, uint256 _gtPerUsdt) Ownable(msg.sender) {
        usdt = IERC20(_usdt);
        gameToken = GameToken(_gameToken);
        gtPerUsdt = _gtPerUsdt;
    }

    function buy(uint256 usdtAmount) external nonReentrant {
        require(usdtAmount > 0, "Amount zero");
        usdt.transferFrom(msg.sender, address(this), usdtAmount);

        uint256 gtOut = (usdtAmount * gtPerUsdt) / 1e6; // USDT has 6 decimals
        gameToken.mint(msg.sender, gtOut);

        emit Purchase(msg.sender, usdtAmount, gtOut);
    }

    function withdrawUSDT(address to, uint256 amount) external onlyOwner {
        usdt.transfer(to, amount);
    }
}
