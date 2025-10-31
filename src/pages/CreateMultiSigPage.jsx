import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

/**
 * 다중 서명 지갑 생성 페이지
 */
const CreateMultiSigPage = () => {
  const navigate = useNavigate();
  const { createMultiSigWallet, createIntegratedMultiSigSystem, currentWallet, savedWallets, selectWallet, error, clearError } = useWallet();
  
  // 폼 상태
  const [walletName, setWalletName] = useState('');
  const [owners, setOwners] = useState(['']);
  const [threshold, setThreshold] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState(null);
  const [showCompilationGuide, setShowCompilationGuide] = useState(false);
  const [deploymentMode, setDeploymentMode] = useState('integrated'); // 'basic' or 'integrated'

  // 현재 지갑이 없고 저장된 지갑이 있으면 자동으로 선택
  React.useEffect(() => {
    if (!currentWallet && savedWallets.length > 0) {
      selectWallet(savedWallets[0]);
    }
  }, [savedWallets, currentWallet, selectWallet]);

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

    // 입력된 소유자 주소 중에서 로컬 스토리지에 저장된 지갑 주소와 일치하는 것이 있는지 확인
    const savedWalletAddresses = savedWallets.map(wallet => wallet.address.toLowerCase());
    const validOwnersLower = validOwners.map(owner => owner.toLowerCase());
    
    // 중복 주소 검사
    const uniqueOwners = [...new Set(validOwnersLower)];
    if (uniqueOwners.length !== validOwnersLower.length) {
      alert('중복된 소유자 주소가 있습니다. 각 소유자는 고유한 주소여야 합니다.');
      return;
    }
    
    // 로컬 스토리지에 저장된 지갑 주소와 일치하는 소유자가 있는지 확인
    const hasValidOwner = validOwnersLower.some(owner => 
      savedWalletAddresses.includes(owner)
    );
    
    if (!hasValidOwner) {
      alert('소유자 목록에 로컬 스토리지에 저장된 지갑 주소가 최소 하나는 포함되어야 합니다.\n\n먼저 지갑을 생성하거나 복구한 후, 해당 지갑 주소를 소유자 목록에 추가해주세요.');
      return;
    }

    try {
      setIsLoading(true);
      setDeploymentResult(null);
      clearError();
      
      // 생성 시작
      
      // 배포 모드에 따라 다중 서명 지갑 생성
      let result;
      
      if (deploymentMode === 'integrated') {
        // 통합 시스템 배포 (PolicyManager, Policy, Roles 포함)
        console.log('통합 다중 서명 시스템 생성 중...');
        result = await createIntegratedMultiSigSystem(walletName, validOwners, threshold);
      } else {
        // 기본 다중 서명 지갑만 배포
        console.log('기본 다중 서명 지갑 생성 중...');
        result = await createMultiSigWallet(walletName, validOwners, threshold);
      }
      
      setDeploymentResult(result);
      // 생성 완료
      
      // 배포 완료 후 대시보드로 이동
      
      if (result.address && result.address.startsWith('0x') && !result.pending) {
        // 실제 컨트랙트 주소인 경우
        console.log('실제 주소로 대시보드 이동:', result.address);
        
        if (deploymentMode === 'integrated') {
          alert(`통합 다중 서명 시스템이 성공적으로 생성되었습니다!\n\n다중 서명 지갑: ${result.address}\n정책 관리자: ${result.integratedSystem.policyManager.address}\n정책 컨트랙트: ${result.integratedSystem.policy.address}\n직급 컨트랙트: ${result.integratedSystem.roles.address}`);
        } else {
          alert(`다중 서명 지갑이 성공적으로 생성되었습니다!\n주소: ${result.address}`);
        }
        
        navigate(`/multisig/${result.address}`);
      } else {
        // 배포가 아직 확인되지 않은 경우 - 대시보드로 이동
        alert(`다중 서명 지갑 배포 트랜잭션이 제출되었습니다!\n\n트랜잭션 해시: ${result.deploymentTx}\n\n대시보드에서 배포 상태를 확인할 수 있습니다.`);
        // 대시보드로 이동하여 사용자가 배포 상태를 확인할 수 있도록 함
        navigate('/');
      }
      
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
              {savedWallets.length > 0 ? (
                <p className="text-sm text-green-600 mt-2">
                  ✅ 저장된 지갑 {savedWallets.length}개 발견 - 소유자 목록에 추가 가능
                </p>
              ) : (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ 다중 서명 지갑을 생성하려면 먼저 지갑을 생성하거나 복구해주세요.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">오류 발생</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 배포 결과 */}
        {deploymentResult && (
          <div className={`mb-6 border rounded-lg p-4 ${
            deploymentResult.pending 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {deploymentResult.pending ? (
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${
                  deploymentResult.pending ? 'text-yellow-800' : 'text-green-800'
                }`}>
                  {deploymentResult.pending ? '배포 대기 중' : '배포 성공'}
                </h3>
                <div className={`mt-2 text-sm ${
                  deploymentResult.pending ? 'text-yellow-700' : 'text-green-700'
                }`}>
                  {deploymentResult.pending ? (
                    <>
                      <p>다중 서명 지갑 배포 트랜잭션이 제출되었습니다!</p>
                      <p className="mt-1">트랜잭션 해시: {deploymentResult.deploymentTx}</p>
                      <p className="mt-1">Etherscan에서 확인해보세요. 확인되면 다중 서명 대시보드에서 확인할 수 있습니다.</p>
                    </>
                  ) : (
                    <>
                      <p>다중 서명 지갑이 성공적으로 배포되었습니다!</p>
                      <p className="mt-1 font-mono">주소: {deploymentResult.address}</p>
                      <p className="mt-1">트랜잭션: {deploymentResult.deploymentTx}</p>
                      
                      {deploymentResult.integratedSystem && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-800 mb-2">통합 시스템 정보:</p>
                          <div className="text-xs text-blue-700 space-y-1">
                            <p>정책 관리자: {deploymentResult.integratedSystem.policyManager.address}</p>
                            <p>정책 컨트랙트: {deploymentResult.integratedSystem.policy.address}</p>
                            <p>직급 컨트랙트: {deploymentResult.integratedSystem.roles.address}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={(e) => { e.preventDefault(); handleCreateMultiSig(); }} className="space-y-6">
            {/* 배포 모드 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                배포 모드
              </label>
              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    type="radio"
                    name="deploymentMode"
                    value="integrated"
                    checked={deploymentMode === 'integrated'}
                    onChange={(e) => setDeploymentMode(e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">통합 시스템 (권장)</div>
                    <div className="text-sm text-gray-500">
                      다중 서명 지갑 + 정책 관리자 + 정책 컨트랙트 + 직급 컨트랙트를 모두 배포합니다.
                      정책과 직급 관리 기능을 사용할 수 있습니다.
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start">
                  <input
                    type="radio"
                    name="deploymentMode"
                    value="basic"
                    checked={deploymentMode === 'basic'}
                    onChange={(e) => setDeploymentMode(e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">기본 다중 서명 지갑</div>
                    <div className="text-sm text-gray-500">
                      다중 서명 지갑만 배포합니다. 나중에 정책과 직급 기능을 추가할 수 있습니다.
                    </div>
                  </div>
                </label>
              </div>
            </div>

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
                {owners.map((owner, index) => {
                  const isSavedWallet = savedWallets.some(wallet => 
                    wallet.address.toLowerCase() === owner.toLowerCase()
                  );
                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={owner}
                          onChange={(e) => updateOwner(index, e.target.value)}
                          placeholder="0x..."
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            isSavedWallet && owner.trim()
                              ? 'border-green-300 bg-green-50' 
                              : 'border-gray-300'
                          }`}
                        />
                        {isSavedWallet && owner.trim() && (
                          <p className="text-xs text-green-600 mt-1">저장된 지갑</p>
                        )}
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
                  );
                })}
              </div>
              
              <p className="text-sm text-gray-500 mt-2">
                최소 2명의 소유자가 필요합니다. 각 소유자는 이더리움 주소여야 하며, 
                <span className="text-green-600 font-medium"> 최소 하나의 소유자는 로컬 스토리지에 저장된 지갑 주소여야 합니다.</span>
              </p>
              
              {/* 저장된 지갑 목록 표시 */}
              {savedWallets.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">사용 가능한 지갑 주소:</p>
                  <div className="space-y-1">
                    {savedWallets.map((wallet, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-gray-600">{wallet.address}</span>
                        <span className="text-gray-500">({wallet.name})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                disabled={isLoading || savedWallets.length === 0 || !walletName.trim() || owners.filter(o => o.trim()).length < 2}
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
