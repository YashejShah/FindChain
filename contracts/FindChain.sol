// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title FindChain - AI-Powered Decentralized Lost & Found
 * @notice Main contract handling item registration, AI matching, escrow rewards, and reputation
 * @dev Integrates with IPFS for decentralized image/metadata storage
 */
contract FindChain is Ownable, ReentrancyGuard {

    // ============ Enums ============
    enum ItemStatus { Active, Matched, Resolved, Expired, Disputed }
    enum ItemType { Lost, Found }
    enum DisputeStatus { None, Open, Voting, Resolved }

    // ============ Structs ============
    struct Item {
        uint256 id;
        address reporter;
        ItemType itemType;
        string title;
        string description;
        string category;
        string ipfsImageHash;      // IPFS CID for item image
        string ipfsMetadataHash;   // IPFS CID for full metadata (AI embeddings, etc.)
        string location;           // Human-readable location
        int256 latitude;           // Stored as fixed-point (x1e6)
        int256 longitude;          // Stored as fixed-point (x1e6)
        uint256 reward;            // Reward in wei (escrowed)
        uint256 timestamp;
        ItemStatus status;
        uint256 matchedWith;       // ID of matched item (0 if unmatched)
        uint256 aiSimilarityScore; // AI similarity score (0-10000 for 0-100.00%)
    }

    struct UserProfile {
        uint256 reputation;        // Reputation score (0-10000)
        uint256 itemsReported;
        uint256 itemsResolved;
        uint256 successfulReturns;
        uint256 totalRewardsEarned;
        uint256 totalRewardsPosted;
        uint256 registeredAt;
        bool isRegistered;
    }

    struct Match {
        uint256 matchId;
        uint256 lostItemId;
        uint256 foundItemId;
        uint256 similarityScore;   // AI score (0-10000)
        address lostReporter;
        address foundReporter;
        uint256 timestamp;
        bool confirmed;
        bool disputed;
    }

    struct Dispute {
        uint256 disputeId;
        uint256 matchId;
        address initiator;
        string reason;
        string evidenceIpfsHash;
        DisputeStatus status;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votingDeadline;
        bool resolved;
    }

    // ============ State Variables ============
    uint256 public nextItemId = 1;
    uint256 public nextMatchId = 1;
    uint256 public nextDisputeId = 1;

    uint256 public platformFeePercent = 2;       // 2% platform fee
    uint256 public minReputationToVote = 100;    // Min reputation to vote on disputes
    uint256 public disputeVotingPeriod = 3 days;
    uint256 public itemExpiryPeriod = 90 days;

    uint256 public totalItemsRegistered;
    uint256 public totalItemsResolved;
    uint256 public totalRewardsDistributed;

    mapping(uint256 => Item) public items;
    mapping(address => UserProfile) public users;
    mapping(uint256 => Match) public matches;
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => mapping(address => bool)) public disputeVotes; // disputeId => voter => voted
    mapping(address => uint256[]) public userItems;                   // user => itemIds

    // ============ Events ============
    event ItemRegistered(uint256 indexed itemId, address indexed reporter, ItemType itemType, string category, uint256 reward);
    event MatchProposed(uint256 indexed matchId, uint256 lostItemId, uint256 foundItemId, uint256 similarityScore);
    event MatchConfirmed(uint256 indexed matchId, uint256 lostItemId, uint256 foundItemId);
    event RewardClaimed(uint256 indexed matchId, address indexed finder, uint256 amount);
    event DisputeOpened(uint256 indexed disputeId, uint256 indexed matchId, address initiator);
    event DisputeVoted(uint256 indexed disputeId, address voter, bool inFavor);
    event DisputeResolved(uint256 indexed disputeId, bool matchUpheld);
    event ReputationUpdated(address indexed user, uint256 newReputation);
    event UserRegistered(address indexed user);

    // ============ Modifiers ============
    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier itemExists(uint256 _itemId) {
        require(_itemId > 0 && _itemId < nextItemId, "Item does not exist");
        _;
    }

    constructor() Ownable(msg.sender) {}

    // ============ User Functions ============

    /**
     * @notice Register a new user on the platform
     */
    function registerUser() external {
        require(!users[msg.sender].isRegistered, "Already registered");
        users[msg.sender] = UserProfile({
            reputation: 500,           // Start with base reputation
            itemsReported: 0,
            itemsResolved: 0,
            successfulReturns: 0,
            totalRewardsEarned: 0,
            totalRewardsPosted: 0,
            registeredAt: block.timestamp,
            isRegistered: true
        });
        emit UserRegistered(msg.sender);
    }

    // ============ Item Registration ============

    /**
     * @notice Report a lost item with optional reward escrow
     * @param _title Item title
     * @param _description Detailed description
     * @param _category Item category (electronics, documents, jewelry, etc.)
     * @param _ipfsImageHash IPFS CID of the item image
     * @param _ipfsMetadataHash IPFS CID of metadata (includes AI feature vector)
     * @param _location Human-readable location string
     * @param _latitude Latitude * 1e6
     * @param _longitude Longitude * 1e6
     */
    function reportLostItem(
        string calldata _title,
        string calldata _description,
        string calldata _category,
        string calldata _ipfsImageHash,
        string calldata _ipfsMetadataHash,
        string calldata _location,
        int256 _latitude,
        int256 _longitude
    ) external payable onlyRegistered {
        uint256 itemId = nextItemId++;

        items[itemId] = Item({
            id: itemId,
            reporter: msg.sender,
            itemType: ItemType.Lost,
            title: _title,
            description: _description,
            category: _category,
            ipfsImageHash: _ipfsImageHash,
            ipfsMetadataHash: _ipfsMetadataHash,
            location: _location,
            latitude: _latitude,
            longitude: _longitude,
            reward: msg.value,
            timestamp: block.timestamp,
            status: ItemStatus.Active,
            matchedWith: 0,
            aiSimilarityScore: 0
        });

        userItems[msg.sender].push(itemId);
        users[msg.sender].itemsReported++;
        users[msg.sender].totalRewardsPosted += msg.value;
        totalItemsRegistered++;

        emit ItemRegistered(itemId, msg.sender, ItemType.Lost, _category, msg.value);
    }

    /**
     * @notice Report a found item
     */
    function reportFoundItem(
        string calldata _title,
        string calldata _description,
        string calldata _category,
        string calldata _ipfsImageHash,
        string calldata _ipfsMetadataHash,
        string calldata _location,
        int256 _latitude,
        int256 _longitude
    ) external onlyRegistered {
        uint256 itemId = nextItemId++;

        items[itemId] = Item({
            id: itemId,
            reporter: msg.sender,
            itemType: ItemType.Found,
            title: _title,
            description: _description,
            category: _category,
            ipfsImageHash: _ipfsImageHash,
            ipfsMetadataHash: _ipfsMetadataHash,
            location: _location,
            latitude: _latitude,
            longitude: _longitude,
            reward: 0,
            timestamp: block.timestamp,
            status: ItemStatus.Active,
            matchedWith: 0,
            aiSimilarityScore: 0
        });

        userItems[msg.sender].push(itemId);
        users[msg.sender].itemsReported++;
        totalItemsRegistered++;

        emit ItemRegistered(itemId, msg.sender, ItemType.Found, _category, 0);
    }

    // ============ AI Matching ============

    /**
     * @notice Propose a match between a lost and found item (called by AI oracle/backend)
     * @param _lostItemId ID of the lost item
     * @param _foundItemId ID of the found item
     * @param _similarityScore AI similarity score (0-10000)
     */
    function proposeMatch(
        uint256 _lostItemId,
        uint256 _foundItemId,
        uint256 _similarityScore
    ) external onlyOwner itemExists(_lostItemId) itemExists(_foundItemId) {
        require(items[_lostItemId].itemType == ItemType.Lost, "First item must be lost");
        require(items[_foundItemId].itemType == ItemType.Found, "Second item must be found");
        require(items[_lostItemId].status == ItemStatus.Active, "Lost item not active");
        require(items[_foundItemId].status == ItemStatus.Active, "Found item not active");
        require(_similarityScore <= 10000, "Score must be 0-10000");

        uint256 matchId = nextMatchId++;

        matches[matchId] = Match({
            matchId: matchId,
            lostItemId: _lostItemId,
            foundItemId: _foundItemId,
            similarityScore: _similarityScore,
            lostReporter: items[_lostItemId].reporter,
            foundReporter: items[_foundItemId].reporter,
            timestamp: block.timestamp,
            confirmed: false,
            disputed: false
        });

        items[_lostItemId].status = ItemStatus.Matched;
        items[_foundItemId].status = ItemStatus.Matched;
        items[_lostItemId].matchedWith = _foundItemId;
        items[_foundItemId].matchedWith = _lostItemId;
        items[_lostItemId].aiSimilarityScore = _similarityScore;
        items[_foundItemId].aiSimilarityScore = _similarityScore;

        emit MatchProposed(matchId, _lostItemId, _foundItemId, _similarityScore);
    }

    /**
     * @notice Confirm a match and release escrowed reward
     * @param _matchId ID of the match to confirm
     */
    function confirmMatch(uint256 _matchId) external nonReentrant {
        Match storage m = matches[_matchId];
        require(m.matchId > 0, "Match does not exist");
        require(!m.confirmed, "Already confirmed");
        require(!m.disputed, "Match is disputed");
        require(msg.sender == m.lostReporter, "Only lost item reporter can confirm");

        m.confirmed = true;

        Item storage lostItem = items[m.lostItemId];
        Item storage foundItem = items[m.foundItemId];
        lostItem.status = ItemStatus.Resolved;
        foundItem.status = ItemStatus.Resolved;

        // Update reputation
        _updateReputation(m.lostReporter, 50);
        _updateReputation(m.foundReporter, 100); // Finder gets more reputation

        users[m.lostReporter].itemsResolved++;
        users[m.foundReporter].itemsResolved++;
        users[m.foundReporter].successfulReturns++;
        totalItemsResolved++;

        // Release reward to finder
        if (lostItem.reward > 0) {
            uint256 fee = (lostItem.reward * platformFeePercent) / 100;
            uint256 finderReward = lostItem.reward - fee;

            users[m.foundReporter].totalRewardsEarned += finderReward;
            totalRewardsDistributed += finderReward;

            (bool sent, ) = payable(m.foundReporter).call{value: finderReward}("");
            require(sent, "Reward transfer failed");
        }

        emit MatchConfirmed(_matchId, m.lostItemId, m.foundItemId);
        emit RewardClaimed(_matchId, m.foundReporter, lostItem.reward);
    }

    // ============ Dispute Resolution ============

    /**
     * @notice Open a dispute on a proposed match
     */
    function openDispute(
        uint256 _matchId,
        string calldata _reason,
        string calldata _evidenceIpfsHash
    ) external onlyRegistered {
        Match storage m = matches[_matchId];
        require(m.matchId > 0, "Match does not exist");
        require(!m.confirmed, "Match already confirmed");
        require(!m.disputed, "Dispute already exists");
        require(
            msg.sender == m.lostReporter || msg.sender == m.foundReporter,
            "Not a party to this match"
        );

        m.disputed = true;
        items[m.lostItemId].status = ItemStatus.Disputed;
        items[m.foundItemId].status = ItemStatus.Disputed;

        uint256 disputeId = nextDisputeId++;
        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            matchId: _matchId,
            initiator: msg.sender,
            reason: _reason,
            evidenceIpfsHash: _evidenceIpfsHash,
            status: DisputeStatus.Voting,
            votesFor: 0,
            votesAgainst: 0,
            votingDeadline: block.timestamp + disputeVotingPeriod,
            resolved: false
        });

        emit DisputeOpened(disputeId, _matchId, msg.sender);
    }

    /**
     * @notice Vote on an active dispute (community governance)
     */
    function voteOnDispute(uint256 _disputeId, bool _inFavor) external onlyRegistered {
        Dispute storage d = disputes[_disputeId];
        require(d.status == DisputeStatus.Voting, "Not in voting phase");
        require(block.timestamp <= d.votingDeadline, "Voting period ended");
        require(!disputeVotes[_disputeId][msg.sender], "Already voted");
        require(users[msg.sender].reputation >= minReputationToVote, "Insufficient reputation");

        Match storage m = matches[d.matchId];
        require(msg.sender != m.lostReporter && msg.sender != m.foundReporter, "Parties cannot vote");

        disputeVotes[_disputeId][msg.sender] = true;

        if (_inFavor) {
            d.votesFor++;
        } else {
            d.votesAgainst++;
        }

        emit DisputeVoted(_disputeId, msg.sender, _inFavor);
    }

    /**
     * @notice Resolve a dispute after voting period ends
     */
    function resolveDispute(uint256 _disputeId) external {
        Dispute storage d = disputes[_disputeId];
        require(d.status == DisputeStatus.Voting, "Not in voting phase");
        require(block.timestamp > d.votingDeadline, "Voting period not ended");

        bool matchUpheld = d.votesFor >= d.votesAgainst;
        d.status = DisputeStatus.Resolved;
        d.resolved = true;

        Match storage m = matches[d.matchId];

        if (matchUpheld) {
            // Match is valid - revert to matched status
            items[m.lostItemId].status = ItemStatus.Matched;
            items[m.foundItemId].status = ItemStatus.Matched;
            m.disputed = false;
        } else {
            // Match is invalid - revert to active
            items[m.lostItemId].status = ItemStatus.Active;
            items[m.foundItemId].status = ItemStatus.Active;
            items[m.lostItemId].matchedWith = 0;
            items[m.foundItemId].matchedWith = 0;
            m.disputed = false;
        }

        emit DisputeResolved(_disputeId, matchUpheld);
    }

    // ============ Internal Functions ============

    function _updateReputation(address _user, uint256 _points) internal {
        UserProfile storage u = users[_user];
        u.reputation = u.reputation + _points > 10000 ? 10000 : u.reputation + _points;
        emit ReputationUpdated(_user, u.reputation);
    }

    // ============ View Functions ============

    function getItem(uint256 _itemId) external view returns (Item memory) {
        return items[_itemId];
    }

    function getUserItems(address _user) external view returns (uint256[] memory) {
        return userItems[_user];
    }

    function getUserProfile(address _user) external view returns (UserProfile memory) {
        return users[_user];
    }

    function getMatch(uint256 _matchId) external view returns (Match memory) {
        return matches[_matchId];
    }

    function getDispute(uint256 _disputeId) external view returns (Dispute memory) {
        return disputes[_disputeId];
    }

    function getPlatformStats() external view returns (
        uint256 _totalItems,
        uint256 _totalResolved,
        uint256 _totalRewards,
        uint256 _activeItems
    ) {
        return (
            totalItemsRegistered,
            totalItemsResolved,
            totalRewardsDistributed,
            totalItemsRegistered - totalItemsResolved
        );
    }

    // ============ Admin Functions ============

    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 10, "Fee too high");
        platformFeePercent = _fee;
    }

    function setDisputeVotingPeriod(uint256 _period) external onlyOwner {
        disputeVotingPeriod = _period;
    }

    function withdrawFees() external onlyOwner {
        (bool sent, ) = payable(owner()).call{value: address(this).balance}("");
        require(sent, "Withdrawal failed");
    }

    receive() external payable {}
}
