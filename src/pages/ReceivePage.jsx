import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { copyToClipboard } from '../utils/wallet';

/**
 * 받기 페이지
 * 주소 공유 및 QR 코드 기능 제공
 */
const ReceivePage = () => {
  const { currentWallet, provider } = useWallet();
  const [copied, setCopied] = useState(false);

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
    <div className="p-6 max-w-2xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">받기</h1>
        <p className="text-gray-600">이 주소로 암호화폐를 받을 수 있습니다.</p>
      </div>

      {/* 주소 카드 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="text-center">
          {/* QR 코드 영역 (실제 구현 시 QR 라이브러리 사용) */}
          <div className="w-48 h-48 mx-auto mb-6 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-sm">QR 코드</p>
            </div>
          </div>

          {/* 주소 */}
          <div className="mb-4">
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
            {copied && (
              <p className="text-sm text-green-600 mt-2">주소가 복사되었습니다!</p>
            )}
          </div>

          {/* 복사 버튼 */}
          <button
            onClick={handleCopyAddress}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            주소 복사하기
          </button>
        </div>
      </div>

      {/* 주의사항 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">주의사항</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>이 주소는 이더리움(ETH) 전용입니다.</li>
                <li>다른 암호화폐를 이 주소로 보내면 잃을 수 있습니다.</li>
                <li>주소를 정확히 확인한 후 전송해주세요.</li>
                <li>소액으로 먼저 테스트해보는 것을 권장합니다.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 네트워크 정보 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">네트워크 정보</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>네트워크:</span>
            <span>{provider?._getConnection?.url?.includes('infura') ? 'Infura (Sepolia)' : 'Custom Node (100.67.242.15:13500)'}</span>
          </div>
          <div className="flex justify-between">
            <span>지갑 타입:</span>
            <span>{currentWallet.type === 'hd' ? 'HD 지갑' : '개인키 지갑'}</span>
          </div>
          <div className="flex justify-between">
            <span>지갑 이름:</span>
            <span>{currentWallet.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceivePage;
