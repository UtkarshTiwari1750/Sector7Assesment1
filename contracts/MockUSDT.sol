// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1_000_000 * 10 ** 6); // 1M USDT
    }

    function decimals() public view virtual override returns (uint8) {
        return 6; // USDT uses 6 decimals
    }
    
    // Faucet function for testing - allows anyone to mint USDT
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
