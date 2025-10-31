pragma solidity ^0.8.20;

//to prevent re-entry attacks.
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.2/contracts/utils/ReentrancyGuard.sol";

contract ImprovedMultiSigWallet is ReentrancyGuard {
    // --- Events ---
    event Deposit(address indexed sender, uint amount, uint balance);
    event TransactionSubmitted(uint indexed txIndex, address indexed proposer, address to, uint value, bytes data);
    event TransactionConfirmed(uint indexed txIndex, address indexed owner);
    event TransactionRevoked(uint indexed txIndex, address indexed owner);
    event TransactionExecuted(uint indexed txIndex);
    event TransactionFailed(uint indexed txIndex);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ThresholdChanged(uint newThreshold);
    
    // Management transaction events
    event ManagementTransactionSubmitted(uint indexed txIndex, address indexed proposer, uint8 txType, address targetAddress, uint newThreshold);
    event ManagementTransactionConfirmed(uint indexed txIndex, address indexed owner);
    event ManagementTransactionRevoked(uint indexed txIndex, address indexed owner);
    event ManagementTransactionExecuted(uint indexed txIndex);
    
    // Policy and Role Management events
    event PolicyManagerUpdated(address indexed oldManager, address indexed newManager);
    event PolicyContractUpdated(address indexed oldPolicy, address indexed newPolicy);
    event RolesContractUpdated(address indexed oldRoles, address indexed newRoles);

    // --- State Variables ---
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public threshold;
    
    // Policy and Role Management
    address public policyManager;
    address public policyContract;
    address public rolesContract;

    // Mapping from owner address to its index in the owners array for O(1) removal.
    mapping(address => uint) private ownerToIndex;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint confirmCount;
    }

    // Management transaction types
    enum ManagementType {
        AddOwner,
        RemoveOwner,
        ChangeThreshold
    }

    struct ManagementTransaction {
        ManagementType txType;
        address targetAddress;  // For add/remove owner
        uint newThreshold;      // For threshold change
        bool executed;
        uint confirmCount;
    }

    Transaction[] public transactions;
    ManagementTransaction[] public managementTransactions;

    // FIX: Moved the confirmations mapping out of the struct.
    // This mapping stores confirmation status for each transaction index and each owner.
    mapping(uint => mapping(address => bool)) public confirmations;
    mapping(uint => mapping(address => bool)) public managementConfirmations;

    // --- Modifiers ---
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }
    

    modifier txExists(uint txIndex) {
        require(txIndex < transactions.length, "Transaction does not exist");
        _;
    }

    modifier notExecuted(uint txIndex) {
        require(!transactions[txIndex].executed, "Transaction already executed");
        _;
    }

    modifier notConfirmed(uint txIndex) {
        // FIX: Use the top-level confirmations mapping.
        require(!confirmations[txIndex][msg.sender], "Transaction already confirmed by you");
        _;
    }

    modifier mgmtTxExists(uint txIndex) {
        require(txIndex < managementTransactions.length, "Management transaction does not exist");
        _;
    }

    modifier mgmtNotExecuted(uint txIndex) {
        require(!managementTransactions[txIndex].executed, "Management transaction already executed");
        _;
    }

    modifier mgmtNotConfirmed(uint txIndex) {
        require(!managementConfirmations[txIndex][msg.sender], "Management transaction already confirmed by you");
        _;
    }

    // --- Constructor ---
    constructor(address[] memory _owners, uint _threshold) {
        require(_owners.length > 0, "Owners required");
        require(_threshold > 0 && _threshold <= _owners.length, "Invalid threshold");

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner address");
            require(!isOwner[owner], "Duplicate owner address");
            
            isOwner[owner] = true;
            owners.push(owner);
            ownerToIndex[owner] = i; // Store the owner's index
        }
        threshold = _threshold;
        emit ThresholdChanged(_threshold);
    }
    
    // --- Policy and Role Management Functions ---
    
    /**
     * @dev PolicyManager 설정 (소유자만 호출 가능)
     * @param _policyManager PolicyManager 컨트랙트 주소
     */
    function setPolicyManager(address _policyManager) external onlyOwner {
        require(_policyManager != address(0), "Invalid policy manager address");
        address oldManager = policyManager;
        policyManager = _policyManager;
        emit PolicyManagerUpdated(oldManager, _policyManager);
    }
    
    /**
     * @dev Policy 컨트랙트 설정 (소유자만 호출 가능)
     * @param _policyContract Policy 컨트랙트 주소
     */
    function setPolicyContract(address _policyContract) external onlyOwner {
        require(_policyContract != address(0), "Invalid policy contract address");
        address oldPolicy = policyContract;
        policyContract = _policyContract;
        emit PolicyContractUpdated(oldPolicy, _policyContract);
    }
    
    /**
     * @dev Roles 컨트랙트 설정 (소유자만 호출 가능)
     * @param _rolesContract Roles 컨트랙트 주소
     */
    function setRolesContract(address _rolesContract) external onlyOwner {
        require(_rolesContract != address(0), "Invalid roles contract address");
        address oldRoles = rolesContract;
        rolesContract = _rolesContract;
        emit RolesContractUpdated(oldRoles, _rolesContract);
    }
    
    /**
     * @dev PolicyManager를 통한 정책과 권한 컨트랙트 업데이트
     * @param _policyContract 새로운 Policy 컨트랙트 주소
     * @param _rolesContract 새로운 Roles 컨트랙트 주소
     */
    function updatePolicyAndRoles(address _policyContract, address _rolesContract) external onlyOwner {
        require(policyManager != address(0), "Policy manager not set");
        require(_policyContract != address(0), "Invalid policy contract address");
        require(_rolesContract != address(0), "Invalid roles contract address");
        
        address oldPolicy = policyContract;
        address oldRoles = rolesContract;
        
        policyContract = _policyContract;
        rolesContract = _rolesContract;
        
        emit PolicyContractUpdated(oldPolicy, _policyContract);
        emit RolesContractUpdated(oldRoles, _rolesContract);
    }

    // --- Receive Ether Function ---
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // --- External Functions (Proposing and Confirming) ---
    
    function submitTransaction(address to, uint value, bytes calldata data) external onlyOwner {
        uint txIndex = transactions.length;
        // FIX: Removed the confirmations mapping from the struct creation.
        transactions.push(Transaction({
            to: to,
            value: value,
            data: data,
            executed: false,
            confirmCount: 0
        }));
        emit TransactionSubmitted(txIndex, msg.sender, to, value, data);
    }

    function confirmTransaction(uint txIndex) external onlyOwner txExists(txIndex) notExecuted(txIndex) notConfirmed(txIndex) nonReentrant {
        Transaction storage txn = transactions[txIndex];
        // FIX: Use the top-level confirmations mapping.
        confirmations[txIndex][msg.sender] = true;
        txn.confirmCount++;

        emit TransactionConfirmed(txIndex, msg.sender);

        if (txn.confirmCount >= threshold) {
            _executeTransaction(txIndex);
        }
    }

    function revokeConfirmation(uint txIndex) external onlyOwner txExists(txIndex) notExecuted(txIndex) {
        // FIX: Use the top-level confirmations mapping.
        require(confirmations[txIndex][msg.sender], "You have not confirmed this transaction");

        confirmations[txIndex][msg.sender] = false;
        transactions[txIndex].confirmCount--;

        emit TransactionRevoked(txIndex, msg.sender);
    }

    // --- Management Transaction Functions ---
    
    function proposeAddOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        require(!isOwner[newOwner], "Already an owner");

        uint txIndex = managementTransactions.length;
        managementTransactions.push(ManagementTransaction({
            txType: ManagementType.AddOwner,
            targetAddress: newOwner,
            newThreshold: 0,
            executed: false,
            confirmCount: 0
        }));
        
        emit ManagementTransactionSubmitted(txIndex, msg.sender, uint8(ManagementType.AddOwner), newOwner, 0);
    }

    function proposeRemoveOwner(address ownerToRemove) external onlyOwner {
        require(isOwner[ownerToRemove], "Not an owner");
        require(owners.length > 1, "Cannot remove the last owner");

        uint txIndex = managementTransactions.length;
        managementTransactions.push(ManagementTransaction({
            txType: ManagementType.RemoveOwner,
            targetAddress: ownerToRemove,
            newThreshold: 0,
            executed: false,
            confirmCount: 0
        }));
        
        emit ManagementTransactionSubmitted(txIndex, msg.sender, uint8(ManagementType.RemoveOwner), ownerToRemove, 0);
    }

    function proposeChangeThreshold(uint newThreshold) external onlyOwner {
        require(newThreshold > 0 && newThreshold <= owners.length, "Invalid new threshold");
        require(newThreshold != threshold, "New threshold must be different from current threshold");

        uint txIndex = managementTransactions.length;
        managementTransactions.push(ManagementTransaction({
            txType: ManagementType.ChangeThreshold,
            targetAddress: address(0),
            newThreshold: newThreshold,
            executed: false,
            confirmCount: 0
        }));
        
        emit ManagementTransactionSubmitted(txIndex, msg.sender, uint8(ManagementType.ChangeThreshold), address(0), newThreshold);
    }

    function confirmManagementTransaction(uint txIndex) external onlyOwner mgmtTxExists(txIndex) mgmtNotExecuted(txIndex) mgmtNotConfirmed(txIndex) nonReentrant {
        ManagementTransaction storage mgmtTxn = managementTransactions[txIndex];
        managementConfirmations[txIndex][msg.sender] = true;
        mgmtTxn.confirmCount++;

        emit ManagementTransactionConfirmed(txIndex, msg.sender);

        if (mgmtTxn.confirmCount >= threshold) {
            _executeManagementTransaction(txIndex);
        }
    }

    function revokeManagementConfirmation(uint txIndex) external onlyOwner mgmtTxExists(txIndex) mgmtNotExecuted(txIndex) {
        require(managementConfirmations[txIndex][msg.sender], "You have not confirmed this management transaction");

        managementConfirmations[txIndex][msg.sender] = false;
        managementTransactions[txIndex].confirmCount--;

        emit ManagementTransactionRevoked(txIndex, msg.sender);
    }

    // --- Internal Management Functions (Only callable by contract) ---

    function _addOwner(address newOwner) internal {
        require(newOwner != address(0), "Invalid address");
        require(!isOwner[newOwner], "Already an owner");

        isOwner[newOwner] = true;
        ownerToIndex[newOwner] = owners.length;
        owners.push(newOwner);
        
        // 임계값이 소유자 수보다 크면 자동으로 조정
        if (threshold > owners.length) {
            threshold = owners.length;
            emit ThresholdChanged(threshold);
        }
        
        emit OwnerAdded(newOwner);
    }

    function _removeOwner(address ownerToRemove) internal {
        require(isOwner[ownerToRemove], "Not an owner");
        require(owners.length > 1, "Cannot remove the last owner");

        isOwner[ownerToRemove] = false;
        
        uint index = ownerToIndex[ownerToRemove];
        address lastOwner = owners[owners.length - 1];

        owners[index] = lastOwner;
        ownerToIndex[lastOwner] = index;

        owners.pop();
        delete ownerToIndex[ownerToRemove];
        
        if (threshold > owners.length && owners.length > 0) {
            threshold = owners.length;
            emit ThresholdChanged(threshold);
        }

        emit OwnerRemoved(ownerToRemove);
    }
    
    function _changeThreshold(uint newThreshold) internal {
        require(newThreshold > 0 && newThreshold <= owners.length, "Invalid new threshold");
        require(newThreshold != threshold, "New threshold must be different from current threshold");
        threshold = newThreshold;
        emit ThresholdChanged(newThreshold);
    }


    // --- Internal Functions ---
    function _executeTransaction(uint txIndex) internal nonReentrant {
        Transaction storage txn = transactions[txIndex];
        
        (bool success, ) = txn.to.call{value: txn.value}(txn.data);

        if (success) {
            txn.executed = true;
            emit TransactionExecuted(txIndex);
        } else {
            // 실행 실패 시 executed 상태를 false로 유지하여 재시도 가능
            // confirmCount는 그대로 유지하여 다시 임계값에 도달하면 재실행 시도
            emit TransactionFailed(txIndex);
        }
    }

    function _executeManagementTransaction(uint txIndex) internal nonReentrant {
        ManagementTransaction storage mgmtTxn = managementTransactions[txIndex];
        
        if (mgmtTxn.txType == ManagementType.AddOwner) {
            _addOwner(mgmtTxn.targetAddress);
        } else if (mgmtTxn.txType == ManagementType.RemoveOwner) {
            _removeOwner(mgmtTxn.targetAddress);
        } else if (mgmtTxn.txType == ManagementType.ChangeThreshold) {
            _changeThreshold(mgmtTxn.newThreshold);
        }
        
        mgmtTxn.executed = true;
        emit ManagementTransactionExecuted(txIndex);
    }

    // --- Getter Functions ---
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransaction(uint txIndex) public view returns (address to, uint value, bytes memory data, bool executed, uint confirmCount) {
        Transaction storage txn = transactions[txIndex];
        return (txn.to, txn.value, txn.data, txn.executed, txn.confirmCount);
    }

    function getTransactionCount() public view returns (uint) {
        return transactions.length;
    }

    function isConfirmed(uint txIndex, address owner) public view returns (bool) {
        return confirmations[txIndex][owner];
    }

    function getConfirmationCount(uint txIndex) public view returns (uint) {
        return transactions[txIndex].confirmCount;
    }

    // --- Management Transaction Getter Functions ---
    function getManagementTransaction(uint txIndex) public view returns (uint8 txType, address targetAddress, uint newThreshold, bool executed, uint confirmCount) {
        ManagementTransaction storage mgmtTxn = managementTransactions[txIndex];
        return (uint8(mgmtTxn.txType), mgmtTxn.targetAddress, mgmtTxn.newThreshold, mgmtTxn.executed, mgmtTxn.confirmCount);
    }

    function getManagementTransactionCount() public view returns (uint) {
        return managementTransactions.length;
    }

    function isManagementConfirmed(uint txIndex, address owner) public view returns (bool) {
        return managementConfirmations[txIndex][owner];
    }

    function getManagementConfirmationCount(uint txIndex) public view returns (uint) {
        return managementTransactions[txIndex].confirmCount;
    }
    
    // --- Policy and Role Integration Functions ---
    
    /**
     * @dev 정책과 권한을 통합한 트랜잭션 검증
     * @param to 수신자 주소
     * @param value 전송할 ETH 금액
     * @param data 트랜잭션 데이터
     * @return bool 검증 통과 여부
     * @return string 검증 실패 시 이유
     */
    function validateTransactionWithPolicy(
        address to,
        uint value,
        bytes calldata data
    ) public view returns (bool, string memory) {
        // Policy 컨트랙트가 설정되어 있으면 정책 검증
        if (policyContract != address(0)) {
            // Policy 컨트랙트의 validateTransaction 함수 호출
            (bool success, bytes memory returnData) = policyContract.staticcall(
                abi.encodeWithSignature(
                    "validateTransaction(address,address,uint256,address)",
                    msg.sender,
                    to,
                    value,
                    address(0) // ETH 전송이므로 토큰 주소는 0
                )
            );
            
            if (success) {
                (bool policyApproved, string memory reason) = abi.decode(returnData, (bool, string));
                if (!policyApproved) {
                    return (false, reason);
                }
            }
        }
        
        // Roles 컨트랙트가 설정되어 있으면 권한 검증
        if (rolesContract != address(0)) {
            // Roles 컨트랙트의 canExecuteTransaction 함수 호출
            (bool success, bytes memory returnData) = rolesContract.staticcall(
                abi.encodeWithSignature("canExecuteTransaction(address)", msg.sender)
            );
            
            if (success) {
                bool canExecute = abi.decode(returnData, (bool));
                if (!canExecute) {
                    return (false, "Insufficient role permissions");
                }
            }
        }
        
        return (true, "Transaction approved");
    }
    
    /**
     * @dev 정책과 권한을 통합한 트랜잭션 제안
     * @param to 수신자 주소
     * @param value 전송할 ETH 금액
     * @param data 트랜잭션 데이터
     */
    function submitTransactionWithPolicy(
        address to,
        uint value,
        bytes calldata data
    ) external onlyOwner {
        // 정책과 권한 검증
        (bool isValid, string memory reason) = validateTransactionWithPolicy(to, value, data);
        require(isValid, reason);
        
        // 검증 통과 시 일반 트랜잭션 제안
        submitTransaction(to, value, data);
    }
    
    /**
     * @dev 정책과 권한 정보 조회
     * @return _policyManager PolicyManager 주소
     * @return _policyContract Policy 컨트랙트 주소
     * @return _rolesContract Roles 컨트랙트 주소
     */
    function getPolicyAndRolesInfo() public view returns (
        address _policyManager,
        address _policyContract,
        address _rolesContract
    ) {
        return (policyManager, policyContract, rolesContract);
    }
}

