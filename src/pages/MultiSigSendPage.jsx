import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 다중 서명 트랜잭션 제안 페이지
 */
const MultiSigSendPage = () => {
  const navigate = useNavigate();
  
  // 폼 상태
  const [to, setTo] = useState('');
  const [value, setValue] = useState('');
  const [data, setData] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      
      // TODO: 실제 트랜잭션 제안 로직
      console.log('트랜잭션 제안:', {
        to: to.trim(),
        value: parseFloat(value),
        data: data.trim(),
        description: description.trim()
      });
      
      alert('트랜잭션이 제안되었습니다! 다른 소유자들의 승인을 기다리는 중입니다.');
      navigate('/multisig');
      
    } catch (error) {
      console.error('트랜잭션 제안 실패:', error);
      alert('트랜잭션 제안에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/multisig')}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">트랜잭션 제안</h1>
            <p className="text-gray-600">새로운 트랜잭션을 제안하고 소유자들의 승인을 받으세요</p>
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
                  <p>이 트랜잭션을 실행하려면 2명의 소유자가 승인해야 합니다.</p>
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
