// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract GameToken is ERC20, Ownable {
    address public tokenStore;

    event Minted(address indexed to, uint256 amount);

    modifier onlyTokenStore() {
        require(msg.sender == tokenStore, "Not TokenStore");
        _;
    }

    constructor() ERC20("Game Token", "GT") Ownable(msg.sender) {}

    function setTokenStore(address _tokenStore) external onlyOwner {
        tokenStore = _tokenStore;
    }

    function mint(address to, uint256 amount) external onlyTokenStore {
        _mint(to, amount);
        emit Minted(to, amount);
    }
}
