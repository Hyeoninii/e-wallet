import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ethers } from 'ethers';

/**
 * 송금 페이지
 * 암호화폐 전송 기능 제공
 */
const SendPage = () => {
  const { 
    currentWallet, 
    provider, 
    isReadOnly, 
    error, 
    clearError 
  } = useWallet();

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
      
      // 트랜잭션 영수증 대기
      const receipt = await response.wait();
      
      if (receipt.status === 1) {
        // 성공 처리
        setSendForm({ to: '', amount: '', gasPrice: '20' });
        
        // 트랜잭션 상태 업데이트
        setLastTransaction(prev => ({
          ...prev,
          status: 'success',
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        }));
        
        alert(`트랜잭션이 성공적으로 완료되었습니다!\n\n해시: ${response.hash}\n블록 번호: ${receipt.blockNumber}\n가스 사용량: ${receipt.gasUsed.toString()}`);
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
      
      alert(`송금에 실패했습니다: ${error.message}`);
    } finally {
      setIsTransactionPending(false);
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

  // 읽기 전용 모드인 경우
  if (isReadOnly) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">송금 불가</h2>
          <p className="text-yellow-700">
            현재 읽기 전용 모드로 연결되어 있습니다. 송금 기능을 사용하려면 개인키나 니모닉으로 지갑을 열어주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">송금</h1>
        <p className="text-gray-600">암호화폐를 다른 주소로 전송합니다.</p>
      </div>

      {/* 송금 폼 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={(e) => { e.preventDefault(); handleSendTransaction(); }} className="space-y-6">
          {/* 수신 주소 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수신 주소
            </label>
            <input
              type="text"
              value={sendForm.to}
              onChange={(e) => handleSendFormChange('to', e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              이더리움 주소를 정확히 입력해주세요.
            </p>
          </div>
          
          {/* 금액 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              금액 (ETH)
            </label>
            <input
              type="number"
              value={sendForm.amount}
              onChange={(e) => handleSendFormChange('amount', e.target.value)}
              placeholder="0.0"
              step="0.000001"
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              전송할 ETH 금액을 입력해주세요.
            </p>
          </div>
          
          {/* 가스 가격 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              가스 가격 (Gwei)
            </label>
            <input
              type="number"
              value={sendForm.gasPrice}
              onChange={(e) => handleSendFormChange('gasPrice', e.target.value)}
              placeholder="20"
              min="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              높은 가스 가격을 설정하면 트랜잭션이 더 빠르게 처리됩니다.
            </p>
          </div>

          {/* 전송 버튼 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={!sendForm.to || !sendForm.amount || isTransactionPending}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTransactionPending ? '전송 중...' : '전송하기'}
            </button>
          </div>
        </form>
      </div>

      {/* 최근 트랜잭션 */}
      {lastTransaction && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 트랜잭션</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">상태:</span>
              <span className={`text-sm font-semibold ${
                lastTransaction.status === 'success' ? 'text-green-600' : 
                lastTransaction.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {lastTransaction.status === 'success' ? '성공' : 
                 lastTransaction.status === 'failed' ? '실패' : '처리 중'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">수신 주소:</span>
              <span className="text-sm font-mono text-gray-600">
                {lastTransaction.to.slice(0, 6)}...{lastTransaction.to.slice(-4)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">금액:</span>
              <span className="text-sm font-semibold">{lastTransaction.amount} ETH</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">해시:</span>
              <span className="text-sm font-mono text-gray-600">
                {lastTransaction.hash.slice(0, 6)}...{lastTransaction.hash.slice(-4)}
              </span>
            </div>
            
            {lastTransaction.blockNumber && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">블록 번호:</span>
                <span className="text-sm">{lastTransaction.blockNumber}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SendPage;
