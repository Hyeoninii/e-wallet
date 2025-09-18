import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 다중 서명 지갑 멤버 관리 페이지
 */
const MultiSigMembersPage = () => {
  const navigate = useNavigate();
  
  // 임시 데이터
  const [members, setMembers] = useState([
    {
      address: '0x1111111111111111111111111111111111111111',
      name: 'Alice',
      role: 'owner',
      addedAt: '2024-01-01T00:00:00Z'
    },
    {
      address: '0x2222222222222222222222222222222222222222',
      name: 'Bob',
      role: 'owner',
      addedAt: '2024-01-01T00:00:00Z'
    },
    {
      address: '0x3333333333333333333333333333333333333333',
      name: 'Charlie',
      role: 'owner',
      addedAt: '2024-01-01T00:00:00Z'
    }
  ]);

  const [currentUser] = useState('0x1111111111111111111111111111111111111111');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberAddress, setNewMemberAddress] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  /**
   * 멤버 추가
   */
  const handleAddMember = async () => {
    if (!newMemberAddress.trim() || !newMemberName.trim()) {
      alert('주소와 이름을 모두 입력해주세요.');
      return;
    }

    // 주소 중복 확인
    if (members.some(member => member.address.toLowerCase() === newMemberAddress.toLowerCase())) {
      alert('이미 존재하는 주소입니다.');
      return;
    }

    try {
      // TODO: 실제 멤버 추가 로직
      console.log('멤버 추가:', {
        address: newMemberAddress.trim(),
        name: newMemberName.trim()
      });
      
      alert('멤버 추가가 제안되었습니다! 다른 소유자들의 승인을 기다리는 중입니다.');
      setShowAddMember(false);
      setNewMemberAddress('');
      setNewMemberName('');
      
    } catch (error) {
      console.error('멤버 추가 실패:', error);
      alert('멤버 추가에 실패했습니다.');
    }
  };

  /**
   * 멤버 제거
   */
  const handleRemoveMember = async (address) => {
    if (address === currentUser) {
      alert('자신을 제거할 수 없습니다.');
      return;
    }

    if (members.length <= 2) {
      alert('최소 2명의 소유자가 필요합니다.');
      return;
    }

    if (window.confirm('이 멤버를 제거하시겠습니까?')) {
      try {
        // TODO: 실제 멤버 제거 로직
        console.log('멤버 제거:', address);
        alert('멤버 제거가 제안되었습니다! 다른 소유자들의 승인을 기다리는 중입니다.');
        
      } catch (error) {
        console.error('멤버 제거 실패:', error);
        alert('멤버 제거에 실패했습니다.');
      }
    }
  };

  /**
   * 주소 복사
   */
  const handleCopyAddress = async (address) => {
    try {
      await navigator.clipboard.writeText(address);
      alert('주소가 복사되었습니다!');
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">멤버 관리</h1>
            <p className="text-gray-600 mt-1">다중 서명 지갑의 소유자를 관리합니다</p>
          </div>
          <button
            onClick={() => setShowAddMember(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            멤버 추가
          </button>
        </div>
      </div>

      {/* 멤버 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">소유자 목록</h2>
          <p className="text-sm text-gray-500 mt-1">
            총 {members.length}명의 소유자가 있습니다
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {members.map((member, index) => (
            <div key={member.address} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">{member.name}</h3>
                      {member.address === currentUser && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          나
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="text-sm font-mono text-gray-600">
                        {member.address.slice(0, 6)}...{member.address.slice(-4)}
                      </code>
                      <button
                        onClick={() => handleCopyAddress(member.address)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="주소 복사"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      추가됨: {new Date(member.addedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    소유자
                  </span>
                  
                  {member.address !== currentUser && members.length > 2 && (
                    <button
                      onClick={() => handleRemoveMember(member.address)}
                      className="p-2 text-red-400 hover:text-red-600"
                      title="멤버 제거"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 멤버 추가 모달 */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">새 멤버 추가</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  멤버 이름
                </label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="예: David"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이더리움 주소
                </label>
                <input
                  type="text"
                  value={newMemberAddress}
                  onChange={(e) => setNewMemberAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  추가할 멤버의 이더리움 주소를 입력하세요.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setNewMemberAddress('');
                  setNewMemberName('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddMember}
                disabled={!newMemberAddress.trim() || !newMemberName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                멤버 추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정보 카드 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">멤버 관리 안내</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>멤버 추가/제거는 다른 소유자들의 승인이 필요합니다</li>
                <li>최소 2명의 소유자가 유지되어야 합니다</li>
                <li>자신을 제거할 수는 없습니다</li>
                <li>멤버 변경 시 임계값을 조정해야 할 수 있습니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiSigMembersPage;
