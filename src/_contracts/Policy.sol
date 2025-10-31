// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Policy
 * @dev 정책 및 룰 관리를 위한 스마트 컨트랙트
 * @author E-Wallet Team
 */
contract Policy {
    // Events
    event PolicyUpdated(string policyName, string description);
    event RuleAdded(string ruleId, string ruleName);
    event RuleRemoved(string ruleId);
    event TransactionBlocked(address indexed from, address indexed to, uint256 amount, string reason);
    event DailyLimitReset(uint256 newDay);
    event AllowedTokenAdded(address indexed token);
    event AllowedTokenRemoved(address indexed token);
    event BlacklistedAddressAdded(address indexed addr);
    event BlacklistedAddressRemoved(address indexed addr);
    
    // State variables
    string public policyName;
    string public description;
    address public owner;
    bool public isActive;
    
    // Policy limits
    uint256 public maxTransactionAmount;
    uint256 public dailyLimit;
    uint256 public dailySpent;
    uint256 public lastResetDay;
    
    // Approval settings
    bool public requireApproval;
    uint256 public approvalThreshold;
    uint256 public timeLockDelay;
    
    // Token and address restrictions
    mapping(address => bool) public allowedTokens;
    mapping(address => bool) public blacklistedAddresses;
    
    // Rules mapping
    mapping(string => bool) public activeRules;
    mapping(string => string) public ruleDescriptions;
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier whenActive() {
        require(isActive, "Policy is not active");
        _;
    }
    
    // Constructor
    constructor(
        string memory _policyName,
        string memory _description,
        uint256 _maxTransactionAmount,
        uint256 _dailyLimit,
        bool _requireApproval,
        uint256 _approvalThreshold,
        uint256 _timeLockDelay
    ) {
        owner = msg.sender;
        policyName = _policyName;
        description = _description;
        isActive = true;
        
        maxTransactionAmount = _maxTransactionAmount;
        dailyLimit = _dailyLimit;
        requireApproval = _requireApproval;
        approvalThreshold = _approvalThreshold;
        timeLockDelay = _timeLockDelay;
        
        lastResetDay = block.timestamp / 1 days;
        dailySpent = 0;
        
        emit PolicyUpdated(policyName, description);
    }
    
    // Rule management functions
    function addRule(string memory ruleId, string memory ruleName, string memory ruleDescription) external onlyOwner {
        activeRules[ruleId] = true;
        ruleDescriptions[ruleId] = ruleDescription;
        emit RuleAdded(ruleId, ruleName);
    }
    
    function removeRule(string memory ruleId) external onlyOwner {
        activeRules[ruleId] = false;
        emit RuleRemoved(ruleId);
    }
    
    // Token restriction functions
    function addAllowedToken(address token) external onlyOwner {
        allowedTokens[token] = true;
        emit AllowedTokenAdded(token);
    }
    
    function removeAllowedToken(address token) external onlyOwner {
        allowedTokens[token] = false;
        emit AllowedTokenRemoved(token);
    }
    
    // Address blacklist functions
    function addBlacklistedAddress(address addr) external onlyOwner {
        blacklistedAddresses[addr] = true;
        emit BlacklistedAddressAdded(addr);
    }
    
    function removeBlacklistedAddress(address addr) external onlyOwner {
        blacklistedAddresses[addr] = false;
        emit BlacklistedAddressRemoved(addr);
    }
    
    // Validation functions
    function validateTransaction(
        address from,
        address to,
        uint256 amount,
        address token
    ) external view whenActive returns (bool, string memory) {
        // Check daily limit
        if (dailySpent + amount > dailyLimit) {
            return (false, "Daily limit exceeded");
        }
        
        // Check maximum transaction amount
        if (amount > maxTransactionAmount) {
            return (false, "Transaction amount exceeds maximum allowed");
        }
        
        // Check blacklisted addresses
        if (blacklistedAddresses[from] || blacklistedAddresses[to]) {
            return (false, "Transaction involves blacklisted address");
        }
        
        // Check token restrictions
        if (token != address(0) && !allowedTokens[token]) {
            return (false, "Token not allowed");
        }
        
        return (true, "Transaction approved");
    }
    
    function resetDailySpent() external onlyOwner {
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastResetDay) {
            dailySpent = 0;
            lastResetDay = currentDay;
            emit DailyLimitReset(currentDay);
        }
    }
    
    function updateDailySpent(uint256 amount) external onlyOwner {
        dailySpent += amount;
    }
    
    function pausePolicy() external onlyOwner {
        isActive = false;
    }
    
    function activatePolicy() external onlyOwner {
        isActive = true;
    }
    
    function updatePolicyLimits(
        uint256 _maxTransactionAmount,
        uint256 _dailyLimit
    ) external onlyOwner {
        maxTransactionAmount = _maxTransactionAmount;
        dailyLimit = _dailyLimit;
    }
    
    function updateApprovalSettings(
        bool _requireApproval,
        uint256 _approvalThreshold,
        uint256 _timeLockDelay
    ) external onlyOwner {
        requireApproval = _requireApproval;
        approvalThreshold = _approvalThreshold;
        timeLockDelay = _timeLockDelay;
    }
    
    // View functions
    function getPolicyInfo() external view returns (
        string memory _policyName,
        string memory _description,
        bool _isActive,
        uint256 _maxTransactionAmount,
        uint256 _dailyLimit,
        uint256 _dailySpent,
        bool _requireApproval,
        uint256 _approvalThreshold,
        uint256 _timeLockDelay
    ) {
        return (
            policyName,
            description,
            isActive,
            maxTransactionAmount,
            dailyLimit,
            dailySpent,
            requireApproval,
            approvalThreshold,
            timeLockDelay
        );
    }
    
    function isTokenAllowed(address token) external view returns (bool) {
        return allowedTokens[token];
    }
    
    function isAddressBlacklisted(address addr) external view returns (bool) {
        return blacklistedAddresses[addr];
    }
    
    function isRuleActive(string memory ruleId) external view returns (bool) {
        return activeRules[ruleId];
    }
}



