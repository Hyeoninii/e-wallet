import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { FiArrowLeft, FiEye, FiEyeOff, FiCheck, FiCopy } from 'react-icons/fi';

/**
 * 지갑 생성 페이지 컴포넌트
 * 새 지갑 생성 및 니모닉 보안 확인
 */
const CreateWalletPage = () => {
  const navigate = useNavigate();
  const { createWallet, isLoading, error, clearError } = useWallet();

  // 폼 상태
  const [walletName, setWalletName] = useState('');
  const [step, setStep] = useState(1); // 1: 이름 입력, 2: 니모닉 표시, 3: 니모닉 확인
  const [generatedWallet, setGeneratedWallet] = useState(null);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [verificationWords, setVerificationWords] = useState([]);
  const [userInputs, setUserInputs] = useState({});
  const [copied, setCopied] = useState(false);

  /**
   * 지갑 생성 시작
   */
  const handleCreateWallet = async () => {
    if (!walletName.trim()) {
      return;
    }

    try {
      clearError();
      const wallet = await createWallet(walletName.trim());
      setGeneratedWallet(wallet);
      setStep(2);
    } catch (error) {
      // 에러는 컨텍스트에서 처리됨
    }
  };

  /**
   * 니모닉 확인 단계로 이동
   */
  const handleConfirmMnemonic = () => {
    if (!generatedWallet?.mnemonic) return;

    // 3개의 랜덤 단어 선택
    const words = generatedWallet.mnemonic.split(' ');
    const selectedIndices = new Set();
    while (selectedIndices.size < 3) {
      selectedIndices.add(Math.floor(Math.random() * words.length));
    }

    const verificationWords = Array.from(selectedIndices).map(index => ({
      index,
      word: words[index]
    }));

    setVerificationWords(verificationWords);
    setUserInputs({});
    setStep(3);
  };

  /**
   * 니모닉 검증
   */
  const handleVerifyMnemonic = () => {
    if (!generatedWallet?.mnemonic) return;

    const words = generatedWallet.mnemonic.split(' ');
    const isCorrect = verificationWords.every(({ index, word }) => 
      words[index] === userInputs[index]
    );

    if (isCorrect) {
      // 지갑 대시보드로 이동
      navigate('/wallet');
    } else {
      // 에러 처리
      clearError();
      setStep(2); // 니모닉 표시 단계로 돌아가기
    }
  };

  /**
   * 니모닉 복사
   */
  const handleCopyMnemonic = async () => {
    if (!generatedWallet?.mnemonic) return;

    try {
      await navigator.clipboard.writeText(generatedWallet.mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
    }
  };

  /**
   * 사용자 입력 처리
   */
  const handleInputChange = (index, value) => {
    setUserInputs(prev => ({
      ...prev,
      [index]: value
    }));
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
            <h1 className="text-xl font-semibold">새 지갑 생성</h1>
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

        {/* 단계 1: 지갑 이름 입력 */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">지갑 이름 설정</h2>
            <p className="text-gray-600 mb-6">
              지갑을 구분하기 위한 이름을 입력해주세요.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                지갑 이름
              </label>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="예: 메인 지갑"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateWallet()}
              />
            </div>

            <button
              onClick={handleCreateWallet}
              disabled={!walletName.trim() || isLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '생성 중...' : '지갑 생성'}
            </button>
          </div>
        )}

        {/* 단계 2: 니모닉 표시 */}
        {step === 2 && generatedWallet && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">니모닉 구문</h2>
            <p className="text-gray-600 mb-6">
              아래 12단어를 안전한 곳에 기록하세요. 이는 지갑 복구에 필요합니다.
            </p>

            {/* 보안 경고 */}
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ <strong>중요:</strong> 이 니모닉은 한 번만 표시됩니다. 
                안전한 곳에 기록하고 절대 다른 사람과 공유하지 마세요.
              </p>
            </div>

            {/* 니모닉 표시 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  니모닉 구문 (12단어)
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {showMnemonic ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleCopyMnemonic}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <FiCopy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {showMnemonic ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-mono text-sm break-words">
                    {generatedWallet.mnemonic}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500">•••••••••••• •••••••••••• •••••••••••• •••••••••••• •••••••••••• •••••••••••• •••••••••••• •••••••••••• •••••••••••• •••••••••••• •••••••••••• ••••••••••••</p>
                </div>
              )}
              
              {copied && (
                <p className="text-green-600 text-sm mt-2 flex items-center">
                  <FiCheck className="w-4 h-4 mr-1" />
                  클립보드에 복사되었습니다
                </p>
              )}
            </div>

            <button
              onClick={handleConfirmMnemonic}
              disabled={!showMnemonic}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              니모닉 확인하기
            </button>
          </div>
        )}

        {/* 단계 3: 니모닉 확인 */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">니모닉 확인</h2>
            <p className="text-gray-600 mb-6">
              아래 순서에 맞는 단어를 입력하여 니모닉을 정확히 기록했는지 확인하세요.
            </p>

            <div className="space-y-4 mb-6">
              {verificationWords.map(({ index, word }) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {index + 1}번째 단어
                  </label>
                  <input
                    type="text"
                    value={userInputs[index] || ''}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    placeholder="단어를 입력하세요"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                다시 보기
              </button>
              <button
                onClick={handleVerifyMnemonic}
                disabled={verificationWords.length !== Object.keys(userInputs).length}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                확인 완료
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateWalletPage;
