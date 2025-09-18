import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 다중 서명 지갑 생성 페이지
 */
const CreateMultiSigPage = () => {
  const navigate = useNavigate();
  
  // 폼 상태
  const [walletName, setWalletName] = useState('');
  const [owners, setOwners] = useState(['']);
  const [threshold, setThreshold] = useState(2);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 소유자 추가
   */
  const addOwner = () => {
    setOwners([...owners, '']);
  };

  /**
   * 소유자 제거
   */
  const removeOwner = (index) => {
    if (owners.length > 1) {
      const newOwners = owners.filter((_, i) => i !== index);
      setOwners(newOwners);
      // 임계값 조정
      if (threshold > newOwners.length) {
        setThreshold(newOwners.length);
      }
    }
  };

  /**
   * 소유자 주소 변경
   */
  const updateOwner = (index, value) => {
    const newOwners = [...owners];
    newOwners[index] = value;
    setOwners(newOwners);
  };

  /**
   * 다중 서명 지갑 생성
   */
  const handleCreateMultiSig = async () => {
    if (!walletName.trim()) {
      alert('지갑 이름을 입력해주세요.');
      return;
    }

    const validOwners = owners.filter(owner => owner.trim());
    if (validOwners.length < 2) {
      alert('최소 2명의 소유자가 필요합니다.');
      return;
    }

    if (threshold > validOwners.length) {
      alert('임계값은 소유자 수보다 클 수 없습니다.');
      return;
    }

    if (threshold < 1) {
      alert('임계값은 최소 1이어야 합니다.');
      return;
    }

    try {
      setIsLoading(true);
      
      // TODO: 실제 다중 서명 지갑 생성 로직
      console.log('다중 서명 지갑 생성:', {
        name: walletName,
        owners: validOwners,
        threshold
      });
      
      // 임시로 성공 처리
      alert('다중 서명 지갑이 생성되었습니다!');
      navigate('/multisig');
      
    } catch (error) {
      console.error('다중 서명 지갑 생성 실패:', error);
      alert('다중 서명 지갑 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => navigate('/')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">다중 서명 지갑 생성</h1>
              <p className="text-gray-600 mt-1">여러 명이 함께 관리하는 안전한 지갑을 만드세요</p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={(e) => { e.preventDefault(); handleCreateMultiSig(); }} className="space-y-6">
            {/* 지갑 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                지갑 이름
              </label>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="예: 팀 지갑, 가족 지갑"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* 소유자 목록 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  소유자 목록
                </label>
                <button
                  type="button"
                  onClick={addOwner}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + 소유자 추가
                </button>
              </div>
              
              <div className="space-y-3">
                {owners.map((owner, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={owner}
                        onChange={(e) => updateOwner(index, e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {owners.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOwner(index)}
                        className="p-2 text-red-400 hover:text-red-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-gray-500 mt-2">
                최소 2명의 소유자가 필요합니다. 각 소유자는 이더리움 주소여야 합니다.
              </p>
            </div>

            {/* 임계값 설정 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                승인 임계값
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
                  min="1"
                  max={owners.filter(o => o.trim()).length}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-600">
                  / {owners.filter(o => o.trim()).length}명
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                트랜잭션을 실행하려면 {threshold}명의 소유자가 승인해야 합니다.
              </p>
            </div>

            {/* 정보 카드 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">다중 서명 지갑이란?</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>여러 명이 함께 관리하는 지갑입니다</li>
                      <li>트랜잭션을 실행하려면 설정된 수만큼의 소유자가 승인해야 합니다</li>
                      <li>한 명의 키가 유출되어도 안전합니다</li>
                      <li>중요한 자금을 관리할 때 매우 유용합니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 생성 버튼 */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isLoading || !walletName.trim() || owners.filter(o => o.trim()).length < 2}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '생성 중...' : '다중 서명 지갑 생성'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateMultiSigPage;
