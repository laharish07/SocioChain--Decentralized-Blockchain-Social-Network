// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title SocioChain
 * @dev Core social network contract — profiles, posts, follows, reactions, groups
 */
contract SocioChain is Ownable, ReentrancyGuard, ERC721 {
    // ─────────────────────── TYPES ───────────────────────

    struct Profile {
        address wallet;
        string  ipfsHash;      // JSON: {username, bio, avatar, website}
        uint256 createdAt;
        uint256 postCount;
        uint256 followerCount;
        uint256 followingCount;
        bool    exists;
        bool    verified;
    }

    struct Post {
        uint256 id;
        address author;
        string  ipfsHash;      // JSON: {text, media[], tags[]}
        uint256 createdAt;
        uint256 likes;
        uint256 reposts;
        uint256 commentCount;
        bool    isDeleted;
        PostType postType;
        uint256 parentId;      // for comments / reposts
    }

    struct Group {
        uint256 id;
        address creator;
        string  name;
        string  ipfsHash;      // JSON: {description, avatar, rules}
        uint256 memberCount;
        bool    isPrivate;
        uint256 createdAt;
    }

    enum PostType { POST, COMMENT, REPOST }

    // ─────────────────────── STATE ───────────────────────

    mapping(address => Profile)         public profiles;
    mapping(uint256 => Post)            public posts;
    mapping(uint256 => Group)           public groups;

    // follow graph
    mapping(address => mapping(address => bool)) public following;
    // likes
    mapping(uint256 => mapping(address => bool)) public liked;
    // group membership
    mapping(uint256 => mapping(address => bool)) public groupMember;
    // group admin
    mapping(uint256 => mapping(address => bool)) public groupAdmin;
    // content moderation flags
    mapping(uint256 => uint256)                  public flagCount;
    mapping(uint256 => mapping(address => bool)) public flagged;
    // data access permissions: owner => accessor => allowed
    mapping(address => mapping(address => bool)) public dataPermissions;

    uint256 public postCount;
    uint256 public groupCount;
    uint256 public profileNFTCount;

    // NFT profile token id => wallet
    mapping(address => uint256) public profileTokenId;

    // SOC token reference
    address public socTokenAddress;

    uint256 public constant MAX_FLAG_AUTO_HIDE = 10;

    // ─────────────────────── EVENTS ───────────────────────

    event ProfileCreated(address indexed wallet, string ipfsHash);
    event ProfileUpdated(address indexed wallet, string ipfsHash);
    event PostCreated(uint256 indexed postId, address indexed author, PostType postType);
    event PostLiked(uint256 indexed postId, address indexed liker);
    event PostUnliked(uint256 indexed postId, address indexed liker);
    event PostFlagged(uint256 indexed postId, address indexed flagger);
    event PostDeleted(uint256 indexed postId, address indexed author);
    event Followed(address indexed follower, address indexed followed);
    event Unfollowed(address indexed follower, address indexed followed);
    event GroupCreated(uint256 indexed groupId, address indexed creator, string name);
    event GroupJoined(uint256 indexed groupId, address indexed member);
    event GroupLeft(uint256 indexed groupId, address indexed member);
    event DataPermissionGranted(address indexed owner, address indexed accessor);
    event DataPermissionRevoked(address indexed owner, address indexed accessor);

    // ─────────────────────── MODIFIERS ───────────────────────

    modifier profileExists(address _wallet) {
        require(profiles[_wallet].exists, "Profile does not exist");
        _;
    }

    modifier postExists(uint256 _postId) {
        require(_postId > 0 && _postId <= postCount, "Post does not exist");
        require(!posts[_postId].isDeleted, "Post is deleted");
        _;
    }

    // ─────────────────────── CONSTRUCTOR ───────────────────────

    constructor() ERC721("SocioChain Profile", "DSOC") Ownable(msg.sender) {}

    // ─────────────────────── PROFILE ───────────────────────

    /**
     * @dev Create a new profile (mints a soulbound profile NFT)
     */
    function createProfile(string calldata _ipfsHash) external {
        require(!profiles[msg.sender].exists, "Profile already exists");
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");

        profiles[msg.sender] = Profile({
            wallet:         msg.sender,
            ipfsHash:       _ipfsHash,
            createdAt:      block.timestamp,
            postCount:      0,
            followerCount:  0,
            followingCount: 0,
            exists:         true,
            verified:       false
        });

        // Mint soulbound NFT
        profileNFTCount++;
        profileTokenId[msg.sender] = profileNFTCount;
        _safeMint(msg.sender, profileNFTCount);

        emit ProfileCreated(msg.sender, _ipfsHash);
    }

    /**
     * @dev Update profile metadata
     */
    function updateProfile(string calldata _ipfsHash) external profileExists(msg.sender) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        profiles[msg.sender].ipfsHash = _ipfsHash;
        emit ProfileUpdated(msg.sender, _ipfsHash);
    }

    /**
     * @dev Block NFT transfers (soulbound)
     */
    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0)) but not transfers
        require(from == address(0), "Profile NFT is soulbound");
        return super._update(to, tokenId, auth);
    }

    // ─────────────────────── POSTS ───────────────────────

    /**
     * @dev Create a new post, comment, or repost
     */
    function createPost(
        string  calldata _ipfsHash,
        PostType          _type,
        uint256           _parentId
    ) external profileExists(msg.sender) returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");

        if (_type == PostType.COMMENT || _type == PostType.REPOST) {
            require(_parentId > 0 && _parentId <= postCount, "Invalid parent");
            require(!posts[_parentId].isDeleted, "Parent is deleted");
        }

        postCount++;
        posts[postCount] = Post({
            id:           postCount,
            author:       msg.sender,
            ipfsHash:     _ipfsHash,
            createdAt:    block.timestamp,
            likes:        0,
            reposts:      0,
            commentCount: 0,
            isDeleted:    false,
            postType:     _type,
            parentId:     _parentId
        });

        profiles[msg.sender].postCount++;

        if (_type == PostType.COMMENT && _parentId > 0) {
            posts[_parentId].commentCount++;
        }
        if (_type == PostType.REPOST && _parentId > 0) {
            posts[_parentId].reposts++;
        }

        emit PostCreated(postCount, msg.sender, _type);
        return postCount;
    }

    /**
     * @dev Like or unlike a post
     */
    function toggleLike(uint256 _postId) external postExists(_postId) profileExists(msg.sender) {
        if (liked[_postId][msg.sender]) {
            liked[_postId][msg.sender] = false;
            posts[_postId].likes--;
            emit PostUnliked(_postId, msg.sender);
        } else {
            liked[_postId][msg.sender] = true;
            posts[_postId].likes++;
            emit PostLiked(_postId, msg.sender);
        }
    }

    /**
     * @dev Delete own post (soft delete)
     */
    function deletePost(uint256 _postId) external {
        require(posts[_postId].author == msg.sender, "Not post author");
        require(!posts[_postId].isDeleted, "Already deleted");
        posts[_postId].isDeleted = true;
        emit PostDeleted(_postId, msg.sender);
    }

    /**
     * @dev Flag post for moderation
     */
    function flagPost(uint256 _postId) external postExists(_postId) profileExists(msg.sender) {
        require(!flagged[_postId][msg.sender], "Already flagged");
        flagged[_postId][msg.sender] = true;
        flagCount[_postId]++;
        emit PostFlagged(_postId, msg.sender);
    }

    // ─────────────────────── FOLLOW ───────────────────────

    function follow(address _target) external profileExists(msg.sender) profileExists(_target) {
        require(msg.sender != _target, "Cannot follow yourself");
        require(!following[msg.sender][_target], "Already following");

        following[msg.sender][_target] = true;
        profiles[msg.sender].followingCount++;
        profiles[_target].followerCount++;

        emit Followed(msg.sender, _target);
    }

    function unfollow(address _target) external profileExists(msg.sender) {
        require(following[msg.sender][_target], "Not following");

        following[msg.sender][_target] = false;
        profiles[msg.sender].followingCount--;
        profiles[_target].followerCount--;

        emit Unfollowed(msg.sender, _target);
    }

    // ─────────────────────── GROUPS ───────────────────────

    function createGroup(
        string calldata _name,
        string calldata _ipfsHash,
        bool            _isPrivate
    ) external profileExists(msg.sender) returns (uint256) {
        require(bytes(_name).length > 0, "Name required");

        groupCount++;
        groups[groupCount] = Group({
            id:          groupCount,
            creator:     msg.sender,
            name:        _name,
            ipfsHash:    _ipfsHash,
            memberCount: 1,
            isPrivate:   _isPrivate,
            createdAt:   block.timestamp
        });

        groupMember[groupCount][msg.sender] = true;
        groupAdmin[groupCount][msg.sender]  = true;

        emit GroupCreated(groupCount, msg.sender, _name);
        return groupCount;
    }

    function joinGroup(uint256 _groupId) external profileExists(msg.sender) {
        require(_groupId > 0 && _groupId <= groupCount, "Group not found");
        require(!groups[_groupId].isPrivate, "Private group - needs invite");
        require(!groupMember[_groupId][msg.sender], "Already a member");

        groupMember[_groupId][msg.sender] = true;
        groups[_groupId].memberCount++;

        emit GroupJoined(_groupId, msg.sender);
    }

    function leaveGroup(uint256 _groupId) external {
        require(groupMember[_groupId][msg.sender], "Not a member");

        groupMember[_groupId][msg.sender] = false;
        groups[_groupId].memberCount--;

        emit GroupLeft(_groupId, msg.sender);
    }

    // ─────────────────────── DATA PERMISSIONS ───────────────────────

    function grantDataPermission(address _accessor) external profileExists(msg.sender) {
        require(_accessor != msg.sender, "Cannot grant to yourself");
        dataPermissions[msg.sender][_accessor] = true;
        emit DataPermissionGranted(msg.sender, _accessor);
    }

    function revokeDataPermission(address _accessor) external {
        dataPermissions[msg.sender][_accessor] = false;
        emit DataPermissionRevoked(msg.sender, _accessor);
    }

    // ─────────────────────── ADMIN ───────────────────────

    function setSocToken(address _token) external onlyOwner {
        socTokenAddress = _token;
    }

    function verifyProfile(address _wallet) external onlyOwner profileExists(_wallet) {
        profiles[_wallet].verified = true;
    }

    // ─────────────────────── VIEW HELPERS ───────────────────────

    function getProfile(address _wallet) external view returns (Profile memory) {
        return profiles[_wallet];
    }

    function getPost(uint256 _postId) external view returns (Post memory) {
        return posts[_postId];
    }

    function isFollowing(address _follower, address _followed) external view returns (bool) {
        return following[_follower][_followed];
    }

    function hasLiked(address _user, uint256 _postId) external view returns (bool) {
        return liked[_postId][_user];
    }

    function isHidden(uint256 _postId) external view returns (bool) {
        return flagCount[_postId] >= MAX_FLAG_AUTO_HIDE;
    }
}
