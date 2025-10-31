import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { generatePolicyContract } from '../utils/contractGenerator';
import { deployNewPolicyAndRoles } from '../utils/contractDeployer';

/**
 * 룰 정의 페이지 컴포넌트
 * 다중 서명 지갑에서 사용할 정책과 룰을 정의할 수 있는 페이지
 */
const RuleDefinitionPage = () => {
  const { address } = useParams();
  const navigate = useNavigate();
  const { currentWallet, provider, isLoading, error } = useWallet();
  
  // 폼 상태
  const [formData, setFormData] = useState({
    policyName: '',
    description: '',
    rules: [],
    maxAmount: '',
    dailyLimit: '',
    requireApproval: true,
    approvalThreshold: 2,
    timeLock: 0,
    allowedTokens: [],
    blacklistedAddresses: []
  });

  // UI 상태
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentTx, setDeploymentTx] = useState(null);
  const [generatedCode, setGeneratedCode] = useState('');
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [policyManagerAddress, setPolicyManagerAddress] = useState(null);
  const [deployedContracts, setDeployedContracts] = useState(null);

  // 룰 템플릿
  const ruleTemplates = [
    {
      id: 'amount_limit',
      name: '금액 제한',
      description: '트랜잭션 금액에 대한 제한을 설정합니다.',
      fields: [
        { name: 'maxAmount', label: '최대 금액 (ETH)', type: 'number', placeholder: '10' },
        { name: 'dailyLimit', label: '일일 한도 (ETH)', type: 'number', placeholder: '50' }
      ]
    },
    {
      id: 'approval_required',
      name: '승인 필요',
      description: '특정 금액 이상의 트랜잭션에 승인이 필요합니다.',
      fields: [
        { name: 'threshold', label: '승인 임계값', type: 'number', placeholder: '2' },
        { name: 'minAmount', label: '최소 금액 (ETH)', type: 'number', placeholder: '1' }
      ]
    },
    {
      id: 'time_lock',
      name: '시간 잠금',
      description: '트랜잭션 실행 전 대기 시간을 설정합니다.',
      fields: [
        { name: 'delay', label: '지연 시간 (초)', type: 'number', placeholder: '3600' }
      ]
    },
    {
      id: 'token_restriction',
      name: '토큰 제한',
      description: '허용된 토큰만 거래할 수 있습니다.',
      fields: [
        { name: 'allowedTokens', label: '허용 토큰 주소 (쉼표로 구분)', type: 'text', placeholder: '0x...' }
      ]
    },
    {
      id: 'address_blacklist',
      name: '주소 블랙리스트',
      description: '특정 주소와의 거래를 금지합니다.',
      fields: [
        { name: 'blacklistedAddresses', label: '차단 주소 (쉼표로 구분)', type: 'text', placeholder: '0x...' }
      ]
    }
  ];

  useEffect(() => {
    if (!currentWallet) {
      navigate('/');
    }
    
    // PolicyManager 주소 로드 (실제로는 다중 서명 지갑에서 가져와야 함)
    // 현재는 Mock 주소 사용
    setPolicyManagerAddress('0x' + Math.random().toString(16).substr(2, 40));
  }, [currentWallet, navigate]);

  /**
   * 폼 데이터 업데이트
   */
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * 룰 추가
   */
  const addRule = (template) => {
    const newRule = {
      id: template.id,
      name: template.name,
      description: template.description,
      enabled: true,
      config: {}
    };

    setFormData(prev => ({
      ...prev,
      rules: [...prev.rules, newRule]
    }));
  };

  /**
   * 룰 제거
   */
  const removeRule = (index) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  /**
   * 룰 설정 업데이트
   */
  const updateRuleConfig = (ruleIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.map((rule, index) => 
        index === ruleIndex 
          ? { ...rule, config: { ...rule.config, [field]: value } }
          : rule
      )
    }));
  };

  /**
   * 룰 활성화/비활성화
   */
  const toggleRule = (index) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.map((rule, i) => 
        i === index ? { ...rule, enabled: !rule.enabled } : rule
      )
    }));
  };

  /**
   * Solidity 코드 생성
   */
  const generateCode = () => {
    try {
      console.log('코드 생성 시작, 폼 데이터:', formData);
      
      // 폼 데이터 유효성 검사
      if (!formData.policyName || formData.policyName.trim() === '') {
        alert('정책 이름을 입력해주세요.');
        return;
      }
      
      const code = generatePolicyContract(formData);
      console.log('생성된 코드 길이:', code.length);
      
      setGeneratedCode(code);
      setShowCodePreview(true);
    } catch (error) {
      console.error('코드 생성 실패:', error);
      console.error('에러 스택:', error.stack);
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
      
      // 정책 데이터 준비
      const policyData = {
        policyName: formData.policyName,
        description: formData.description,
        maxAmount: formData.maxAmount,
        dailyLimit: formData.dailyLimit,
        requireApproval: formData.requireApproval,
        approvalThreshold: formData.approvalThreshold,
        timeLock: formData.timeLock
      };

      // 직급 데이터 준비 (기본값)
      const rolesData = {
        rolesName: `${formData.policyName} - Roles`,
        description: `${formData.description} - Role management system`
      };

      console.log('컨트랙트 배포 시작...', { policyData, rolesData, policyManagerAddress });

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
        hash: result.policyTxHash,
        address: result.policyAddress
      });

      alert(`컨트랙트가 성공적으로 배포되었습니다! (시뮬레이션 모드)\n\n정책 컨트랙트: ${result.policyAddress}\n직급 컨트랙트: ${result.rolesAddress}\n\n※ 실제 블록체인 배포를 위해서는 Solidity 컴파일러가 필요합니다.`);
      
    } catch (error) {
      console.error('배포 실패:', error);
      alert('배포에 실패했습니다: ' + error.message);
    } finally {
      setIsDeploying(false);
    }
  };

  /**
   * 폼 제출
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    generateCode();
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">정책 및 룰 정의</h1>
              <p className="mt-2 text-gray-600">
                다중 서명 지갑에서 사용할 정책과 룰을 정의합니다.
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기본 정보 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">기본 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  정책 이름
                </label>
                <input
                  type="text"
                  value={formData.policyName}
                  onChange={(e) => handleInputChange('policyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 회사 정책"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  최대 금액 (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.maxAmount}
                  onChange={(e) => handleInputChange('maxAmount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="정책에 대한 설명을 입력하세요..."
              />
            </div>
          </div>

          {/* 룰 템플릿 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">룰 템플릿</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ruleTemplates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <button
                    type="button"
                    onClick={() => addRule(template)}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    추가
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 추가된 룰들 */}
          {formData.rules.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">추가된 룰</h2>
              <div className="space-y-4">
                {formData.rules.map((rule, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => toggleRule(index)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <h3 className="font-medium text-gray-900">{rule.name}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                    
                    {/* 룰별 설정 필드 */}
                    {ruleTemplates.find(t => t.id === rule.id)?.fields.map((field) => (
                      <div key={field.name} className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          value={rule.config[field.name] || ''}
                          onChange={(e) => updateRuleConfig(index, field.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={generateCode}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              코드 미리보기
            </button>
            <div className="space-x-3">
              <button
                type="button"
                onClick={() => navigate(`/multisig/${address}`)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                정책 생성
              </button>
            </div>
          </div>
        </form>

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
                <h4 className="font-medium text-green-800 mb-2">정책 컨트랙트</h4>
                <p className="text-green-700 text-sm">
                  주소: <code className="bg-green-100 px-2 py-1 rounded break-all">{deployedContracts.policyAddress}</code>
                </p>
                <p className="text-green-700 text-sm">
                  트랜잭션: <code className="bg-green-100 px-2 py-1 rounded break-all">{deployedContracts.policyTxHash}</code>
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-800 mb-2">직급 컨트랙트</h4>
                <p className="text-green-700 text-sm">
                  주소: <code className="bg-green-100 px-2 py-1 rounded break-all">{deployedContracts.rolesAddress}</code>
                </p>
                <p className="text-green-700 text-sm">
                  트랜잭션: <code className="bg-green-100 px-2 py-1 rounded break-all">{deployedContracts.rolesTxHash}</code>
                </p>
              </div>
              
              <div className="pt-4 border-t border-green-200">
                <p className="text-green-700 text-sm">
                  <strong>PolicyManager</strong>에서 새로운 컨트랙트 주소가 자동으로 업데이트되었습니다.
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

export default RuleDefinitionPage;
