// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SocToken (SOC)
 * @dev Governance + reward token for the SocioChain platform
 *      - Earned by receiving likes on posts
 *      - Used for DAO voting on content moderation disputes
 *      - Enables tipping other users
 */
contract SocToken is ERC20, ERC20Permit, ERC20Votes, Ownable {
    address public socialContract;

    uint256 public constant LIKE_REWARD     = 1  * 10**18;  // 1 SOC per like received
    uint256 public constant POST_REWARD     = 5  * 10**18;  // 5 SOC for first post of day
    uint256 public constant MAX_SUPPLY      = 1_000_000_000 * 10**18; // 1 billion

    mapping(address => uint256) public lastPostRewardDay;

    event Tipped(address indexed from, address indexed to, uint256 amount);
    event LikeRewarded(address indexed author, uint256 postId);

    constructor() ERC20("Soc Token", "SOC") ERC20Permit("Soc Token") Ownable(msg.sender) {
        // Mint 10M to deployer for liquidity/airdrops
        _mint(msg.sender, 10_000_000 * 10**18);
    }

    modifier onlySocialContract() {
        require(msg.sender == socialContract, "Only social contract");
        _;
    }

    function setSocialContract(address _addr) external onlyOwner {
        socialContract = _addr;
    }

    /**
     * @dev Called by SocioChain when a post receives a like
     */
    function rewardLike(address _author, uint256 _postId) external onlySocialContract {
        require(totalSupply() + LIKE_REWARD <= MAX_SUPPLY, "Max supply reached");
        _mint(_author, LIKE_REWARD);
        emit LikeRewarded(_author, _postId);
    }

    /**
     * @dev Called by SocioChain on daily first post
     */
    function rewardPost(address _author) external onlySocialContract {
        uint256 today = block.timestamp / 86400;
        if (lastPostRewardDay[_author] < today) {
            lastPostRewardDay[_author] = today;
            require(totalSupply() + POST_REWARD <= MAX_SUPPLY, "Max supply reached");
            _mint(_author, POST_REWARD);
        }
    }

    /**
     * @dev Tip another user
     */
    function tip(address _to, uint256 _amount) external {
        require(_to != msg.sender, "Cannot tip yourself");
        require(balanceOf(msg.sender) >= _amount, "Insufficient SOC");
        _transfer(msg.sender, _to, _amount);
        emit Tipped(msg.sender, _to, _amount);
    }

    // ERC20Votes overrides
    function _update(address from, address to, uint256 value)
        internal override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public view override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
