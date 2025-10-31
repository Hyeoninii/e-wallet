import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { generateRolesContract } from '../utils/contractGenerator';
import { deployNewPolicyAndRoles } from '../utils/contractDeployer';

/**
 * 직급 관리 페이지 컴포넌트
 * 다중 서명 지갑에서 직급을 생성하고 지갑 주소별로 직급을 할당할 수 있는 페이지
 */
const RoleManagementPage = () => {
  const { address } = useParams();
  const navigate = useNavigate();
  const { currentWallet, provider, isLoading, error } = useWallet();
  
  // 폼 상태
  const [formData, setFormData] = useState({
    roles: [],
    memberRoles: {},
    rolePermissions: {}
  });

  // UI 상태
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentTx, setDeploymentTx] = useState(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [activeTab, setActiveTab] = useState('roles'); // 'roles', 'assignments', 'permissions'
  const [policyManagerAddress, setPolicyManagerAddress] = useState(null);
  const [deployedContracts, setDeployedContracts] = useState(null);

  // 기본 직급 템플릿
  const defaultRoles = [
    {
      id: 'admin',
      name: '관리자',
      description: '모든 권한을 가진 최고 관리자',
      permissions: ['CREATE_ROLE', 'DELETE_ROLE', 'ASSIGN_ROLE', 'REMOVE_ROLE', 'MODIFY_PERMISSIONS', 'EXECUTE_TRANSACTION', 'APPROVE_TRANSACTION'],
      level: 100,
      color: 'red'
    },
    {
      id: 'manager',
      name: '매니저',
      description: '팀 관리 및 트랜잭션 승인 권한',
      permissions: ['ASSIGN_ROLE', 'EXECUTE_TRANSACTION', 'APPROVE_TRANSACTION'],
      level: 80,
      color: 'blue'
    },
    {
      id: 'approver',
      name: '승인자',
      description: '트랜잭션 승인 권한',
      permissions: ['APPROVE_TRANSACTION'],
      level: 60,
      color: 'green'
    },
    {
      id: 'member',
      name: '멤버',
      description: '기본 멤버 권한',
      permissions: ['VIEW_TRANSACTIONS'],
      level: 40,
      color: 'gray'
    }
  ];

  // 권한 목록
  const availablePermissions = [
    { id: 'CREATE_ROLE', name: '직급 생성', description: '새로운 직급을 생성할 수 있습니다.' },
    { id: 'DELETE_ROLE', name: '직급 삭제', description: '기존 직급을 삭제할 수 있습니다.' },
    { id: 'ASSIGN_ROLE', name: '직급 할당', description: '멤버에게 직급을 할당할 수 있습니다.' },
    { id: 'REMOVE_ROLE', name: '직급 제거', description: '멤버의 직급을 제거할 수 있습니다.' },
    { id: 'MODIFY_PERMISSIONS', name: '권한 수정', description: '직급의 권한을 수정할 수 있습니다.' },
    { id: 'EXECUTE_TRANSACTION', name: '트랜잭션 실행', description: '트랜잭션을 실행할 수 있습니다.' },
    { id: 'APPROVE_TRANSACTION', name: '트랜잭션 승인', description: '트랜잭션을 승인할 수 있습니다.' },
    { id: 'VIEW_TRANSACTIONS', name: '트랜잭션 조회', description: '트랜잭션을 조회할 수 있습니다.' },
    { id: 'MANAGE_POLICIES', name: '정책 관리', description: '정책을 생성하고 수정할 수 있습니다.' },
    { id: 'EMERGENCY_PAUSE', name: '긴급 정지', description: '긴급 상황에서 시스템을 정지할 수 있습니다.' }
  ];

  useEffect(() => {
    if (!currentWallet) {
      navigate('/');
    }
    
    // PolicyManager 주소 로드 (실제로는 다중 서명 지갑에서 가져와야 함)
    // 현재는 Mock 주소 사용
    setPolicyManagerAddress('0x' + Math.random().toString(16).substr(2, 40));
    
    // 기본 직급들로 초기화
    setFormData(prev => ({
      ...prev,
      roles: defaultRoles
    }));
  }, [currentWallet, navigate]);

  /**
   * 직급 추가
   */
  const addRole = () => {
    const newRole = {
      id: '',
      name: '',
      description: '',
      permissions: [],
      level: 50,
      color: 'gray'
    };

    setFormData(prev => ({
      ...prev,
      roles: [...prev.roles, newRole]
    }));
  };

  /**
   * 직급 업데이트
   */
  const updateRole = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.map((role, i) => 
        i === index ? { ...role, [field]: value } : role
      )
    }));
  };

  /**
   * 직급 삭제
   */
  const removeRole = (index) => {
    const roleToRemove = formData.roles[index];
    
    // 해당 직급을 가진 멤버들의 직급을 기본값으로 변경
    const updatedMemberRoles = { ...formData.memberRoles };
    Object.keys(updatedMemberRoles).forEach(address => {
      if (updatedMemberRoles[address] === roleToRemove.id) {
        updatedMemberRoles[address] = 'member';
      }
    });

    setFormData(prev => ({
      ...prev,
      roles: prev.roles.filter((_, i) => i !== index),
      memberRoles: updatedMemberRoles
    }));
  };

  /**
   * 권한 토글
   */
  const togglePermission = (roleIndex, permissionId) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.map((role, index) => 
        index === roleIndex 
          ? {
              ...role,
              permissions: role.permissions.includes(permissionId)
                ? role.permissions.filter(p => p !== permissionId)
                : [...role.permissions, permissionId]
            }
          : role
      )
    }));
  };

  /**
   * 멤버 주소 추가
   */
  const addMember = () => {
    const address = prompt('멤버의 지갑 주소를 입력하세요:');
    if (address && address.startsWith('0x') && address.length === 42) {
      setFormData(prev => ({
        ...prev,
        memberRoles: {
          ...prev.memberRoles,
          [address]: 'member'
        }
      }));
    } else {
      alert('유효한 지갑 주소를 입력해주세요.');
    }
  };

  /**
   * 멤버 직급 변경
   */
  const updateMemberRole = (address, roleId) => {
    setFormData(prev => ({
      ...prev,
      memberRoles: {
        ...prev.memberRoles,
        [address]: roleId
      }
    }));
  };

  /**
   * 멤버 제거
   */
  const removeMember = (address) => {
    setFormData(prev => {
      const { [address]: removed, ...rest } = prev.memberRoles;
      return {
        ...prev,
        memberRoles: rest
      };
    });
  };

  /**
   * Solidity 코드 생성
   */
  const generateCode = () => {
    try {
      const code = generateRolesContract(formData);
      setGeneratedCode(code);
      setShowCodePreview(true);
    } catch (error) {
      console.error('코드 생성 실패:', error);
      alert('코드 생성에 실패했습니다: ' + error.message);
    }
  };

  /**
   * 컨트랙트 배포
   */
  const deployContract = async () => {
    if (!provider || !currentWallet) {
      alert('지갑이 연결되지 않았습니다.');
      return;
    }

    if (!policyManagerAddress) {
      alert('PolicyManager 주소를 찾을 수 없습니다.');
      return;
    }

    try {
      setIsDeploying(true);
      
      // 직급 데이터 준비
      const rolesData = {
        rolesName: 'Custom Roles System',
        description: 'User-defined role management system'
      };

      // 정책 데이터 준비 (기본값)
      const policyData = {
        policyName: 'Default Policy',
        description: 'Default policy for role management',
        maxAmount: 10,
        dailyLimit: 50,
        requireApproval: true,
        approvalThreshold: 2,
        timeLock: 0
      };

      console.log('직급 시스템 배포 시작...', { rolesData, policyData, policyManagerAddress });

      // 실제 배포 실행
      const result = await deployNewPolicyAndRoles(
        provider,
        currentWallet.privateKey,
        policyManagerAddress,
        policyData,
        rolesData
      );

      console.log('배포 결과:', result);

      setDeployedContracts({
        policyAddress: result.policyAddress,
        rolesAddress: result.rolesAddress,
        policyTxHash: result.policyTransactionHash,
        rolesTxHash: result.rolesTransactionHash
      });

      setDeploymentTx({
        hash: result.rolesTxHash,
        address: result.rolesAddress
      });

      alert(`직급 시스템이 성공적으로 배포되었습니다! (시뮬레이션 모드)\n\n정책 컨트랙트: ${result.policyAddress}\n직급 컨트랙트: ${result.rolesAddress}\n\n※ 실제 블록체인 배포를 위해서는 Solidity 컴파일러가 필요합니다.`);
      
    } catch (error) {
      console.error('배포 실패:', error);
      alert('배포에 실패했습니다: ' + error.message);
    } finally {
      setIsDeploying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">직급 관리</h1>
              <p className="mt-2 text-gray-600">
                다중 서명 지갑에서 직급을 생성하고 멤버에게 할당합니다.
              </p>
            </div>
            <button
              onClick={() => navigate(`/multisig/${address}`)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← 뒤로 가기
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'roles', name: '직급 관리' },
              { id: 'assignments', name: '직급 할당' },
              { id: 'permissions', name: '권한 설정' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 직급 관리 탭 */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">직급 목록</h2>
                <button
                  onClick={addRole}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + 새 직급 추가
                </button>
              </div>
              
              <div className="space-y-4">
                {formData.roles.map((role, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full bg-${role.color}-500`}></div>
                        <input
                          type="text"
                          value={role.name}
                          onChange={(e) => updateRole(index, 'name', e.target.value)}
                          className="text-lg font-medium border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                          placeholder="직급 이름"
                        />
                      </div>
                      <button
                        onClick={() => removeRole(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          직급 ID
                        </label>
                        <input
                          type="text"
                          value={role.id}
                          onChange={(e) => updateRole(index, 'id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="admin, manager, etc."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          레벨 (숫자가 높을수록 상위 직급)
                        </label>
                        <input
                          type="number"
                          value={role.level}
                          onChange={(e) => updateRole(index, 'level', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        설명
                      </label>
                      <textarea
                        value={role.description}
                        onChange={(e) => updateRole(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="직급에 대한 설명을 입력하세요..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 직급 할당 탭 */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">멤버 직급 할당</h2>
                <button
                  onClick={addMember}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + 멤버 추가
                </button>
              </div>
              
              <div className="space-y-4">
                {Object.entries(formData.memberRoles).map(([address, roleId]) => (
                  <div key={address} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {address.slice(0, 6)}...{address.slice(-4)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{address}</p>
                        <p className="text-sm text-gray-500">지갑 주소</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <select
                        value={roleId}
                        onChange={(e) => updateMemberRole(address, e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {formData.roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeMember(address)}
                        className="text-red-600 hover:text-red-800"
                      >
                        제거
                      </button>
                    </div>
                  </div>
                ))}
                
                {Object.keys(formData.memberRoles).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>아직 추가된 멤버가 없습니다.</p>
                    <p className="text-sm">+ 멤버 추가 버튼을 클릭하여 멤버를 추가하세요.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 권한 설정 탭 */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">직급별 권한 설정</h2>
              
              <div className="space-y-6">
                {formData.roles.map((role, roleIndex) => (
                  <div key={roleIndex} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-4 h-4 rounded-full bg-${role.color}-500`}></div>
                      <h3 className="text-lg font-medium text-gray-900">{role.name}</h3>
                      <span className="text-sm text-gray-500">(레벨: {role.level})</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availablePermissions.map((permission) => (
                        <label key={permission.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={role.permissions.includes(permission.id)}
                            onChange={() => togglePermission(roleIndex, permission.id)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{permission.name}</p>
                            <p className="text-sm text-gray-500">{permission.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 액션 버튼들 */}
        <div className="flex justify-between mt-8">
          <button
            onClick={generateCode}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            코드 미리보기
          </button>
          <div className="space-x-3">
            <button
              onClick={() => navigate(`/multisig/${address}`)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={deployContract}
              disabled={isDeploying}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isDeploying ? '배포 중...' : '직급 시스템 배포'}
            </button>
          </div>
        </div>

        {/* 코드 미리보기 모달 */}
        {showCodePreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">생성된 Solidity 코드</h3>
                <button
                  onClick={() => setShowCodePreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-[60vh]">
                <pre className="text-sm bg-gray-100 p-4 rounded overflow-x-auto">
                  <code>{generatedCode}</code>
                </pre>
              </div>
              <div className="flex justify-end space-x-3 p-4 border-t">
                <button
                  onClick={() => setShowCodePreview(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  닫기
                </button>
                <button
                  onClick={deployContract}
                  disabled={isDeploying}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isDeploying ? '배포 중...' : '배포하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 배포 결과 */}
        {deployedContracts && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">배포 완료! (시뮬레이션 모드)</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-800 mb-2">직급 컨트랙트</h4>
                <p className="text-green-700 text-sm">
                  주소: <code className="bg-green-100 px-2 py-1 rounded break-all">{deployedContracts.rolesAddress}</code>
                </p>
                <p className="text-green-700 text-sm">
                  트랜잭션: <code className="bg-green-100 px-2 py-1 rounded break-all">{deployedContracts.rolesTxHash}</code>
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-800 mb-2">정책 컨트랙트</h4>
                <p className="text-green-700 text-sm">
                  주소: <code className="bg-green-100 px-2 py-1 rounded break-all">{deployedContracts.policyAddress}</code>
                </p>
                <p className="text-green-700 text-sm">
                  트랜잭션: <code className="bg-green-100 px-2 py-1 rounded break-all">{deployedContracts.policyTxHash}</code>
                </p>
              </div>
              
              <div className="pt-4 border-t border-green-200">
                <p className="text-green-700 text-sm">
                  <strong>PolicyManager</strong>에서 새로운 컨트랙트 주소가 자동으로 업데이트되었습니다.
                </p>
                <p className="text-green-700 text-sm mt-2">
                  이제 정의한 직급과 권한을 사용할 수 있습니다.
                </p>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 text-sm font-medium">시뮬레이션 모드 안내</p>
                  <p className="text-blue-700 text-xs mt-1">
                    현재는 시뮬레이션 모드로 작동합니다. 실제 블록체인 배포를 위해서는 Solidity 컴파일러(solc-js)를 통한 바이트코드 생성이 필요합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleManagementPage;
