// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PlayGame is Ownable, ReentrancyGuard {
    enum Status { NONE, CREATED, STAKED, SETTLED, REFUNDED }

    struct Match {
        address p1;
        address p2;
        uint256 stake;
        uint256 startTime;
        Status status;
        address winner;
        mapping(address => bool) staked;
    }

    IERC20 public gameToken;
    address public operator;
    uint256 public timeout = 24 hours;
    mapping(bytes32 => Match) public matches;

    event MatchCreated(bytes32 indexed matchId, address indexed p1, address indexed p2, uint256 stake);
    event Staked(bytes32 indexed matchId, address indexed player);
    event Settled(bytes32 indexed matchId, address indexed winner, uint256 amount);
    event Refunded(bytes32 indexed matchId);

    modifier onlyOperator() {
        require(msg.sender == operator, "Not operator");
        _;
    }

    constructor(address _gameToken, address _operator) Ownable(msg.sender) {
        gameToken = IERC20(_gameToken);
        operator = _operator;
    }

    function createMatch(bytes32 matchId, address p1, address p2, uint256 stake) external onlyOwner {
        Match storage m = matches[matchId];
        require(m.status == Status.NONE, "Already exists");
        m.p1 = p1;
        m.p2 = p2;
        m.stake = stake;
        m.status = Status.CREATED;
        emit MatchCreated(matchId, p1, p2, stake);
    }

    function stake(bytes32 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        require(m.status == Status.CREATED || m.status == Status.STAKED, "Invalid status");
        require(msg.sender == m.p1 || msg.sender == m.p2, "Not a player");
        require(!m.staked[msg.sender], "Already staked");

        gameToken.transferFrom(msg.sender, address(this), m.stake);
        m.staked[msg.sender] = true;
        emit Staked(matchId, msg.sender);

        if (m.staked[m.p1] && m.staked[m.p2]) {
            m.status = Status.STAKED;
            m.startTime = block.timestamp;
        }
    }

    function commitResult(bytes32 matchId, address winner) external onlyOperator nonReentrant {
        Match storage m = matches[matchId];
        require(m.status == Status.STAKED, "Invalid status");
        require(winner == m.p1 || winner == m.p2, "Invalid winner");

        uint256 total = m.stake * 2;
        gameToken.transfer(winner, total);
        m.status = Status.SETTLED;
        m.winner = winner;

        emit Settled(matchId, winner, total);
    }

    function refund(bytes32 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        require(m.status == Status.STAKED, "Invalid status");
        require(block.timestamp > m.startTime + timeout, "Too early");

        gameToken.transfer(m.p1, m.stake);
        gameToken.transfer(m.p2, m.stake);
        m.status = Status.REFUNDED;

        emit Refunded(matchId);
    }
}
