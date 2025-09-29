import { ethers } from 'ethers';
import { contractABI } from '../_contracts/MultiSigWallet.js';
import { getMultiSigWalletBytecode } from './contractCompiler.js';

/**
 * 다중 서명 지갑 컨트랙트 배포
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} privateKey - 배포자의 개인키
 * @param {string[]} owners - 소유자 주소 배열
 * @param {number} threshold - 승인 임계값
 * @returns {Promise<Object>} 배포된 컨트랙트 정보
 */
export const deployMultiSigWallet = async (provider, privateKey, owners, threshold) => {
  try {
    console.log('다중 서명 지갑 배포 시작:', { owners, threshold });
    
    // 지갑 생성
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('배포자 주소:', wallet.address);
    
    // 컨트랙트 팩토리 생성
    const contractFactory = new ethers.ContractFactory(
      contractABI,
      getMultiSigWalletBytecode(),
      wallet
    );
    
    // 컨트랙트 배포
    console.log('컨트랙트 배포 중...');
    const contract = await contractFactory.deploy(owners, threshold);
    
    const deploymentTx = contract.deploymentTransaction();
    console.log('배포 트랜잭션 해시:', deploymentTx.hash);
    console.log('배포 대기 중...');
    
    // 배포 완료 대기 (타임아웃 설정)
    try {
      // 120초 타임아웃 설정 (더 긴 대기 시간)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('배포 타임아웃: 120초 내에 확인되지 않았습니다')), 120000);
      });
      
      await Promise.race([
        contract.waitForDeployment(),
        timeoutPromise
      ]);
      
      const contractAddress = await contract.getAddress();
      console.log('배포 완료! 컨트랙트 주소:', contractAddress);
      
      return {
        address: contractAddress,
        contract: contract,
        deploymentTx: deploymentTx.hash,
        owners: owners,
        threshold: threshold,
        pending: false
      };
      
    } catch (waitError) {
      console.warn('배포 대기 중 오류 발생:', waitError.message);
      
      // Etherscan에서 확인 가능하도록 트랜잭션 해시는 반환
      console.log('트랜잭션이 제출되었습니다. Etherscan에서 확인해보세요:', deploymentTx.hash);
      
      // 배포가 완료되지 않은 경우 pending 상태로 반환
      return {
        address: null, // 실제 주소가 없음을 명시
        contract: null,
        deploymentTx: deploymentTx.hash,
        owners: owners,
        threshold: threshold,
        pending: true
      };
    }
    
  } catch (error) {
    console.error('다중 서명 지갑 배포 실패:', error);
    throw new Error(`다중 서명 지갑 배포에 실패했습니다: ${error.message}`);
  }
};


/**
 * 다중 서명 지갑 인스턴스 생성
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} contractAddress - 컨트랙트 주소
 * @returns {Object} 컨트랙트 인스턴스
 */
export const getMultiSigWallet = (provider, contractAddress) => {
  try {
    console.log('컨트랙트 인스턴스 생성:', { contractAddress, provider: !!provider });
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    console.log('컨트랙트 인스턴스 생성 완료:', contract.target);
    return contract;
  } catch (error) {
    console.error('다중 서명 지갑 인스턴스 생성 실패:', error);
    throw new Error('다중 서명 지갑에 연결할 수 없습니다: ' + error.message);
  }
};

/**
 * 컨트랙트가 다중서명 지갑인지 확인
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} contractAddress - 컨트랙트 주소
 * @returns {Promise<boolean>} 다중서명 지갑인지 여부
 */
export const isMultiSigWallet = async (provider, contractAddress) => {
  try {
    console.log('다중서명 지갑 확인 시작:', contractAddress);
    
    // 컨트랙트 코드 확인
    const code = await provider.getCode(contractAddress);
    console.log('컨트랙트 코드:', code);
    
    if (code === '0x' || code === '0x0') {
      console.log('컨트랙트가 배포되지 않음');
      return false;
    }
    
    // 컨트랙트 인스턴스 생성
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    // 여러 함수를 시도해서 다중서명 지갑인지 확인
    let hasValidFunctions = false;
    
    try {
      // getOwners 함수 시도
      const owners = await contract.getOwners();
      console.log('getOwners() 성공:', owners);
      hasValidFunctions = true;
    } catch (ownersError) {
      console.log('getOwners() 실패:', ownersError.message);
    }
    
    try {
      // threshold 함수 시도
      const threshold = await contract.threshold();
      console.log('threshold() 성공:', threshold);
      hasValidFunctions = true;
    } catch (thresholdError) {
      console.log('threshold() 실패:', thresholdError.message);
    }
    
    if (hasValidFunctions) {
      console.log('다중서명 지갑 확인됨');
      return true;
    } else {
      console.log('다중서명 지갑이 아님');
      return false;
    }
  } catch (error) {
    console.error('다중서명 지갑 확인 실패:', error);
    return false;
  }
};

/**
 * 다중서명 지갑의 트랜잭션 목록 조회
 * @param {Object} contract - 다중서명 지갑 컨트랙트 인스턴스
 * @returns {Promise<Array>} 트랜잭션 목록
 */
export const getMultiSigTransactions = async (contract) => {
  try {
    console.log('다중서명 트랜잭션 조회 시작:', contract.target);
    
    const transactionCount = await contract.getTransactionCount();
    console.log('총 트랜잭션 수:', transactionCount.toString());
    
    const transactions = [];
    
    // 각 트랜잭션 정보 조회
    for (let i = 0; i < transactionCount; i++) {
      try {
        const tx = await contract.getTransaction(i);
        console.log(`트랜잭션 ${i}:`, tx);
        
        // 트랜잭션 상태 확인
        const isExecuted = await contract.isExecuted(i);
        const confirmations = await contract.getConfirmations(i);
        
        transactions.push({
          id: i,
          to: tx.to,
          value: tx.value.toString(),
          data: tx.data,
          executed: isExecuted,
          confirmations: confirmations.length,
          requiredConfirmations: await contract.threshold(),
          createdAt: new Date().toISOString() // 실제로는 블록 타임스탬프를 사용해야 함
        });
      } catch (txError) {
        console.warn(`트랜잭션 ${i} 조회 실패:`, txError.message);
      }
    }
    
    console.log('조회된 트랜잭션 수:', transactions.length);
    return transactions;
  } catch (error) {
    console.error('다중서명 트랜잭션 조회 실패:', error);
    return [];
  }
};

/**
 * 다중서명 지갑에 트랜잭션 제안
 * @param {Object} contract - 다중서명 지갑 컨트랙트 인스턴스
 * @param {string} to - 수신자 주소
 * @param {string} value - 전송할 ETH 양 (wei 단위)
 * @param {string} data - 트랜잭션 데이터 (선택사항)
 * @returns {Promise<Object>} 트랜잭션 해시
 */
export const proposeTransaction = async (contract, to, value, data = '0x') => {
  try {
    console.log('트랜잭션 제안 시작:', { to, value, data });
    
    const tx = await contract.submitTransaction(to, value, data);
    console.log('트랜잭션 제안 완료:', tx.hash);
    
    return {
      hash: tx.hash,
      to,
      value,
      data
    };
  } catch (error) {
    console.error('트랜잭션 제안 실패:', error);
    throw error;
  }
};

/**
 * 다중서명 트랜잭션에 서명
 * @param {Object} contract - 다중서명 지갑 컨트랙트 인스턴스
 * @param {number} transactionId - 트랜잭션 ID
 * @returns {Promise<Object>} 서명 트랜잭션 해시
 */
export const confirmTransaction = async (contract, transactionId) => {
  try {
    console.log('트랜잭션 서명 시작:', transactionId);
    
    const tx = await contract.confirmTransaction(transactionId);
    console.log('트랜잭션 서명 완료:', tx.hash);
    
    return {
      hash: tx.hash,
      transactionId
    };
  } catch (error) {
    console.error('트랜잭션 서명 실패:', error);
    throw error;
  }
};

/**
 * 다중서명 트랜잭션 실행
 * @param {Object} contract - 다중서명 지갑 컨트랙트 인스턴스
 * @param {number} transactionId - 트랜잭션 ID
 * @returns {Promise<Object>} 실행 트랜잭션 해시
 */
export const executeTransaction = async (contract, transactionId) => {
  try {
    console.log('트랜잭션 실행 시작:', transactionId);
    
    const tx = await contract.executeTransaction(transactionId);
    console.log('트랜잭션 실행 완료:', tx.hash);
    
    return {
      hash: tx.hash,
      transactionId
    };
  } catch (error) {
    console.error('트랜잭션 실행 실패:', error);
    throw error;
  }
};

/**
 * 다중 서명 지갑 정보 조회
 * @param {Object} contract - 컨트랙트 인스턴스
 * @returns {Promise<Object>} 지갑 정보
 */
export const getMultiSigWalletInfo = async (contract) => {
  try {
    console.log('다중서명 지갑 정보 조회 시작:', contract.target);
    
    // 컨트랙트 존재 여부 먼저 확인 (선택적)
    console.log('컨트랙트 코드 확인 중...');
    try {
      const contractCode = await contract.provider.getCode(contract.target);
      console.log('컨트랙트 코드:', contractCode);
      
      if (contractCode === '0x' || contractCode === '0x0') {
        console.warn('컨트랙트가 배포되지 않았을 수 있음, 계속 시도...');
      }
    } catch (codeError) {
      console.warn('컨트랙트 코드 조회 실패, 계속 시도:', codeError.message);
    }
    
    // 기본 정보 조회 (오류 시 기본값 사용)
    let owners = [];
    let threshold = 0;
    
    try {
      console.log('getOwners() 호출 중...');
      owners = await contract.getOwners();
      console.log('getOwners() 성공:', owners);
    } catch (ownersError) {
      console.warn('getOwners() 실패, 기본값 사용:', ownersError.message);
      owners = [];
    }
    
    try {
      console.log('threshold() 호출 중...');
      threshold = await contract.threshold();
      console.log('threshold() 성공:', threshold);
    } catch (thresholdError) {
      console.warn('threshold() 실패, 기본값 사용:', thresholdError.message);
      threshold = 0;
    }
    
    // 잔액은 별도로 조회 (provider 문제 해결)
    let balance = '0';
    try {
      console.log('잔액 조회 시작...');
      console.log('contract 정보:', {
        provider: contract.provider,
        target: contract.target,
        hasGetBalance: contract.provider && typeof contract.provider.getBalance === 'function'
      });
      
      // 여러 방법으로 잔액 조회 시도
      if (contract.provider && contract.target) {
        try {
          // 방법 1: contract.provider.getBalance() 사용
          balance = await contract.provider.getBalance(contract.target);
          console.log('잔액 조회 성공 (방법 1):', balance);
        } catch (method1Error) {
          console.warn('방법 1 실패, 방법 2 시도:', method1Error.message);
          
          try {
            // 방법 2: provider 직접 사용
            balance = await contract.provider.getBalance(contract.target);
            console.log('잔액 조회 성공 (방법 2):', balance);
          } catch (method2Error) {
            console.warn('방법 2 실패, 방법 3 시도:', method2Error.message);
            
            try {
              // 방법 3: ethers.getBalance 사용
              balance = await ethers.getBalance(contract.provider, contract.target);
              console.log('잔액 조회 성공 (방법 3):', balance);
            } catch (method3Error) {
              console.warn('방법 3 실패, 기본값 사용:', method3Error.message);
              balance = '0';
            }
          }
        }
      } else {
        console.warn('provider 또는 target이 없음, 기본값 사용');
        balance = '0';
      }
    } catch (balanceError) {
      console.warn('잔액 조회 실패, 기본값 사용:', balanceError);
      balance = '0';
    }
    
    console.log('기본 정보 조회 완료:', { owners, threshold, balance });
    
    // 트랜잭션 수는 선택적으로 조회
    let transactionCount = 0;
    try {
      transactionCount = await contract.getTransactionCount();
      console.log('트랜잭션 수 조회 완료:', transactionCount);
    } catch (txError) {
      console.warn('트랜잭션 수 조회 실패, 기본값 사용:', txError);
    }
    
    const result = {
      address: contract.target,
      owners: owners,
      threshold: threshold.toString(),
      balance: ethers.formatEther(balance),
      ownerCount: owners.length,
      transactionCount: transactionCount.toString()
    };
    
    console.log('최종 결과:', result);
    return result;
  } catch (error) {
    console.error('다중 서명 지갑 정보 조회 실패:', error);
    console.error('오류 상세:', error.message);
    console.error('오류 스택:', error.stack);
    throw new Error('지갑 정보를 가져올 수 없습니다: ' + error.message);
  }
};

/**
 * 주소 유효성 검사
 * @param {string} address - 검사할 주소
 * @returns {boolean} 유효한 주소인지 여부
 */
export const isValidEthereumAddress = (address) => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * 소유자 주소 배열 유효성 검사
 * @param {string[]} owners - 소유자 주소 배열
 * @returns {Object} 검사 결과
 */
export const validateOwners = (owners) => {
  const validOwners = owners.filter(owner => owner.trim());
  
  if (validOwners.length < 2) {
    return { valid: false, error: '최소 2명의 소유자가 필요합니다.' };
  }
  
  // 중복 주소 검사
  const uniqueOwners = [...new Set(validOwners)];
  if (uniqueOwners.length !== validOwners.length) {
    return { valid: false, error: '중복된 소유자 주소가 있습니다.' };
  }
  
  // 주소 형식 검사
  for (const owner of validOwners) {
    if (!ethers.isAddress(owner)) {
      return { valid: false, error: `유효하지 않은 주소 형식입니다: ${owner}` };
    }
  }
  
  return { valid: true, owners: validOwners };
};

/**
 * 임계값 유효성 검사
 * @param {number} threshold - 임계값
 * @param {number} ownerCount - 소유자 수
 * @returns {Object} 검사 결과
 */
export const validateThreshold = (threshold, ownerCount) => {
  if (threshold < 1) {
    return { valid: false, error: '임계값은 최소 1이어야 합니다.' };
  }
  
  if (threshold > ownerCount) {
    return { valid: false, error: '임계값은 소유자 수보다 클 수 없습니다.' };
  }
  
  return { valid: true };
};

/**
 * 트랜잭션 서명 상태 확인
 * @param {Object} contract - 컨트랙트 인스턴스
 * @param {number} txIndex - 트랜잭션 인덱스
 * @param {string} ownerAddress - 소유자 주소
 * @returns {Promise<boolean>} 서명 여부
 */
export const isTransactionConfirmed = async (contract, txIndex, ownerAddress) => {
  try {
    return await contract.isConfirmed(txIndex, ownerAddress);
  } catch (error) {
    console.error('서명 상태 확인 실패:', error);
    throw new Error('서명 상태를 확인할 수 없습니다.');
  }
};

/**
 * 트랜잭션 서명 수 조회
 * @param {Object} contract - 컨트랙트 인스턴스
 * @param {number} txIndex - 트랜잭션 인덱스
 * @returns {Promise<number>} 서명 수
 */
export const getTransactionConfirmationCount = async (contract, txIndex) => {
  try {
    const count = await contract.getConfirmationCount(txIndex);
    return parseInt(count.toString());
  } catch (error) {
    console.error('서명 수 조회 실패:', error);
    throw new Error('서명 수를 조회할 수 없습니다.');
  }
};

/**
 * 전체 트랜잭션 수 조회
 * @param {Object} contract - 컨트랙트 인스턴스
 * @returns {Promise<number>} 트랜잭션 수
 */
export const getTotalTransactionCount = async (contract) => {
  try {
    const count = await contract.getTransactionCount();
    return parseInt(count.toString());
  } catch (error) {
    console.error('트랜잭션 수 조회 실패:', error);
    throw new Error('트랜잭션 수를 조회할 수 없습니다.');
  }
};
