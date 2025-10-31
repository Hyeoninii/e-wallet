/**
 * 동적 Solidity 컨트랙트 생성 유틸리티
 * 사용자 입력에 따라 정책 및 직급 관리 컨트랙트를 생성합니다.
 * 
 * 주요 기능:
 * - 사용자 정의 권한에 따른 동적 함수 생성 (isMember, isManager 등)
 * - 금액별 승인 규칙 동적 생성 (isOver0dot1eth 등)
 * - 권한별 배열 관리 및 멤버 저장
 * - 룰 체인 형식의 정책 검증
 */

/**
 * ETH를 wei로 변환하는 헬퍼 함수
 * @param {number|string} ethAmount - ETH 금액
 * @returns {string} wei 금액 (문자열)
 */
const ethToWei = (ethAmount) => {
  if (!ethAmount || ethAmount === '') return '0';
  const amount = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
  if (isNaN(amount) || amount < 0) return '0';
  return (amount * 1e18).toString();
};

/**
 * 권한 이름을 함수명으로 변환하는 헬퍼 함수
 * @param {string} roleName - 권한 이름
 * @returns {string} 함수명
 */
const roleNameToFunctionName = (roleName) => {
  if (!roleName) return '';
  return roleName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^[0-9]/, 'role$&'); // 숫자로 시작하면 'role' 접두사 추가
};

/**
 * 금액을 함수명으로 변환하는 헬퍼 함수
 * @param {number|string} amount - 금액 (ETH)
 * @returns {string} 함수명
 */
const amountToFunctionName = (amount) => {
  if (!amount) return '';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '';
  
  // 소수점이 있는 경우 처리
  if (numAmount % 1 !== 0) {
    const str = numAmount.toString();
    const decimalPart = str.split('.')[1];
    return `isOver${str.split('.')[0]}dot${decimalPart}eth`;
  }
  
  return `isOver${numAmount}eth`;
};

/**
 * 문자열을 안전하게 이스케이프하는 헬퍼 함수
 * @param {string} str - 이스케이프할 문자열
 * @returns {string} 이스케이프된 문자열
 */
const escapeString = (str) => {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
};

/**
 * 동적 정책 컨트랙트 생성
 * @param {Object} formData - 정책 폼 데이터
 * @returns {string} 생성된 Solidity 코드
 */
export const generatePolicyContract = (formData) => {
  console.log('generatePolicyContract 호출됨, formData:', formData);
  
  const { 
    policyName, 
    description, 
    rules = [], 
    maxAmount, 
    dailyLimit, 
    requireApproval, 
    approvalThreshold, 
    timeLock, 
    allowedTokens = [], 
    blacklistedAddresses = [],
    amountRules = [] // 금액별 승인 규칙
  } = formData;
  
  console.log('추출된 데이터:', {
    policyName,
    description,
    rules,
    maxAmount,
    dailyLimit,
    requireApproval,
    approvalThreshold,
    timeLock
  });

  // 기본 컨트랙트 템플릿
  let contractCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * ${policyName || 'Custom Policy'} Contract
 * ${description || 'Generated policy contract for multi-signature wallet'}
 * 
 * This contract defines the policies and rules for the multi-signature wallet.
 * Generated on: ${new Date().toISOString()}
 */

contract Policy {
    // Events
    event PolicyUpdated(string policyName, string description);
    event RuleAdded(string ruleId, string ruleName);
    event RuleRemoved(string ruleId);
    event TransactionBlocked(address indexed from, address indexed to, uint256 amount, string reason);
    
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
    constructor() {
        owner = msg.sender;
        policyName = "${escapeString(policyName || 'Custom Policy')}";
        description = "${escapeString(description || 'Generated policy contract')}";
        isActive = true;
        
        // Initialize policy limits
        maxTransactionAmount = ${ethToWei(maxAmount || 10)};
        dailyLimit = ${ethToWei(dailyLimit || 50)};
        requireApproval = ${requireApproval};
        approvalThreshold = ${approvalThreshold || 2};
        timeLockDelay = ${timeLock || 0};
        
        // Initialize daily tracking
        lastResetDay = block.timestamp / 1 days;
        dailySpent = 0;
        
        emit PolicyUpdated(policyName, description);
    }`;

  // 금액별 승인 규칙에 대한 동적 함수 생성
  const enabledAmountRules = amountRules.filter(rule => rule.enabled);
  enabledAmountRules.forEach(rule => {
    const functionName = amountToFunctionName(rule.amount);
    const requiredRole = rule.requiredRole || 'manager';
    const roleFunctionName = roleNameToFunctionName(requiredRole);
    
    contractCode += `
    
    // ${rule.amount} ETH 이상 트랜잭션 검증 함수
    function ${functionName}(uint256 amount) public pure returns (bool) {
        return amount >= ${ethToWei(rule.amount)};
    }
    
    function requires${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Approval(uint256 amount) public pure returns (bool) {
        return ${functionName}(amount);
    }`;
  });

  // 룰별 코드 생성
  if (rules && rules.length > 0) {
    contractCode += `
    
    // Rule management functions
    function addRule(string memory ruleId, string memory ruleName, string memory ruleDescription) external onlyOwner {
        activeRules[ruleId] = true;
        ruleDescriptions[ruleId] = ruleDescription;
        emit RuleAdded(ruleId, ruleName);
    }
    
    function removeRule(string memory ruleId) external onlyOwner {
        activeRules[ruleId] = false;
        emit RuleRemoved(ruleId);
    }`;

    // 각 룰에 대한 검증 함수 생성
    rules.forEach((rule, index) => {
      if (rule.enabled) {
        contractCode += generateRuleValidation(rule, index);
      }
    });
  }

  // 토큰 제한 코드
  if (allowedTokens && allowedTokens.length > 0) {
    contractCode += `
    
    // Token restriction functions
    function addAllowedToken(address token) external onlyOwner {
        allowedTokens[token] = true;
    }
    
    function removeAllowedToken(address token) external onlyOwner {
        allowedTokens[token] = false;
    }`;
  }

  // 주소 블랙리스트 코드
  if (blacklistedAddresses && blacklistedAddresses.length > 0) {
    contractCode += `
    
    // Address blacklist functions
    function addBlacklistedAddress(address addr) external onlyOwner {
        blacklistedAddresses[addr] = true;
    }
    
    function removeBlacklistedAddress(address addr) external onlyOwner {
        blacklistedAddresses[addr] = false;
    }`;
  }

  // 공통 검증 함수들
  contractCode += `
    
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
}`;

  return contractCode;
};

/**
 * 동적 직급 관리 컨트랙트 생성
 * @param {Object} formData - 직급 폼 데이터
 * @returns {string} 생성된 Solidity 코드
 */
export const generateRolesContract = (formData) => {
  const { roles = [], memberRoles = {}, rolePermissions = {} } = formData;

  // 사용자 정의 권한 목록 추출
  const customRoles = roles.filter(role => role.enabled);
  
  let contractCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * Dynamic Role Management Contract
 * Manages custom roles and permissions for multi-signature wallet
 * 
 * Generated on: ${new Date().toISOString()}
 * Custom Roles: ${customRoles.map(r => r.name).join(', ')}
 */

contract Roles {
    // Events
    event RoleCreated(string roleId, string roleName, uint256 level);
    event RoleDeleted(string roleId);
    event RoleAssigned(address indexed member, string roleId);
    event RoleRemoved(address indexed member, string roleId);
    event PermissionGranted(string roleId, string permission);
    event PermissionRevoked(string roleId, string permission);
    event MemberAdded(address indexed member, string roleId);
    event MemberRemoved(address indexed member);
    
    // State variables
    string public rolesName;
    string public description;
    address public owner;
    bool public isActive;
    
    // Role structure
    struct Role {
        string id;
        string name;
        string description;
        uint256 level;
        bool exists;
        uint256 memberCount;
    }
    
    // Member to role mapping
    mapping(address => string) public memberRoles;
    mapping(address => bool) public isMember;
    mapping(address => uint256) public memberJoinTime;
    
    // Role management
    mapping(string => Role) public roles;
    mapping(string => bool) public roleExists;
    mapping(string => mapping(string => bool)) public rolePermissions;
    
    // Permission definitions
    mapping(string => bool) public validPermissions;
    
    // Role level tracking
    string[] public roleIds;
    address[] public members;
    
    // Dynamic role arrays - 각 권한별로 멤버 주소를 저장하는 배열
${customRoles.map(role => {
  const functionName = roleNameToFunctionName(role.name);
  return `    address[] public ${functionName}Members;`;
}).join('\n')}
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyMember() {
        require(isMember[msg.sender], "Only members can call this function");
        _;
    }
    
    modifier hasPermission(string memory permission) {
        require(
            hasRolePermission(memberRoles[msg.sender], permission),
            "Insufficient permissions"
        );
        _;
    }
    
    modifier whenActive() {
        require(isActive, "Contract is not active");
        _;
    }
    
    // Constructor
    constructor(string memory _rolesName, string memory _description) {
        owner = msg.sender;
        rolesName = _rolesName;
        description = _description;
        isActive = true;
        
        // Initialize valid permissions
        validPermissions["CREATE_ROLE"] = true;
        validPermissions["DELETE_ROLE"] = true;
        validPermissions["ASSIGN_ROLE"] = true;
        validPermissions["REMOVE_ROLE"] = true;
        validPermissions["MODIFY_PERMISSIONS"] = true;
        validPermissions["EXECUTE_TRANSACTION"] = true;
        validPermissions["APPROVE_TRANSACTION"] = true;
        validPermissions["VIEW_TRANSACTIONS"] = true;
        validPermissions["MANAGE_POLICIES"] = true;
        validPermissions["EMERGENCY_PAUSE"] = true;
        validPermissions["MANAGE_MEMBERS"] = true;
        validPermissions["VIEW_MEMBERS"] = true;
    }`;

  // 사용자 정의 권한별 동적 함수 생성
  customRoles.forEach(role => {
    const functionName = roleNameToFunctionName(role.name);
    const roleId = role.id || functionName;
    
    contractCode += `
    
    // ${role.name} 권한 관련 함수들
    function is${functionName.charAt(0).toUpperCase() + functionName.slice(1)}(address member) public view returns (bool) {
        return hasMemberRole(member, "${roleId}");
    }
    
    function get${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Members() public view returns (address[] memory) {
        return ${functionName}Members;
    }
    
    function get${functionName.charAt(0).toUpperCase() + functionName.slice(1)}Count() public view returns (uint256) {
        return ${functionName}Members.length;
    }`;
  });

  // 직급 관리 함수들
  contractCode += `
    
    // Role management functions
    function createRole(
        string memory roleId,
        string memory roleName,
        string memory description,
        uint256 level
    ) external onlyOwner hasPermission("CREATE_ROLE") {
        require(!roleExists[roleId], "Role already exists");
        require(level > 0 && level <= 100, "Invalid role level");
        
        roles[roleId] = Role({
            id: roleId,
            name: roleName,
            description: description,
            level: level,
            exists: true
        });
        
        roleExists[roleId] = true;
        emit RoleCreated(roleId, roleName, level);
    }
    
    function deleteRole(string memory roleId) external onlyOwner hasPermission("DELETE_ROLE") {
        require(roleExists[roleId], "Role does not exist");
        require(keccak256(bytes(roleId)) != keccak256(bytes("admin")), "Cannot delete admin role");
        
        roleExists[roleId] = false;
        roles[roleId].exists = false;
        emit RoleDeleted(roleId);
    }
    
    function assignRole(address member, string memory roleId) external onlyOwner hasPermission("ASSIGN_ROLE") {
        require(roleExists[roleId], "Role does not exist");
        require(member != address(0), "Invalid member address");
        require(keccak256(bytes(roleId)) != keccak256(bytes("admin")), "Cannot assign admin role directly");
        
        // Remove from previous role if exists
        if (isMember[member]) {
            string memory oldRole = memberRoles[member];
            roles[oldRole].memberCount--;
            _removeFromRoleArray(member, oldRole);
        } else {
            members.push(member);
        }
        
        memberRoles[member] = roleId;
        isMember[member] = true;
        memberJoinTime[member] = block.timestamp;
        roles[roleId].memberCount++;
        
        // Add to role-specific array
        _addToRoleArray(member, roleId);
        
        emit RoleAssigned(member, roleId);
        emit MemberAdded(member, roleId);
    }
    
    function removeRole(address member) external onlyOwner hasPermission("REMOVE_ROLE") {
        require(isMember[member], "Member does not exist");
        require(keccak256(bytes(memberRoles[member])) != keccak256(bytes("admin")), "Cannot remove admin role");
        
        string memory oldRole = memberRoles[member];
        roles[oldRole].memberCount--;
        
        // Remove from role-specific array
        _removeFromRoleArray(member, oldRole);
        
        delete memberRoles[member];
        isMember[member] = false;
        delete memberJoinTime[member];
        
        // Remove from members array
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == member) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
        
        emit RoleRemoved(member, oldRole);
        emit MemberRemoved(member);
    }
    
    function grantPermission(string memory roleId, string memory permission) external onlyOwner hasPermission("MODIFY_PERMISSIONS") {
        require(roleExists[roleId], "Role does not exist");
        require(validPermissions[permission], "Invalid permission");
        
        rolePermissions[roleId][permission] = true;
        emit PermissionGranted(roleId, permission);
    }
    
    function revokePermission(string memory roleId, string memory permission) external onlyOwner hasPermission("MODIFY_PERMISSIONS") {
        require(roleExists[roleId], "Role does not exist");
        require(validPermissions[permission], "Invalid permission");
        
        rolePermissions[roleId][permission] = false;
        emit PermissionRevoked(roleId, permission);
    }`;

  // 권한 검증 함수들
  contractCode += `
    
    // Internal helper functions for role array management
    function _addToRoleArray(address member, string memory roleId) internal {
${customRoles.map(role => {
  const functionName = roleNameToFunctionName(role.name);
  const roleId = role.id || functionName;
  return `        if (keccak256(bytes(roleId)) == keccak256(bytes("${roleId}"))) {
            ${functionName}Members.push(member);
        }`;
}).join('\n')}
    }
    
    function _removeFromRoleArray(address member, string memory roleId) internal {
${customRoles.map(role => {
  const functionName = roleNameToFunctionName(role.name);
  const roleId = role.id || functionName;
  return `        if (keccak256(bytes(roleId)) == keccak256(bytes("${roleId}"))) {
            for (uint256 i = 0; i < ${functionName}Members.length; i++) {
                if (${functionName}Members[i] == member) {
                    ${functionName}Members[i] = ${functionName}Members[${functionName}Members.length - 1];
                    ${functionName}Members.pop();
                    break;
                }
            }
        }`;
}).join('\n')}
    }
    
    function hasMemberRole(address member, string memory roleId) public view returns (bool) {
        if (!isMember[member]) return false;
        return keccak256(bytes(memberRoles[member])) == keccak256(bytes(roleId));
    }
    
    // Permission checking functions
    function hasRolePermission(string memory roleId, string memory permission) public view returns (bool) {
        if (!roleExists[roleId]) return false;
        return rolePermissions[roleId][permission];
    }
    
    function hasMemberPermission(address member, string memory permission) external view returns (bool) {
        if (!isMember[member]) return false;
        return hasRolePermission(memberRoles[member], permission);
    }
    
    function canExecuteTransaction(address member) external view returns (bool) {
        return hasMemberPermission(member, "EXECUTE_TRANSACTION");
    }
    
    function canApproveTransaction(address member) external view returns (bool) {
        return hasMemberPermission(member, "APPROVE_TRANSACTION");
    }
    
    function canViewTransactions(address member) external view returns (bool) {
        return hasMemberPermission(member, "VIEW_TRANSACTIONS");
    }
    
    function canManagePolicies(address member) external view returns (bool) {
        return hasMemberPermission(member, "MANAGE_POLICIES");
    }`;

  // 뷰 함수들
  contractCode += `
    
    // View functions
    function getMemberRole(address member) external view returns (string memory) {
        return memberRoles[member];
    }
    
    function getRoleInfo(string memory roleId) external view returns (
        string memory name,
        string memory description,
        uint256 level,
        bool exists
    ) {
        Role memory role = roles[roleId];
        return (role.name, role.description, role.level, role.exists);
    }
    
    function getRolePermissions(string memory roleId) external view returns (string[] memory) {
        string[] memory permissions = new string[](10);
        uint256 count = 0;
        
        if (rolePermissions[roleId]["CREATE_ROLE"]) permissions[count++] = "CREATE_ROLE";
        if (rolePermissions[roleId]["DELETE_ROLE"]) permissions[count++] = "DELETE_ROLE";
        if (rolePermissions[roleId]["ASSIGN_ROLE"]) permissions[count++] = "ASSIGN_ROLE";
        if (rolePermissions[roleId]["REMOVE_ROLE"]) permissions[count++] = "REMOVE_ROLE";
        if (rolePermissions[roleId]["MODIFY_PERMISSIONS"]) permissions[count++] = "MODIFY_PERMISSIONS";
        if (rolePermissions[roleId]["EXECUTE_TRANSACTION"]) permissions[count++] = "EXECUTE_TRANSACTION";
        if (rolePermissions[roleId]["APPROVE_TRANSACTION"]) permissions[count++] = "APPROVE_TRANSACTION";
        if (rolePermissions[roleId]["VIEW_TRANSACTIONS"]) permissions[count++] = "VIEW_TRANSACTIONS";
        if (rolePermissions[roleId]["MANAGE_POLICIES"]) permissions[count++] = "MANAGE_POLICIES";
        if (rolePermissions[roleId]["EMERGENCY_PAUSE"]) permissions[count++] = "EMERGENCY_PAUSE";
        
        // Resize array to actual count
        string[] memory result = new string[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = permissions[i];
        }
        
        return result;
    }
    
    function isRoleHigher(string memory roleId1, string memory roleId2) external view returns (bool) {
        require(roleExists[roleId1] && roleExists[roleId2], "One or both roles do not exist");
        return roles[roleId1].level > roles[roleId2].level;
    }
    
    function getRoleLevel(string memory roleId) external view returns (uint256) {
        require(roleExists[roleId], "Role does not exist");
        return roles[roleId].level;
    }
    
    // Emergency functions
    function emergencyPause() external onlyOwner hasPermission("EMERGENCY_PAUSE") {
        isActive = false;
    }
    
    function emergencyUnpause() external onlyOwner {
        isActive = true;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }
}`;

  console.log('정책 컨트랙트 코드 생성 완료, 길이:', contractCode.length);
  return contractCode;
};

/**
 * 룰별 검증 함수 생성
 * @param {Object} rule - 룰 객체
 * @param {number} index - 룰 인덱스
 * @returns {string} 생성된 검증 함수 코드
 */
function generateRuleValidation(rule, index) {
  const ruleId = rule.id || `rule_${index}`;
  const ruleName = rule.name || `Rule ${index + 1}`;
  
  let validationCode = `
    
    // ${ruleName} validation
    function validate${ruleId.charAt(0).toUpperCase() + ruleId.slice(1)}(
        address from,
        address to,
        uint256 amount,
        address token
    ) internal view returns (bool, string memory) {`;

  switch (rule.id) {
    case 'amount_limit':
      validationCode += `
        // Amount limit validation
        if (amount > ${ethToWei(rule.config.maxAmount || 10)}) {
            return (false, "Amount exceeds maximum limit");
        }
        if (dailySpent + amount > ${ethToWei(rule.config.dailyLimit || 50)}) {
            return (false, "Daily limit exceeded");
        }`;
      break;
      
    case 'approval_required':
      validationCode += `
        // Approval required validation
        if (amount >= ${ethToWei(rule.config.minAmount || 1)}) {
            // This would require approval from ${rule.config.threshold || 2} members
            // Implementation depends on multi-sig wallet integration
        }`;
      break;
      
    case 'time_lock':
      validationCode += `
        // Time lock validation
        // This would check if enough time has passed since transaction proposal
        // Implementation depends on multi-sig wallet integration
        uint256 delay = ${rule.config.delay || 3600};
        // Time lock logic would go here`;
      break;
      
    case 'token_restriction':
      validationCode += `
        // Token restriction validation
        if (token != address(0) && !allowedTokens[token]) {
            return (false, "Token not allowed");
        }`;
      break;
      
    case 'address_blacklist':
      validationCode += `
        // Address blacklist validation
        if (blacklistedAddresses[from] || blacklistedAddresses[to]) {
            return (false, "Address is blacklisted");
        }`;
      break;
      
    default:
      validationCode += `
        // Custom rule validation
        // Add custom validation logic here`;
  }

  validationCode += `
        return (true, "Rule validation passed");
    }`;

  return validationCode;
}

/**
 * 통합 컨트랙트 생성 (정책 + 직급)
 * @param {Object} policyData - 정책 데이터
 * @param {Object} roleData - 직급 데이터
 * @returns {string} 생성된 통합 Solidity 코드
 */
export const generateIntegratedContract = (policyData, roleData) => {
  const customRoles = (roleData.roles || []).filter(role => role.enabled);
  const amountRules = (policyData.amountRules || []).filter(rule => rule.enabled);
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * Integrated Policy and Role Management Contract
 * Combines policy enforcement with role-based access control
 * 
 * Generated on: ${new Date().toISOString()}
 * Custom Roles: ${customRoles.map(r => r.name).join(', ')}
 * Amount Rules: ${amountRules.map(r => r.amount + 'ETH').join(', ')}
 */

import "./Policy.sol";
import "./Roles.sol";

contract IntegratedWalletManager {
    Policy public policyContract;
    Roles public rolesContract;
    address public owner;
    
    event TransactionValidated(address indexed member, bool approved, string reason);
    event RoleValidationFailed(address indexed member, string requiredRole);
    event AmountValidationFailed(uint256 amount, string requiredApproval);
    
    constructor(address _policyContract, address _rolesContract) {
        policyContract = Policy(_policyContract);
        rolesContract = Roles(_rolesContract);
        owner = msg.sender;
    }
    
    function validateTransactionWithRole(
        address member,
        address to,
        uint256 amount,
        address token
    ) external returns (bool, string memory) {
        // Check role permissions first
        if (!rolesContract.canExecuteTransaction(member)) {
            emit TransactionValidated(member, false, "Insufficient role permissions");
            return (false, "Insufficient role permissions");
        }
        
        // Check amount-based approval requirements
        ${amountRules.map(rule => {
          const functionName = amountToFunctionName(rule.amount);
          const requiredRole = rule.requiredRole || 'manager';
          const roleFunctionName = roleNameToFunctionName(requiredRole);
          return `if (policyContract.${functionName}(amount)) {
            if (!rolesContract.is${roleFunctionName.charAt(0).toUpperCase() + roleFunctionName.slice(1)}(member)) {
                emit RoleValidationFailed(member, "${requiredRole}");
                emit TransactionValidated(member, false, "Requires ${requiredRole} approval for ${rule.amount} ETH+ transactions");
                return (false, "Requires ${requiredRole} approval for ${rule.amount} ETH+ transactions");
            }
        }`;
        }).join('\n')}
        
        // Then check policy rules
        (bool policyApproved, string memory reason) = policyContract.validateTransaction(
            member,
            to,
            amount,
            token
        );
        
        emit TransactionValidated(member, policyApproved, reason);
        return (policyApproved, reason);
    }
    
    function canMemberExecuteTransaction(address member) external view returns (bool) {
        return rolesContract.canExecuteTransaction(member);
    }
    
    function canMemberApproveTransaction(address member) external view returns (bool) {
        return rolesContract.canApproveTransaction(member);
    }
    
    // Dynamic role checking functions
${customRoles.map(role => {
  const functionName = roleNameToFunctionName(role.name);
  return `    function is${functionName.charAt(0).toUpperCase() + functionName.slice(1)}(address member) external view returns (bool) {
        return rolesContract.is${functionName.charAt(0).toUpperCase() + functionName.slice(1)}(member);
    }`;
}).join('\n')}
    
    // Dynamic amount checking functions
${amountRules.map(rule => {
  const functionName = amountToFunctionName(rule.amount);
  return `    function ${functionName}(uint256 amount) external view returns (bool) {
        return policyContract.${functionName}(amount);
    }`;
}).join('\n')}
}`;
};

/**
 * 사용자 정의 권한과 정책에 따른 완전한 컨트랙트 시스템 생성
 * @param {Object} config - 전체 설정 객체
 * @param {Object} config.roles - 권한 설정
 * @param {Object} config.policy - 정책 설정
 * @param {Object} config.multisig - 다중서명 설정
 * @returns {Object} 생성된 컨트랙트 코드들
 */
export const generateCompleteContractSystem = (config) => {
  const { roles = {}, policy = {}, multisig = {} } = config;
  
  console.log('완전한 컨트랙트 시스템 생성 시작:', config);
  
  // 1. 동적 Roles 컨트랙트 생성
  const rolesContract = generateRolesContract(roles);
  
  // 2. 동적 Policy 컨트랙트 생성
  const policyContract = generatePolicyContract(policy);
  
  // 3. 통합 컨트랙트 생성
  const integratedContract = generateIntegratedContract(policy, roles);
  
  return {
    roles: {
      sourceCode: rolesContract,
      contractName: 'Roles',
      description: '동적 권한 관리 컨트랙트'
    },
    policy: {
      sourceCode: policyContract,
      contractName: 'Policy',
      description: '동적 정책 관리 컨트랙트'
    },
    integrated: {
      sourceCode: integratedContract,
      contractName: 'IntegratedWalletManager',
      description: '통합 지갑 관리 컨트랙트'
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      customRoles: (roles.roles || []).filter(r => r.enabled).map(r => r.name),
      amountRules: (policy.amountRules || []).filter(r => r.enabled).map(r => r.amount + 'ETH'),
      version: '1.0.0'
    }
  };
};

/**
 * 컨트랙트 배포를 위한 바이트코드 생성 시뮬레이션
 * @param {string} sourceCode - Solidity 소스 코드
 * @param {string} contractName - 컨트랙트 이름
 * @returns {Object} 배포용 정보
 */
export const prepareContractForDeployment = (sourceCode, contractName) => {
  console.log(`컨트랙트 배포 준비: ${contractName}`);
  
  // 실제 환경에서는 solc-js를 사용하여 컴파일해야 함
  const mockABI = generateContractABI(contractName);
  const mockBytecode = generateMockBytecode();
  
  return {
    sourceCode,
    contractName,
    abi: mockABI,
    bytecode: mockBytecode,
    isSimulation: true
  };
};

/**
 * 컨트랙트별 ABI 생성
 * @param {string} contractName - 컨트랙트 이름
 * @returns {Array} ABI 배열
 */
function generateContractABI(contractName) {
  const baseABI = [
    {
      "inputs": [],
      "name": "owner",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "isActive",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];
  
  if (contractName === 'Roles') {
    return [
      ...baseABI,
      {
        "inputs": [
          {"internalType": "string", "name": "_rolesName", "type": "string"},
          {"internalType": "string", "name": "_description", "type": "string"}
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "member", "type": "address"},
          {"internalType": "string", "name": "roleId", "type": "string"}
        ],
        "name": "assignRole",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "member", "type": "address"},
          {"internalType": "string", "name": "permission", "type": "string"}
        ],
        "name": "hasMemberPermission",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];
  } else if (contractName === 'Policy') {
    return [
      ...baseABI,
      {
        "inputs": [
          {"internalType": "string", "name": "_policyName", "type": "string"},
          {"internalType": "string", "name": "_description", "type": "string"},
          {"internalType": "uint256", "name": "_maxTransactionAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "_dailyLimit", "type": "uint256"},
          {"internalType": "bool", "name": "_requireApproval", "type": "bool"},
          {"internalType": "uint256", "name": "_approvalThreshold", "type": "uint256"},
          {"internalType": "uint256", "name": "_timeLockDelay", "type": "uint256"}
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "inputs": [
          {"internalType": "address", "name": "from", "type": "address"},
          {"internalType": "address", "name": "to", "type": "address"},
          {"internalType": "uint256", "name": "amount", "type": "uint256"},
          {"internalType": "address", "name": "token", "type": "address"}
        ],
        "name": "validateTransaction",
        "outputs": [
          {"internalType": "bool", "name": "", "type": "bool"},
          {"internalType": "string", "name": "", "type": "string"}
        ],
        "stateMutability": "view",
        "type": "function"
      }
    ];
  }
  
  return baseABI;
}

/**
 * Mock 바이트코드 생성
 * @returns {string} Mock 바이트코드
 */
function generateMockBytecode() {
  // 실제로는 solc-js로 컴파일된 바이트코드를 사용해야 함
  return "0x608060405234801561001057600080fd5b50600436106100a95760003560e01c8063...";
}
