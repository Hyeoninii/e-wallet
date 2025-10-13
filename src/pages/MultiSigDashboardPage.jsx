import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { ethers } from 'ethers';

/**
 * 다중 서명 지갑 대시보드 페이지
 */
const MultiSigDashboardPage = () => {
  const navigate = useNavigate();
  const { address } = useParams();
  const { provider, getMultiSigWalletData, savedMultiSigWallets, currentWallet, getMultiSigWalletTransactions } = useWallet();

  const [multisigWallet, setMultisigWallet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        console.log('다중서명 대시보드 - 현재 지갑 상태:', {
          currentWallet: currentWallet,
          provider: provider,
          address: address
        });

        if (!address) {
          throw new Error('주소가 제공되지 않았습니다.');
        }
        if (!provider) {
          throw new Error('네트워크에 연결되지 않았습니다. 잠시 후 다시 시도하세요.');
        }

        // 트랜잭션 해시인지 확인 (0x로 시작하고 66자리)
        const isTransactionHash = address.startsWith('0x') && address.length === 66;
        
        if (isTransactionHash) {
          // 트랜잭션 해시인 경우 - 배포 대기 중 상태로 표시
          setMultisigWallet({
            name: '배포 대기 중',
            address: address,
            owners: [],
            threshold: 0,
            balance: '0',
            pendingTransactions: 0,
            deploymentTx: address,
            createdAt: new Date().toISOString(),
            pending: true
          });
          return;
        }

        // 실제 주소인 경우
        if (!ethers.isAddress(address)) {
          throw new Error('유효한 다중 서명 지갑 주소가 아닙니다.');
        }

        // 로컬 스토리지에서 다중 서명 지갑 정보 찾기
        console.log('다중서명 지갑 찾기 시작:', address);
        console.log('저장된 다중서명 지갑 목록:', savedMultiSigWallets);
        
        const savedWallet = savedMultiSigWallets.find(wallet => 
          wallet.address?.toLowerCase() === address.toLowerCase() || 
          wallet.deploymentTx?.toLowerCase() === address.toLowerCase()
        );

        console.log('찾은 지갑 정보:', savedWallet);

        if (!savedWallet) {
          console.error('저장된 다중 서명 지갑을 찾을 수 없습니다.');
          console.error('검색한 주소:', address);
          console.error('저장된 지갑 주소들:', savedMultiSigWallets.map(w => w.address));
          
          // 저장된 지갑이 없어도 컨트랙트에서 직접 정보를 조회해보기
          console.log('저장된 지갑이 없으므로 컨트랙트에서 직접 조회 시도...');
          try {
            const contractInfo = await getMultiSigWalletData(address);
            console.log('컨트랙트에서 직접 조회 성공:', contractInfo);
            
            // 임시 지갑 정보 생성
            const tempWallet = {
              name: '임시 지갑',
              address: contractInfo.address,
              owners: contractInfo.owners,
              threshold: Number(contractInfo.threshold),
              balance: contractInfo.balance,
              pendingTransactions: 0,
              deploymentTx: '',
              createdAt: new Date().toISOString(),
              pending: false
            };
            
            setMultisigWallet(tempWallet);
            return;
          } catch (contractError) {
            console.error('컨트랙트에서도 조회 실패:', contractError);
            throw new Error('저장된 다중 서명 지갑을 찾을 수 없습니다.');
          }
        }

        // pending 상태가 아닌 경우에만 실제 컨트랙트에서 정보 조회
        if (!savedWallet.pending) {
          const contractInfo = await getMultiSigWalletData(address);
          
          setMultisigWallet({
            name: savedWallet.name,
            address: contractInfo.address,
            owners: contractInfo.owners,
            threshold: Number(contractInfo.threshold),
            balance: contractInfo.balance,
            pendingTransactions: 0, // TODO: 실제 트랜잭션 수 조회
            deploymentTx: savedWallet.deploymentTx,
            createdAt: savedWallet.createdAt
          });

          // 현재 사용자 설정 (현재 지갑이 소유자 중 하나인지 확인)
          if (currentWallet && contractInfo.owners.includes(currentWallet.address)) {
            setCurrentUser(currentWallet.address);
          }

          // 트랜잭션 목록 로드
          try {
            console.log('다중서명 트랜잭션 로드 시작:', address);
            const transactions = await getMultiSigWalletTransactions(address);
            console.log('로드된 트랜잭션 수:', transactions.length);
            
            // 최근 5개 트랜잭션만 표시
            const recentTxs = transactions.slice(-5).reverse();
            setRecentTransactions(recentTxs);
          } catch (txError) {
            console.warn('트랜잭션 로드 실패:', txError);
            setRecentTransactions([]);
          }
        } else {
          // pending 상태인 경우 저장된 정보로 표시
          setMultisigWallet({
            name: savedWallet.name,
            address: savedWallet.address || address,
            owners: savedWallet.owners,
            threshold: savedWallet.threshold,
            balance: '0',
            pendingTransactions: 0,
            deploymentTx: savedWallet.deploymentTx,
            createdAt: savedWallet.createdAt,
            pending: true
          });
        }

      } catch (e) {
        console.error('멀티시그 로드 실패:', e);
        setLoadError(e.message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [address, provider, getMultiSigWalletData, savedMultiSigWallets, currentWallet]);

  /**
   * 주소 복사
   */
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(multisigWallet.address);
      alert('주소가 복사되었습니다!');
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  /**
   * 공유 링크 생성
   */
  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/multisig/${multisigWallet.address}/join`;
    return shareUrl;
  };

  /**
   * 공유 링크 복사
   */
  const handleCopyShareLink = async () => {
    try {
      const shareLink = generateShareLink();
      await navigator.clipboard.writeText(shareLink);
      alert('공유 링크가 복사되었습니다!\n\n다른 서명자들에게 이 링크를 공유하세요.');
    } catch (error) {
      console.error('공유 링크 복사 실패:', error);
    }
  };


  /**
   * 잔액만 새로고침
   */
  const handleRefreshBalance = async () => {
    try {
      setIsLoadingBalance(true);

      if (!address || !provider) {
        return;
      }

      // 잔액만 조회
      const balance = await provider.getBalance(address);
      const balanceInEth = ethers.formatEther(balance);
      
      setMultisigWallet(prev => ({
        ...prev,
        balance: balanceInEth
      }));

      console.log('잔액 새로고침 완료:', balanceInEth);
    } catch (error) {
      console.error('잔액 새로고침 실패:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  /**
   * 지갑 정보 새로고침
   */
  const handleRefreshWallet = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      if (!address || !provider) {
        return;
      }

      // 현재 지갑 정보 다시 로드
      const contractInfo = await getMultiSigWalletData(address);
      
      setMultisigWallet(prev => ({
        ...prev,
        owners: contractInfo.owners,
        threshold: Number(contractInfo.threshold),
        balance: contractInfo.balance
      }));

      // 현재 사용자 재확인
      if (currentWallet && contractInfo.owners.includes(currentWallet.address)) {
        setCurrentUser(currentWallet.address);
      }

      console.log('지갑 정보 새로고침 완료');
    } catch (error) {
      console.error('지갑 정보 새로고침 실패:', error);
      setLoadError('지갑 정보 새로고침에 실패했습니다: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {isLoading && (
        <div className="text-center text-gray-500">지갑 정보를 불러오는 중...</div>
      )}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">{loadError}</div>
      )}
      {!isLoading && !loadError && multisigWallet && (
        <>
      {/* 환영 메시지 */}
      {multisigWallet.pending ? (
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">배포 대기 중</h1>
          <p className="text-yellow-100">
            다중 서명 지갑이 배포되고 있습니다. 트랜잭션이 확인되면 정상적으로 사용할 수 있습니다.
          </p>
          <div className="mt-4 p-3 bg-yellow-100 bg-opacity-20 rounded-lg">
            <p className="text-sm text-yellow-200">
              트랜잭션 해시: {multisigWallet.address}
            </p>
            <p className="text-xs text-yellow-300 mt-1">
              Etherscan에서 확인해보세요. 확인되면 페이지를 새로고침하세요.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">안녕하세요, {multisigWallet.name}!</h1>
          <p className="text-purple-100">
            다중 서명 지갑에 연결되었습니다. {multisigWallet.threshold}명의 승인이 필요한 트랜잭션을 관리할 수 있습니다.
          </p>
        </div>
      )}

      {/* 잔액 카드 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">잔액</h2>
          <button
            onClick={handleRefreshBalance}
            disabled={isLoadingBalance}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="잔액 새로고침"
          >
            <svg className={`w-5 h-5 ${isLoadingBalance ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-baseline space-x-2">
          <span className={`text-3xl font-bold transition-colors duration-200 ${
            isLoadingBalance ? 'text-gray-400' : 'text-gray-900'
          }`}>
            {isLoadingBalance ? (
              <span className="flex items-center">
                <svg className="animate-spin h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                새로고침 중...
              </span>
            ) : (
              parseFloat(multisigWallet.balance).toFixed(6)
            )}
          </span>
          <span className="text-lg text-gray-500">ETH</span>
        </div>
      </div>

      {/* 지갑 정보 카드 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">지갑 정보</h2>
        
        <div className="space-y-4">
          {/* 지갑 주소 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">지갑 주소</label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 p-3 bg-gray-50 rounded-lg text-sm font-mono border border-gray-200 break-all">
                {multisigWallet.address}
              </code>
              <button
                onClick={handleCopyAddress}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="주소 복사"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* 승인 임계값 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">승인 임계값</label>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                {multisigWallet.threshold} / {multisigWallet.owners.length}명
              </span>
              <span className="text-sm text-gray-500">
                트랜잭션 실행을 위해 {multisigWallet.threshold}명의 승인이 필요합니다
              </span>
            </div>
          </div>

          {/* 공유 링크 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">서명자 초대</label>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyShareLink}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span>공유 링크 복사</span>
              </button>
              <span className="text-sm text-gray-500">
                다른 서명자들을 초대하려면 이 링크를 공유하세요
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 소유자 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">소유자 목록</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(`/multisig/${address}/members`)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              관리
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {multisigWallet.owners.map((owner, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-semibold text-sm">
                    {index + 1}
                  </span>
                </div>
                <div>
                  <code className="text-sm font-mono text-gray-900">
                    {owner.slice(0, 6)}...{owner.slice(-4)}
                  </code>
                  {owner === currentUser && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      나
                    </span>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                소유자 #{index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* 빠른 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         <button
           onClick={() => {
             console.log('트랜잭션 제안 버튼 클릭 - 디버깅 정보:', {
               currentWallet: currentWallet,
               currentWalletAddress: currentWallet?.address,
               multisigWallet: multisigWallet,
               owners: multisigWallet?.owners,
               address: address
             });

             if (!currentWallet) {
               alert('트랜잭션을 제안하려면 먼저 지갑을 연결해주세요.');
               navigate('/');
               return;
             }

             if (!multisigWallet || !multisigWallet.owners) {
               alert('다중서명 지갑 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
               return;
             }

             // 주소 비교 (대소문자 구분 없이)
             const isOwner = multisigWallet.owners.some(owner => 
               owner.toLowerCase() === currentWallet.address.toLowerCase()
             );

             console.log('소유자 확인:', {
               currentWalletAddress: currentWallet.address,
               owners: multisigWallet.owners,
               isOwner: isOwner
             });

             if (!isOwner) {
               // 소유자 목록이 비어있는 경우 특별 처리
               if (multisigWallet.owners.length === 0) {
                 const confirmAdd = confirm(
                   '이 다중서명 지갑에 소유자가 등록되지 않았습니다.\n' +
                   '현재 지갑을 소유자로 추가하시겠습니까?'
                 );
                 
                 if (confirmAdd) {
                   // 임시로 소유자 추가 (실제로는 컨트랙트에서 해야 함)
                   const updatedMultisigWallet = {
                     ...multisigWallet,
                     owners: [currentWallet.address],
                     threshold: 1
                   };
                   setMultisigWallet(updatedMultisigWallet);
                   alert('소유자가 추가되었습니다. 이제 트랜잭션을 제안할 수 있습니다.');
                   navigate(`/multisig/${address}/send`);
                   return;
                 }
               }
               
               alert('이 다중서명 지갑의 소유자만 트랜잭션을 제안할 수 있습니다.');
               return;
             }
             navigate(`/multisig/${address}/send`);
           }}
           className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
         >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">트랜잭션 제안</h3>
          </div>
          <p className="text-sm text-gray-600">새로운 트랜잭션을 제안합니다</p>
        </button>

        <button
          onClick={() => navigate(`/multisig/${address}/transactions`)}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">트랜잭션 내역</h3>
          </div>
          <p className="text-sm text-gray-600">대기 중인 트랜잭션: {multisigWallet.pendingTransactions}개</p>
        </button>

        <button
          onClick={() => navigate(`/multisig/${address}/settings`)}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">설정</h3>
          </div>
          <p className="text-sm text-gray-600">지갑 설정 및 멤버 관리</p>
        </button>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 활동</h3>
        {recentTransactions.length > 0 ? (
          <div className="space-y-3">
            {recentTransactions.map((tx, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                tx.executed ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    tx.executed ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      트랜잭션 #{tx.id}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ethers.formatEther(tx.value)} ETH → {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                  <p className={`text-xs font-medium ${
                    tx.executed ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {tx.executed ? '완료' : `대기 중 (${tx.confirmations}/${tx.requiredConfirmations} 승인)`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">최근 활동이 없습니다.</p>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
};

export default MultiSigDashboardPage;
