import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';

/**
 * 지갑 복구 페이지 컴포넌트
 * 니모닉 또는 개인키로 지갑 복구
 */
const RecoverWalletPage = () => {
  const navigate = useNavigate();
  const { 
    recoverWalletByMnemonic, 
    recoverWalletByPrivateKey, 
    isLoading, 
    error, 
    clearError 
  } = useWallet();

  // 폼 상태
  const [recoveryMethod, setRecoveryMethod] = useState('mnemonic'); // 'mnemonic' or 'privateKey'
  const [walletName, setWalletName] = useState('');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  /**
   * 지갑 복구 실행
   */
  const handleRecoverWallet = async () => {
    if (!walletName.trim() || !recoveryInput.trim()) {
      return;
    }

    try {
      clearError();
      
      if (recoveryMethod === 'mnemonic') {
        await recoverWalletByMnemonic(recoveryInput.trim(), walletName.trim());
      } else {
        await recoverWalletByPrivateKey(recoveryInput.trim(), walletName.trim());
      }
      
      // 지갑 대시보드로 이동
      navigate('/wallet');
    } catch (error) {
      // 에러는 컨텍스트에서 처리됨
    }
  };

  /**
   * 입력 필드 초기화
   */
  const handleMethodChange = (method) => {
    setRecoveryMethod(method);
    setRecoveryInput('');
    clearError();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg mr-3"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">지갑 복구</h1>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">지갑 복구 방법 선택</h2>
          <p className="text-gray-600 mb-6">
            니모닉 구문 또는 개인키를 사용하여 기존 지갑을 복구할 수 있습니다.
          </p>

          {/* 복구 방법 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              복구 방법
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleMethodChange('mnemonic')}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  recoveryMethod === 'mnemonic'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">니모닉 구문</div>
                <div className="text-sm opacity-75">12단어 복구 구문</div>
              </button>
              <button
                onClick={() => handleMethodChange('privateKey')}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  recoveryMethod === 'privateKey'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">개인키</div>
                <div className="text-sm opacity-75">64자리 16진수</div>
              </button>
            </div>
          </div>

          {/* 지갑 이름 입력 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              지갑 이름
            </label>
            <input
              type="text"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              placeholder="예: 복구된 지갑"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 복구 정보 입력 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {recoveryMethod === 'mnemonic' ? '니모닉 구문' : '개인키'}
            </label>
            
            {recoveryMethod === 'mnemonic' ? (
              <textarea
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                placeholder="12단어를 공백으로 구분하여 입력하세요"
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            ) : (
              <div className="relative">
                <input
                  type={showPrivateKey ? 'text' : 'password'}
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value)}
                  placeholder="0x로 시작하는 64자리 개인키"
                  className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                >
                  {showPrivateKey ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* 안내 메시지 */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              {recoveryMethod === 'mnemonic' ? (
                <>
                  <strong>니모닉 복구:</strong> 12단어 구문을 정확히 입력하세요. 
                  단어 사이는 공백으로 구분합니다.
                </>
              ) : (
                <>
                  <strong>개인키 복구:</strong> 0x로 시작하는 64자리 16진수 개인키를 입력하세요. 
                  개인키는 매우 민감한 정보이므로 안전하게 관리하세요.
                </>
              )}
            </p>
          </div>

          {/* 복구 버튼 */}
          <button
            onClick={handleRecoverWallet}
            disabled={!walletName.trim() || !recoveryInput.trim() || isLoading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '복구 중...' : '지갑 복구'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecoverWalletPage;
