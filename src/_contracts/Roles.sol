// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Roles
 * @dev 직급 및 권한 관리를 위한 스마트 컨트랙트
 * @author E-Wallet Team
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
    }
    
    // Role management functions
    function createRole(
        string memory roleId,
        string memory roleName,
        string memory roleDescription,
        uint256 level
    ) external onlyOwner hasPermission("CREATE_ROLE") {
        require(!roleExists[roleId], "Role already exists");
        require(level > 0 && level <= 100, "Invalid role level");
        require(bytes(roleId).length > 0, "Role ID cannot be empty");
        require(bytes(roleName).length > 0, "Role name cannot be empty");
        
        roles[roleId] = Role({
            id: roleId,
            name: roleName,
            description: roleDescription,
            level: level,
            exists: true,
            memberCount: 0
        });
        
        roleExists[roleId] = true;
        roleIds.push(roleId);
        
        emit RoleCreated(roleId, roleName, level);
    }
    
    function deleteRole(string memory roleId) external onlyOwner hasPermission("DELETE_ROLE") {
        require(roleExists[roleId], "Role does not exist");
        require(keccak256(bytes(roleId)) != keccak256(bytes("admin")), "Cannot delete admin role");
        require(roles[roleId].memberCount == 0, "Cannot delete role with members");
        
        roleExists[roleId] = false;
        roles[roleId].exists = false;
        
        // Remove from roleIds array
        for (uint256 i = 0; i < roleIds.length; i++) {
            if (keccak256(bytes(roleIds[i])) == keccak256(bytes(roleId))) {
                roleIds[i] = roleIds[roleIds.length - 1];
                roleIds.pop();
                break;
            }
        }
        
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
        } else {
            members.push(member);
        }
        
        memberRoles[member] = roleId;
        isMember[member] = true;
        memberJoinTime[member] = block.timestamp;
        roles[roleId].memberCount++;
        
        emit RoleAssigned(member, roleId);
        emit MemberAdded(member, roleId);
    }
    
    function removeRole(address member) external onlyOwner hasPermission("REMOVE_ROLE") {
        require(isMember[member], "Member does not exist");
        require(keccak256(bytes(memberRoles[member])) != keccak256(bytes("admin")), "Cannot remove admin role");
        
        string memory oldRole = memberRoles[member];
        roles[oldRole].memberCount--;
        
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
    }
    
    function canManageMembers(address member) external view returns (bool) {
        return hasMemberPermission(member, "MANAGE_MEMBERS");
    }
    
    // View functions
    function getMemberRole(address member) external view returns (string memory) {
        return memberRoles[member];
    }
    
    function getRoleInfo(string memory roleId) external view returns (
        string memory name,
        string memory roleDescription,
        uint256 level,
        bool exists,
        uint256 memberCount
    ) {
        Role memory role = roles[roleId];
        return (role.name, role.description, role.level, role.exists, role.memberCount);
    }
    
    function getRolePermissions(string memory roleId) external view returns (string[] memory) {
        string[] memory permissions = new string[](12);
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
        if (rolePermissions[roleId]["MANAGE_MEMBERS"]) permissions[count++] = "MANAGE_MEMBERS";
        if (rolePermissions[roleId]["VIEW_MEMBERS"]) permissions[count++] = "VIEW_MEMBERS";
        
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
    
    function getAllRoles() external view returns (string[] memory) {
        return roleIds;
    }
    
    function getAllMembers() external view returns (address[] memory) {
        return members;
    }
    
    function getMemberCount() external view returns (uint256) {
        return members.length;
    }
    
    function getRoleCount() external view returns (uint256) {
        return roleIds.length;
    }
    
    function getMembersByRole(string memory roleId) external view returns (address[] memory) {
        require(roleExists[roleId], "Role does not exist");
        
        address[] memory roleMembers = new address[](roles[roleId].memberCount);
        uint256 count = 0;
        
        for (uint256 i = 0; i < members.length; i++) {
            if (keccak256(bytes(memberRoles[members[i]])) == keccak256(bytes(roleId))) {
                roleMembers[count] = members[i];
                count++;
            }
        }
        
        return roleMembers;
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
    
    // Batch operations
    function batchAssignRoles(address[] memory members, string[] memory roleIds) external onlyOwner hasPermission("ASSIGN_ROLE") {
        require(members.length == roleIds.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < members.length; i++) {
            assignRole(members[i], roleIds[i]);
        }
    }
    
    function batchGrantPermissions(string memory roleId, string[] memory permissions) external onlyOwner hasPermission("MODIFY_PERMISSIONS") {
        require(roleExists[roleId], "Role does not exist");
        
        for (uint256 i = 0; i < permissions.length; i++) {
            if (validPermissions[permissions[i]]) {
                rolePermissions[roleId][permissions[i]] = true;
                emit PermissionGranted(roleId, permissions[i]);
            }
        }
    }
}



