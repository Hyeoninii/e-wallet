import React, { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import Layout from '../components/Layout';

/**
 * 동적 다중서명 지갑 생성 페이지
 * 사용자가 권한과 정책을 정의하여 동적으로 컨트랙트를 생성할 수 있습니다.
 */
const DynamicMultiSigCreatePage = () => {
  const { createDynamicMultiSigSystem, isLoading, error } = useWallet();
  
  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    owners: [''],
    threshold: 2,
    roles: {
      roles: [
        { id: 'manager', name: 'Manager', level: 80, enabled: true, permissions: ['EXECUTE_TRANSACTION', 'APPROVE_TRANSACTION', 'MANAGE_POLICIES'] },
        { id: 'member', name: 'Member', level: 50, enabled: true, permissions: ['EXECUTE_TRANSACTION', 'VIEW_TRANSACTIONS'] }
      ]
    },
    policy: {
      policyName: 'Custom Policy',
      description: '사용자 정의 정책',
      maxAmount: 10,
      dailyLimit: 50,
      requireApproval: true,
      approvalThreshold: 2,
      timeLock: 0,
      amountRules: [
        { amount: 0.1, requiredRole: 'manager', enabled: true },
        { amount: 1, requiredRole: 'manager', enabled: true },
        { amount: 10, requiredRole: 'manager', enabled: true }
      ]
    }
  });

  // 소유자 추가
  const addOwner = () => {
    setFormData(prev => ({
      ...prev,
      owners: [...prev.owners, '']
    }));
  };

  // 소유자 제거
  const removeOwner = (index) => {
    setFormData(prev => ({
      ...prev,
      owners: prev.owners.filter((_, i) => i !== index)
    }));
  };

  // 소유자 주소 변경
  const updateOwner = (index, value) => {
    setFormData(prev => ({
      ...prev,
      owners: prev.owners.map((owner, i) => i === index ? value : owner)
    }));
  };

  // 권한 추가
  const addRole = () => {
    setFormData(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        roles: [...prev.roles.roles, {
          id: `role_${Date.now()}`,
          name: '',
          level: 50,
          enabled: true,
          permissions: []
        }]
      }
    }));
  };

  // 권한 제거
  const removeRole = (index) => {
    setFormData(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        roles: prev.roles.roles.filter((_, i) => i !== index)
      }
    }));
  };

  // 권한 업데이트
  const updateRole = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      roles: {
        ...prev.roles,
        roles: prev.roles.roles.map((role, i) => 
          i === index ? { ...role, [field]: value } : role
        )
      }
    }));
  };

  // 금액 규칙 추가
  const addAmountRule = () => {
    setFormData(prev => ({
      ...prev,
      policy: {
        ...prev.policy,
        amountRules: [...prev.policy.amountRules, {
          amount: 0,
          requiredRole: 'manager',
          enabled: true
        }]
      }
    }));
  };

  // 금액 규칙 제거
  const removeAmountRule = (index) => {
    setFormData(prev => ({
      ...prev,
      policy: {
        ...prev.policy,
        amountRules: prev.policy.amountRules.filter((_, i) => i !== index)
      }
    }));
  };

  // 금액 규칙 업데이트
  const updateAmountRule = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      policy: {
        ...prev.policy,
        amountRules: prev.policy.amountRules.map((rule, i) => 
          i === index ? { ...rule, [field]: value } : rule
        )
      }
    }));
  };

  // 폼 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // 유효성 검사
      const validOwners = formData.owners.filter(owner => owner.trim() !== '');
      if (validOwners.length < 2) {
        alert('최소 2명의 소유자가 필요합니다.');
        return;
      }

      if (formData.threshold > validOwners.length) {
        alert('임계값은 소유자 수보다 작거나 같아야 합니다.');
        return;
      }

      // 동적 다중서명 시스템 생성
      const result = await createDynamicMultiSigSystem(
        formData.name,
        validOwners,
        formData.threshold,
        {
          roles: formData.roles,
          policy: formData.policy
        }
      );

      console.log('동적 다중서명 시스템 생성 완료:', result);
      alert('동적 다중서명 지갑이 성공적으로 생성되었습니다!');
      
      // 폼 초기화
      setFormData({
        name: '',
        owners: [''],
        threshold: 2,
        roles: {
          roles: [
            { id: 'manager', name: 'Manager', level: 80, enabled: true, permissions: ['EXECUTE_TRANSACTION', 'APPROVE_TRANSACTION', 'MANAGE_POLICIES'] },
            { id: 'member', name: 'Member', level: 50, enabled: true, permissions: ['EXECUTE_TRANSACTION', 'VIEW_TRANSACTIONS'] }
          ]
        },
        policy: {
          policyName: 'Custom Policy',
          description: '사용자 정의 정책',
          maxAmount: 10,
          dailyLimit: 50,
          requireApproval: true,
          approvalThreshold: 2,
          timeLock: 0,
          amountRules: [
            { amount: 0.1, requiredRole: 'manager', enabled: true },
            { amount: 1, requiredRole: 'manager', enabled: true },
            { amount: 10, requiredRole: 'manager', enabled: true }
          ]
        }
      });
      
    } catch (error) {
      console.error('동적 다중서명 시스템 생성 실패:', error);
      alert('동적 다중서명 시스템 생성에 실패했습니다: ' + error.message);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">동적 다중서명 지갑 생성</h1>
              <p className="mt-2 text-sm text-gray-600">
                사용자 정의 권한과 정책에 따라 동적으로 컨트랙트를 생성합니다.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* 기본 정보 */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">기본 정보</h2>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">지갑 이름</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 소유자 설정 */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">소유자 설정</h2>
                <div className="space-y-4">
                  {formData.owners.map((owner, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={owner}
                        onChange={(e) => updateOwner(index, e.target.value)}
                        placeholder="0x..."
                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      {formData.owners.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOwner(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-800"
                        >
                          제거
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOwner}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    소유자 추가
                  </button>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">임계값</label>
                  <input
                    type="number"
                    min="1"
                    max={formData.owners.length}
                    value={formData.threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
                    className="mt-1 block w-32 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* 권한 설정 */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">권한 설정</h2>
                <div className="space-y-4">
                  {formData.roles.roles.map((role, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">권한 이름</label>
                          <input
                            type="text"
                            value={role.name}
                            onChange={(e) => updateRole(index, 'name', e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">레벨 (1-100)</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={role.level}
                            onChange={(e) => updateRole(index, 'level', parseInt(e.target.value))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={role.enabled}
                              onChange={(e) => updateRole(index, 'enabled', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">활성화</span>
                          </label>
                        </div>
                      </div>
                      {index > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRole(index)}
                          className="mt-2 px-3 py-1 text-red-600 hover:text-red-800 text-sm"
                        >
                          권한 제거
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addRole}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    권한 추가
                  </button>
                </div>
              </div>

              {/* 정책 설정 */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">정책 설정</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">정책 이름</label>
                    <input
                      type="text"
                      value={formData.policy.policyName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        policy: { ...prev.policy, policyName: e.target.value }
                      }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">최대 트랜잭션 금액 (ETH)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.policy.maxAmount}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        policy: { ...prev.policy, maxAmount: parseFloat(e.target.value) }
                      }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">일일 한도 (ETH)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.policy.dailyLimit}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        policy: { ...prev.policy, dailyLimit: parseFloat(e.target.value) }
                      }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">승인 임계값</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.policy.approvalThreshold}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        policy: { ...prev.policy, approvalThreshold: parseInt(e.target.value) }
                      }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* 금액별 승인 규칙 */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">금액별 승인 규칙</h3>
                  <div className="space-y-3">
                    {formData.policy.amountRules.map((rule, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700">금액 (ETH)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={rule.amount}
                            onChange={(e) => updateAmountRule(index, 'amount', parseFloat(e.target.value))}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700">필요한 권한</label>
                          <select
                            value={rule.requiredRole}
                            onChange={(e) => updateAmountRule(index, 'requiredRole', e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            {formData.roles.roles.filter(r => r.enabled).map(role => (
                              <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={(e) => updateAmountRule(index, 'enabled', e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">활성화</span>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAmountRule(index)}
                          className="px-3 py-1 text-red-600 hover:text-red-800"
                        >
                          제거
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addAmountRule}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      규칙 추가
                    </button>
                  </div>
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? '생성 중...' : '동적 다중서명 지갑 생성'}
                </button>
              </div>
            </form>

            {error && (
              <div className="px-6 py-4 bg-red-50 border-t border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DynamicMultiSigCreatePage;



