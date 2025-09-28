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
  validateOwners,
  validateThreshold
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
    } catch (error) {
      console.error('저장된 지갑 불러오기 실패:', error);
    }
  };

  /**
   * 저장된 다중 서명 지갑 목록 불러오기
   */
  const loadSavedMultiSigWallets = () => {
    try {
      const multiSigWallets = loadWalletData('savedMultiSigWallets') || [];
      setSavedMultiSigWallets(multiSigWallets);
    } catch (error) {
      console.error('저장된 다중 서명 지갑 불러오기 실패:', error);
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
  };

  /**
   * 지갑 삭제
   * @param {string} address - 삭제할 지갑 주소
   */
  const deleteWallet = (address) => {
    try {
      const updatedWallets = savedWallets.filter(wallet => wallet.address !== address);
      setSavedWallets(updatedWallets);
      saveWalletData('savedWallets', updatedWallets);
      
      // 현재 지갑이 삭제된 지갑이면 선택 해제
      if (currentWallet?.address === address) {
        setCurrentWallet(null);
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
      
      // 새로운 다중 서명 지갑 추가
      const updatedMultiSigWallets = [...currentMultiSigWallets, multiSigWalletData];
      setSavedMultiSigWallets(updatedMultiSigWallets);
      
      // 로컬 스토리지에 저장
      const saveResult = saveWalletData('savedMultiSigWallets', updatedMultiSigWallets);
      console.log('다중 서명 지갑 저장 결과:', saveResult);
      console.log('저장된 다중 서명 지갑 목록:', updatedMultiSigWallets);

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
      if (!provider) {
        throw new Error('네트워크에 연결되지 않았습니다.');
      }

      if (!ethers.isAddress(address)) {
        throw new Error('유효하지 않은 주소입니다.');
      }

      // 컨트랙트 인스턴스 생성
      const contract = getMultiSigWallet(provider, address);
      
      // 컨트랙트 정보 조회
      const info = await getMultiSigWalletInfo(contract);
      
      return {
        address,
        owners: info.owners,
        threshold: info.threshold,
        balance: info.balance
      };
    } catch (error) {
      console.error('다중 서명 지갑 데이터 조회 실패:', error);
      throw error;
    }
  };

  /**
   * 다중 서명 지갑 삭제
   * @param {string} address - 삭제할 다중 서명 지갑 주소
   */
  const deleteMultiSigWallet = (address) => {
    try {
      const updatedMultiSigWallets = savedMultiSigWallets.filter(
        wallet => wallet.address !== address
      );
      setSavedMultiSigWallets(updatedMultiSigWallets);
      saveWalletData('savedMultiSigWallets', updatedMultiSigWallets);
    } catch (error) {
      console.error('다중 서명 지갑 삭제 실패:', error);
      setError('다중 서명 지갑 삭제에 실패했습니다.');
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
    
    // 유틸리티
    isConnected: !!currentWallet,
    isReadOnly: currentWallet?.type === 'readonly'
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};