import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { 
  getOwners, 
  proposeAddOwner, 
  proposeRemoveOwner, 
  proposeChangeThreshold,
  confirmManagementTransaction,
  revokeManagementConfirmation,
  getManagementTransactionCount,
  getManagementTransaction,
  isManagementConfirmed,
  getManagementConfirmationCount
} from '../utils/multisig';

const MultiSigMembersPage = () => {
  const { currentWallet, provider } = useWallet();
  const [owners, setOwners] = useState([]);
  const [managementTransactions, setManagementTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [newThreshold, setNewThreshold] = useState('');

  // URL에서 contractAddress 추출
  const contractAddress = window.location.pathname.split('/')[2];

  useEffect(() => {
    if (contractAddress && provider) {
      loadData();
    }
  }, [contractAddress, provider]);

  const loadData = async () => {
      try {
        setLoading(true);
      const ownersList = await getOwners(contractAddress, provider);
      setOwners(ownersList);

      console.log('관리 트랜잭션 조회 시작...');
      console.log('멤버 관리 페이지 - 컨트랙트 주소:', contractAddress);
      console.log('멤버 관리 페이지 - 프로바이더 상태:', !!provider);
      
      const txCount = await getManagementTransactionCount(contractAddress, provider);
      console.log('멤버 관리 페이지 - 관리 트랜잭션 수:', txCount);
      console.log('멤버 관리 페이지 - 관리 트랜잭션 수 타입:', typeof txCount, txCount.toString());
      
      const txs = [];
      for (let i = 0; i < txCount; i++) {
        try {
          console.log(`관리 트랜잭션 ${i} 조회 중...`);
          const tx = await getManagementTransaction(contractAddress, i, provider);
          const isConfirmedByUser = await isManagementConfirmed(contractAddress, i, currentWallet.address, provider);
          const confirmCount = await getManagementConfirmationCount(contractAddress, i, provider);
          
          console.log(`관리 트랜잭션 ${i} 정보:`, { tx, isConfirmedByUser, confirmCount });
          
          txs.push({
            ...tx,
            txIndex: i,
            isConfirmedByUser,
            confirmCount
          });
        } catch (txError) {
          console.warn(`관리 트랜잭션 ${i} 조회 실패:`, txError.message);
        }
      }
      console.log('조회된 관리 트랜잭션 수:', txs.length);
      setManagementTransactions(txs);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOwner = async () => {
    if (!newOwnerAddress.trim()) return;
    
    try {
      setLoading(true);
      console.log('멤버 추가 제안 시작:', { contractAddress, newOwnerAddress, provider: !!provider, hasPrivateKey: !!currentWallet.privateKey });
      
      const result = await proposeAddOwner(contractAddress, newOwnerAddress, provider, currentWallet.privateKey);
      console.log('멤버 추가 제안 성공:', result);
      
      setNewOwnerAddress('');
      await loadData();
      alert('멤버 추가 제안이 생성되었습니다.');
    } catch (error) {
      console.error('멤버 추가 제안 실패:', error);
      console.error('에러 상세:', error.message);
      alert(`멤버 추가 제안에 실패했습니다: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

  const handleRemoveOwner = async (ownerAddress) => {
    if (!confirm(`${ownerAddress}를 멤버에서 제거하시겠습니까?`)) return;
    
    try {
      setLoading(true);
      await proposeRemoveOwner(contractAddress, ownerAddress, provider, currentWallet.privateKey);
      await loadData();
      alert('멤버 제거 제안이 생성되었습니다.');
    } catch (error) {
      console.error('멤버 제거 제안 실패:', error);
      alert('멤버 제거 제안에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeThreshold = async () => {
    const threshold = parseInt(newThreshold);
    if (isNaN(threshold) || threshold <= 0 || threshold > owners.length) {
      alert('유효한 임계값을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      console.log('임계값 변경 제안 시작:', { contractAddress, threshold, provider: !!provider, hasPrivateKey: !!currentWallet.privateKey });
      
      const result = await proposeChangeThreshold(contractAddress, threshold, provider, currentWallet.privateKey);
      console.log('임계값 변경 제안 성공:', result);
      
      setNewThreshold('');
      await loadData();
      alert('임계값 변경 제안이 생성되었습니다.');
    } catch (error) {
      console.error('임계값 변경 제안 실패:', error);
      console.error('에러 상세:', error.message);
      alert(`임계값 변경 제안에 실패했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTransaction = async (txIndex) => {
    try {
      setLoading(true);
      await confirmManagementTransaction(contractAddress, txIndex, provider, currentWallet.privateKey);
      await loadData();
      alert('트랜잭션을 승인했습니다.');
    } catch (error) {
      console.error('트랜잭션 승인 실패:', error);
      alert('트랜잭션 승인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeConfirmation = async (txIndex) => {
    try {
      setLoading(true);
      await revokeManagementConfirmation(contractAddress, txIndex, provider, currentWallet.privateKey);
      await loadData();
      alert('승인을 취소했습니다.');
    } catch (error) {
      console.error('승인 취소 실패:', error);
      alert('승인 취소에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionTypeText = (txType) => {
    switch (txType) {
      case 0: return '멤버 추가';
      case 1: return '멤버 제거';
      case 2: return '임계값 변경';
      default: return '알 수 없음';
    }
  };

  const getTransactionDescription = (tx) => {
    switch (tx.txType) {
      case 0: return `멤버 추가: ${tx.targetAddress}`;
      case 1: return `멤버 제거: ${tx.targetAddress}`;
      case 2: return `임계값 변경: ${tx.newThreshold}`;
      default: return '알 수 없음';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">멤버 관리</h1>
        <p className="text-gray-600">멀티시그 지갑의 멤버와 임계값을 관리합니다.</p>
      </div>

        {/* 현재 멤버 목록 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">현재 멤버 ({owners.length}명)</h2>
        </div>

        <div className="space-y-4">
          {owners.map((owner, index) => (
            <div key={owner} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">멤버 {index + 1}</p>
                  <p className="text-sm text-gray-600 font-mono">{owner}</p>
                  {owner.toLowerCase() === currentWallet.address.toLowerCase() && (
                    <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      나
                  </span>
                  )}
                </div>
              </div>
              {owners.length > 1 && owner.toLowerCase() !== currentWallet.address.toLowerCase() && (
                    <button
                  onClick={() => handleRemoveOwner(owner)}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                    >
                      제거
                    </button>
                  )}
            </div>
          ))}
      </div>

        {/* 멤버 추가 섹션 */}
        <div className="mt-6 p-4 border rounded-lg bg-blue-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">멤버 추가</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
              value={newOwnerAddress}
              onChange={(e) => setNewOwnerAddress(e.target.value)}
              placeholder="새 멤버 주소 (0x...)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              <button
              onClick={handleAddOwner}
              disabled={!newOwnerAddress.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                  추가
              </button>
            </div>
        </div>

        {/* 임계값 변경 섹션 */}
        <div className="mt-4 p-4 border rounded-lg bg-green-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">임계값 변경</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">현재 임계값: {owners.length}명 중</span>
            <input
              type="number"
              min="1"
              max={owners.length}
              value={newThreshold}
              onChange={(e) => setNewThreshold(e.target.value)}
              placeholder="새 임계값"
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <span className="text-sm text-gray-600">명</span>
            <button
              onClick={handleChangeThreshold}
              disabled={!newThreshold || parseInt(newThreshold) < 1 || parseInt(newThreshold) > owners.length}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              변경
            </button>
          </div>
        </div>
        </div>

      {/* 관리 트랜잭션 목록 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">관리 트랜잭션</h2>
        
        {managementTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">관리 트랜잭션이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {managementTransactions.map((tx) => (
              <div key={tx.txIndex} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
            <div>
                    <h3 className="font-medium text-gray-900">
                      {getTransactionTypeText(tx.txType)}
                    </h3>
                    <p className="text-sm text-gray-600">{getTransactionDescription(tx)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      tx.executed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {tx.executed ? '완료' : '대기중'}
                </span>
              </div>
            </div>
            
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    승인: {tx.confirmCount} / {owners.length}
          </div>
            
                  {!tx.executed && (
                    <div className="space-x-2">
                      {tx.isConfirmedByUser ? (
                        <button
                          onClick={() => handleRevokeConfirmation(tx.txIndex)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          승인 취소
                        </button>
                      ) : (
            <button
                          onClick={() => handleConfirmTransaction(tx.txIndex)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
            >
                          승인
            </button>
                      )}
                    </div>
                  )}
            </div>
          </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default MultiSigMembersPage;