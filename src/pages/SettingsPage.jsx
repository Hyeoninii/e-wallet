import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { copyToClipboard } from '../utils/wallet';

/**
 * 설정 페이지
 * 지갑 설정 및 관리 기능 제공
 */
const SettingsPage = () => {
  const { currentWallet, disconnectWallet, provider } = useWallet();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [copied, setCopied] = useState('');

  /**
   * 텍스트 복사
   */
  const handleCopy = async (text, type) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
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
    <div className="p-6 max-w-4xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">설정</h1>
        <p className="text-gray-600">지갑 설정 및 보안 정보를 관리합니다.</p>
      </div>

      <div className="space-y-6">
        {/* 지갑 정보 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">지갑 정보</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">지갑 이름</label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                {currentWallet.name}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">지갑 타입</label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                {currentWallet.type === 'hd' ? 'HD 지갑' : '개인키 지갑'}
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">지갑 주소</label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-3 bg-gray-50 rounded-lg text-sm font-mono border border-gray-200 break-all">
                  {currentWallet.address}
                </code>
                <button
                  onClick={() => handleCopy(currentWallet.address, 'address')}
                  className="p-2 text-gray-400 hover:text-gray-600"
                  title="주소 복사"
                >
                  {copied === 'address' ? (
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
          </div>
        </div>

        {/* 보안 정보 */}
        {currentWallet.privateKey && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">보안 정보</h2>
            
            {/* 개인키 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">개인키</label>
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
                  <button
                    onClick={() => handleCopy(currentWallet.privateKey, 'privateKey')}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="개인키 복사"
                  >
                    {copied === 'privateKey' ? (
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

            {/* 니모닉 (HD 지갑인 경우) */}
            {currentWallet.mnemonic && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">니모닉 구문</label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <textarea
                      value={showMnemonic ? currentWallet.mnemonic : '•'.repeat(currentWallet.mnemonic.length)}
                      readOnly
                      className="flex-1 p-3 bg-gray-50 rounded-lg text-sm font-mono border border-gray-200 resize-none"
                      rows={3}
                    />
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => setShowMnemonic(!showMnemonic)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="니모닉 표시/숨김"
                      >
                        {showMnemonic ? '숨기기' : '보기'}
                      </button>
                      <button
                        onClick={() => handleCopy(currentWallet.mnemonic, 'mnemonic')}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="니모닉 복사"
                      >
                        {copied === 'mnemonic' ? (
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
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ 니모닉 구문은 지갑을 복구하는 데 사용됩니다. 안전한 곳에 보관하세요.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 네트워크 설정 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">네트워크 설정</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">현재 네트워크</label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                Custom Node (100.67.242.15:13500)
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">체인 ID</label>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                Custom
              </div>
            </div>
          </div>
        </div>

        {/* 위험 구역 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4">위험 구역</h2>
          
          <div className="space-y-4">
            <div className="bg-white border border-red-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-red-900 mb-2">지갑 연결 해제</h3>
              <p className="text-sm text-red-700 mb-3">
                지갑 연결을 해제하면 현재 세션이 종료됩니다. 다시 사용하려면 지갑을 다시 열어야 합니다.
              </p>
              <button
                onClick={disconnectWallet}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                연결 해제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
