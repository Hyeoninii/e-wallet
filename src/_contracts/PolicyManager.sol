// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Policy.sol";
import "./Roles.sol";

/**
 * @title PolicyManager
 * @dev 정책과 직급 관리 컨트랙트의 중앙 관리자
 * @author E-Wallet Team
 */
contract PolicyManager {
    // Events
    event PolicyContractUpdated(address indexed oldPolicy, address indexed newPolicy);
    event RolesContractUpdated(address indexed oldRoles, address indexed newRoles);
    event PolicyManagerInitialized(address indexed multisigWallet, address indexed policy, address indexed roles);
    event NewPolicyDeployed(address indexed policyAddress, string policyName);
    event NewRolesDeployed(address indexed rolesAddress, string rolesName);
    
    // State variables
    address public multisigWallet;
    address public policyContract;
    address public rolesContract;
    address public owner;
    bool public isInitialized;
    
    // Policy and Roles contract history
    address[] public policyHistory;
    address[] public rolesHistory;
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyMultisig() {
        require(msg.sender == multisigWallet, "Only multisig wallet can call this function");
        _;
    }
    
    modifier whenInitialized() {
        require(isInitialized, "PolicyManager not initialized");
        _;
    }
    
    // Constructor
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev 다중 서명 지갑과 함께 PolicyManager 초기화
     * @param _multisigWallet 다중 서명 지갑 주소
     * @param _policyContract 초기 정책 컨트랙트 주소
     * @param _rolesContract 초기 직급 컨트랙트 주소
     */
    function initialize(
        address _multisigWallet,
        address _policyContract,
        address _rolesContract
    ) external onlyOwner {
        require(!isInitialized, "Already initialized");
        require(_multisigWallet != address(0), "Invalid multisig wallet address");
        require(_policyContract != address(0), "Invalid policy contract address");
        require(_rolesContract != address(0), "Invalid roles contract address");
        
        multisigWallet = _multisigWallet;
        policyContract = _policyContract;
        rolesContract = _rolesContract;
        isInitialized = true;
        
        // Add to history
        policyHistory.push(_policyContract);
        rolesHistory.push(_rolesContract);
        
        emit PolicyManagerInitialized(_multisigWallet, _policyContract, _rolesContract);
    }
    
    /**
     * @dev 새로운 정책 컨트랙트 배포 및 업데이트
     * @param _policyName 정책 이름
     * @param _description 정책 설명
     * @param _maxTransactionAmount 최대 트랜잭션 금액
     * @param _dailyLimit 일일 한도
     * @param _requireApproval 승인 필요 여부
     * @param _approvalThreshold 승인 임계값
     * @param _timeLockDelay 시간 잠금 지연
     * @return newPolicyAddress 새로 배포된 정책 컨트랙트 주소
     */
    function deployNewPolicy(
        string memory _policyName,
        string memory _description,
        uint256 _maxTransactionAmount,
        uint256 _dailyLimit,
        bool _requireApproval,
        uint256 _approvalThreshold,
        uint256 _timeLockDelay
    ) external onlyMultisig whenInitialized returns (address newPolicyAddress) {
        // Deploy new Policy contract
        Policy newPolicy = new Policy(
            _policyName,
            _description,
            _maxTransactionAmount,
            _dailyLimit,
            _requireApproval,
            _approvalThreshold,
            _timeLockDelay
        );
        
        newPolicyAddress = address(newPolicy);
        
        // Update policy contract reference
        address oldPolicy = policyContract;
        policyContract = newPolicyAddress;
        policyHistory.push(newPolicyAddress);
        
        emit PolicyContractUpdated(oldPolicy, newPolicyAddress);
        emit NewPolicyDeployed(newPolicyAddress, _policyName);
        
        return newPolicyAddress;
    }
    
    /**
     * @dev 새로운 직급 컨트랙트 배포 및 업데이트
     * @param _rolesName 직급 시스템 이름
     * @param _description 직급 시스템 설명
     * @return newRolesAddress 새로 배포된 직급 컨트랙트 주소
     */
    function deployNewRoles(
        string memory _rolesName,
        string memory _description
    ) external onlyMultisig whenInitialized returns (address newRolesAddress) {
        // Deploy new Roles contract
        Roles newRoles = new Roles(_rolesName, _description);
        
        newRolesAddress = address(newRoles);
        
        // Update roles contract reference
        address oldRoles = rolesContract;
        rolesContract = newRolesAddress;
        rolesHistory.push(newRolesAddress);
        
        emit RolesContractUpdated(oldRoles, newRolesAddress);
        emit NewRolesDeployed(newRolesAddress, _rolesName);
        
        return newRolesAddress;
    }
    
    /**
     * @dev 정책과 직급 컨트랙트를 함께 업데이트
     * @param policyParams 정책 컨트랙트 생성 파라미터
     * @param rolesParams 직급 컨트랙트 생성 파라미터
     * @return newPolicyAddress 새로 배포된 정책 컨트랙트 주소
     * @return newRolesAddress 새로 배포된 직급 컨트랙트 주소
     */
    function deployNewPolicyAndRoles(
        PolicyParams memory policyParams,
        RolesParams memory rolesParams
    ) external onlyMultisig whenInitialized returns (address newPolicyAddress, address newRolesAddress) {
        // Deploy new Policy contract
        Policy newPolicy = new Policy(
            policyParams.name,
            policyParams.description,
            policyParams.maxTransactionAmount,
            policyParams.dailyLimit,
            policyParams.requireApproval,
            policyParams.approvalThreshold,
            policyParams.timeLockDelay
        );
        
        newPolicyAddress = address(newPolicy);
        
        // Deploy new Roles contract
        Roles newRoles = new Roles(rolesParams.name, rolesParams.description);
        newRolesAddress = address(newRoles);
        
        // Update contract references
        address oldPolicy = policyContract;
        address oldRoles = rolesContract;
        
        policyContract = newPolicyAddress;
        rolesContract = newRolesAddress;
        
        policyHistory.push(newPolicyAddress);
        rolesHistory.push(newRolesAddress);
        
        emit PolicyContractUpdated(oldPolicy, newPolicyAddress);
        emit RolesContractUpdated(oldRoles, newRolesAddress);
        emit NewPolicyDeployed(newPolicyAddress, policyParams.name);
        emit NewRolesDeployed(newRolesAddress, rolesParams.name);
        
        return (newPolicyAddress, newRolesAddress);
    }
    
    /**
     * @dev 현재 정책 컨트랙트 인스턴스 반환
     */
    function getPolicyContract() external view whenInitialized returns (Policy) {
        return Policy(policyContract);
    }
    
    /**
     * @dev 현재 직급 컨트랙트 인스턴스 반환
     */
    function getRolesContract() external view whenInitialized returns (Roles) {
        return Roles(rolesContract);
    }
    
    /**
     * @dev 정책 컨트랙트 히스토리 반환
     */
    function getPolicyHistory() external view returns (address[] memory) {
        return policyHistory;
    }
    
    /**
     * @dev 직급 컨트랙트 히스토리 반환
     */
    function getRolesHistory() external view returns (address[] memory) {
        return rolesHistory;
    }
    
    /**
     * @dev 컨트랙트 정보 반환
     */
    function getContractInfo() external view whenInitialized returns (
        address _multisigWallet,
        address _policyContract,
        address _rolesContract,
        uint256 _policyVersion,
        uint256 _rolesVersion
    ) {
        return (
            multisigWallet,
            policyContract,
            rolesContract,
            policyHistory.length,
            rolesHistory.length
        );
    }
    
    // Structs for batch deployment
    struct PolicyParams {
        string name;
        string description;
        uint256 maxTransactionAmount;
        uint256 dailyLimit;
        bool requireApproval;
        uint256 approvalThreshold;
        uint256 timeLockDelay;
    }
    
    struct RolesParams {
        string name;
        string description;
    }
}



