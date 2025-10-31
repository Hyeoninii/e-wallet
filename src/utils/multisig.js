import { ethers } from 'ethers';
import { contractABI } from '../_contracts/MultiSigWallet.js';
import { getMultiSigWalletBytecode } from './contractCompiler.js';
import { 
  deployPolicyContract, 
  deployRolesContract, 
  deployPolicyManagerContract 
} from './contractDeployer.js';

/**
 * 다중 서명 지갑 컨트랙트 배포
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} privateKey - 배포자의 개인키
 * @param {string[]} owners - 소유자 주소 배열
 * @param {number} threshold - 승인 임계값
 * @returns {Promise<Object>} 배포된 컨트랙트 정보
 */
/**
 * 통합 다중 서명 지갑 시스템 배포
 * MultiSigWallet, PolicyManager, Policy, Roles 컨트랙트를 순차적으로 배포
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} privateKey - 배포자의 개인키
 * @param {string[]} owners - 소유자 주소 배열
 * @param {number} threshold - 승인 임계값
 * @param {Object} policyData - 정책 데이터 (선택사항)
 * @param {Object} rolesData - 직급 데이터 (선택사항)
 * @returns {Promise<Object>} 배포된 모든 컨트랙트 정보
 */
export const deployIntegratedMultiSigSystem = async (provider, privateKey, owners, threshold, policyData = null, rolesData = null) => {
  try {
    console.log('통합 다중 서명 시스템 배포 시작...');
    
    // 1. MultiSigWallet 배포
    console.log('1. MultiSigWallet 배포 중...');
    const multisigResult = await deployMultiSigWallet(provider, privateKey, owners, threshold);
    console.log('MultiSigWallet 배포 완료:', multisigResult.address);
    
    // 2. PolicyManager 배포
    console.log('2. PolicyManager 배포 중...');
    const policyManagerResult = await deployPolicyManagerContract(provider, privateKey);
    console.log('PolicyManager 배포 완료:', policyManagerResult.address);
    
    // 3. Policy 컨트랙트 배포
    console.log('3. Policy 컨트랙트 배포 중...');
    const policyDataToUse = policyData || {
      policyName: 'Default Policy',
      description: 'Default policy for multi-signature wallet',
      maxAmount: 10,
      dailyLimit: 50,
      requireApproval: true,
      approvalThreshold: threshold,
      timeLock: 0
    };
    
    const policyResult = await deployPolicyContract(provider, privateKey, policyDataToUse);
    console.log('Policy 컨트랙트 배포 완료:', policyResult.address);
    
    // 4. Roles 컨트랙트 배포
    console.log('4. Roles 컨트랙트 배포 중...');
    const rolesDataToUse = rolesData || {
      rolesName: 'Default Roles',
      description: 'Default role management system'
    };
    
    const rolesResult = await deployRolesContract(provider, privateKey, rolesDataToUse);
    console.log('Roles 컨트랙트 배포 완료:', rolesResult.address);
    
    // 5. PolicyManager 초기화
    console.log('5. PolicyManager 초기화 중...');
    const policyManagerABI = [
      "function initialize(address _multisigWallet, address _policyContract, address _rolesContract) external"
    ];
    const policyManager = new ethers.Contract(policyManagerResult.address, policyManagerABI, new ethers.Wallet(privateKey, provider));
    
    const initTx = await policyManager.initialize(
      multisigResult.address,
      policyResult.address,
      rolesResult.address
    );
    await initTx.wait();
    console.log('PolicyManager 초기화 완료');
    
    const result = {
      multisigWallet: {
        address: multisigResult.address,
        transactionHash: multisigResult.deploymentTx,
        abi: contractABI
      },
      policyManager: {
        address: policyManagerResult.address,
        transactionHash: policyManagerResult.transactionHash,
        abi: policyManagerResult.abi
      },
      policy: {
        address: policyResult.address,
        transactionHash: policyResult.transactionHash,
        abi: policyResult.abi
      },
      roles: {
        address: rolesResult.address,
        transactionHash: rolesResult.transactionHash,
        abi: rolesResult.abi
      },
      deploymentSummary: {
        totalContracts: 4,
        multisigAddress: multisigResult.address,
        policyManagerAddress: policyManagerResult.address,
        policyAddress: policyResult.address,
        rolesAddress: rolesResult.address
      }
    };
    
    console.log('통합 다중 서명 시스템 배포 완료!', result.deploymentSummary);
    return result;
    
  } catch (error) {
    console.error('통합 다중 서명 시스템 배포 실패:', error);
    throw new Error('통합 시스템 배포에 실패했습니다: ' + error.message);
  }
};

export const deployMultiSigWallet = async (provider, privateKey, owners, threshold) => {
  try {
    console.log('다중 서명 지갑 배포 시작');
    
    // 지갑 생성
    const wallet = new ethers.Wallet(privateKey, provider);
    // 배포자 주소 로그는 생략
    
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
      console.log('배포 완료');
      
      return {
        address: contractAddress,
        contract: contract,
        deploymentTx: deploymentTx.hash,
        owners: owners,
        threshold: threshold,
        pending: false
      };
      
    } catch (waitError) {
      console.warn('배포 대기 중 오류 발생');
      
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
    const transactionCount = await contract.getTransactionCount();
    const transactions = [];
    for (let i = 0; i < transactionCount; i++) {
      try {
        const tx = await contract.getTransaction(i);
        const confirmCount = await contract.getConfirmationCount(i);
        const threshold = await contract.threshold();
        // 제안자 정보 (있으면)
        let proposer = '알 수 없음';
        try {
          const filter = contract.filters.TransactionSubmitted(i);
          const events = await contract.queryFilter(filter);
          if (events.length > 0) {
            proposer = events[0].args.proposer;
          }
        } catch {}
        const valueInEth = ethers.formatEther(tx.value.toString());
        transactions.push({
          id: i,
          to: tx.to,
          value: valueInEth,
          valueWei: tx.value.toString(),
          data: tx.data,
          executed: tx.executed,
          confirmations: parseInt(confirmCount.toString()),
          requiredConfirmations: parseInt(threshold.toString()),
          createdAt: new Date().toISOString(),
          proposer,
          confirmedBy: []
        });
      } catch {}
    }
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
    // 기본 정보 조회 (오류 시 기본값 사용)
    let owners = [];
    let threshold = 0;
    try {
      owners = await contract.getOwners();
    } catch {
      owners = [];
    }
    try {
      threshold = await contract.threshold();
    } catch {
      threshold = 0;
    }
    // 잔액 조회 (실패 시 0)
    let balance = '0';
    try {
      if (contract.provider && contract.target) {
        balance = await contract.provider.getBalance(contract.target);
      }
    } catch {
      balance = '0';
    }
    // 트랜잭션 수 (선택)
    let transactionCount = 0;
    try {
      transactionCount = await contract.getTransactionCount();
    } catch {}
    return {
      address: contract.target,
      owners,
      threshold: threshold.toString(),
      balance: ethers.formatEther(balance),
      ownerCount: owners.length,
      transactionCount: transactionCount.toString()
    };
  } catch (error) {
    console.error('다중 서명 지갑 정보 조회 실패:', error);
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

// ==================== 관리 트랜잭션 함수들 ====================

/**
 * 멤버 추가 제안
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {string} newOwner - 새 멤버 주소
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} privateKey - 개인키
 * @returns {Promise<Object>} 트랜잭션 해시
 */
export const proposeAddOwner = async (contractAddress, newOwner, provider, privateKey) => {
  try {
    console.log('proposeAddOwner 호출:', { contractAddress, newOwner, provider: !!provider, privateKey: !!privateKey });
    
    if (!provider) {
      throw new Error('프로바이더가 없습니다.');
    }
    if (!privateKey) {
      throw new Error('개인키가 없습니다.');
    }
    if (!ethers.isAddress(contractAddress)) {
      throw new Error('유효하지 않은 컨트랙트 주소입니다.');
    }
    if (!ethers.isAddress(newOwner)) {
      throw new Error('유효하지 않은 새 멤버 주소입니다.');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    console.log('트랜잭션 제출 중...');
    const tx = await contract.proposeAddOwner(newOwner);
    console.log('트랜잭션 해시:', tx.hash);
    
    console.log('트랜잭션 확인 대기 중...');
    await tx.wait();
    console.log('트랜잭션 확인 완료');
    
    return {
      hash: tx.hash,
      newOwner
    };
  } catch (error) {
    console.error('멤버 추가 제안 실패:', error);
    console.error('에러 상세:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
      data: error.data
    });
    throw new Error(`멤버 추가 제안 실패: ${error.message}`);
  }
};

/**
 * 멤버 제거 제안
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {string} ownerToRemove - 제거할 멤버 주소
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} privateKey - 개인키
 * @returns {Promise<Object>} 트랜잭션 해시
 */
export const proposeRemoveOwner = async (contractAddress, ownerToRemove, provider, privateKey) => {
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    const tx = await contract.proposeRemoveOwner(ownerToRemove);
    await tx.wait();
    
    return {
      hash: tx.hash,
      ownerToRemove
    };
  } catch (error) {
    console.error('멤버 제거 제안 실패:', error);
    throw error;
  }
};

/**
 * 임계값 변경 제안
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {number} newThreshold - 새 임계값
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} privateKey - 개인키
 * @returns {Promise<Object>} 트랜잭션 해시
 */
export const proposeChangeThreshold = async (contractAddress, newThreshold, provider, privateKey) => {
  try {
    console.log('proposeChangeThreshold 호출:', { contractAddress, newThreshold, provider: !!provider, privateKey: !!privateKey });
    
    if (!provider) {
      throw new Error('프로바이더가 없습니다.');
    }
    if (!privateKey) {
      throw new Error('개인키가 없습니다.');
    }
    if (!ethers.isAddress(contractAddress)) {
      throw new Error('유효하지 않은 컨트랙트 주소입니다.');
    }
    if (newThreshold <= 0) {
      throw new Error('임계값은 0보다 커야 합니다.');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    console.log('트랜잭션 제출 중...');
    const tx = await contract.proposeChangeThreshold(newThreshold);
    console.log('트랜잭션 해시:', tx.hash);
    
    console.log('트랜잭션 확인 대기 중...');
    await tx.wait();
    console.log('트랜잭션 확인 완료');
    
    return {
      hash: tx.hash,
      newThreshold
    };
  } catch (error) {
    console.error('임계값 변경 제안 실패:', error);
    console.error('에러 상세:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
      data: error.data
    });
    throw new Error(`임계값 변경 제안 실패: ${error.message}`);
  }
};

/**
 * 관리 트랜잭션 승인
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {number} txIndex - 트랜잭션 인덱스
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} privateKey - 개인키
 * @returns {Promise<Object>} 트랜잭션 해시
 */
export const confirmManagementTransaction = async (contractAddress, txIndex, provider, privateKey) => {
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    const tx = await contract.confirmManagementTransaction(txIndex);
    await tx.wait();
    
    return {
      hash: tx.hash,
      txIndex
    };
  } catch (error) {
    console.error('관리 트랜잭션 승인 실패:', error);
    throw error;
  }
};

/**
 * 관리 트랜잭션 승인 취소
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {number} txIndex - 트랜잭션 인덱스
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} privateKey - 개인키
 * @returns {Promise<Object>} 트랜잭션 해시
 */
export const revokeManagementConfirmation = async (contractAddress, txIndex, provider, privateKey) => {
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    const tx = await contract.revokeManagementConfirmation(txIndex);
    await tx.wait();
    
    return {
      hash: tx.hash,
      txIndex
    };
  } catch (error) {
    console.error('관리 트랜잭션 승인 취소 실패:', error);
    throw error;
  }
};

/**
 * 관리 트랜잭션 조회
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {number} txIndex - 트랜잭션 인덱스
 * @param {Object} provider - 이더리움 프로바이더
 * @returns {Promise<Object>} 관리 트랜잭션 정보
 */
export const getManagementTransaction = async (contractAddress, txIndex, provider) => {
  try {
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    const tx = await contract.getManagementTransaction(txIndex);
    
    return {
      txType: parseInt(tx.txType.toString()),
      targetAddress: tx.targetAddress,
      newThreshold: parseInt(tx.newThreshold.toString()),
      executed: tx.executed,
      confirmCount: parseInt(tx.confirmCount.toString())
    };
  } catch (error) {
    console.error('관리 트랜잭션 조회 실패:', error);
    throw error;
  }
};

/**
 * 관리 트랜잭션 수 조회
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {Object} provider - 이더리움 프로바이더
 * @returns {Promise<number>} 관리 트랜잭션 수
 */
export const getManagementTransactionCount = async (contractAddress, provider) => {
  try {
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    const count = await contract.getManagementTransactionCount();
    return parseInt(count.toString());
  } catch (error) {
    console.error('관리 트랜잭션 수 조회 실패:', error);
    throw error;
  }
};

/**
 * 관리 트랜잭션 승인 상태 확인
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {number} txIndex - 트랜잭션 인덱스
 * @param {string} ownerAddress - 소유자 주소
 * @param {Object} provider - 이더리움 프로바이더
 * @returns {Promise<boolean>} 승인 여부
 */
export const isManagementConfirmed = async (contractAddress, txIndex, ownerAddress, provider) => {
  try {
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    return await contract.isManagementConfirmed(txIndex, ownerAddress);
  } catch (error) {
    console.error('관리 트랜잭션 승인 상태 확인 실패:', error);
    throw error;
  }
};

/**
 * 관리 트랜잭션 승인 수 조회
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {number} txIndex - 트랜잭션 인덱스
 * @param {Object} provider - 이더리움 프로바이더
 * @returns {Promise<number>} 승인 수
 */
export const getManagementConfirmationCount = async (contractAddress, txIndex, provider) => {
  try {
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    const count = await contract.getManagementConfirmationCount(txIndex);
    return parseInt(count.toString());
  } catch (error) {
    console.error('관리 트랜잭션 승인 수 조회 실패:', error);
    throw error;
  }
};

/**
 * 소유자 목록 조회 (간편 함수)
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {Object} provider - 이더리움 프로바이더
 * @returns {Promise<Array>} 소유자 주소 배열
 */
export const getOwners = async (contractAddress, provider) => {
  try {
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    return await contract.getOwners();
  } catch (error) {
    console.error('소유자 목록 조회 실패:', error);
    throw error;
  }
};

/**
 * 다중서명 트랜잭션 승인
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {number} txIndex - 트랜잭션 인덱스
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} privateKey - 개인키
 * @returns {Promise<Object>} 트랜잭션 해시
 */
export const confirmMultiSigTransaction = async (contractAddress, txIndex, provider, privateKey) => {
  try {
    console.log('트랜잭션 승인 시작:', { contractAddress, txIndex, provider: !!provider, privateKey: !!privateKey });
    
    if (!provider) {
      throw new Error('프로바이더가 없습니다.');
    }
    if (!privateKey) {
      throw new Error('개인키가 없습니다.');
    }
    if (!ethers.isAddress(contractAddress)) {
      throw new Error('유효하지 않은 컨트랙트 주소입니다.');
    }
    if (txIndex < 0) {
      throw new Error('유효하지 않은 트랜잭션 인덱스입니다.');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    // 승인 전 상태 확인 (디버깅용)
    console.log('승인 전 상태 확인 중...');
    const owners = await contract.getOwners();
    const currentUser = wallet.address;
    console.log('현재 사용자 주소:', currentUser);
    console.log('소유자 목록:', owners);
    
    // 이미 승인했는지 확인 (디버깅용)
    const isAlreadyConfirmed = await contract.isConfirmed(txIndex, currentUser);
    console.log('이미 승인했는가?', isAlreadyConfirmed);
    
    // 트랜잭션 존재 여부 확인 (디버깅용)
    const txExists = await contract.getTransactionCount();
    console.log('총 트랜잭션 수:', txExists.toString());
    console.log('요청한 트랜잭션 인덱스:', txIndex);
    
    console.log('트랜잭션 승인 제출 중...');
    const tx = await contract.confirmTransaction(txIndex);
    console.log('트랜잭션 해시:', tx.hash);
    
    console.log('트랜잭션 확인 대기 중...');
    await tx.wait();
    console.log('트랜잭션 승인 완료');
    
    return {
      hash: tx.hash,
      txIndex: txIndex
    };
  } catch (error) {
    console.error('트랜잭션 승인 실패:', error);
    console.error('에러 상세:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
      data: error.data
    });
    
    // 에러 메시지 개선
    let errorMessage = '트랜잭션 승인 실패';
    if (error.data === '0x3ee5aeb5') {
      errorMessage = '이미 이 트랜잭션에 승인했습니다.';
    } else if (error.message.includes('Not an owner')) {
      errorMessage = '승인 권한이 없습니다. 다중서명 지갑의 소유자가 아닙니다.';
    } else if (error.message.includes('Transaction does not exist')) {
      errorMessage = '존재하지 않는 트랜잭션입니다.';
    } else if (error.message.includes('Transaction already executed')) {
      errorMessage = '이미 실행된 트랜잭션입니다.';
    } else {
      errorMessage = `트랜잭션 승인 실패: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * 다중서명 트랜잭션 실행
 * @param {string} contractAddress - 컨트랙트 주소
 * @param {number} txIndex - 트랜잭션 인덱스
 * @param {Object} provider - 이더리움 프로바이더
 * @param {string} privateKey - 개인키
 * @returns {Promise<Object>} 트랜잭션 해시
 */
export const executeMultiSigTransaction = async (contractAddress, txIndex, provider, privateKey) => {
  try {
    console.log('트랜잭션 실행 시작:', { contractAddress, txIndex, provider: !!provider, privateKey: !!privateKey });
    
    if (!provider) {
      throw new Error('프로바이더가 없습니다.');
    }
    if (!privateKey) {
      throw new Error('개인키가 없습니다.');
    }
    if (!ethers.isAddress(contractAddress)) {
      throw new Error('유효하지 않은 컨트랙트 주소입니다.');
    }
    if (txIndex < 0) {
      throw new Error('유효하지 않은 트랜잭션 인덱스입니다.');
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    console.log('트랜잭션 실행 제출 중...');
    const tx = await contract.executeTransaction(txIndex);
    console.log('트랜잭션 해시:', tx.hash);
    
    console.log('트랜잭션 확인 대기 중...');
    const receipt = await tx.wait();
    console.log('트랜잭션 실행 완료');
    
    return {
      hash: tx.hash,
      txIndex: txIndex,
      receipt: receipt
    };
  } catch (error) {
    console.error('트랜잭션 실행 실패:', error);
    console.error('에러 상세:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
      data: error.data
    });
    throw new Error(`트랜잭션 실행 실패: ${error.message}`);
  }
};