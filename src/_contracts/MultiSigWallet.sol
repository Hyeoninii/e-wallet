// SPDX-License-Identifier: MIT
// COMPILER VERSION UPDATED to match the imported contract's requirement.
pragma solidity ^0.8.20;

// Import ReentrancyGuard from OpenZeppelin to prevent re-entry attacks.
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.2/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Highly Improved Multi-Signature Wallet
 * @dev This contract has been hardened against front-running, gas limit DoS, and reentrancy attacks.
 */
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

    Transaction[] public transactions;

    // FIX: Moved the confirmations mapping out of the struct.
    // This mapping stores confirmation status for each transaction index and each owner.
    mapping(uint => mapping(address => bool)) public confirmations;

    // --- Modifiers ---
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }
    
    modifier onlyWallet() {
        require(msg.sender == address(this), "Only the wallet itself can call this");
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

    // --- Owner Management Functions (Only callable by the wallet itself via proposals) ---

    function addOwner(address newOwner) public onlyWallet {
        require(newOwner != address(0), "Invalid address");
        require(!isOwner[newOwner], "Already an owner");

        isOwner[newOwner] = true;
        ownerToIndex[newOwner] = owners.length;
        owners.push(newOwner);
        emit OwnerAdded(newOwner);
    }

    function removeOwner(address ownerToRemove) public onlyWallet {
        require(isOwner[ownerToRemove], "Not an owner");

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
    
    function changeThreshold(uint newThreshold) public onlyWallet {
        require(newThreshold > 0 && newThreshold <= owners.length, "Invalid new threshold");
        threshold = newThreshold;
        emit ThresholdChanged(newThreshold);
    }


    // --- Internal Functions ---
    function _executeTransaction(uint txIndex) internal nonReentrant {
        Transaction storage txn = transactions[txIndex];
        
        txn.executed = true;

        (bool success, ) = txn.to.call{value: txn.value}(txn.data);

        if (success) {
            emit TransactionExecuted(txIndex);
        } else {
            emit TransactionFailed(txIndex);
        }
    }

    // --- Getter Functions ---
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransaction(uint txIndex) public view returns (address to, uint value, bytes memory data, bool executed, uint confirmCount) {
        Transaction storage txn = transactions[txIndex];
        return (txn.to, txn.value, txn.data, txn.executed, txn.confirmCount);
    }
}

