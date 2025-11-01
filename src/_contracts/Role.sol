// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Role - 직급 레지스트리 및 포함 규칙
/// @notice 관리자는 주소를 부장/대리/사원 배열(세트)에 추가/삭제할 수 있다.
///         PolicyManager가 CONFIRMED_ONLY 규칙으로 호출한다.
///         함수 시그니처는 (address[] calldata confirmed) -> (bool) 형태를 따른다.
contract Role {
    address public owner;

    mapping(address => bool) private heads;      // 부장
    mapping(address => bool) private managers;   // 대리
    mapping(address => bool) private staffs;     // 사원

    event OwnerChanged(address indexed newOwner);
    event HeadAdded(address indexed account);
    event HeadRemoved(address indexed account);
    event ManagerAdded(address indexed account);
    event ManagerRemoved(address indexed account);
    event StaffAdded(address indexed account);
    event StaffRemoved(address indexed account);

    modifier onlyOwner() {
        require(msg.sender == owner, "Role: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Role: zero addr");
        owner = newOwner;
        emit OwnerChanged(newOwner);
    }

    // --- 부장(Head)
    function addHead(address a) external onlyOwner {
        heads[a] = true;
        emit HeadAdded(a);
    }
    function removeHead(address a) external onlyOwner {
        heads[a] = false;
        emit HeadRemoved(a);
    }

    // --- 대리(Manager)
    function addManager(address a) external onlyOwner {
        managers[a] = true;
        emit ManagerAdded(a);
    }
    function removeManager(address a) external onlyOwner {
        managers[a] = false;
        emit ManagerRemoved(a);
    }

    // --- 사원(Staff)
    function addStaff(address a) external onlyOwner {
        staffs[a] = true;
        emit StaffAdded(a);
    }
    function removeStaff(address a) external onlyOwner {
        staffs[a] = false;
        emit StaffRemoved(a);
    }

    // --- 포함 검사 (CONFIRMED_ONLY 규칙 대상)
    function includeHeadSign(address[] calldata confirmed) external view returns (bool) {
        for (uint i; i < confirmed.length; i++) {
            if (heads[confirmed[i]]) return true;
        }
        return false;
    }

    function includeManagerSign(address[] calldata confirmed) external view returns (bool) {
        for (uint i; i < confirmed.length; i++) {
            if (managers[confirmed[i]]) return true;
        }
        return false;
    }

    function includeStaffSign(address[] calldata confirmed) external view returns (bool) {
        for (uint i; i < confirmed.length; i++) {
            if (staffs[confirmed[i]]) return true;
        }
        return false;
    }

    // --- 조회 보조
    function isHead(address a) external view returns (bool) { return heads[a]; }
    function isManager(address a) external view returns (bool) { return managers[a]; }
    function isStaff(address a) external view returns (bool) { return staffs[a]; }
}
