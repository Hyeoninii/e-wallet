import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 다중 서명 지갑 대시보드 페이지
 */
const MultiSigDashboardPage = () => {
  const navigate = useNavigate();
  
  // 임시 데이터 (실제로는 props나 context에서 받아올 것)
  const [multisigWallet] = useState({
    name: '팀 지갑',
    address: '0x1234567890123456789012345678901234567890',
    owners: [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333'
    ],
    threshold: 2,
    balance: '1.2345',
    pendingTransactions: 3
  });

  const [currentUser] = useState('0x1111111111111111111111111111111111111111'); // 현재 사용자

  /**
   * 주소 복사
   */
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(multisigWallet.address);
      alert('주소가 복사되었습니다!');
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 환영 메시지 */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">안녕하세요, {multisigWallet.name}!</h1>
        <p className="text-purple-100">
          다중 서명 지갑에 연결되었습니다. {multisigWallet.threshold}명의 승인이 필요한 트랜잭션을 관리할 수 있습니다.
        </p>
      </div>

      {/* 잔액 카드 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">잔액</h2>
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900">
            {parseFloat(multisigWallet.balance).toFixed(6)}
          </span>
          <span className="text-lg text-gray-500">ETH</span>
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
                {multisigWallet.address}
              </code>
              <button
                onClick={handleCopyAddress}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="주소 복사"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* 승인 임계값 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">승인 임계값</label>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                {multisigWallet.threshold} / {multisigWallet.owners.length}명
              </span>
              <span className="text-sm text-gray-500">
                트랜잭션 실행을 위해 {multisigWallet.threshold}명의 승인이 필요합니다
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 소유자 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">소유자 목록</h2>
          <button
            onClick={() => navigate('/multisig/members')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            관리
          </button>
        </div>
        
        <div className="space-y-3">
          {multisigWallet.owners.map((owner, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-semibold text-sm">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <code className="text-sm font-mono text-gray-900">
                    {owner.slice(0, 6)}...{owner.slice(-4)}
                  </code>
                  {owner === currentUser && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      나
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                소유자 #{index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/multisig/send')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">트랜잭션 제안</h3>
          </div>
          <p className="text-sm text-gray-600">새로운 트랜잭션을 제안합니다</p>
        </button>

        <button
          onClick={() => navigate('/multisig/transactions')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">트랜잭션 내역</h3>
          </div>
          <p className="text-sm text-gray-600">대기 중인 트랜잭션: {multisigWallet.pendingTransactions}개</p>
        </button>

        <button
          onClick={() => navigate('/multisig/settings')}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">설정</h3>
          </div>
          <p className="text-sm text-gray-600">지갑 설정 및 멤버 관리</p>
        </button>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">트랜잭션 제안 #123</p>
                <p className="text-xs text-gray-500">0.5 ETH → 0x1234...5678</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">2분 전</p>
              <p className="text-xs text-yellow-600 font-medium">대기 중 (1/2 승인)</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">트랜잭션 실행 #122</p>
                <p className="text-xs text-gray-500">0.1 ETH → 0xabcd...efgh</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">1시간 전</p>
              <p className="text-xs text-green-600 font-medium">완료</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiSigDashboardPage;
