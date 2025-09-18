import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 다중 서명 트랜잭션 목록 및 승인 페이지
 */
const MultiSigTransactionsPage = () => {
  const navigate = useNavigate();
  
  // 임시 데이터
  const [transactions] = useState([
    {
      id: 1,
      proposer: '0x1111111111111111111111111111111111111111',
      to: '0x1234567890123456789012345678901234567890',
      value: '0.5',
      description: '팀 보너스 지급',
      status: 'pending',
      confirmations: 1,
      threshold: 2,
      createdAt: '2024-01-15T10:30:00Z',
      confirmedBy: ['0x1111111111111111111111111111111111111111']
    },
    {
      id: 2,
      proposer: '0x2222222222222222222222222222222222222222',
      to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      value: '0.1',
      description: '마케팅 비용 지급',
      status: 'pending',
      confirmations: 0,
      threshold: 2,
      createdAt: '2024-01-15T09:15:00Z',
      confirmedBy: []
    },
    {
      id: 3,
      proposer: '0x3333333333333333333333333333333333333333',
      to: '0x9876543210987654321098765432109876543210',
      value: '1.0',
      description: '개발팀 급여',
      status: 'executed',
      confirmations: 2,
      threshold: 2,
      createdAt: '2024-01-14T16:45:00Z',
      executedAt: '2024-01-14T17:30:00Z',
      confirmedBy: ['0x1111111111111111111111111111111111111111', '0x2222222222222222222222222222222222222222']
    }
  ]);

  const [currentUser] = useState('0x1111111111111111111111111111111111111111');

  /**
   * 트랜잭션 승인
   */
  const handleConfirmTransaction = async (txId) => {
    try {
      // TODO: 실제 승인 로직
      console.log('트랜잭션 승인:', txId);
      alert('트랜잭션이 승인되었습니다!');
    } catch (error) {
      console.error('승인 실패:', error);
      alert('승인에 실패했습니다.');
    }
  };

  /**
   * 트랜잭션 실행
   */
  const handleExecuteTransaction = async (txId) => {
    try {
      // TODO: 실제 실행 로직
      console.log('트랜잭션 실행:', txId);
      alert('트랜잭션이 실행되었습니다!');
    } catch (error) {
      console.error('실행 실패:', error);
      alert('실행에 실패했습니다.');
    }
  };

  /**
   * 상태별 색상 반환
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'executed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * 상태별 텍스트 반환
   */
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return '대기 중';
      case 'executed':
        return '실행됨';
      case 'rejected':
        return '거부됨';
      default:
        return '알 수 없음';
    }
  };

  /**
   * 사용자가 이미 승인했는지 확인
   */
  const isConfirmedByUser = (tx) => {
    return tx.confirmedBy.includes(currentUser);
  };

  /**
   * 실행 가능한지 확인
   */
  const canExecute = (tx) => {
    return tx.status === 'pending' && tx.confirmations >= tx.threshold;
  };

  return (
    <div className="p-6">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">트랜잭션 내역</h1>
            <p className="text-gray-600 mt-1">대기 중인 트랜잭션을 승인하고 실행하세요</p>
          </div>
          <button
            onClick={() => navigate('/multisig/send')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            새 트랜잭션 제안
          </button>
        </div>
      </div>

      {/* 트랜잭션 목록 */}
      <div className="space-y-4">
        {transactions.map((tx) => (
          <div key={tx.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    트랜잭션 #{tx.id}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                    {getStatusText(tx.status)}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">제안자:</span>
                    <code className="ml-2 font-mono text-gray-900">
                      {tx.proposer.slice(0, 6)}...{tx.proposer.slice(-4)}
                    </code>
                  </div>
                  <div>
                    <span className="text-gray-500">수신 주소:</span>
                    <code className="ml-2 font-mono text-gray-900">
                      {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                    </code>
                  </div>
                  <div>
                    <span className="text-gray-500">금액:</span>
                    <span className="ml-2 font-semibold text-gray-900">{tx.value} ETH</span>
                  </div>
                  <div>
                    <span className="text-gray-500">승인:</span>
                    <span className="ml-2 text-gray-900">
                      {tx.confirmations}/{tx.threshold}명
                    </span>
                  </div>
                </div>
                
                {tx.description && (
                  <div className="mt-3">
                    <span className="text-gray-500 text-sm">설명:</span>
                    <p className="text-gray-900 text-sm mt-1">{tx.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 승인 진행률 */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>승인 진행률</span>
                <span>{tx.confirmations}/{tx.threshold}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(tx.confirmations / tx.threshold) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* 승인자 목록 */}
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">승인자:</div>
              <div className="flex flex-wrap gap-2">
                {tx.confirmedBy.map((address, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium"
                  >
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                ))}
                {tx.confirmedBy.length === 0 && (
                  <span className="text-gray-500 text-sm">아직 승인자가 없습니다</span>
                )}
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                제안 시간: {new Date(tx.createdAt).toLocaleString()}
              </div>
              
              <div className="flex space-x-2">
                {tx.status === 'pending' && !isConfirmedByUser(tx) && (
                  <button
                    onClick={() => handleConfirmTransaction(tx.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                  >
                    승인
                  </button>
                )}
                
                {tx.status === 'pending' && isConfirmedByUser(tx) && (
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm font-medium">
                    이미 승인함
                  </span>
                )}
                
                {canExecute(tx) && (
                  <button
                    onClick={() => handleExecuteTransaction(tx.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    실행
                  </button>
                )}
                
                {tx.status === 'executed' && (
                  <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md text-sm">
                    실행 완료
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 빈 상태 */}
      {transactions.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">트랜잭션이 없습니다</h3>
          <p className="text-gray-500 mb-4">아직 제안된 트랜잭션이 없습니다.</p>
          <button
            onClick={() => navigate('/multisig/send')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            첫 트랜잭션 제안하기
          </button>
        </div>
      )}
    </div>
  );
};

export default MultiSigTransactionsPage;
