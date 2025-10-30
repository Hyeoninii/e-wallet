import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

/**
 * 사이드바 네비게이션 컴포넌트
 */
const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentWallet, disconnectWallet, isReadOnly, isMultiSig } = useWallet();

  const menuItems = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      ),
      path: '/wallet',
      description: '지갑 정보 및 잔액 확인'
    },
    {
      id: 'send',
      label: '송금',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
      path: '/wallet/send',
      description: '암호화폐 전송',
      disabled: isReadOnly
    },
    {
      id: 'receive',
      label: '받기',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
        </svg>
      ),
      path: '/wallet/receive',
      description: '주소 공유 및 QR 코드'
    },
    {
      id: 'transactions',
      label: '거래 내역',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      path: '/wallet/transactions',
      description: '트랜잭션 히스토리'
    },
    {
      id: 'members',
      label: '멤버 관리',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      path: '/wallet/members',
      description: '멀티시그 멤버 관리',
      showOnly: 'multisig'
    },
    {
      id: 'settings',
      label: '설정',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      path: '/wallet/settings',
      description: '지갑 설정 및 관리'
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    onClose(); // 모바일에서 네비게이션 후 사이드바 닫기
  };

  const handleDisconnect = () => {
    disconnectWallet();
    navigate('/');
    onClose();
  };

  // 메뉴 필터링 (멀티시그 지갑일 때만 멤버 관리 메뉴 표시)
  const filteredMenuItems = menuItems.filter(item => {
    if (item.showOnly === 'multisig') {
      return isMultiSig;
    }
    return true;
  });

  return (
    <>
      {/* 데스크톱 사이드바 */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
          {/* 로고 */}
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-xl font-bold text-gray-900">E-Wallet</h1>
          </div>

          {/* 지갑 정보 */}
          {currentWallet && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {currentWallet.name?.charAt(0)?.toUpperCase() || 'W'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentWallet.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {currentWallet.address?.slice(0, 6)}...{currentWallet.address?.slice(-4)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isReadOnly ? '읽기 전용' : '개인 지갑'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 네비게이션 메뉴 */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {filteredMenuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const isDisabled = item.disabled;
                    
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => !isDisabled && handleNavigation(item.path)}
                          disabled={isDisabled}
                          className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full text-left transition-colors ${
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : isDisabled
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                          }`}
                          title={item.description}
                        >
                          <span className={`flex-shrink-0 ${
                            isActive ? 'text-blue-700' : isDisabled ? 'text-gray-400' : 'text-gray-400 group-hover:text-blue-700'
                          }`}>
                            {item.icon}
                          </span>
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>

          {/* 하단 액션 버튼들 */}
          <div className="mt-auto space-y-2">
            <button
              onClick={() => handleNavigation('/wallet')}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              새로고침
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              연결 해제
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 사이드바 */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col bg-white border-r border-gray-200">
          {/* 모바일 헤더 */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">E-Wallet</h1>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 모바일 컨텐츠 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* 지갑 정보 */}
            {currentWallet && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {currentWallet.name?.charAt(0)?.toUpperCase() || 'W'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {currentWallet.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {currentWallet.address?.slice(0, 6)}...{currentWallet.address?.slice(-4)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {isReadOnly ? '읽기 전용' : '개인 지갑'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 네비게이션 메뉴 */}
            <nav className="space-y-2">
              {filteredMenuItems.map((item) => {
                const isActive = location.pathname === item.path;
                const isDisabled = item.disabled;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => !isDisabled && handleNavigation(item.path)}
                    disabled={isDisabled}
                    className={`group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold w-full text-left transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : isDisabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                    }`}
                    title={item.description}
                  >
                    <span className={`flex-shrink-0 ${
                      isActive ? 'text-blue-700' : isDisabled ? 'text-gray-400' : 'text-gray-400 group-hover:text-blue-700'
                    }`}>
                      {item.icon}
                    </span>
                    <div className="flex-1">
                      <div>{item.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 모바일 하단 버튼들 */}
          <div className="p-6 border-t border-gray-200 space-y-2">
            <button
              onClick={() => handleNavigation('/wallet')}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              새로고침
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              연결 해제
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
