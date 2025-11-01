// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Policy - 금액 기준 정책 모음
/// @notice PolicyManager가 VALUE_ONLY 규칙으로 호출한다.
///         함수 시그니처는 (uint256 valueWei) -> (bool) 형태를 따른다.
contract Policy {
    uint256 private constant _0_01_ETH = 10_000_000_000_000_000;   // 0.01 ETH in wei
    uint256 private constant _0_1_ETH  = 100_000_000_000_000_000;  // 0.1  ETH
    uint256 private constant _1_ETH    = 1_000_000_000_000_000_000; // 1    ETH
    uint256 private constant _10_ETH   = 10_000_000_000_000_000_000;// 10   ETH

    function isOver0dot01(uint256 valueWei) external pure returns (bool) {
        return valueWei >= _0_01_ETH;
    }

    function isOver0dot1(uint256 valueWei) external pure returns (bool) {
        return valueWei >= _0_1_ETH;
    }

    function isOver1(uint256 valueWei) external pure returns (bool) {
        return valueWei >= _1_ETH;
    }

    function isOver10(uint256 valueWei) external pure returns (bool) {
        return valueWei >= _10_ETH;
    }
}
