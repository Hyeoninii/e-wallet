import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

/**
 * 다중서명 지갑 멤버 관리 페이지
 * 다중서명 지갑의 멤버 추가/제거 및 승인 임계값 변경 기능 제공
 */
const MultiSigMembersPage = () => {
  const { address } = useParams();
  const navigate = useNavigate();
  const { getMultiSigWalletData, currentWallet } = useWallet();
  const [multisigWallet, setMultisigWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [newThreshold, setNewThreshold] = useState('');

  useEffect(() => {
    const loadWalletData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!address) {
          throw new Error('다중서명 지갑 주소가 필요합니다.');
        }

        console.log('다중서명 멤버 관리 페이지 - 지갑 데이터 로드 시작:', address);
        const walletData = await getMultiSigWalletData(address);
        console.log('다중서명 멤버 관리 페이지 - 지갑 데이터 로드 완료:', walletData);
        
        setMultisigWallet(walletData);
        setNewThreshold(walletData.threshold.toString());
      } catch (err) {
        console.error('다중서명 멤버 관리 페이지 - 지갑 데이터 로드 실패:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadWalletData();
  }, [address, getMultiSigWalletData]);

  const handleAddMember = () => {
    if (!newMemberAddress.trim()) {
      alert('새 멤버 주소를 입력해주세요.');
      return;
    }

    if (!newMemberAddress.startsWith('0x') || newMemberAddress.length !== 42) {
      alert('유효한 이더리움 주소를 입력해주세요.');
      return;
    }

    if (multisigWallet.owners.includes(newMemberAddress)) {
      alert('이미 등록된 멤버입니다.');
      return;
    }

    // TODO: 실제 멤버 추가 로직 구현
    alert('멤버 추가 기능은 아직 구현되지 않았습니다.');
  };

  const handleRemoveMember = (memberAddress) => {
    if (memberAddress.toLowerCase() === currentWallet?.address?.toLowerCase()) {
      alert('자신을 제거할 수 없습니다.');
      return;
    }

    if (multisigWallet.owners.length <= 1) {
      alert('최소 1명의 멤버는 유지되어야 합니다.');
      return;
    }

    // TODO: 실제 멤버 제거 로직 구현
    alert('멤버 제거 기능은 아직 구현되지 않았습니다.');
  };

  const handleUpdateThreshold = () => {
    const threshold = parseInt(newThreshold);
    
    if (isNaN(threshold) || threshold < 1) {
      alert('승인 임계값은 1 이상이어야 합니다.');
      return;
    }

    if (threshold > multisigWallet.owners.length) {
      alert('승인 임계값은 멤버 수보다 클 수 없습니다.');
      return;
    }

    // TODO: 실제 임계값 변경 로직 구현
    alert('임계값 변경 기능은 아직 구현되지 않았습니다.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">다중서명 지갑 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">오류: {error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!multisigWallet) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">다중서명 지갑을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(`/multisig/${address}`)}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">멤버 관리</h1>
            <p className="text-gray-600">지갑 주소: {address}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 현재 멤버 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">현재 멤버 ({multisigWallet.owners.length}명)</h2>
          
          <div className="space-y-3">
            {multisigWallet.owners.map((owner, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-gray-900">{owner}</p>
                    <p className="text-xs text-gray-500">멤버 {index + 1}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {owner.toLowerCase() === currentWallet?.address?.toLowerCase() && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      현재 사용자
                  </span>
                  )}
                  {owner.toLowerCase() !== currentWallet?.address?.toLowerCase() && multisigWallet.owners.length > 1 && (
                    <button
                      onClick={() => handleRemoveMember(owner)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-sm"
                    >
                      제거
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>

        {/* 새 멤버 추가 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">새 멤버 추가</h2>
            
            <div className="space-y-4">
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">새 멤버 주소</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMemberAddress}
                  onChange={(e) => setNewMemberAddress(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              <button
                onClick={handleAddMember}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                  추가
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* 승인 임계값 변경 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">승인 임계값 변경</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">새 승인 임계값</label>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  min="1"
                  max={multisigWallet.owners.length}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-600">
                  (1 ~ {multisigWallet.owners.length} 사이의 값)
                </span>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
                <span className="font-semibold text-yellow-900">주의사항</span>
              </div>
              <p className="text-yellow-800 text-sm">
                승인 임계값을 변경하면 모든 멤버의 승인이 필요합니다. 
                현재 임계값: <strong>{multisigWallet.threshold}</strong>명
              </p>
          </div>
            
            <button
              onClick={handleUpdateThreshold}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              임계값 변경
            </button>
            </div>
          </div>

        {/* 정보 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-blue-900">정보</span>
          </div>
          <p className="text-blue-800 text-sm">
            멤버 관리 기능은 스마트 컨트랙트의 함수를 호출하여 실행됩니다. 
            모든 변경사항은 블록체인에 기록되며, 가스비가 발생할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MultiSigMembersPage;