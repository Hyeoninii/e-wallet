import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { ethers } from 'ethers';
import { weiToEth, shortenAddress, copyToClipboard } from '../utils/wallet';

/**
 * 지갑 대시보드 컴포넌트
 * 지갑 정보, 잔액, 송금 기능 제공
 */
const WalletDashboard = () => {
  const navigate = useNavigate();
  const { 
    currentWallet, 
    provider, 
    isReadOnly, 
    disconnectWallet, 
    error, 
    clearError 
  } = useWallet();

  // 상태 관리
  const [balance, setBalance] = useState('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  // 송금 폼 상태
  const [sendForm, setSendForm] = useState({
    to: '',
    amount: '',
    gasPrice: '20' // Gwei
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
   * 잔액 조회
   */
  useEffect(() => {
    if (currentWallet?.address && provider) {
      fetchBalance();
    }
  }, [currentWallet, provider]);

  /**
   * 잔액 조회 함수
   */
  const fetchBalance = async () => {
    console.log('fetchBalance 호출됨');
    console.log('currentWallet:', currentWallet);
    console.log('provider:', provider);
    
    if (!currentWallet?.address || !provider) {
      console.log('조건 불만족: 주소 또는 프로바이더 없음');
      return;
    }

    try {
      setIsLoadingBalance(true);
      console.log('잔액 조회 시작:', currentWallet.address);
      
      const balanceWei = await provider.getBalance(currentWallet.address);
      console.log('Wei 잔액:', balanceWei.toString());
      
      const balanceEth = weiToEth(balanceWei);
      console.log('ETH 잔액:', balanceEth);
      
      setBalance(balanceEth);
    } catch (error) {
      console.error('잔액 조회 실패:', error);
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
   * 송금 실행
   */
  const handleSendTransaction = async () => {
    if (!currentWallet?.privateKey || !provider) {
      return;
    }

    try {
      clearError();
      setIsTransactionPending(true);
      
      // 입력 검증
      if (!sendForm.to || !sendForm.amount) {
        throw new Error('수신 주소와 금액을 입력해주세요.');
      }

      // 지갑 생성
      const wallet = new ethers.Wallet(currentWallet.privateKey, provider);
      
      // 현재 잔액 확인
      const balance = await provider.getBalance(wallet.address);
      const amountWei = ethers.parseEther(sendForm.amount);
      
      if (balance < amountWei) {
        throw new Error('잔액이 부족합니다.');
      }

      // 가스 한도 추정
      const gasLimit = await provider.estimateGas({
        from: wallet.address,
        to: sendForm.to,
        value: amountWei
      });

      // 트랜잭션 생성
      const tx = {
        to: sendForm.to,
        value: amountWei,
        gasLimit: gasLimit,
        gasPrice: ethers.parseUnits(sendForm.gasPrice, 'gwei')
      };

      console.log('트랜잭션 정보:', {
        from: wallet.address,
        to: sendForm.to,
        value: ethers.formatEther(amountWei) + ' ETH',
        gasLimit: gasLimit.toString(),
        gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei') + ' Gwei'
      });

      // 트랜잭션 전송
      const response = await wallet.sendTransaction(tx);
      
      console.log('트랜잭션 해시:', response.hash);
      
      // 트랜잭션 정보 저장
      setLastTransaction({
        hash: response.hash,
        to: sendForm.to,
        amount: sendForm.amount,
        timestamp: new Date().toISOString(),
        status: 'pending'
      });
      
      // 트랜잭션 영수증 대기 (실제 블록에 포함될 때까지)
      alert(`트랜잭션이 전송되었습니다!\n해시: ${response.hash}\n\n블록에 포함될 때까지 기다리는 중...`);
      
      // 트랜잭션 영수증 대기
      const receipt = await response.wait();
      
      console.log('트랜잭션 영수증:', receipt);
      
      if (receipt.status === 1) {
        // 성공 처리
        setShowSendModal(false);
        setSendForm({ to: '', amount: '', gasPrice: '20' });
        
        // 트랜잭션 상태 업데이트
        setLastTransaction(prev => ({
          ...prev,
          status: 'success',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        }));
        
        // 잔액 새로고침
        setTimeout(fetchBalance, 2000);
        
        alert(` 트랜잭션이 성공적으로 완료되었습니다!\n\n해시: ${response.hash}\n블록 번호: ${receipt.blockNumber}\n가스 사용량: ${receipt.gasUsed.toString()}`);
      } else {
        setLastTransaction(prev => ({
          ...prev,
          status: 'failed'
        }));
        throw new Error('트랜잭션이 실패했습니다.');
      }
      
    } catch (error) {
      console.error('송금 실패:', error);
      
      if (lastTransaction) {
        setLastTransaction(prev => ({
          ...prev,
          status: 'failed',
          error: error.message
        }));
      }
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        alert('송금에 실패했습니다: 잔액이 부족합니다.');
      } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        alert('송금에 실패했습니다: 가스 한도를 계산할 수 없습니다. 주소를 확인해주세요.');
      } else if (error.message.includes('nonce')) {
        alert('송금에 실패했습니다: nonce 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        alert(`송금에 실패했습니다: ${error.message}`);
      }
    } finally {
      setIsTransactionPending(false);
    }
  };

  /**
   * 트랜잭션 상태 확인
   */
  const checkTransactionStatus = async (hash) => {
    if (!hash || !provider) return;
    
    try {
      const receipt = await provider.getTransactionReceipt(hash);
      if (receipt) {
        console.log('트랜잭션 영수증:', receipt);
        alert(`트랜잭션 상태:\n\n해시: ${hash}\n상태: ${receipt.status === 1 ? '성공' : '실패'}\n블록 번호: ${receipt.blockNumber}\n가스 사용량: ${receipt.gasUsed.toString()}`);
      } else {
        alert('트랜잭션이 아직 블록에 포함되지 않았습니다.');
      }
    } catch (error) {
      console.error('트랜잭션 상태 확인 실패:', error);
      alert('트랜잭션 상태를 확인할 수 없습니다.');
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
                  {isReadOnly ? '읽기 전용' : '개인 지갑'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={fetchBalance}
                disabled={isLoadingBalance}
                style={{ padding: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                title="잔액 새로고침"
              >
                {isLoadingBalance ? '⟳' : '⟳'}
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
                      display: 'flex',
                      alignItems: 'center',
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

            {/* 네트워크 정보 */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>네트워크</label>
              <p style={{ color: '#111827', margin: 0 }}>Custom Node (100.67.242.15:13500)</p>
            </div>
          </div>

          {/* w 정보 (읽기 전용이 아닌 경우) */}
          {!isReadOnly && currentWallet.privateKey && (
            <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>개인키</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <code style={{ 
                    flex: 1, 
                    padding: '12px', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontFamily: 'monospace',
                    border: '1px solid #e5e7eb',
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                    minWidth: 0
                  }}>
                    {showPrivateKey ? currentWallet.privateKey : '•'.repeat(currentWallet.privateKey.length)}
                  </code>
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    style={{ padding: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                    title="개인키 표시/숨김"
                  >
                    {showPrivateKey ? 'Hide' : 'Show'}
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
                           lastTransaction.status === 'failed' ? '#dc2626' : '#d97706'
                  }}>
                    {lastTransaction.status === 'success' ? '성공' : 
                     lastTransaction.status === 'failed' ? '실패' : '처리 중'}
                  </span>
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
                    onClick={() => window.open(`https://sepolia.etherscan.io/tx/${lastTransaction.hash}`, '_blank')}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    Sepolia Etherscan에서 보기
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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
            <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px 0' }}>송금</h3>
            
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
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setShowSendModal(false)}
                style={{
                  flex: 1,
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
              <button
                onClick={handleSendTransaction}
                disabled={!sendForm.to || !sendForm.amount}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: (!sendForm.to || !sendForm.amount) ? 0.5 : 1
                }}
              >
                송금
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;
