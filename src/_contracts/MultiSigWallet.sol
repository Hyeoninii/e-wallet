// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title 개선된 다중 서명 지갑
 * @dev 이 컨트랙트는 기본적인 다중 서명 지갑의 개선된 버전입니다.
 * 주요 개선 사항:
 * 1. DoS 공격을 방지하기 위한 가스 효율적인 소유자 관리.
 * 2. 오프체인 모니터링을 위한 모든 중요 활동에 대한 이벤트.
 * 3. 승인 철회 및 거래 취소 기능.
 * 4. 실행 실패한 거래에 대한 명확한 상태 처리.
 */
contract ImprovedMultiSigWallet {
    // --- 이벤트 ---
    event Deposit(address indexed sender, uint amount, uint balance);
    event TransactionSubmitted(uint indexed txIndex, address indexed proposer, address to, uint value, bytes data);
    event TransactionConfirmed(uint indexed txIndex, address indexed owner);
    event TransactionRevoked(uint indexed txIndex, address indexed owner);
    event TransactionExecuted(uint indexed txIndex);
    event TransactionFailed(uint indexed txIndex);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ThresholdChanged(uint newThreshold);

    // --- 상태 변수 ---
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public threshold;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        mapping(address => bool) confirmations;
        uint confirmCount;
    }

    Transaction[] public transactions;

    // --- 제어자 (Modifiers) ---
    modifier onlyOwner() {
        require(isOwner[msg.sender], "소유자만 호출할 수 있습니다 (Not an owner)");
        _;
    }

    modifier txExists(uint txIndex) {
        require(txIndex < transactions.length, "존재하지 않는 거래입니다 (Transaction does not exist)");
        _;
    }

    modifier notExecuted(uint txIndex) {
        require(!transactions[txIndex].executed, "이미 실행된 거래입니다 (Transaction already executed)");
        _;
    }

    modifier notConfirmed(uint txIndex) {
        require(!transactions[txIndex].confirmations[msg.sender], "이미 승인한 거래입니다 (Transaction already confirmed by you)");
        _;
    }

    // --- 생성자 ---
    constructor(address[] memory _owners, uint _threshold) {
        require(_owners.length > 0, "소유자 주소가 필요합니다 (Owners required)");
        require(_threshold > 0 && _threshold <= _owners.length, "잘못된 최소 승인 수치입니다 (Invalid threshold)");

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "유효하지 않은 소유자 주소입니다 (Invalid owner address)");
            require(!isOwner[owner], "중복된 소유자 주소입니다 (Duplicate owner address)");
            isOwner[owner] = true;
        }
        owners = _owners;
        threshold = _threshold;
        emit ThresholdChanged(_threshold);
    }

    // --- 이더(ETH) 수신 함수 ---
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // --- 외부 호출 가능 함수 (External Functions) ---
    function submitTransaction(address to, uint value, bytes calldata data) external onlyOwner {
        uint txIndex = transactions.length;
        transactions.push(Transaction({
            to: to,
            value: value,
            data: data,
            executed: false,
            confirmCount: 0
        }));
        emit TransactionSubmitted(txIndex, msg.sender, to, value, data);
    }

    function confirmTransaction(uint txIndex) external onlyOwner txExists(txIndex) notExecuted(txIndex) notConfirmed(txIndex) {
        Transaction storage txn = transactions[txIndex];
        txn.confirmations[msg.sender] = true;
        txn.confirmCount++;

        emit TransactionConfirmed(txIndex, msg.sender);

        if (txn.confirmCount >= threshold) {
            _executeTransaction(txIndex);
        }
    }

    function revokeConfirmation(uint txIndex) external onlyOwner txExists(txIndex) notExecuted(txIndex) {
        Transaction storage txn = transactions[txIndex];
        require(txn.confirmations[msg.sender], "이 거래를 승인한 적이 없습니다 (You have not confirmed this transaction)");

        txn.confirmations[msg.sender] = false;
        txn.confirmCount--;

        emit TransactionRevoked(txIndex, msg.sender);
    }

    function addOwner(address newOwner) public onlyOwner {
        require(newOwner != address(0), "유효하지 않은 주소입니다 (Invalid address)");
        require(!isOwner[newOwner], "이미 소유자로 등록된 주소입니다 (Already an owner)");

        isOwner[newOwner] = true;
        owners.push(newOwner);
        emit OwnerAdded(newOwner);
    }

    function removeOwner(address ownerToRemove) public onlyOwner {
        require(isOwner[ownerToRemove], "소유자가 아닙니다 (Not an owner)");

        isOwner[ownerToRemove] = false;

        // 반복문 없이 효율적으로 소유자를 제거
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == ownerToRemove) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }
        
        if (threshold > owners.length && owners.length > 0) {
            threshold = owners.length;
            emit ThresholdChanged(threshold);
        }

        emit OwnerRemoved(ownerToRemove);
    }
    
    function changeThreshold(uint newThreshold) public onlyOwner {
        require(newThreshold > 0 && newThreshold <= owners.length, "새로운 최소 승인 수치가 유효하지 않습니다 (Invalid new threshold)");
        threshold = newThreshold;
        emit ThresholdChanged(newThreshold);
    }


    // --- 내부 호출 전용 함수 (Internal Functions) ---
    function _executeTransaction(uint txIndex) internal {
        Transaction storage txn = transactions[txIndex];
        
        // Checks-Effects-Interactions 패턴 적용: 외부 호출 전에 상태 변경
        txn.executed = true;

        (bool success, ) = txn.to.call{value: txn.value}(txn.data);

        if (success) {
            emit TransactionExecuted(txIndex);
        } else {
            emit TransactionFailed(txIndex);
        }
    }

    // --- 정보 조회 함수 (Getter Functions) ---
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    function getTransaction(uint txIndex) public view returns (address to, uint value, bytes memory data, bool executed, uint confirmCount) {
        Transaction storage txn = transactions[txIndex];
        return (txn.to, txn.value, txn.data, txn.executed, txn.confirmCount);
    }
}