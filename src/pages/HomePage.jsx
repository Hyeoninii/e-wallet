import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

/**
 * 홈 페이지 컴포넌트 (대시보드 형태)
 */
const HomePage = () => {
  const navigate = useNavigate();
  const { 
    savedWallets, 
    selectWallet, 
    openWalletByAddress, 
    recoverWalletByPrivateKey,
    recoverWalletByMnemonic,
    isLoading, 
    error, 
    clearError 
  } = useWallet();

  // 주소 입력 상태
  const [addressInput, setAddressInput] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [walletNameInput, setWalletNameInput] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [openMode, setOpenMode] = useState('address'); // 'address', 'privateKey', or 'mnemonic'

  /**
   * 새 지갑 생성 페이지로 이동
   */
  const handleCreateWallet = () => {
    navigate('/create');
  };

  /**
   * 주소로 지갑 열기 (읽기 전용)
   */
  const handleOpenByAddress = async () => {
    if (!addressInput.trim()) {
      return;
    }

    try {
      clearError();
      await openWalletByAddress(addressInput.trim());
      navigate('/wallet');
    } catch (error) {
      // 에러는 컨텍스트에서 처리됨
    }
  };

  /**
   * 개인키로 지갑 열기 (진짜 지갑)
   */
  const handleOpenByPrivateKey = async () => {
    if (!privateKeyInput.trim() || !walletNameInput.trim()) {
      return;
    }

    try {
      clearError();
      await recoverWalletByPrivateKey(privateKeyInput.trim(), walletNameInput.trim());
      navigate('/wallet');
    } catch (error) {
      // 에러는 컨텍스트에서 처리됨
    }
  };

  /**
   * 니모닉으로 지갑 열기 (진짜 지갑)
   */
  const handleOpenByMnemonic = async () => {
    if (!mnemonicInput.trim() || !walletNameInput.trim()) {
      return;
    }

    try {
      clearError();
      await recoverWalletByMnemonic(mnemonicInput.trim(), walletNameInput.trim());
      navigate('/wallet');
    } catch (error) {
      console.error('니모닉 지갑 열기 실패:', error);
    }
  };

  /**
   * 저장된 지갑 선택
   */
  const handleSelectWallet = (wallet) => {
    selectWallet(wallet);
    navigate('/wallet');
  };

  /**
   * 모달 닫기
   */
  const handleCloseModal = () => {
    setShowAddressInput(false);
    setAddressInput('');
    setPrivateKeyInput('');
    setMnemonicInput('');
    setWalletNameInput('');
    setOpenMode('address');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">E-Wallet</h1>
              <p className="text-gray-600 mt-1">안전하고 간편한 개인 암호화폐 지갑</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {savedWallets.length}개의 지갑 저장됨
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-blue-800">로딩 중...</p>
            </div>
          </div>
        )}

        {/* 메인 액션 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 새 지갑 생성 카드 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={handleCreateWallet}>
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">새 지갑 생성</h3>
                <p className="text-sm text-gray-500">새로운 암호화폐 지갑을 생성합니다</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              새로운 암호화폐 지갑을 생성하고 니모닉을 안전하게 보관하세요.
            </p>
            <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
              지갑 생성하기
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* 지갑 열기 카드 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setShowAddressInput(true)}>
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">지갑 열기</h3>
                <p className="text-sm text-gray-500">기존 지갑을 열어서 사용합니다</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              주소로 읽기 전용 또는 개인키로 진짜 지갑을 열어보세요.
            </p>
            <div className="mt-4 flex items-center text-green-600 text-sm font-medium">
              지갑 열기
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* 다중 서명 지갑 생성 카드 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/multisig/create')}>
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">다중 서명 지갑</h3>
                <p className="text-sm text-gray-500">여러 명이 함께 관리하는 지갑</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              여러 명이 함께 관리하는 안전한 다중 서명 지갑을 생성하세요.
            </p>
            <div className="mt-4 flex items-center text-purple-600 text-sm font-medium">
              다중 서명 지갑 생성
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* 저장된 지갑 목록 */}
        {savedWallets.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">내 지갑</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedWallets.map((wallet) => (
                <div
                  key={wallet.address}
                  onClick={() => handleSelectWallet(wallet)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-semibold text-sm">
                        {wallet.name?.charAt(0)?.toUpperCase() || 'W'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{wallet.name}</div>
                      <div className="text-xs text-gray-500 font-mono">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      wallet.type === 'hd' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {wallet.type === 'hd' ? 'HD 지갑' : '개인키 지갑'}
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 지갑 열기 모달 */}
        {showAddressInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">지갑 열기</h3>
              
              {/* 모드 선택 */}
              <div className="mb-6">
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button
                    onClick={() => setOpenMode('address')}
                    className={`flex-1 min-w-24 px-3 py-2 text-xs rounded-md border transition-colors ${
                      openMode === 'address' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    주소로 열기
                  </button>
                  <button
                    onClick={() => setOpenMode('privateKey')}
                    className={`flex-1 min-w-24 px-3 py-2 text-xs rounded-md border transition-colors ${
                      openMode === 'privateKey' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    개인키로 열기
                  </button>
                  <button
                    onClick={() => setOpenMode('mnemonic')}
                    className={`flex-1 min-w-24 px-3 py-2 text-xs rounded-md border transition-colors ${
                      openMode === 'mnemonic' 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    니모닉으로 열기
                  </button>
                </div>
              </div>

              {/* 주소 모드 */}
              {openMode === 'address' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      지갑 주소
                    </label>
                    <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => setAddressInput(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleOpenByAddress()}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      주소만 입력하면 잔액을 확인할 수 있습니다. 트랜잭션은 불가능합니다.
                    </p>
                  </div>
                </div>
              )}

              {/* 개인키 모드 */}
              {openMode === 'privateKey' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      지갑 이름
                    </label>
                    <input
                      type="text"
                      value={walletNameInput}
                      onChange={(e) => setWalletNameInput(e.target.value)}
                      placeholder="내 지갑"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      개인키
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 p-3 bg-gray-50 rounded-md text-sm font-mono border border-gray-200 break-all whitespace-pre-wrap">
                        {privateKeyInput.length > 0 ? 
                          privateKeyInput.match(/.{1,32}/g)?.join('\n') || privateKeyInput :
                          '•'.repeat(32) + '\n' + '•'.repeat(32) + '\n' + '•'.repeat(32)
                        }
                      </code>
                      <button
                        onClick={() => setPrivateKeyInput('')}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="개인키 표시/숨김"
                      >
                        {privateKeyInput.length > 0 ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      개인키를 입력하면 트랜잭션을 보낼 수 있는 진짜 지갑으로 열립니다.
                    </p>
                  </div>
                </div>
              )}

              {/* 니모닉 모드 */}
              {openMode === 'mnemonic' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      지갑 이름
                    </label>
                    <input
                      type="text"
                      value={walletNameInput}
                      onChange={(e) => setWalletNameInput(e.target.value)}
                      placeholder="내 지갑"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      니모닉 구문 (12단어)
                    </label>
                    <textarea
                      value={mnemonicInput}
                      onChange={(e) => setMnemonicInput(e.target.value)}
                      placeholder="steak entry begin fox napkin original almost pilot ladder multiply guide coil"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={3}
                      onKeyPress={(e) => e.key === 'Enter' && handleOpenByMnemonic()}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      <p className="mb-1"><strong>입력 형식:</strong> 12개의 영어 단어를 공백으로 구분하여 입력</p>
                      <p className="mb-1"><strong>예시:</strong> steak entry begin fox napkin original almost pilot ladder multiply guide coil</p>
                      <p>니모닉 구문을 입력하면 트랜잭션을 보낼 수 있는 진짜 지갑으로 열립니다.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={
                    openMode === 'address' ? handleOpenByAddress : 
                    openMode === 'privateKey' ? handleOpenByPrivateKey :
                    openMode === 'mnemonic' ? handleOpenByMnemonic : handleOpenByAddress
                  }
                  disabled={
                    (openMode === 'address' && !addressInput.trim()) ||
                    (openMode === 'privateKey' && (!privateKeyInput.trim() || !walletNameInput.trim())) ||
                    (openMode === 'mnemonic' && (!mnemonicInput.trim() || !walletNameInput.trim())) ||
                    isLoading
                  }
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? '열는 중...' : '열기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;