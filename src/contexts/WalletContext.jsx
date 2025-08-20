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

      // Sepolia 테스트넷 프로바이더 설정
      const sepoliaProvider = new ethers.JsonRpcProvider(
        'https://sepolia.infura.io/v3/c2d38e26cb7f47d792611197ed4807dd'
      );
      setProvider(sepoliaProvider);

      // 저장된 지갑 목록 불러오기
      loadSavedWallets();
      
    } catch (error) {
      console.error('지갑 초기화 실패:', error);
      setError('지갑 시스템 초기화에 실패했습니다: ' + error.message);
    } finally {
      setIsLoading(false);
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
