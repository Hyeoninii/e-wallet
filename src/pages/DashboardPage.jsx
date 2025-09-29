import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ethers } from 'ethers';
import { weiToEth, shortenAddress, copyToClipboard } from '../utils/wallet';

/**
 * 대시보드 메인 페이지
 * 지갑 정보, 잔액, 최근 활동 등을 표시
 */
const DashboardPage = () => {
  const { 
    currentWallet, 
    provider, 
    isReadOnly, 
    error, 
    clearError,
    savedMultiSigWallets,
    loadSavedMultiSigWallets
  } = useWallet();

  // 다중서명 지갑 목록 디버깅
  useEffect(() => {
    console.log('DashboardPage - savedMultiSigWallets 변경됨:', savedMultiSigWallets);
    console.log('DashboardPage - 다중서명 지갑 개수:', savedMultiSigWallets.length);
  }, [savedMultiSigWallets]);

  // 상태 관리
  const [balance, setBalance] = useState('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copied, setCopied] = useState(false);

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
    if (!currentWallet?.address || !provider) return;

    try {
      setIsLoadingBalance(true);
      const balanceWei = await provider.getBalance(currentWallet.address);
      const balanceEth = weiToEth(balanceWei);
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

  if (!currentWallet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">지갑이 연결되지 않았습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 환영 메시지 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">안녕하세요, {currentWallet.name}님!</h1>
        <p className="text-blue-100">
          {isReadOnly ? '읽기 전용 모드로 연결되었습니다.' : '개인 지갑에 연결되었습니다.'}
        </p>
      </div>

      {/* 잔액 카드 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">잔액</h2>
          <button
            onClick={fetchBalance}
            disabled={isLoadingBalance}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="잔액 새로고침"
          >
            <svg className={`w-5 h-5 ${isLoadingBalance ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900">
            {isLoadingBalance ? '로딩 중...' : parseFloat(balance).toFixed(6)}
          </span>
          <span className="text-lg text-gray-500">ETH</span>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          네트워크: {provider?._getConnection?.url?.includes('infura') ? 'Infura (Sepolia)' : 'Custom Node (100.67.242.15:13500)'}
        </div>
      </div>

      {/* 지갑 정보 카드 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">지갑 정보</h2>
        
        <div className="space-y-4">
          {/* 지갑 주소 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">지갑 주소</label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 p-3 bg-gray-50 rounded-lg text-sm font-mono border border-gray-200 break-all">
                {currentWallet.address}
              </code>
              <button
                onClick={handleCopyAddress}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="주소 복사"
              >
                {copied ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* 지갑 타입 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">지갑 타입</label>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isReadOnly 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {isReadOnly ? '읽기 전용' : '개인 지갑'}
              </span>
              {currentWallet.type && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {currentWallet.type === 'hd' ? 'HD 지갑' : '개인키 지갑'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 개인키 정보 (읽기 전용이 아닌 경우) */}
      {!isReadOnly && currentWallet.privateKey && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">개인키</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <code className="flex-1 p-3 bg-gray-50 rounded-lg text-sm font-mono border border-gray-200 break-all whitespace-pre-wrap">
                {showPrivateKey ? currentWallet.privateKey : '•'.repeat(currentWallet.privateKey.length)}
              </code>
              <button
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="개인키 표시/숨김"
              >
                {showPrivateKey ? '숨기기' : '보기'}
              </button>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ 개인키는 안전하게 보관하세요. 절대 다른 사람과 공유하지 마세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isReadOnly && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">빠른 액션</h3>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-blue-700 transition-colors">
                송금하기
              </button>
              <button className="w-full bg-gray-100 text-gray-700 rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-200 transition-colors">
                받기 주소 공유
              </button>
            </div>
          </div>
        )}
        
        {/* 다중 서명 지갑 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">다중 서명 지갑</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  loadSavedMultiSigWallets();
                  alert('다중 서명 지갑 목록을 새로고침했습니다.');
                }}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                title="목록 새로고침"
              >
                🔄
              </button>
              <button 
                onClick={async () => {
                  const address = prompt('배포된 다중서명 지갑 주소를 입력하세요:');
                  if (address && address.startsWith('0x')) {
                    try {
                      console.log('수동으로 다중서명 지갑 추가 시작:', address);
                      
                      // 컨트랙트에서 실제 정보 조회 시도
                      let contractInfo = null;
                      try {
                        const { getMultiSigWalletData } = await import('../contexts/WalletContext');
                        contractInfo = await getMultiSigWalletData(address);
                        console.log('컨트랙트에서 조회된 정보:', contractInfo);
                      } catch (contractError) {
                        console.warn('컨트랙트 정보 조회 실패, 기본값 사용:', contractError);
                      }
                      
                      // 수동으로 다중서명 지갑 추가
                      const manualWallet = {
                        name: '수동 추가된 지갑',
                        address: address,
                        owners: contractInfo?.owners || [],
                        threshold: contractInfo?.threshold || 0,
                        deploymentTx: '',
                        createdAt: new Date().toISOString(),
                        type: 'multisig',
                        pending: false
                      };
                      
                      console.log('추가할 지갑 정보:', manualWallet);
                      
                      // 현재 저장된 목록에 추가
                      const currentWallets = JSON.parse(localStorage.getItem('savedMultiSigWallets') || '[]');
                      console.log('현재 저장된 지갑 목록:', currentWallets);
                      
                      currentWallets.push(manualWallet);
                      console.log('업데이트된 지갑 목록:', currentWallets);
                      
                      localStorage.setItem('savedMultiSigWallets', JSON.stringify(currentWallets));
                      console.log('로컬 스토리지에 저장 완료');
                      
                      // 상태 새로고침
                      loadSavedMultiSigWallets();
                      alert('다중서명 지갑이 추가되었습니다!');
                    } catch (error) {
                      console.error('수동 추가 실패:', error);
                      alert('지갑 추가에 실패했습니다: ' + error.message);
                    }
                  }
                }}
                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors"
                title="수동으로 지갑 추가"
              >
                + 수동추가
              </button>
              <button 
                onClick={() => window.location.href = '/multisig/create'}
                className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                + 생성
              </button>
            </div>
          </div>
          
          {savedMultiSigWallets.length > 0 ? (
            <div className="space-y-3">
              {savedMultiSigWallets.map((wallet, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{wallet.name}</h4>
                      <p className="text-sm text-gray-500 font-mono">
                        {wallet.address || '배포 대기 중...'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {wallet.pending ? (
                          <span className="text-yellow-600">배포 대기 중</span>
                        ) : (
                          `소유자 ${wallet.owners.length}명, 임계값 ${wallet.threshold}`
                        )}
                      </p>
                    </div>
                    <button 
                      onClick={() => window.location.href = `/multisig/${wallet.address || wallet.deploymentTx}`}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        wallet.pending 
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      }`}
                    >
                      {wallet.pending ? '대기 중' : '열기'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p className="text-sm">아직 다중 서명 지갑이 없습니다</p>
              <button 
                onClick={() => window.location.href = '/multisig/create'}
                className="mt-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                첫 번째 다중 서명 지갑 생성하기
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">최근 활동</h3>
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">아직 거래 내역이 없습니다</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
