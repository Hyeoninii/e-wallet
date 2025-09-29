import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { ethers } from 'ethers';

/**
 * 다중 서명 트랜잭션 제안 페이지
 */
const MultiSigSendPage = () => {
  const navigate = useNavigate();
  const { address } = useParams();
  const { provider, getMultiSigWalletData, currentWallet, proposeMultiSigTransaction } = useWallet();
  
  // 폼 상태
  const [to, setTo] = useState('');
  const [value, setValue] = useState('');
  const [data, setData] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 다중서명 지갑 상태
  const [multisigWallet, setMultisigWallet] = useState(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [walletError, setWalletError] = useState(null);

  // 다중서명 지갑 정보 로드
  useEffect(() => {
    const loadWallet = async () => {
      try {
        setIsLoadingWallet(true);
        setWalletError(null);

        if (!address) {
          throw new Error('다중서명 지갑 주소가 제공되지 않았습니다.');
        }

        if (!provider) {
          throw new Error('네트워크에 연결되지 않았습니다.');
        }

        console.log('다중서명 지갑 정보 로드 시작:', address);
        const walletInfo = await getMultiSigWalletData(address);
        console.log('다중서명 지갑 정보 로드 완료:', walletInfo);
        
        setMultisigWallet(walletInfo);
      } catch (error) {
        console.error('다중서명 지갑 로드 실패:', error);
        setWalletError(error.message);
      } finally {
        setIsLoadingWallet(false);
      }
    };

    loadWallet();
  }, [address, provider, getMultiSigWalletData]);

  /**
   * 트랜잭션 제안
   */
  const handleProposeTransaction = async () => {
    if (!to.trim() || !value.trim()) {
      alert('수신 주소와 금액을 입력해주세요.');
      return;
    }

    if (parseFloat(value) <= 0) {
      alert('금액은 0보다 커야 합니다.');
      return;
    }

    try {
      setIsLoading(true);
      
      console.log('트랜잭션 제안 시작:', {
        to: to.trim(),
        value: parseFloat(value),
        data: data.trim(),
        description: description.trim()
      });
      
      // ETH를 wei로 변환
      const valueInWei = ethers.parseEther(value);
      
      // 트랜잭션 제안
      const result = await proposeMultiSigTransaction(
        address,
        to.trim(),
        valueInWei.toString(),
        data.trim() || '0x'
      );
      
      console.log('트랜잭션 제안 완료:', result);
      
      alert('트랜잭션이 제안되었습니다! 다른 소유자들의 승인을 기다리는 중입니다.');
      navigate(`/multisig/${address}`);
      
    } catch (error) {
      console.error('트랜잭션 제안 실패:', error);
      alert('트랜잭션 제안에 실패했습니다: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 로딩 상태
  if (isLoadingWallet) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center text-gray-500">다중서명 지갑 정보를 불러오는 중...</div>
      </div>
    );
  }

  // 디버깅: 현재 지갑 상태 확인
  console.log('MultiSigSendPage - 현재 지갑 상태:', {
    currentWallet: currentWallet,
    provider: provider,
    address: address
  });

  // 지갑 연결 확인
  if (!currentWallet) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6V7a2 2 0 00-2-2H8a2 2 0 00-2 2v2m8 0V7a2 2 0 012-2h2a2 2 0 012 2v2m-8 0h8" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">지갑 연결 필요</h2>
          <p className="text-yellow-800 mb-4">
            다중서명 트랜잭션을 제안하려면 먼저 개인 지갑을 연결해야 합니다.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              지갑 연결하기
            </button>
            <button
              onClick={() => navigate(`/multisig/${address}`)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              다중서명 지갑으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 소유자 확인
  if (multisigWallet && !multisigWallet.owners.includes(currentWallet.address)) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">권한 없음</h2>
          <p className="text-red-800 mb-4">
            현재 연결된 지갑은 이 다중서명 지갑의 소유자가 아닙니다.
          </p>
          <p className="text-sm text-red-700 mb-4">
            연결된 지갑: {currentWallet.address}<br/>
            다중서명 지갑 소유자: {multisigWallet.owners.join(', ')}
          </p>
          <button
            onClick={() => navigate(`/multisig/${address}`)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            다중서명 지갑으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 오류 상태
  if (walletError) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {walletError}
        </div>
        <button
          onClick={() => navigate('/multisig')}
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          돌아가기
        </button>
      </div>
    );
  }

  // 다중서명 지갑이 로드되지 않은 경우
  if (!multisigWallet) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center text-gray-500">다중서명 지갑 정보를 불러올 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(`/multisig/${address}`)}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">트랜잭션 제안</h1>
            <p className="text-gray-600">새로운 트랜잭션을 제안하고 소유자들의 승인을 받으세요</p>
            <p className="text-sm text-gray-500 mt-1">
              다중서명 지갑: {multisigWallet.address}
            </p>
          </div>
        </div>
      </div>

      {/* 트랜잭션 폼 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={(e) => { e.preventDefault(); handleProposeTransaction(); }} className="space-y-6">
          {/* 수신 주소 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              수신 주소 *
            </label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              이더리움 주소를 정확히 입력해주세요.
            </p>
          </div>
          
          {/* 금액 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              금액 (ETH) *
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.0"
              step="0.000001"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              전송할 ETH 금액을 입력해주세요.
            </p>
          </div>
          
          {/* 데이터 (선택사항) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              데이터 (선택사항)
            </label>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              스마트 컨트랙트 호출 시 필요한 데이터를 입력하세요.
            </p>
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명 (선택사항)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이 트랜잭션의 목적을 설명해주세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              다른 소유자들이 이해할 수 있도록 트랜잭션의 목적을 설명해주세요.
            </p>
          </div>

          {/* 승인 정보 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">승인 프로세스</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>이 트랜잭션을 실행하려면 {multisigWallet.threshold}명의 소유자가 승인해야 합니다.</p>
                  <p className="mt-1">총 {multisigWallet.owners.length}명의 소유자 중 {multisigWallet.threshold}명의 승인이 필요합니다.</p>
                  <p className="mt-1">제안 후 다른 소유자들이 검토하고 승인할 수 있습니다.</p>
                </div>
              </div>
            </div>
          </div>

          {/* 제안 버튼 */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/multisig')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !to.trim() || !value.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '제안 중...' : '트랜잭션 제안'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MultiSigSendPage;
