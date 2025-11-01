// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MultiSig with Pluggable PolicyManager
/// @notice 기본 멀티시그 흐름에, 임계값 달성 시 PolicyManager 룰체인 검증을 추가한다.
contract MultiSig {
    // --- Events ---
    event Deposit(address indexed sender, uint256 amount, uint256 balance);

    event TransactionSubmitted(uint indexed txIndex, address indexed proposer, address to, uint256 value, bytes data);
    event TransactionConfirmed(uint indexed txIndex, address indexed owner);
    event TransactionRevoked(uint indexed txIndex, address indexed owner);
    event TransactionExecuted(uint indexed txIndex);
    event TransactionFailed(uint indexed txIndex);

    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ThresholdChanged(uint newThreshold);
    event PolicyManagerChanged(address indexed pm);

    // --- State ---
    address[] public owners;
    mapping(address => bool) public isOwner;
    mapping(address => uint256) private ownerIndex; // 0..n-1

    uint256 public threshold;
    address public policyManager; // optional

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmCount;
    }
    Transaction[] public transactions;

    mapping(uint256 => mapping(address => bool)) public confirmations; // txIndex => owner => confirmed

    // --- Modifiers ---
    modifier onlyOwner() {
        require(isOwner[msg.sender], "MS: not owner");
        _;
    }

    modifier onlySelf() {
        require(msg.sender == address(this), "MS: only self");
        _;
    }

    modifier txExists(uint txIndex) {
        require(txIndex < transactions.length, "MS: tx !exist");
        _;
    }

    modifier notExecuted(uint txIndex) {
        require(!transactions[txIndex].executed, "MS: executed");
        _;
    }

    modifier notConfirmed(uint txIndex) {
        require(!confirmations[txIndex][msg.sender], "MS: already confirmed");
        _;
    }

    // --- Constructor ---
    constructor(address[] memory _owners, uint256 _threshold, address _policyManager) {
        require(_owners.length > 0, "MS: owners required");
        require(_threshold > 0 && _threshold <= _owners.length, "MS: invalid threshold");

        for (uint i; i < _owners.length; i++) {
            address o = _owners[i];
            require(o != address(0), "MS: zero owner");
            require(!isOwner[o], "MS: dup owner");
            isOwner[o] = true;
            ownerIndex[o] = owners.length;
            owners.push(o);
        }
        threshold = _threshold;
        policyManager = _policyManager; // 0 가능
        emit ThresholdChanged(_threshold);
        emit PolicyManagerChanged(_policyManager);
    }

    // --- Receive Ether ---
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // --- Submit/Confirm/Revoke/Execute ---
    function submitTransaction(address to, uint256 value, bytes calldata data) external onlyOwner {
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

    function confirmTransaction(uint txIndex)
        external
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
        notConfirmed(txIndex)
    {
        confirmations[txIndex][msg.sender] = true;
        transactions[txIndex].confirmCount += 1;
        emit TransactionConfirmed(txIndex, msg.sender);

        if (transactions[txIndex].confirmCount >= threshold) {
            _tryExecute(txIndex);
        }
    }

    function revokeConfirmation(uint txIndex)
        external
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
    {
        require(confirmations[txIndex][msg.sender], "MS: not confirmed");
        confirmations[txIndex][msg.sender] = false;
        transactions[txIndex].confirmCount -= 1;
        emit TransactionRevoked(txIndex, msg.sender);
    }

    function executeTransaction(uint txIndex)
        external
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
    {
        require(transactions[txIndex].confirmCount >= threshold, "MS: not enough confs");
        _tryExecute(txIndex);
    }

    // --- Internal execute with Policy check ---
    function _tryExecute(uint txIndex) internal {
        Transaction storage txn = transactions[txIndex];

        // 1) 정책 체크 (있다면)
        if (policyManager != address(0)) {
            address[] memory confirmed = _gatherConfirmed(txIndex);
            // to/proposer/owners도 넘길 수 있도록 확장 포맷 유지
            (bool ok, bytes memory ret) = policyManager.staticcall(
                abi.encodeWithSignature(
                    "canExecute(address,uint256,bytes,address,address[],address[])",
                    txn.to,
                    txn.value,
                    txn.data,
                    msg.sender,      // proposer: 마지막 확인자(트리거)
                    owners,
                    confirmed
                )
            );
            require(ok && ret.length == 32 && abi.decode(ret, (bool)), "MS: policy denied");
        }

        // 2) 실행 (재진입 방지: 먼저 플래그)
        txn.executed = true;

        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        if (!success) {
            txn.executed = false; // 안전하게 되돌려 주고 revert
            emit TransactionFailed(txIndex);
            revert("MS: call failed");
        }
        emit TransactionExecuted(txIndex);
    }

    function _gatherConfirmed(uint txIndex) internal view returns (address[] memory arr) {
        uint n = owners.length;
        uint cnt;
        // 1-pass count
        for (uint i; i < n; i++) {
            if (confirmations[txIndex][owners[i]]) cnt++;
        }
        arr = new address[](cnt);
        // 2-pass fill
        uint k;
        for (uint i; i < n; i++) {
            address o = owners[i];
            if (confirmations[txIndex][o]) {
                arr[k++] = o;
            }
        }
    }

    // --- Self-call only (관리 변경) ---
    function addOwner(address newOwner) external onlySelf {
        require(newOwner != address(0), "MS: zero owner");
        require(!isOwner[newOwner], "MS: dup");
        isOwner[newOwner] = true;
        ownerIndex[newOwner] = owners.length;
        owners.push(newOwner);
        if (threshold > owners.length) {
            threshold = owners.length;
            emit ThresholdChanged(threshold);
        }
        emit OwnerAdded(newOwner);
    }

    function removeOwner(address ownerToRemove) external onlySelf {
        require(isOwner[ownerToRemove], "MS: not owner");
        require(owners.length > 1, "MS: last owner");
        // swap & pop
        uint idx = ownerIndex[ownerToRemove];
        address last = owners[owners.length - 1];
        owners[idx] = last;
        ownerIndex[last] = idx;
        owners.pop();
        delete ownerIndex[ownerToRemove];
        isOwner[ownerToRemove] = false;

        if (threshold > owners.length) {
            threshold = owners.length;
            emit ThresholdChanged(threshold);
        }
        emit OwnerRemoved(ownerToRemove);
    }

    function changeThreshold(uint newThreshold) external onlySelf {
        require(newThreshold > 0 && newThreshold <= owners.length, "MS: bad threshold");
        threshold = newThreshold;
        emit ThresholdChanged(newThreshold);
    }

    function setPolicyManager(address pm) external onlySelf {
        policyManager = pm; // 0 주소 허용: 정책 미적용 모드
        emit PolicyManagerChanged(pm);
    }

    // --- Views ---
    function getOwners() external view returns (address[] memory) { return owners; }
    function getTransaction(uint txIndex) external view returns (address to, uint value, bytes memory data, bool executed, uint confirmCount) {
        Transaction storage t = transactions[txIndex];
        return (t.to, t.value, t.data, t.executed, t.confirmCount);
    }
    function getTransactionCount() external view returns (uint) { return transactions.length; }

    function getConfirmedSigners(uint txIndex) external view returns (address[] memory) {
        return _gatherConfirmed(txIndex);
    }
}
