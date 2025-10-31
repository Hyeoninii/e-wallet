# E-Wallet: 다중 서명 지갑 시스템

이더리움 기반의 고급 다중 서명(Multi-Signature) 지갑 시스템으로, 정책 관리 및 역할 기반 권한 관리 기능을 포함합니다.

## 📋 목차

- [개요](#개요)
- [시스템 아키텍처](#시스템-아키텍처)
- [주요 컨트랙트](#주요-컨트랙트)
- [주요 기능](#주요-기능)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [사용 방법](#사용-방법)
- [보안 기능](#보안-기능)
- [기술 스택](#기술-스택)

## 개요

이 프로젝트는 블록체인 기반의 다중 서명 지갑 시스템으로, 다음과 같은 특징을 제공합니다:

- **다중 서명 트랜잭션**: 여러 소유자의 승인이 필요한 안전한 트랜잭션 처리
- **정책 관리**: 트랜잭션 금액 제한, 일일 한도, 블랙리스트 등 다양한 정책 적용
- **역할 기반 권한 관리**: 역할 시스템을 통한 세밀한 권한 제어
- **관리 트랜잭션**: 소유자 추가/제거, 임계값 변경 등의 관리 작업도 다중 서명으로 처리

## 시스템 아키텍처

시스템은 4개의 주요 스마트 컨트랙트로 구성됩니다:

### 컨트랙트 구조

#### 1. MultiSigWallet (다중 서명 지갑 컨트랙트)
- 소유자 관리
- 트랜잭션 처리 (제안, 승인, 실행)
- 정책 통합 (Policy, Roles 컨트랙트 참조)

#### 2. PolicyManager (중앙 관리자)
- 정책 배포 및 관리
- 역할 배포 및 관리
- 정책 체인 관리 (버전 히스토리 추적)

#### 3. Policy (정책 관리 컨트랙트)
- 금액 제한
- 일일 한도
- 블랙리스트 관리
- 토큰 제한

#### 4. Roles (역할 및 권한 관리 컨트랙트)
- 역할 관리
- 권한 관리
- 멤버 관리

### 컨트랙트 간 관계

- **MultiSigWallet**: 트랜잭션 제안, 실행 등 다중 서명 기반 전자지갑 기능
- **PolicyManager**: 정책과 역할 컨트랙트의 중앙 관리자로, 새 버전 배포 및 히스토리 관리, 정책(Policy)과 역할(Roles) 컨트랙트를 참조하여 트랜잭션 검증
- **Policy**: 트랜잭션에 대한 정책 규칙 검증
- **Roles**: 멤버의 역할과 권한 관리

## 주요 컨트랙트

### 1. MultiSigWallet.sol

핵심 다중 서명 지갑 컨트랙트입니다.

#### 주요 기능

- **트랜잭션 관리**
  - `submitTransaction()`: 트랜잭션 제안
  - `confirmTransaction()`: 트랜잭션 승인
  - `revokeConfirmation()`: 승인 취소
  - 자동 실행: 임계값 달성 시 자동 실행

- **관리 트랜잭션**
  - `proposeAddOwner()`: 소유자 추가 제안
  - `proposeRemoveOwner()`: 소유자 제거 제안
  - `proposeChangeThreshold()`: 임계값 변경 제안
  - 관리 트랜잭션도 다중 서명을 통해서만 실행

- **정책 및 역할 통합**
  - `submitTransactionWithPolicy()`: 정책 검증을 통한 트랜잭션 제안
  - `validateTransactionWithPolicy()`: 정책과 권한 검증

#### 상태 변수

```solidity
address[] public owners;              // 소유자 목록
mapping(address => bool) public isOwner;  // 소유자 여부
uint public threshold;                // 승인 임계값
address public policyManager;        // 정책 관리자 주소
address public policyContract;        // 정책 컨트랙트 주소
address public rolesContract;         // 역할 컨트랙트 주소
```

### 2. Policy.sol

트랜잭션 정책을 관리하는 컨트랙트입니다.

#### 주요 기능

- **정책 규칙**
  - 최대 트랜잭션 금액 제한
  - 일일 한도 관리
  - 토큰 허용 목록 관리
  - 주소 블랙리스트 관리

- **정책 검증**
  - `validateTransaction()`: 트랜잭션을 정책 규칙에 맞는지 검증

#### 상태 변수

```solidity
uint256 public maxTransactionAmount;  // 최대 트랜잭션 금액
uint256 public dailyLimit;           // 일일 한도
uint256 public dailySpent;           // 일일 사용 금액
mapping(address => bool) public allowedTokens;  // 허용된 토큰
mapping(address => bool) public blacklistedAddresses;  // 블랙리스트 주소
```

### 3. PolicyManager.sol

정책과 역할 컨트랙트의 중앙 관리자입니다.

#### 주요 기능

- **컨트랙트 배포**
  - `deployNewPolicy()`: 새로운 정책 컨트랙트 배포
  - `deployNewRoles()`: 새로운 역할 컨트랙트 배포
  - `deployNewPolicyAndRoles()`: 정책과 역할을 함께 배포

- **정책 체인 관리**
  - `policyHistory[]`: PolicyManager 컨트랙트 내부에 저장되는 정책 컨트랙트의 모든 버전 히스토리 배열
  - `rolesHistory[]`: PolicyManager 컨트랙트 내부에 저장되는 역할 컨트랙트의 모든 버전 히스토리 배열
  - `getPolicyHistory()`: 정책 컨트랙트 버전 히스토리 배열 조회
  - `getRolesHistory()`: 역할 컨트랙트 버전 히스토리 배열 조회
  - `getContractInfo()`: 현재 버전 정보 포함 컨트랙트 정보 조회
  - 새 버전 배포 시 이전 버전은 히스토리 배열에 보존되며, 현재 버전만 활성화
  - 모든 정책 및 역할 컨트랙트 버전의 주소를 배열로 추적하여 감사 및 롤백 가능

#### 상태 변수

```solidity
address[] public policyHistory;  // 정책 컨트랙트 버전 히스토리
address[] public rolesHistory;   // 역할 컨트랙트 버전 히스토리
address public policyContract;  // 현재 활성 정책 컨트랙트
address public rolesContract;   // 현재 활성 역할 컨트랙트
```

### 4. Roles.sol

역할 기반 권한 관리 컨트랙트입니다.

#### 주요 기능

- **역할 관리**
  - `createRole()`: 새로운 역할 생성
  - `deleteRole()`: 역할 삭제
  - `assignRole()`: 멤버에게 역할 할당
  - `removeRole()`: 멤버의 역할 제거

- **권한 관리**
  - `grantPermission()`: 역할에 권한 부여
  - `revokePermission()`: 역할의 권한 제거
  - 기본 권한 지원 (EXECUTE_TRANSACTION, APPROVE_TRANSACTION 등)

- **권한 검증**
  - `canExecuteTransaction()`: 트랜잭션 실행 권한 확인
  - `canApproveTransaction()`: 트랜잭션 승인 권한 확인

#### 역할 구조

```solidity
struct Role {
    string id;
    string name;
    string description;
    uint256 level;
    bool exists;
    uint256 memberCount;
}
```

## 주요 기능

### 1. 다중 서명 트랜잭션

- 여러 소유자가 트랜잭션을 제안하고 승인
- 지정된 임계값만큼의 승인이 모이면 자동 실행
- 각 소유자는 자신의 승인을 취소할 수 있음

### 2. 관리 트랜잭션

소유자 변경, 임계값 변경 등 지갑 설정 변경도 다중 서명을 통해 안전하게 처리됩니다.

### 3. 정책 기반 제한

- **금액 제한**: 최대 트랜잭션 금액 설정
- **일일 한도**: 일일 총 거래 금액 제한
- **토큰 제한**: 허용된 토큰만 거래 가능
- **블랙리스트**: 특정 주소로의 거래 차단

### 4. 역할 기반 권한

- 멤버에게 역할 할당
- 역할별로 다른 권한 부여
- 트랜잭션 실행, 승인, 정책 관리 등 세분화된 권한 제어

### 5. 정책 체인 관리

- **버전 히스토리 추적**: 모든 정책 및 역할 컨트랙트 버전의 주소를 블록체인에 기록
- **감사 가능성**: 과거 버전의 정책과 역할 설정을 추적 및 검토 가능
- **롤백 준비**: 필요시 이전 버전으로 되돌릴 수 있는 주소 정보 보관
- **버전 관리**: `getPolicyHistory()`, `getRolesHistory()` 함수로 모든 버전 조회

### 6. 통합 배포 시스템

`deployIntegratedMultiSigSystem()` 함수를 통해 모든 컨트랙트를 한 번에 배포하고 설정할 수 있습니다.


## 설치 및 실행

### 필수 요구사항

- Node.js 18+ 
- npm 또는 yarn
- MetaMask 또는 다른 Web3 지갑

### 설치

```bash
# 의존성 설치
npm install
```

### 개발 서버 실행

```bash
# 개발 서버 시작
npm run dev
```

### 빌드

```bash
# 프로덕션 빌드
npm run build
```

## 사용 방법

### 1. 다중 서명 지갑 생성

1. 웹 인터페이스에서 "다중 서명 지갑 생성" 클릭
2. 소유자 주소 목록 입력 (최소 2명)
3. 승인 임계값 설정 (소유자 수 이하)
4. 컨트랙트 배포 확인

### 2. 트랜잭션 제안 및 승인

1. "트랜잭션 제안" 페이지에서 수신자 주소와 금액 입력
2. 트랜잭션 제안 생성
3. 다른 소유자들이 "트랜잭션 확인"을 통해 승인
4. 임계값 달성 시 자동 실행

### 3. 정책 설정

1. "정책 정의" 페이지에서 정책 규칙 설정
   - 최대 트랜잭션 금액
   - 일일 한도
   - 허용 토큰 목록
   - 블랙리스트 주소
2. PolicyManager를 통해 정책 컨트랙트 배포
3. MultiSigWallet에 정책 컨트랙트 연결

### 4. 역할 관리

1. "역할 관리" 페이지에서 역할 생성
2. 각 역할에 권한 부여
3. 멤버에게 역할 할당

### 5. 관리 트랜잭션

- **소유자 추가**: 제안 → 다중 승인 → 실행
- **소유자 제거**: 제안 → 다중 승인 → 실행
- **임계값 변경**: 제안 → 다중 승인 → 실행

## 보안 기능

### 1. 입력 검증

- 주소 유효성 검사
- 중복 주소 방지
- 임계값 범위 검증
- 빈 배열 방지

### 2. 권한 검증

- `onlyOwner` 수정자를 통한 소유자만 접근 가능
- 정책 및 역할 통합 검증

### 3. 트랜잭션 상태 관리

- 이미 실행된 트랜잭션 재실행 방지
- 중복 승인 방지
- 승인 취소 기능

## 기술 스택

### 프론트엔드
- **React 18**: UI 프레임워크
- **React Router**: 라우팅
- **Ethers.js 6**: 이더리움 상호작용
- **Tailwind CSS**: 스타일링
- **Vite**: 빌드 도구

### 스마트 컨트랙트
- **Solidity ^0.8.20**: 스마트 컨트랙트 언어
- **OpenZeppelin**: 보안 라이브러리

### 개발 도구
- **Hardhat**: 스마트 컨트랙트 개발 프레임워크
- **ESLint**: 코드 품질 관리
