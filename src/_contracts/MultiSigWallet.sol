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

    // --- State Variables ---
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public threshold;

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
}

