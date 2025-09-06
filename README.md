# E-Wallet - 개인 암호화폐 지갑

안전하고 간편한 개인 암호화폐 지갑 애플리케이션입니다. MetaMask 없이도 완전히 독립적으로 작동하는 프론트엔드 전용 지갑입니다.

## 주요 기능

### 지갑 관리
- 새 지갑 생성: BIP39/BIP44 표준을 따른 HD 지갑 생성
- 지갑 복구: 니모닉 구문 또는 개인키로 지갑 복구
- 주소로 열기: 지갑 주소만으로 잔액 조회 (읽기 전용)
- 로컬 저장: 암호화된 로컬 스토리지에 지갑 정보 저장

### 보안 기능
- 니모닉 검증: 지갑 생성 시 니모닉 확인 단계
- 개인키 보호: 민감한 정보는 클라이언트에서만 처리
- 암호화 저장: 로컬 스토리지 데이터 암호화

### 트랜잭션 기능
- 잔액 조회: 실시간 ETH 잔액 확인
- 송금 기능: 개인키로 서명하여 ETH 전송
- 가스 설정: 사용자 정의 가스 가격 설정

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 빌드
```bash
npm run build
```

## 사용 방법

### 새 지갑 생성
1. 홈페이지에서 "새 지갑 생성" 클릭
2. 지갑 이름 입력
3. 생성된 니모닉을 안전한 곳에 기록
4. 니모닉 확인 단계 완료

### 지갑 복구
1. 홈페이지에서 "지갑 열기" 클릭
2. 개인키로 열기 선택
3. 지갑 이름과 개인키 입력
4. 지갑 복구 완료

### 주소로 지갑 열기
1. 홈페이지에서 "지갑 열기" 클릭
2. 주소로 열기 선택
3. 지갑 주소 입력
4. 잔액 및 정보 확인 (읽기 전용)

### 송금하기
1. 지갑 대시보드에서 "송금" 버튼 클릭
2. 수신 주소와 금액 입력
3. 가스 가격 설정 (선택사항)
4. 트랜잭션 전송

## 보안 고려사항

### 구현된 보안 기능
- 개인키는 서버로 전송되지 않음
- 모든 암호화 작업은 클라이언트에서 수행
- 니모닉 생성 시 사용자 확인 단계
- 로컬 스토리지 데이터 암호화

### 주의사항
- 개인키와 니모닉은 절대 다른 사람과 공유하지 마세요
- 안전한 환경에서만 지갑을 사용하세요
- 정기적으로 백업을 확인하세요
- 테스트넷에서만 사용하세요 (실제 자산 위험)

## 프로젝트 구조

```
src/
├── contexts/           # React Context (상태 관리)
│   └── WalletContext.jsx
├── pages/              # 페이지 컴포넌트
│   ├── HomePage.jsx
│   ├── CreateWalletPage.jsx
│   ├── RecoverWalletPage.jsx
│   └── WalletDashboard.jsx
├── utils/              # 유틸리티 함수
│   └── wallet.js
├── App.jsx             # 메인 앱 컴포넌트
└── main.jsx            # 앱 진입점
```

## 테스트

현재 Sepolia 테스트넷에서 테스트 중입니다.

### 테스트용 ETH 받기
- Sepolia Faucet에서 테스트 ETH 받기
- Alchemy Faucet에서도 가능

## 라이선스

MIT License

## 기여하기

1. Fork the Project
2. Create your Feature Branch (git checkout -b feature/AmazingFeature)
3. Commit your Changes (git commit -m 'Add some AmazingFeature')
4. Push to the Branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.

---

주의: 이 프로젝트는 교육 및 테스트 목적으로 제작되었습니다. 실제 자산을 사용하기 전에 충분한 테스트를 진행하세요.