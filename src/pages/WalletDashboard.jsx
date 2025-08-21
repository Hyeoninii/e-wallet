// src/pages/WalletDashboard.jsx (RPC 버전)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { shortenAddress, copyToClipboard } from '../utils/wallet';

/**
 * RPC 통신을 사용하는 지갑 대시보드
 */
const WalletDashboard = () => {
  const navigate = useNavigate();
  const { 
    currentWallet, 
    isReadOnly, 
    disconnectWallet,
    error, 
    clearError,
    isLoading,
    rpcClient,
    currentNetwork,
    availableNetworks,
    getBalance,
    sendEther,
    getTransactionReceipt,
    switchNetwork,
    getGasPrice
  } = useWallet();

  // 상태 관리
  const [balance, setBalance] = useState('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [currentGasPrice, setCurrentGasPrice] = useState('20');

  // 송금 폼 상태
  const [sendForm, setSendForm] = useState({
    to: '',
    amount: '',
    gasPrice: '20'
  });

  // 트랜잭션 상태
  const [lastTransaction, setLastTransaction] = useState(null);
  const [isTransactionPending, setIsTransactionPending] = useState(false);

  /**
   * 지갑이 없으면 홈으로 리다이렉트
   */
  useEffect(() => {
    if (!currentWallet) {
      navigate('/');
    }
  }, [currentWallet, navigate]);

  /**
   * 잔액 조회 및 가스 가격 조회
   */
  useEffect(() => {
    if (currentWallet?.address && rpcClient) {
      fetchWalletInfo();
    }
  }, [currentWallet, rpcClient, currentNetwork]);

  /**
   * 지갑 정보 조회 (잔액 + 가스 가격)
   */
  const fetchWalletInfo = async () => {
    if (!currentWallet?.address || !rpcClient) return;

    try {
      setIsLoadingBalance(true);
      
      // 병렬로 잔액과 가스 가격 조회
      const [walletBalance, gasPrice] = await Promise.all([
        getBalance(currentWallet.address),
        getGasPrice()
      ]);
      
      setBalance(walletBalance);
      setCurrentGasPrice(gasPrice);
      setSendForm(prev => ({ ...prev, gasPrice }));
      
    } catch (error) {
      console.error('지갑 정보 조회 실패:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  /**
   * 주소 복사
   */
  const handleCopyAddress = async () => {
    if (!currentWallet?.address) return;

    const success = await copyToClipboard(currentWallet.address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * RPC 직접 통신으로 송금 실행
   */
  const handleSendTransaction = async () => {
    if (!currentWallet?.privateKey || !rpcClient) {
      return;
    }

    try {
      clearError();
      setIsTransactionPending(true);
      
      // 입력 검증
      if (!sendForm.to || !sendForm.amount) {
        throw new Error('수신 주소와 금액을 입력해주세요.');
      }

      // 잔액 확인
      const currentBalance = parseFloat(balance);
      const sendAmount = parseFloat(sendForm.amount);
      
      if (currentBalance < sendAmount) {
        throw new Error('잔액이 부족합니다.');
      }

      console.log('RPC 송금 시작:', {
        from: currentWallet.address,
        to: sendForm.to,
        amount: sendForm.amount + ' ETH',
        gasPrice: sendForm.gasPrice + ' Gwei',
        network: currentNetwork.name
      });

      // RPC를 통해 ETH 전송
      const txHash = await sendEther(sendForm.to, sendForm.amount, {
        gasPrice: sendForm.gasPrice
      });
      
      console.log('RPC 트랜잭션 전송 완료:', txHash);
      
      // 트랜잭션 정보 저장
      setLastTransaction({
        hash: txHash,
        to: sendForm.to,
        amount: sendForm.amount,
        timestamp: new Date().toISOString(),
        status: 'pending',
        network: currentNetwork.name
      });
      
      // 성공 알림
      alert(`트랜잭션이 전송되었습니다!\n해시: ${txHash}\n\n블록에 포함될 때까지 기다리는 중...`);
      
      // 트랜잭션 영수증 대기 (백그라운드에서)
      waitForTransactionReceipt(txHash);
      
      // 송금 모달 닫기 및 폼 초기화
      setShowSendModal(false);
      setSendForm({ to: '', amount: '', gasPrice: currentGasPrice });
      
    } catch (error) {
      console.error('RPC 송금 실패:', error);
      
      if (lastTransaction) {
        setLastTransaction(prev => ({
          ...prev,
          status: 'failed',
          error: error.message
        }));
      }
      
      // 에러 타입별 처리
      if (error.message.includes('insufficient funds')) {
        alert('❌ 송금에 실패했습니다: 잔액이 부족합니다.');
      } else if (error.message.includes('invalid address')) {
        alert('❌ 송금에 실패했습니다: 유효하지 않은 주소입니다.');
      } else if (error.message.includes('gas')) {
        alert('❌ 송금에 실패했습니다: 가스 관련 오류입니다.');
      } else {
        alert(`❌ 송금에 실패했습니다: ${error.message}`);
      }
    } finally {
      setIsTransactionPending(false);
    }
  };

  /**
   * 트랜잭션 영수증 대기 (비동기)
   */
  const waitForTransactionReceipt = async (txHash) => {
    try {
      let attempts = 0;
      const maxAttempts = 30; // 5분 대기 (10초 간격)
      
      const checkReceipt = async () => {
        try {
          const receipt = await getTransactionReceipt(txHash);
          
          if (receipt) {
            console.log('트랜잭션 영수증 받음:', receipt);
            
            const success = rpcClient.hexToDecimal(receipt.status) === 1;
            
            // 트랜잭션 상태 업데이트
            setLastTransaction(prev => ({
              ...prev,
              status: success ? 'success' : 'failed',
              blockNumber: rpcClient.hexToDecimal(receipt.blockNumber),
              gasUsed: rpcClient.hexToDecimal(receipt.gasUsed)
            }));
            
            // 잔액 새로고침
            setTimeout(fetchWalletInfo, 2000);
            
            // 완료 알림
            if (success) {
              alert(`✅ 트랜잭션이 성공적으로 완료되었습니다!\n\n해시: ${txHash}\n블록 번호: ${rpcClient.hexToDecimal(receipt.blockNumber)}\n가스 사용량: ${rpcClient.hexToDecimal(receipt.gasUsed)}`);
            } else {
              alert(`❌ 트랜잭션이 실패했습니다.\n\n해시: ${txHash}`);
            }
            
            return;
          }
          
          // 아직 영수증이 없으면 재시도
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkReceipt, 10000); // 10초 후 재시도
          } else {
            console.log('트랜잭션 영수증 대기 시간 초과');
            setLastTransaction(prev => ({
              ...prev,
              status: 'timeout'
            }));
          }
        } catch (error) {
          console.error('트랜잭션 영수증 확인 실패:', error);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkReceipt, 10000);
          }
        }
      };
      
      // 첫 번째 확인은 5초 후
      setTimeout(checkReceipt, 5000);
      
    } catch (error) {
      console.error('트랜잭션 영수증 대기 실패:', error);
    }
  };

  /**
   * 트랜잭션 상태 수동 확인
   */
  const checkTransactionStatus = async (hash) => {
    if (!hash || !rpcClient) return;
    
    try {
      const receipt = await getTransactionReceipt(hash);
      if (receipt) {
        const success = rpcClient.hexToDecimal(receipt.status) === 1;
        alert(`트랜잭션 상태:\n\n해시: ${hash}\n상태: ${success ? '성공' : '실패'}\n블록 번호: ${rpcClient.hexToDecimal(receipt.blockNumber)}\n가스 사용량: ${rpcClient.hexToDecimal(receipt.gasUsed)}`);
      } else {
        alert('트랜잭션이 아직 블록에 포함되지 않았습니다.');
      }
    } catch (error) {
      console.error('트랜잭션 상태 확인 실패:', error);
      alert('트랜잭션 상태를 확인할 수 없습니다.');
    }
  };

  /**
   * 네트워크 변경
   */
  const handleNetworkChange = async (networkKey) => {
    try {
      await switchNetwork(networkKey);
      setShowNetworkModal(false);
      // 잠시 후 지갑 정보 새로고침
      setTimeout(fetchWalletInfo, 1000);
    } catch (error) {
      console.error('네트워크 변경 실패:', error);
    }
  };

  /**
   * 송금 폼 입력 처리
   */
  const handleSendFormChange = (field, value) => {
    setSendForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!currentWallet) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* 헤더 */}
      <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => navigate('/')}
                style={{ padding: '8px', marginRight: '12px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
              >
                ←
              </button>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>{currentWallet.name}</h1>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  {isReadOnly ? '읽기 전용' : '개인 지갑'} • {currentNetwork.name}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setShowNetworkModal(true)}
                style={{ 
                  padding: '8px 12px', 
                  fontSize: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px', 
                  backgroundColor: 'white', 
                  cursor: 'pointer' 
                }}
              >
                네트워크
              </button>
              <button
                onClick={fetchWalletInfo}
                disabled={isLoadingBalance}
                style={{ padding: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                title="새로고침"
              >
                {isLoadingBalance ? '⟳' : '↻'}
              </button>
              <button
                onClick={disconnectWallet}
                style={{ padding: '8px 12px', fontSize: '14px', border: '1px solid #d1d5db', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer' }}
              >
                연결 해제
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '32px 16px' }}>
        {/* 에러 메시지 */}
        {error && (
          <div style={{ 
            marginBottom: '24px', 
            padding: '16px', 
            backgroundColor: '#fef2f2', 
            border: '1px solid #fecaca', 
            borderRadius: '8px',
            color: '#dc2626'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          {/* 지갑 정보 카드 */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>지갑 정보</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {!isReadOnly && (
                  <button
                    onClick={() => setShowSendModal(true)}
                    disabled={isTransactionPending}
                    style={{ 
                      padding: '8px 16px', 
                      backgroundColor: '#2563eb', 
                      color: 'white', 
                      borderRadius: '8px', 
                      border: 'none',
                      cursor: isTransactionPending ? 'not-allowed' : 'pointer',
                      opacity: isTransactionPending ? 0.6 : 1
                    }}
                  >
                    {isTransactionPending ? '송금 중...' : '송금'}
                  </button>
                )}
              </div>
            </div>

            {/* 잔액 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>잔액</label>
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <span style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827' }}>
                  {isLoadingBalance ? '로딩 중...' : `${parseFloat(balance).toFixed(6)}`}
                </span>
                <span style={{ fontSize: '18px', color: '#6b7280', marginLeft: '8px' }}>ETH</span>
              </div>
            </div>

            {/* 지갑 주소 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>지갑 주소</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{ 
                  flex: 1, 
                  padding: '12px', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '8px', 
                  fontSize: '14px', 
                  fontFamily: 'monospace',
                  border: '1px solid #e5e7eb'
                }}>
                  {currentWallet.address}
                </code>
                <button
                  onClick={handleCopyAddress}
                  style={{ padding: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                  title="주소 복사"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>

            {/* 네트워크 및 가스 정보 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>네트워크</label>
                <p style={{ color: '#111827', margin: 0 }}>{currentNetwork.name}</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>현재 가스 가격</label>
                <p style={{ color: '#111827', margin: 0 }}>{currentGasPrice} Gwei</p>
              </div>
            </div>
          </div>

          {/* 개인키 정보 (읽기 전용이 아닌 경우) */}
          {!isReadOnly && currentWallet.privateKey && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>개인키</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPrivateKey ? 'text' : 'password'}
                    value={currentWallet.privateKey}
                    readOnly
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      paddingRight: '48px',
                      backgroundColor: '#f9fafb', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px', 
                      fontSize: '14px', 
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      padding: '4px', 
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    {showPrivateKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                  ⚠️ 개인키는 안전하게 보관하세요. 절대 다른 사람과 공유하지 마세요.
                </p>
              </div>
            </div>
          )}

          {/* 트랜잭션 상태 */}
          {lastTransaction && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>최근 트랜잭션</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>상태:</span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: lastTransaction.status === 'success' ? '#059669' : 
                           lastTransaction.status === 'failed' ? '#dc2626' : 
                           lastTransaction.status === 'timeout' ? '#d97706' : '#6366f1'
                  }}>
                    {lastTransaction.status === 'success' ? '✅ 성공' : 
                     lastTransaction.status === 'failed' ? '❌ 실패' : 
                     lastTransaction.status === 'timeout' ? '⏰ 시간초과' : '⏳ 처리 중'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>네트워크:</span>
                  <span style={{ fontSize: '14px' }}>{lastTransaction.network}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>수신 주소:</span>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#6b7280' }}>
                    {lastTransaction.to.slice(0, 6)}...{lastTransaction.to.slice(-4)}
                  </span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>금액:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>{lastTransaction.amount} ETH</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>해시:</span>
                  <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#6b7280' }}>
                    {lastTransaction.hash.slice(0, 6)}...{lastTransaction.hash.slice(-4)}
                  </span>
                </div>
                
                {lastTransaction.blockNumber && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>블록 번호:</span>
                    <span style={{ fontSize: '14px' }}>{lastTransaction.blockNumber}</span>
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={() => checkTransactionStatus(lastTransaction.hash)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    상태 확인
                  </button>
                  <button
                    onClick={() => window.open(`${currentNetwork.blockExplorer}/tx/${lastTransaction.hash}`, '_blank')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    탐색기에서 보기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 네트워크 변경 모달 */}
      {showNetworkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            margin: '0 16px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>네트워크 변경</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {Object.entries(availableNetworks).map(([key, network]) => (
                <button
                  key={key}
                  onClick={() => handleNetworkChange(key)}
                  disabled={isLoading}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: currentNetwork.chainId === network.chainId ? '#eff6ff' : 'white',
                    cursor: 'pointer',
                    opacity: isLoading ? 0.6 : 1
                  }}
                >
                  <div style={{ fontWeight: '500' }}>{network.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Chain ID: {network.chainId}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowNetworkModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                color: '#374151',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 송금 모달 */}
      {showSendModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            margin: '0 16px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>RPC 송금</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  수신 주소
                </label>
                <input
                  type="text"
                  value={sendForm.to}
                  onChange={(e) => handleSendFormChange('to', e.target.value)}
                  placeholder="0x..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  금액 (ETH)
                </label>
                <input
                  type="number"
                  value={sendForm.amount}
                  onChange={(e) => handleSendFormChange('amount', e.target.value)}
                  placeholder="0.0"
                  step="0.000001"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  잔액: {balance} ETH
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  가스 가격 (Gwei)
                </label>
                <input
                  type="number"
                  value={sendForm.gasPrice}
                  onChange={(e) => handleSendFormChange('gasPrice', e.target.value)}
                  placeholder="20"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  현재 네트워크 가스 가격: {currentGasPrice} Gwei
                </div>
              </div>
            </div>

            {/* RPC 통신 안내 */}
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#eff6ff', 
              border: '1px solid #dbeafe', 
              borderRadius: '8px' 
            }}>
              <p style={{ fontSize: '12px', color: '#1d4ed8', margin: 0 }}>
                🔗 <strong>RPC 직접 통신</strong><br />
                이 송금은 {currentNetwork.name}에 직접 RPC 호출로 전송됩니다.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShowSendModal(false)}
                disabled={isTransactionPending}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  opacity: isTransactionPending ? 0.6 : 1
                }}
              >
                취소
              </button>
              <button
                onClick={handleSendTransaction}
                disabled={!sendForm.to || !sendForm.amount || isTransactionPending}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: (!sendForm.to || !sendForm.amount || isTransactionPending) ? 0.5 : 1
                }}
              >
                {isTransactionPending ? '송금 중...' : 'RPC 송금'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;