import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

/**
 * 다중서명 지갑 참여 페이지
 */
const MultiSigJoinPage = () => {
  const navigate = useNavigate();
  const { address } = useParams();
  const { 
    provider, 
    currentWallet, 
    joinMultiSigWallet, 
    verifySigner,
    getMultiSigWalletData 
  } = useWallet();

  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);
  const [walletInfo, setWalletInfo] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    const handleJoin = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('다중서명 지갑 참여 페이지 로드:', address);

        if (!address) {
          throw new Error('다중서명 지갑 주소가 제공되지 않았습니다.');
        }

        if (!provider) {
          throw new Error('네트워크에 연결되지 않았습니다.');
        }

        if (!currentWallet) {
          throw new Error('먼저 지갑을 연결해주세요.');
        }

        // 다중서명 지갑 정보 조회
        console.log('다중서명 지갑 정보 조회 중...');
        const walletData = await getMultiSigWalletData(address);
        setWalletInfo(walletData);

        // 서명자 인증
        console.log('서명자 인증 중...');
        setIsVerifying(true);
        const verification = await verifySigner(address, currentWallet.address);
        setVerificationResult(verification);

        if (verification.isSigner) {
          console.log('서명자 확인됨, 자동 참여 시작...');
          setIsJoining(true);
          
          // 자동으로 다중서명 지갑에 참여
          const joinedWallet = await joinMultiSigWallet(address);
          
          alert(`다중서명 지갑에 성공적으로 참여했습니다!\n\n지갑 주소: ${joinedWallet.address}`);
          
          // 대시보드로 이동
          navigate(`/multisig/${address}`);
        } else {
          console.log('서명자가 아님');
        }

      } catch (error) {
        console.error('참여 처리 실패:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
        setIsVerifying(false);
        setIsJoining(false);
      }
    };

    handleJoin();
  }, [address, provider, currentWallet, joinMultiSigWallet, verifySigner, getMultiSigWalletData, navigate]);

  /**
   * 수동 참여 처리
   */
  const handleManualJoin = async () => {
    try {
      setIsJoining(true);
      setError(null);

      const joinedWallet = await joinMultiSigWallet(address);
      
      alert(`다중서명 지갑에 성공적으로 참여했습니다!\n\n지갑 주소: ${joinedWallet.address}`);
      
      // 대시보드로 이동
      navigate(`/multisig/${address}`);
      
    } catch (error) {
      console.error('수동 참여 실패:', error);
      setError(error.message);
    } finally {
      setIsJoining(false);
    }
  };

  /**
   * 홈으로 돌아가기
   */
  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">다중서명 지갑 참여</h1>
          <p className="text-gray-600 mt-2">다른 다중서명 지갑의 서명자로 참여합니다</p>
        </div>

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">지갑 정보를 확인하는 중...</p>
          </div>
        )}

        {/* 인증 중 */}
        {isVerifying && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">서명자 인증 중...</p>
          </div>
        )}

        {/* 참여 중 */}
        {isJoining && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">다중서명 지갑에 참여하는 중...</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 font-medium">오류 발생</p>
            </div>
            <p className="text-red-700 mt-2">{error}</p>
          </div>
        )}

        {/* 지갑 정보 */}
        {walletInfo && !isLoading && !isVerifying && !isJoining && (
          <div className="space-y-4">
            {/* 지갑 정보 카드 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">다중서명 지갑 정보</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">지갑 주소:</span>
                  <code className="block text-sm font-mono bg-white p-2 rounded border mt-1 break-all">
                    {address}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">소유자 수:</span>
                  <span className="text-sm font-medium">{walletInfo.owners.length}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">승인 임계값:</span>
                  <span className="text-sm font-medium">{walletInfo.threshold}명</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">잔액:</span>
                  <span className="text-sm font-medium">{parseFloat(walletInfo.balance).toFixed(6)} ETH</span>
                </div>
              </div>
            </div>

            {/* 서명자 인증 결과 */}
            {verificationResult && (
              <div className={`rounded-lg p-4 ${
                verificationResult.isSigner 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center mb-2">
                  {verificationResult.isSigner ? (
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  )}
                  <p className={`font-medium ${
                    verificationResult.isSigner ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {verificationResult.isSigner ? '서명자 확인됨' : '서명자가 아님'}
                  </p>
                </div>
                <p className={`text-sm ${
                  verificationResult.isSigner ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {verificationResult.isSigner 
                    ? '이 지갑은 해당 다중서명 지갑의 서명자입니다.'
                    : '이 지갑은 해당 다중서명 지갑의 서명자가 아닙니다.'
                  }
                </p>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="space-y-3">
              {verificationResult?.isSigner ? (
                <button
                  onClick={handleManualJoin}
                  disabled={isJoining}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isJoining ? '참여 중...' : '다시 참여하기'}
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    이 지갑은 해당 다중서명 지갑의 서명자가 아닙니다.
                  </p>
                  <button
                    onClick={handleGoHome}
                    className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    홈으로 돌아가기
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 하단 안내 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <p>• 다중서명 지갑의 서명자로만 참여할 수 있습니다</p>
            <p>• 참여 후 해당 지갑의 트랜잭션에 서명할 수 있습니다</p>
            <p>• 지갑이 연결되어 있어야 참여할 수 있습니다</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiSigJoinPage;
