import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

/**
 * 다중서명 지갑 설정 페이지
 * 다중서명 지갑의 설정 및 멤버 관리 기능 제공
 */
const MultiSigSettingsPage = () => {
  const { address } = useParams();
  const navigate = useNavigate();
  const { getMultiSigWalletData, currentWallet } = useWallet();
  const [multisigWallet, setMultisigWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!address) {
          throw new Error('다중서명 지갑 주소가 필요합니다.');
        }

        console.log('다중서명 설정 페이지 - 지갑 데이터 로드 시작:', address);
        const walletData = await getMultiSigWalletData(address);
        console.log('다중서명 설정 페이지 - 지갑 데이터 로드 완료:', walletData);
        
        setMultisigWallet(walletData);
      } catch (err) {
        console.error('다중서명 설정 페이지 - 지갑 데이터 로드 실패:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadWalletData();
  }, [address, getMultiSigWalletData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">다중서명 지갑 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">오류: {error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!multisigWallet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">다중서명 지갑을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(`/multisig/${address}`)}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">다중서명 지갑 설정</h1>
            <p className="text-gray-600">지갑 주소: {address}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 지갑 정보 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">지갑 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">지갑 주소</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={address}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(address)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  복사
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">잔액</label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                <span className="text-lg font-semibold">{multisigWallet.balance} ETH</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">승인 임계값</label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                <span className="text-lg font-semibold">{multisigWallet.threshold}명</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">총 소유자 수</label>
              <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                <span className="text-lg font-semibold">{multisigWallet.owners.length}명</span>
              </div>
            </div>
          </div>
        </div>

        {/* 소유자 관리 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">소유자 관리</h2>
            <button
              onClick={() => navigate(`/multisig/${address}/members`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              멤버 관리
            </button>
          </div>
          
          <div className="space-y-3">
            {multisigWallet.owners.map((owner, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-gray-900">{owner}</p>
                    <p className="text-xs text-gray-500">소유자 {index + 1}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {owner.toLowerCase() === currentWallet?.address?.toLowerCase() && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      현재 사용자
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 승인 프로세스 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">승인 프로세스</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold text-blue-900">승인 규칙</span>
            </div>
            <p className="text-blue-800 text-sm">
              모든 트랜잭션은 <strong>{multisigWallet.threshold}명</strong>의 소유자 승인이 필요합니다.
              현재 <strong>{multisigWallet.owners.length}명</strong>의 소유자가 있습니다.
            </p>
          </div>
        </div>

        {/* 위험 구역 */}
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4">위험 구역</h2>
          
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">지갑 삭제</h3>
              <p className="text-red-800 text-sm mb-3">
                이 작업은 되돌릴 수 없습니다. 모든 자금이 영구적으로 손실됩니다.
              </p>
              <button
                disabled
                className="bg-red-600 text-white px-4 py-2 rounded-md opacity-50 cursor-not-allowed text-sm"
              >
                지갑 삭제 (비활성화됨)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiSigSettingsPage;
