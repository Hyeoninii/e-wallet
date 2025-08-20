import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';

// 페이지 컴포넌트들
import HomePage from './pages/HomePage';
import WalletDashboard from './pages/WalletDashboard';
import CreateWalletPage from './pages/CreateWalletPage';

/**
 * 메인 App 컴포넌트
 * 라우팅과 전역 상태 관리를 담당
 */
function App() {
  return (
    <WalletProvider>
      <div>
        <Routes>
          {/* 홈 페이지 - 지갑 생성/열기 선택 */}
          <Route path="/" element={<HomePage />} />
          
          {/* 지갑 생성 페이지 */}
          <Route path="/create" element={<CreateWalletPage />} />
          
          {/* 지갑 대시보드 */}
          <Route path="/wallet" element={<WalletDashboard />} />
        </Routes>
      </div>
    </WalletProvider>
  );
}

export default App;
