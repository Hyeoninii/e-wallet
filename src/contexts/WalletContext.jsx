// src/contexts/WalletContext.jsx (RPC 버전)
import React, { createContext, useContext, useState, useEffect } from 'react';
import EthereumRPCClient from '../utils/rpcClient';
import { TransactionSigner, TransactionBuilder } from '../utils/transactionUtils';
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
 */
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

/**
 * RPC 통신을 사용하는 지갑 프로바이더
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
  
  // RPC 클라이언트
  const [rpcClient, setRpcClient] = useState(null);
  
  // 트랜잭션 빌더
  const [transactionBuilder, setTransactionBuilder] = useState(null);

  // 네트워크 설정
  const NETWORKS = {
    sepolia: {
      name: 'Sepolia Testnet',
      chainId: 11155111,
      rpcUrl: 'https://sepolia.infura.io/v3/c2d38e26cb7f47d792611197ed4807dd',
      blockExplorer: 'https://sepolia.etherscan.io'
    },
    mainnet: {
      name: 'Ethereum Mainnet',
      chainId: 1,
      rpcUrl: 'https://mainnet.infura.io/v3/c2d38e26cb7f47d792611197ed4807dd',
      blockExplorer: 'https://etherscan.io'
    }
  };

  const [currentNetwork, setCurrentNetwork] = useState(NETWORKS.sepolia);

  /**
   * 컴포넌트 마운트 시 초기화
   */
  useEffect(() => {
    initializeWallet();
  }, []);

  /**
   * 지갑 시스템 초기화 (RPC 클라이언트 설정)
   */
  const initializeWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // RPC 클라이언트 초기화
      const client = new EthereumRPCClient(currentNetwork.rpcUrl, currentNetwork.chainId);
      setRpcClient(client);

      // 트랜잭션 빌더 초기화
      const builder = new TransactionBuilder(client);
      setTransactionBuilder(builder);

      // 네트워크 연결 테스트
      const chainId = await client.getChainId();
      const blockNumber = await client.getBlockNumber();
      
      console.log('RPC 연결 성공:', {
        chainId: client.hexToDecimal(chainId),
        blockNumber: client.hexToDecimal(blockNumber),
        network: currentNetwork.name
      });

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
   * 지갑 잔액 조회 (RPC 직접 호출)
   * @param {string} address - 지갑 주소
   * @returns {Promise<string>} ETH 단위 잔액
   */
  const getBalance = async (address) => {
    if (!rpcClient || !address) return '0';

    try {
      const balanceWei = await rpcClient.getBalance(address);
      return rpcClient.weiToEth(balanceWei);
    } catch (error) {
      console.error('잔액 조회 실패:', error);
      throw new Error('잔액 조회에 실패했습니다: ' + error.message);
    }
  };

  /**
   * ETH 전송 (RPC 직접 통신)
   * @param {string} to - 수신자 주소
   * @param {string} amount - 전송할 ETH 양
   * @param {Object} options - 가스 옵션
   * @returns {Promise<string>} 트랜잭션 해시
   */
  const sendEther = async (to, amount, options = {}) => {
    if (!currentWallet?.privateKey || !rpcClient || !transactionBuilder) {
      throw new Error('지갑이 연결되지 않았거나 RPC 클라이언트가 초기화되지 않았습니다.');
    }

    try {
      setIsLoading(true);
      setError(null);

      // 트랜잭션 서명자 생성
      const signer = new TransactionSigner(currentWallet.privateKey);

      // 트랜잭션 생성
      const transaction = await transactionBuilder.buildTransferTransaction(
        currentWallet.address,
        to,
        amount,
        options
      );

      console.log('생성된 트랜잭션:', transaction);

      // 트랜잭션 서명
      const signedTx = await signer.signTransaction(transaction, currentNetwork.chainId);

      console.log('서명된 트랜잭션:', signedTx);

      // 서명된 트랜잭션 전송
      const txHash = await rpcClient.sendRawTransaction(signedTx);

      console.log('트랜잭션 해시:', txHash);

      return txHash;
    } catch (error) {
      console.error('ETH 전송 실패:', error);
      setError('ETH 전송에 실패했습니다: ' + error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 트랜잭션 상태 확인
   * @param {string} txHash - 트랜잭션 해시
   * @returns {Promise<Object>} 트랜잭션 영수증
   */
  const getTransactionReceipt = async (txHash) => {
    if (!rpcClient) {
      throw new Error('RPC 클라이언트가 초기화되지 않았습니다.');
    }

    try {
      return await rpcClient.getTransactionReceipt(txHash);
    } catch (error) {
      console.error('트랜잭션 영수증 조회 실패:', error);
      throw new Error('트랜잭션 상태 확인에 실패했습니다: ' + error.message);
    }
  };

  /**
   * 네트워크 변경
   * @param {string} networkKey - 네트워크 키 ('sepolia', 'mainnet')
   */
  const switchNetwork = async (networkKey) => {
    if (!NETWORKS[networkKey]) {
      throw new Error('지원되지 않는 네트워크입니다.');
    }

    try {
      setIsLoading(true);
      setCurrentNetwork(NETWORKS[networkKey]);
      
      // RPC 클라이언트 재초기화
      await initializeWallet();
    } catch (error) {
      console.error('네트워크 변경 실패:', error);
      setError('네트워크 변경에 실패했습니다: ' + error.message);
    }
  };

  /**
   * 가스 가격 조회
   * @returns {Promise<string>} Gwei 단위 가스 가격
   */
  const getGasPrice = async () => {
    if (!rpcClient) return '20';

    try {
      const gasPriceWei = await rpcClient.getGasPrice();
      const gasPriceGwei = rpcClient.hexToDecimal(gasPriceWei) / 1e9;
      return gasPriceGwei.toFixed(1);
    } catch (error) {
      console.error('가스 가격 조회 실패:', error);
      return '20'; // 기본값
    }
  };

  // 기존 지갑 생성/복구/관리 함수들은 동일하게 유지...
  const createWallet = async (name) => {
    try {
      setIsLoading(true);
      setError(null);

      const newWallet = createNewWallet(name);
      const updatedWallets = [...savedWallets, newWallet];
      setSavedWallets(updatedWallets);
      saveWalletData('savedWallets', updatedWallets);
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

  const recoverWalletByMnemonic = async (mnemonic, name) => {
    try {
      setIsLoading(true);
      setError(null);

      const recoveredWallet = recoverWalletFromMnemonic(mnemonic, name);
      const updatedWallets = [...savedWallets, recoveredWallet];
      setSavedWallets(updatedWallets);
      saveWalletData('savedWallets', updatedWallets);
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

  const recoverWalletByPrivateKey = async (privateKey, name) => {
    try {
      setIsLoading(true);
      setError(null);

      const recoveredWallet = recoverWalletFromPrivateKey(privateKey, name);
      const updatedWallets = [...savedWallets, recoveredWallet];
      setSavedWallets(updatedWallets);
      saveWalletData('savedWallets', updatedWallets);
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

  const openWalletByAddress = async (address) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!isValidAddress(address)) {
        throw new Error('유효하지 않은 지갑 주소입니다.');
      }

      const readOnlyWallet = {
        name: '읽기 전용 지갑',
        address: address,
        type: 'readonly',
        createdAt: new Date().toISOString()
      };

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

  const selectWallet = (wallet) => {
    setCurrentWallet(wallet);
    setError(null);
  };

  const deleteWallet = (address) => {
    try {
      const updatedWallets = savedWallets.filter(wallet => wallet.address !== address);
      setSavedWallets(updatedWallets);
      saveWalletData('savedWallets', updatedWallets);
      
      if (currentWallet?.address === address) {
        setCurrentWallet(null);
      }
    } catch (error) {
      console.error('지갑 삭제 실패:', error);
      setError('지갑 삭제에 실패했습니다.');
    }
  };

  const disconnectWallet = () => {
    setCurrentWallet(null);
    setError(null);
  };

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
    rpcClient,
    currentNetwork,
    
    // 액션
    createWallet,
    recoverWalletByMnemonic,
    recoverWalletByPrivateKey,
    openWalletByAddress,
    selectWallet,
    deleteWallet,
    disconnectWallet,
    clearError,
    
    // RPC 통신 함수들
    getBalance,
    sendEther,
    getTransactionReceipt,
    switchNetwork,
    getGasPrice,
    
    // 네트워크 정보
    availableNetworks: NETWORKS,
    
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