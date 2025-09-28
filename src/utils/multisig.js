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
      // 60초 타임아웃 설정
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('배포 타임아웃: 60초 내에 확인되지 않았습니다')), 60000);
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
      
      // 임시로 트랜잭션 해시를 주소로 사용 (실제로는 올바르지 않지만 사용자에게 피드백 제공)
      return {
        address: `트랜잭션 확인 중: ${deploymentTx.hash}`,
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
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    return contract;
  } catch (error) {
    console.error('다중 서명 지갑 인스턴스 생성 실패:', error);
    throw new Error('다중 서명 지갑에 연결할 수 없습니다.');
  }
};

/**
 * 다중 서명 지갑 정보 조회
 * @param {Object} contract - 컨트랙트 인스턴스
 * @returns {Promise<Object>} 지갑 정보
 */
export const getMultiSigWalletInfo = async (contract) => {
  try {
    const [owners, threshold, balance] = await Promise.all([
      contract.getOwners(),
      contract.threshold(),
      contract.provider.getBalance(contract.target)
    ]);
    
    return {
      address: contract.target,
      owners: owners,
      threshold: threshold.toString(),
      balance: ethers.formatEther(balance),
      ownerCount: owners.length
    };
  } catch (error) {
    console.error('다중 서명 지갑 정보 조회 실패:', error);
    throw new Error('지갑 정보를 가져올 수 없습니다.');
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
