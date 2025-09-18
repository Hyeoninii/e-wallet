import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';

/**
 * 거래 내역 페이지
 * 트랜잭션 히스토리 표시
 */
const TransactionsPage = () => {
  const { currentWallet, provider } = useWallet();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 트랜잭션 내역 조회
   */
  useEffect(() => {
    if (currentWallet?.address && provider) {
      fetchTransactions();
    }
  }, [currentWallet, provider]);

  const fetchTransactions = async () => {
    if (!currentWallet?.address || !provider) return;

    try {
      setIsLoading(true);
      // 실제 구현에서는 블록 익스플로러 API를 사용하여 트랜잭션 내역을 조회
      // 현재는 더미 데이터로 표시
      setTransactions([]);
    } catch (error) {
      console.error('트랜잭션 조회 실패:', error);
    } finally {
      setIsLoading(false);
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
    <div className="p-6">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">거래 내역</h1>
        <p className="text-gray-600">지갑의 모든 트랜잭션 내역을 확인할 수 있습니다.</p>
      </div>

      {/* 새로고침 버튼 */}
      <div className="mb-6">
        <button
          onClick={fetchTransactions}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? '새로고침 중...' : '새로고침'}
        </button>
      </div>

      {/* 트랜잭션 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">거래 내역을 불러오는 중...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">거래 내역이 없습니다</h3>
            <p className="text-gray-500 mb-4">
              아직 이 지갑으로 전송된 트랜잭션이 없습니다.
            </p>
            <button
              onClick={fetchTransactions}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              새로고침
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((tx, index) => (
              <div key={index} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      tx.status === 'success' ? 'bg-green-500' : 
                      tx.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {tx.type === 'send' ? '송금' : '입금'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${
                      tx.type === 'send' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {tx.type === 'send' ? '-' : '+'}{tx.amount} ETH
                    </p>
                    <p className="text-xs text-gray-500">
                      {tx.status === 'success' ? '완료' : 
                       tx.status === 'failed' ? '실패' : '대기 중'}
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 font-mono">
                  해시: {tx.hash}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 도움말 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">거래 내역 확인</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                트랜잭션은 블록에 포함된 후에 표시됩니다. 
                실시간으로 업데이트되지 않을 수 있으니 새로고침 버튼을 눌러 확인해주세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
