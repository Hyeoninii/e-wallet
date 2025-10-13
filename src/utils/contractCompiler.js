/**
 * 컨트랙트 컴파일 및 바이트코드 생성 유틸리티
 * 
 * 실제 프로덕션에서는 Hardhat, Remix, 또는 다른 컴파일러를 사용해야 합니다.
 * 이 파일은 개발 및 테스트 목적으로만 사용됩니다.
 */

import { MULTISIG_WALLET_BYTECODE } from './bytecode.js';

/**
 * MultiSigWallet 컨트랙트의 컴파일된 바이트코드
 * 
 * 주의: 이 바이트코드는 예시용입니다. 실제 배포를 위해서는:
 * 1. Hardhat을 사용하여 컴파일: npx hardhat compile
 * 2. Remix IDE에서 컴파일
 * 3. 또는 다른 Solidity 컴파일러 사용
 * 
 * 현재는 빈 바이트코드를 반환합니다.
 */
export const getMultiSigWalletBytecode = () => {
  // 별도 파일에서 바이트코드 가져오기
  console.log('=== 바이트코드 디버깅 ===');
  console.log('MULTISIG_WALLET_BYTECODE:', MULTISIG_WALLET_BYTECODE);
  console.log('바이트코드 길이:', MULTISIG_WALLET_BYTECODE.length);
  console.log('바이트코드 타입:', typeof MULTISIG_WALLET_BYTECODE);
  console.log('바이트코드 시작:', MULTISIG_WALLET_BYTECODE.substring(0, 20));
  console.log('=== 디버깅 끝 ===');
  
  if (MULTISIG_WALLET_BYTECODE === '0x' || MULTISIG_WALLET_BYTECODE.length < 10) {
    console.warn('⚠️  실제 컨트랙트 바이트코드가 설정되지 않았습니다.');
    console.warn('   src/utils/bytecode.js 파일에서 MULTISIG_WALLET_BYTECODE를 업데이트하세요.');
  }
  
  return MULTISIG_WALLET_BYTECODE;
};

/**
 * 컨트랙트 컴파일 가이드
 */
export const getCompilationGuide = () => {
  return {
    hardhat: {
      steps: [
        '1. Hardhat 설치: npm install --save-dev hardhat',
        '2. Hardhat 초기화: npx hardhat init',
        '3. contracts/MultiSigWallet.sol 파일 생성',
        '4. 컨트랙트 컴파일: npx hardhat compile',
        '5. artifacts/contracts/MultiSigWallet.sol/MultiSigWallet.json에서 바이트코드 추출'
      ]
    },
    remix: {
      steps: [
        '1. https://remix.ethereum.org 접속',
        '2. contracts 폴더에 MultiSigWallet.sol 파일 생성',
        '3. Solidity 컴파일러 탭에서 컴파일',
        '4. artifacts 폴더에서 바이트코드 복사'
      ]
    }
  };
};
