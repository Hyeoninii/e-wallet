import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import Sidebar from './Sidebar';

/**
 * 메인 레이아웃 컴포넌트
 * 사이드바와 메인 컨텐츠 영역을 관리
 */
const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentWallet } = useWallet();
  const location = useLocation();

  // 지갑이 연결되지 않은 경우 사이드바 숨김
  const shouldShowSidebar = currentWallet && location.pathname !== '/';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 사이드바 */}
      {shouldShowSidebar && (
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
      )}

      {/* 메인 컨텐츠 영역 */}
      <div className={`transition-all duration-300 ${shouldShowSidebar ? 'lg:ml-64' : ''}`}>
        {/* 모바일 헤더 */}
        {shouldShowSidebar && (
          <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-gray-900">
                {currentWallet?.name || 'E-Wallet'}
              </h1>
              <div className="w-8"></div> {/* 공간 확보 */}
            </div>
          </div>
        )}

        {/* 데스크톱 헤더 */}
        {shouldShowSidebar && (
          <div className="hidden lg:block bg-white shadow-sm border-b border-gray-200">
            <div className="px-6 py-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {currentWallet?.name || 'E-Wallet'}
              </h1>
            </div>
          </div>
        )}

        {/* 페이지 컨텐츠 */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* 모바일 사이드바 오버레이 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}
    </div>
  );
};

export default Layout;
