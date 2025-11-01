// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PolicyManager - 룰 체인 관리 및 검증 실행기
/// @notice 프론트에서 setRules로 룰 배열을 설정/교체한다.
///         멀티시그는 임계값 도달 시 canExecute(...)를 호출해 최종 허용 여부를 확인한다.
contract PolicyManager {
    enum ParamKind { VALUE_ONLY, CONFIRMED_ONLY }

    struct Rule {
        address target;   // Policy 또는 Role 컨트랙트 주소
        bytes4 selector;  // 호출할 함수 시그니처의 selector
        ParamKind kind;   // 인자 전달 유형
    }

    address public admin;
    Rule[] public rules;

    event AdminChanged(address indexed newAdmin);
    event RulesCleared();
    event RuleAdded(address indexed target, bytes4 selector, ParamKind kind);

    modifier onlyAdmin() {
        require(msg.sender == admin, "PolicyManager: not admin");
        _;
    }

    constructor(address _admin) {
        require(_admin != address(0), "PolicyManager: zero admin");
        admin = _admin;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "PolicyManager: zero admin");
        admin = newAdmin;
        emit AdminChanged(newAdmin);
    }

    function clearRules() public onlyAdmin {
        delete rules;
        emit RulesCleared();
    }

    /// @notice 규칙 체인을 통째로 교체한다.
    function setRules(Rule[] calldata newRules) external onlyAdmin {
        delete rules;
        for (uint i; i < newRules.length; i++) {
            rules.push(newRules[i]);
            emit RuleAdded(newRules[i].target, newRules[i].selector, newRules[i].kind);
        }
    }

    /// @notice 규칙 하나씩 추가 (유연한 프론트 구성용)
    function addRule(address target, bytes4 selector, ParamKind kind) external onlyAdmin {
        rules.push(Rule({target: target, selector: selector, kind: kind}));
        emit RuleAdded(target, selector, kind);
    }

    function getRules() external view returns (Rule[] memory) {
        return rules;
    }

    /// @dev 멀티시그가 호출: 모든 룰이 true면 true 반환
    /// @param _to 트랜잭션 대상 주소
    /// @param value 트랜잭션 value(wei)
    /// @param _data 트랜잭션 calldata
    /// @param _proposer 실행 트리거(마지막 컨펌러 등)
    /// @param _owners 멀티시그 오너 목록
    /// @param confirmed 해당 트랜잭션 컨펌러 목록
    function canExecute(
        address _to,
        uint256 value,
        bytes calldata _data,
        address _proposer,
        address[] calldata _owners,
        address[] calldata confirmed
    ) external view returns (bool) {
        // _to, _data, _proposer, _owners 는 현재 룰에서는 안 쓰지만
        // 확장성을 위해 남겨둠.

        for (uint i; i < rules.length; i++) {
            Rule memory r = rules[i];
            (bool ok, bytes memory ret) = _staticCheck(r, value, confirmed);
            if (!ok) return false;

            if (ret.length != 32) return false;
            if (!abi.decode(ret, (bool))) return false;
        }
        return true;
    }

    function _staticCheck(
        Rule memory r,
        uint256 value,
        address[] calldata confirmed
    ) internal view returns (bool success, bytes memory ret) {
        if (r.kind == ParamKind.VALUE_ONLY) {
            // function f(uint256) returns (bool)
            bytes memory callData = abi.encodeWithSelector(r.selector, value);
            (success, ret) = r.target.staticcall(callData);
        } else {
            // ParamKind.CONFIRMED_ONLY
            // function f(address[]) returns (bool)
            bytes memory callData = abi.encodeWithSelector(r.selector, confirmed);
            (success, ret) = r.target.staticcall(callData);
        }
    }
}
