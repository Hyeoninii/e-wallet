import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  saveWalletData, 
  loadWalletData, 
  createNewWallet,
  recoverWalletFromMnemonic,
  recoverWalletFromPrivateKey,
  isValidAddress
} from '../utils/wallet';
import { 
  deployMultiSigWallet, 
  getMultiSigWallet, 
  getMultiSigWalletInfo,
  isMultiSigWallet,
  validateOwners,
  validateThreshold,
  getMultiSigTransactions,
  proposeTransaction,
  confirmTransaction,
  executeTransaction
} from '../utils/multisig';

// 지갑 컨텍스트 생성
const WalletContext = createContext();

/**
 * 지갑 상태 관리 훅
 * @returns {Object} 지갑 컨텍스트 값들
 */
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

/**
 * 지갑 프로바이더 컴포넌트
 * @param {Object} props - 컴포넌트 props
 * @param {React.ReactNode} props.children - 자식 컴포넌트들
 */
export const WalletProvider = ({ children }) => {
  // 현재 활성화된 지갑 상태
  const [currentWallet, setCurrentWallet] = useState(null);
  
  // 저장된 지갑 목록
  const [savedWallets, setSavedWallets] = useState([]);
  
  // 저장된 다중 서명 지갑 목록
  const [savedMultiSigWallets, setSavedMultiSigWallets] = useState([]);
  
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  
  // 에러 상태
  const [error, setError] = useState(null);
  
  // 이더리움 프로바이더 (Sepolia 테스트넷)
  const [provider, setProvider] = useState(null);

  /**
   * 컴포넌트 마운트 시 초기화
   */
  useEffect(() => {
    initializeWallet();
  }, []);

  /**
   * 지갑 시스템 초기화
   */
  const initializeWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 프록시를 통한 노드 연결 (CORS 문제 해결)
      const proxyUrl = `${window.location.origin}/api/ethereum`;
      console.log('프록시 URL:', proxyUrl);
      
      const customProvider = new ethers.JsonRpcProvider(proxyUrl);
      
      // 네트워크 정보 확인 및 연결 테스트 (10초 타임아웃)
      try {
        console.log('노드 연결 시도 중...');
        
        // 10초 타임아웃 설정
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
        });
        
        // 연결 테스트와 타임아웃을 경쟁시킴
        const connectionPromise = Promise.all([
          customProvider.getBlockNumber(),
          customProvider.getNetwork()
        ]);
        
        const [blockNumber, network] = await Promise.race([
          connectionPromise,
          timeoutPromise
        ]);
        
        console.log('현재 블록 번호:', blockNumber);
        console.log('연결된 네트워크:', network);
        console.log('Custom 노드 연결 성공!');
        
        setProvider(customProvider);
        
      } catch (error) {
        console.error('Custom 노드 연결 실패:', error);
        console.error('에러 타입:', error.constructor.name);
        console.error('에러 메시지:', error.message);
        
        // Infura로 자동 전환
        console.log('Infura로 자동 전환 중...');
        await connectToInfura();
      }

      // 저장된 지갑 목록 불러오기
      loadSavedWallets();
      
      // 저장된 다중 서명 지갑 목록 불러오기
      loadSavedMultiSigWallets();
      
    } catch (error) {
      console.error('지갑 초기화 실패:', error);
      setError('지갑 시스템 초기화에 실패했습니다: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Infura 연결
   */
  const connectToInfura = async () => {
    try {
      const infuraApiKey = '5dc76d758e1444e18669946ef9b04d0c';
      const infuraUrl = `https://sepolia.infura.io/v3/${infuraApiKey}`;
      
      console.log('Infura 연결 시도 중...');
      
      const infuraProvider = new ethers.JsonRpcProvider(infuraUrl);
      
      // Infura 연결 테스트
      const blockNumber = await infuraProvider.getBlockNumber();
      const network = await infuraProvider.getNetwork();
      
      console.log('Infura 블록 번호:', blockNumber);
      console.log('Infura 네트워크:', network);
      console.log('✅ Infura 연결 성공!');
      
      setProvider(infuraProvider);
      
      // 사용자에게 알림
      setError('Custom 노드 연결 실패로 Infura로 자동 전환되었습니다.');
      
    } catch (error) {
      console.error('Infura 연결 실패:', error);
      setError('모든 노드 연결에 실패했습니다. 네트워크를 확인해주세요.');
    }
  };

  /**
   * 저장된 지갑 목록 불러오기
   */
  const loadSavedWallets = () => {
    try {
      const wallets = loadWalletData('savedWallets') || [];
      setSavedWallets(wallets);
      
      // 마지막으로 선택된 지갑이 있으면 자동으로 선택
      const lastSelectedWallet = loadWalletData('lastSelectedWallet');
      if (lastSelectedWallet) {
        console.log('마지막으로 선택된 지갑 자동 로드:', lastSelectedWallet);
        setCurrentWallet(lastSelectedWallet);
      }
    } catch (error) {
      console.error('저장된 지갑 불러오기 실패:', error);
    }
  };

  /**
   * 저장된 다중 서명 지갑 목록 불러오기
   */
  const loadSavedMultiSigWallets = () => {
    try {
      console.log('다중서명 지갑 목록 불러오기 시작...');
      const multiSigWallets = loadWalletData('savedMultiSigWallets') || [];
      console.log('로컬 스토리지에서 불러온 다중서명 지갑 목록:', multiSigWallets);
      console.log('다중서명 지갑 개수:', multiSigWallets.length);
      setSavedMultiSigWallets(multiSigWallets);
      console.log('다중서명 지갑 상태 업데이트 완료');
    } catch (error) {
      console.error('저장된 다중 서명 지갑 불러오기 실패:', error);
    }
  };

  /**
   * 다중서명 지갑의 트랜잭션 목록 조회
   */
  const getMultiSigWalletTransactions = async (address) => {
    try {
      console.log('다중서명 지갑 트랜잭션 조회 시작:', address);
      
      if (!provider) {
        throw new Error('네트워크에 연결되지 않았습니다.');
      }

      if (!ethers.isAddress(address)) {
        throw new Error('유효하지 않은 주소입니다.');
      }

      const contract = getMultiSigWallet(provider, address);
      const transactions = await getMultiSigTransactions(contract);
      
      console.log('조회된 트랜잭션 수:', transactions.length);
      return transactions;
    } catch (error) {
      console.error('다중서명 지갑 트랜잭션 조회 실패:', error);
      throw error;
    }
  };

  /**
   * 다중서명 지갑에 트랜잭션 제안
   */
  const proposeMultiSigTransaction = async (address, to, value, data = '0x') => {
    try {
      console.log('다중서명 트랜잭션 제안 시작:', { address, to, value, data });
      
      if (!provider) {
        throw new Error('네트워크에 연결되지 않았습니다.');
      }

      if (!currentWallet) {
        throw new Error('지갑이 연결되지 않았습니다.');
      }

      if (!ethers.isAddress(address)) {
        throw new Error('유효하지 않은 다중서명 지갑 주소입니다.');
      }

      if (!ethers.isAddress(to)) {
        throw new Error('유효하지 않은 수신자 주소입니다.');
      }

      // 개인키로 서명된 컨트랙트 인스턴스 생성
      const wallet = new ethers.Wallet(currentWallet.privateKey, provider);
      const contract = getMultiSigWallet(wallet, address);
      
      // 트랜잭션 제안
      const result = await proposeTransaction(contract, to, value, data);
      
      console.log('트랜잭션 제안 완료:', result);
      return result;
    } catch (error) {
      console.error('다중서명 트랜잭션 제안 실패:', error);
      throw error;
    }
  };

  /**
   * 다중서명 트랜잭션에 서명
   */
  const confirmMultiSigTransaction = async (address, transactionId) => {
    try {
      console.log('다중서명 트랜잭션 서명 시작:', { address, transactionId });
      
      if (!provider) {
        throw new Error('네트워크에 연결되지 않았습니다.');
      }

      if (!currentWallet) {
        throw new Error('지갑이 연결되지 않았습니다.');
      }

      if (!ethers.isAddress(address)) {
        throw new Error('유효하지 않은 다중서명 지갑 주소입니다.');
      }

      // 개인키로 서명된 컨트랙트 인스턴스 생성
      const wallet = new ethers.Wallet(currentWallet.privateKey, provider);
      const contract = getMultiSigWallet(wallet, address);
      
      // 트랜잭션 서명
      const result = await confirmTransaction(contract, transactionId);
      
      console.log('트랜잭션 서명 완료:', result);
      return result;
    } catch (error) {
      console.error('다중서명 트랜잭션 서명 실패:', error);
      throw error;
    }
  };

  /**
   * 다중서명 트랜잭션 실행
   */
  const executeMultiSigTransaction = async (address, transactionId) => {
    try {
      console.log('다중서명 트랜잭션 실행 시작:', { address, transactionId });
      
      if (!provider) {
        throw new Error('네트워크에 연결되지 않았습니다.');
      }

      if (!currentWallet) {
        throw new Error('지갑이 연결되지 않았습니다.');
      }

      if (!ethers.isAddress(address)) {
        throw new Error('유효하지 않은 다중서명 지갑 주소입니다.');
      }

      // 개인키로 서명된 컨트랙트 인스턴스 생성
      const wallet = new ethers.Wallet(currentWallet.privateKey, provider);
      const contract = getMultiSigWallet(wallet, address);
      
      // 트랜잭션 실행
      const result = await executeTransaction(contract, transactionId);
      
      console.log('트랜잭션 실행 완료:', result);
      return result;
    } catch (error) {
      console.error('다중서명 트랜잭션 실행 실패:', error);
      throw error;
    }
  };

  /**
   * 새 지갑 생성
   * @param {string} name - 지갑 이름
   * @returns {Object} 생성된 지갑 정보
   */
  const createWallet = async (name) => {
    try {
      setIsLoading(true);
      setError(null);

      // 새 지갑 생성
      const newWallet = createNewWallet(name);
      
      // 지갑 목록에 추가
      const updatedWallets = [...savedWallets, newWallet];
      setSavedWallets(updatedWallets);
      saveWalletData('savedWallets', updatedWallets);
      
      // 현재 지갑으로 설정
      setCurrentWallet(newWallet);
      
      return newWallet;
    } catch (error) {
      console.error('지갑 생성 실패:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 니모닉으로 지갑 복구
   * @param {string} mnemonic - 12단어 니모닉
   * @param {string} name - 지갑 이름
   * @returns {Object} 복구된 지갑 정보
   */
  const recoverWalletByMnemonic = async (mnemonic, name) => {
    try {
      setIsLoading(true);
      setError(null);

      const recoveredWallet = recoverWalletFromMnemonic(mnemonic, name);
      
      // 지갑 목록에 추가
      const updatedWallets = [...savedWallets, recoveredWallet];
      setSavedWallets(updatedWallets);
      saveWalletData('savedWallets', updatedWallets);
      
      // 현재 지갑으로 설정
      setCurrentWallet(recoveredWallet);
      
      return recoveredWallet;
    } catch (error) {
      console.error('니모닉 복구 실패:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 개인키로 지갑 복구
   * @param {string} privateKey - 개인키
   * @param {string} name - 지갑 이름
   * @returns {Object} 복구된 지갑 정보
   */
  const recoverWalletByPrivateKey = async (privateKey, name) => {
    try {
      setIsLoading(true);
      setError(null);

      const recoveredWallet = recoverWalletFromPrivateKey(privateKey, name);
      
      // 지갑 목록에 추가
      const updatedWallets = [...savedWallets, recoveredWallet];
      setSavedWallets(updatedWallets);
      saveWalletData('savedWallets', updatedWallets);
      
      // 현재 지갑으로 설정
      setCurrentWallet(recoveredWallet);
      
      return recoveredWallet;
    } catch (error) {
      console.error('개인키 복구 실패:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 주소로 지갑 열기 (읽기 전용)
   * @param {string} address - 지갑 주소
   * @returns {Object} 지갑 정보
   */
  const openWalletByAddress = async (address) => {
    try {
      setIsLoading(true);
      setError(null);

      // 주소 유효성 검사
      if (!isValidAddress(address)) {
        throw new Error('유효하지 않은 지갑 주소입니다.');
      }

      // 읽기 전용 지갑 객체 생성
      const readOnlyWallet = {
        name: '읽기 전용 지갑',
        address: address,
        type: 'readonly',
        createdAt: new Date().toISOString()
      };

      // 현재 지갑으로 설정
      setCurrentWallet(readOnlyWallet);
      
      return readOnlyWallet;
    } catch (error) {
      console.error('지갑 열기 실패:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 저장된 지갑 선택
   * @param {Object} wallet - 선택할 지갑
   */
  const selectWallet = (wallet) => {
    setCurrentWallet(wallet);
    setError(null);
    
    // 마지막으로 선택된 지갑 저장
    saveWalletData('lastSelectedWallet', wallet);
    console.log('지갑 선택됨:', wallet.address);
  };

  /**
   * 지갑 삭제
   * @param {string} address - 삭제할 지갑 주소
   */
  const deleteWallet = (address) => {
    try {
      // 로컬 스토리지에서 최신 데이터 로드
      const currentWallets = loadWalletData('savedWallets') || [];
      console.log('삭제 전 저장된 지갑 목록:', currentWallets);
      console.log('삭제할 주소:', address);
      
      // 대소문자 구분 없이 주소 비교
      const updatedWallets = currentWallets.filter(wallet => 
        wallet.address?.toLowerCase() !== address?.toLowerCase()
      );
      
      console.log('삭제 후 지갑 목록:', updatedWallets);
      
      // 상태 업데이트
      setSavedWallets(updatedWallets);
      
      // 로컬 스토리지에 저장
      saveWalletData('savedWallets', updatedWallets);
      
      // 저장 확인
      const verifyDeleted = loadWalletData('savedWallets') || [];
      console.log('삭제 확인 - 로컬 스토리지에서 불러온 목록:', verifyDeleted);
      
      // 현재 지갑이 삭제된 지갑이면 선택 해제
      if (currentWallet?.address?.toLowerCase() === address?.toLowerCase()) {
        setCurrentWallet(null);
        saveWalletData('lastSelectedWallet', null);
      }
    } catch (error) {
      console.error('지갑 삭제 실패:', error);
      setError('지갑 삭제에 실패했습니다.');
    }
  };

  /**
   * 지갑 연결 해제
   */
  const disconnectWallet = () => {
    setCurrentWallet(null);
    setError(null);
    
    // 마지막으로 선택된 지갑 정보 삭제
    localStorage.removeItem('lastSelectedWallet');
    console.log('지갑 연결 해제됨');
  };

  /**
   * 다중 서명 지갑 생성
   * @param {string} name - 지갑 이름
   * @param {Array} owners - 소유자 주소 목록
   * @param {number} threshold - 임계값
   * @returns {Object} 생성된 다중 서명 지갑 정보
   */
  const createMultiSigWallet = async (name, owners, threshold) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!provider) {
        throw new Error('네트워크에 연결되지 않았습니다.');
      }

      if (!currentWallet) {
        throw new Error('현재 지갑이 선택되지 않았습니다.');
      }

      // 소유자 및 임계값 유효성 검사
      const ownerValidation = validateOwners(owners);
      if (!ownerValidation.valid) {
        throw new Error(ownerValidation.error);
      }

      const thresholdValidation = validateThreshold(threshold, ownerValidation.owners.length);
      if (!thresholdValidation.valid) {
        throw new Error(thresholdValidation.error);
      }

      // 다중 서명 지갑 배포
      const deployedWallet = await deployMultiSigWallet(
        provider,
        currentWallet.privateKey,
        ownerValidation.owners,
        threshold
      );

      // 다중 서명 지갑 데이터 생성
      const multiSigWalletData = {
        name,
        address: deployedWallet.address,
        owners: ownerValidation.owners,
        threshold,
        deploymentTx: deployedWallet.deploymentTx,
        createdAt: new Date().toISOString(),
        type: 'multisig',
        pending: deployedWallet.pending || false
      };

      // 현재 로컬 스토리지에서 최신 다중 서명 지갑 목록 불러오기
      const currentMultiSigWallets = loadWalletData('savedMultiSigWallets') || [];
      console.log('현재 저장된 다중 서명 지갑 목록:', currentMultiSigWallets);
      console.log('현재 저장된 다중 서명 지갑 개수:', currentMultiSigWallets.length);
      
      // 새로운 다중 서명 지갑 추가
      const updatedMultiSigWallets = [...currentMultiSigWallets, multiSigWalletData];
      console.log('업데이트된 다중 서명 지갑 목록:', updatedMultiSigWallets);
      console.log('업데이트된 다중 서명 지갑 개수:', updatedMultiSigWallets.length);
      
      setSavedMultiSigWallets(updatedMultiSigWallets);
      console.log('상태 업데이트 완료');
      
      // 로컬 스토리지에 저장
      const saveResult = saveWalletData('savedMultiSigWallets', updatedMultiSigWallets);
      console.log('다중 서명 지갑 저장 결과:', saveResult);
      console.log('저장된 다중 서명 지갑 목록:', updatedMultiSigWallets);
      
      // 저장 후 즉시 다시 불러와서 확인
      const verifySaved = loadWalletData('savedMultiSigWallets') || [];
      console.log('저장 검증 - 로컬 스토리지에서 불러온 목록:', verifySaved);
      console.log('저장 검증 - 불러온 개수:', verifySaved.length);

      return multiSigWalletData;
    } catch (error) {
      console.error('다중 서명 지갑 생성 실패:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 다중 서명 지갑 데이터 조회
   * @param {string} address - 다중 서명 지갑 주소
   * @returns {Object} 지갑 정보
   */
  const getMultiSigWalletData = async (address) => {
    try {
      console.log('다중서명 지갑 데이터 조회 시작:', address);
      
      if (!provider) {
        throw new Error('네트워크에 연결되지 않았습니다.');
      }

      if (!ethers.isAddress(address)) {
        throw new Error('유효하지 않은 주소입니다.');
      }

      console.log('컨트랙트 인스턴스 생성 중...');
      console.log('사용할 provider:', provider);
      console.log('사용할 address:', address);
      
      // 다중서명 지갑 확인을 우회하고 직접 시도
      console.log('다중서명 지갑 확인을 우회하고 직접 시도...');
      
      // 컨트랙트 인스턴스 생성
      const contract = getMultiSigWallet(provider, address);
      console.log('컨트랙트 인스턴스 생성 완료:', contract.target);
      console.log('생성된 contract 정보:', {
        target: contract.target,
        provider: contract.provider,
        hasGetBalance: contract.provider && typeof contract.provider.getBalance === 'function'
      });
      
      console.log('컨트랙트 정보 조회 중...');
      // 컨트랙트 정보 조회
      const info = await getMultiSigWalletInfo(contract);
      console.log('컨트랙트 정보 조회 완료:', info);
      
      // 잔액을 직접 조회해보기
      let directBalance = '0';
      try {
        console.log('직접 잔액 조회 시도...');
        directBalance = await provider.getBalance(address);
        console.log('직접 잔액 조회 성공:', directBalance);
        console.log('직접 잔액 (ETH):', ethers.formatEther(directBalance));
      } catch (directBalanceError) {
        console.warn('직접 잔액 조회 실패:', directBalanceError);
      }
      
      const result = {
        address,
        owners: info.owners,
        threshold: info.threshold,
        balance: directBalance !== '0' ? ethers.formatEther(directBalance) : info.balance
      };
      
      console.log('최종 반환 데이터:', result);
      return result;
    } catch (error) {
      console.error('다중 서명 지갑 데이터 조회 실패:', error);
      console.error('오류 상세:', error.message);
      console.error('오류 스택:', error.stack);
      throw error;
    }
  };

  /**
   * 다중 서명 지갑 삭제
   * @param {string} addressOrTx - 삭제할 다중 서명 지갑 주소 또는 배포 트랜잭션 해시
   */
  const deleteMultiSigWallet = (addressOrTx) => {
    try {
      // 로컬 스토리지에서 최신 데이터 로드
      const currentMultiSigWallets = loadWalletData('savedMultiSigWallets') || [];
      console.log('삭제 전 저장된 다중 서명 지갑 목록:', currentMultiSigWallets);
      console.log('삭제할 주소/트랜잭션:', addressOrTx);
      
      // 주소 또는 배포 트랜잭션 해시로 비교 (대소문자 구분 없이)
      const updatedMultiSigWallets = currentMultiSigWallets.filter(wallet => {
        const walletAddress = wallet.address?.toLowerCase();
        const walletTx = wallet.deploymentTx?.toLowerCase();
        const targetAddressOrTx = addressOrTx?.toLowerCase();
        
        // 주소가 있으면 주소로 비교, 없으면 배포 트랜잭션 해시로 비교
        if (walletAddress) {
          return walletAddress !== targetAddressOrTx;
        } else if (walletTx) {
          return walletTx !== targetAddressOrTx;
        }
        // 주소와 트랜잭션 해시가 모두 없으면 유지 (안전을 위해)
        return true;
      });
      
      console.log('삭제 후 다중 서명 지갑 목록:', updatedMultiSigWallets);
      
      // 상태 업데이트
      setSavedMultiSigWallets(updatedMultiSigWallets);
      
      // 로컬 스토리지에 저장
      saveWalletData('savedMultiSigWallets', updatedMultiSigWallets);
      
      // 저장 확인
      const verifyDeleted = loadWalletData('savedMultiSigWallets') || [];
      console.log('삭제 확인 - 로컬 스토리지에서 불러온 목록:', verifyDeleted);
      console.log('삭제 확인 - 남은 다중 서명 지갑 개수:', verifyDeleted.length);
    } catch (error) {
      console.error('다중 서명 지갑 삭제 실패:', error);
      setError('다중 서명 지갑 삭제에 실패했습니다.');
    }
  };

  /**
   * 서명자 인증 (다중서명 지갑의 서명자인지 확인)
   * @param {string} multisigAddress - 다중서명 지갑 주소
   * @param {string} signerAddress - 확인할 서명자 주소
   * @returns {Object} 인증 결과
   */
  const verifySigner = async (multisigAddress, signerAddress) => {
    try {
      console.log('서명자 인증 시작:', { multisigAddress, signerAddress });
      
      if (!provider) {
        throw new Error('네트워크에 연결되지 않았습니다.');
      }

      if (!ethers.isAddress(multisigAddress)) {
        throw new Error('유효하지 않은 다중서명 지갑 주소입니다.');
      }

      if (!ethers.isAddress(signerAddress)) {
        throw new Error('유효하지 않은 서명자 주소입니다.');
      }

      // 컨트랙트에서 소유자 목록 조회
      const contract = getMultiSigWallet(provider, multisigAddress);
      const owners = await contract.getOwners();
      
      // 서명자가 소유자 목록에 있는지 확인
      const isSigner = owners.some(owner => 
        owner.toLowerCase() === signerAddress.toLowerCase()
      );

      console.log('서명자 인증 결과:', {
        multisigAddress,
        signerAddress,
        owners,
        isSigner
      });

      return {
        isSigner,
        owners,
        multisigAddress,
        signerAddress
      };
    } catch (error) {
      console.error('서명자 인증 실패:', error);
      throw error;
    }
  };

  /**
   * 다중서명 지갑에 서명자 참여 (주소로 접근)
   * @param {string} multisigAddress - 다중서명 지갑 주소
   * @returns {Object} 참여 결과
   */
  const joinMultiSigWallet = async (multisigAddress) => {
    try {
      console.log('다중서명 지갑 참여 시작:', multisigAddress);
      
      if (!currentWallet) {
        throw new Error('지갑이 연결되지 않았습니다.');
      }

      if (!provider) {
        throw new Error('네트워크에 연결되지 않았습니다.');
      }

      if (!ethers.isAddress(multisigAddress)) {
        throw new Error('유효하지 않은 다중서명 지갑 주소입니다.');
      }

      // 서명자 인증
      const verification = await verifySigner(multisigAddress, currentWallet.address);
      
      if (!verification.isSigner) {
        throw new Error('이 지갑은 해당 다중서명 지갑의 서명자가 아닙니다.');
      }

      // 다중서명 지갑 정보 조회
      const walletData = await getMultiSigWalletData(multisigAddress);
      
      // 로컬 스토리지에 다중서명 지갑 추가 (이미 있는지 확인)
      const existingWallets = loadWalletData('savedMultiSigWallets') || [];
      const isAlreadyAdded = existingWallets.some(wallet => 
        wallet.address?.toLowerCase() === multisigAddress.toLowerCase()
      );

      if (!isAlreadyAdded) {
        const newMultiSigWallet = {
          name: `다중서명 지갑 ${multisigAddress.slice(0, 6)}...${multisigAddress.slice(-4)}`,
          address: multisigAddress,
          owners: walletData.owners,
          threshold: Number(walletData.threshold),
          balance: walletData.balance,
          deploymentTx: '',
          createdAt: new Date().toISOString(),
          type: 'multisig',
          pending: false,
          joinedAt: new Date().toISOString()
        };

        const updatedWallets = [...existingWallets, newMultiSigWallet];
        setSavedMultiSigWallets(updatedWallets);
        saveWalletData('savedMultiSigWallets', updatedWallets);
        
        console.log('다중서명 지갑 참여 완료:', newMultiSigWallet);
        return newMultiSigWallet;
      } else {
        console.log('이미 참여한 다중서명 지갑입니다.');
        return existingWallets.find(wallet => 
          wallet.address?.toLowerCase() === multisigAddress.toLowerCase()
        );
      }
    } catch (error) {
      console.error('다중서명 지갑 참여 실패:', error);
      throw error;
    }
  };

  /**
   * 에러 초기화
   */
  const clearError = () => {
    setError(null);
  };

  // 컨텍스트 값
  const value = {
    // 상태
    currentWallet,
    savedWallets,
    savedMultiSigWallets,
    isLoading,
    error,
    provider,
    
    // 액션
    createWallet,
    recoverWalletByMnemonic,
    recoverWalletByPrivateKey,
    openWalletByAddress,
    selectWallet,
    deleteWallet,
    disconnectWallet,
    clearError,
    
    // 다중 서명 지갑 액션
    createMultiSigWallet,
    getMultiSigWalletData,
    deleteMultiSigWallet,
    loadSavedMultiSigWallets,
    
    // 다중 서명 트랜잭션 액션
    getMultiSigWalletTransactions,
    proposeMultiSigTransaction,
    confirmMultiSigTransaction,
    executeMultiSigTransaction,
    
    // 서명자 참여 액션
    verifySigner,
    joinMultiSigWallet,
    
    // 유틸리티
    isConnected: !!currentWallet,
    isReadOnly: currentWallet?.type === 'readonly',
    isMultiSig: currentWallet?.type === 'multisig'
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};