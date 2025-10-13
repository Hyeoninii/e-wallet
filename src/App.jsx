import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';

// 레이아웃 컴포넌트
import Layout from './components/Layout';

// 페이지 컴포넌트들
import HomePage from './pages/HomePage';
import CreateWalletPage from './pages/CreateWalletPage';

// 대시보드 페이지들
import DashboardPage from './pages/DashboardPage';
import SendPage from './pages/SendPage';
import ReceivePage from './pages/ReceivePage';
import TransactionsPage from './pages/TransactionsPage';
import SettingsPage from './pages/SettingsPage';

// 다중 서명 페이지들
import CreateMultiSigPage from './pages/CreateMultiSigPage';
import MultiSigDashboardPage from './pages/MultiSigDashboardPage';
import MultiSigJoinPage from './pages/MultiSigJoinPage';
import MultiSigSendPage from './pages/MultiSigSendPage';
import MultiSigTransactionsPage from './pages/MultiSigTransactionsPage';
import MultiSigMembersPage from './pages/MultiSigMembersPage';
import MultiSigSettingsPage from './pages/MultiSigSettingsPage';

/**
 * 메인 App 컴포넌트
 * 라우팅과 전역 상태 관리를 담당
 */
function App() {
  return (
    <WalletProvider>
      <Layout>
        <Routes>
          {/* 홈 페이지 - 지갑 생성/열기 선택 */}
          <Route path="/" element={<HomePage />} />
          
          {/* 지갑 생성 페이지 */}
          <Route path="/create" element={<CreateWalletPage />} />
          
          {/* 대시보드 페이지들 */}
          <Route path="/wallet" element={<DashboardPage />} />
          <Route path="/wallet/send" element={<SendPage />} />
          <Route path="/wallet/receive" element={<ReceivePage />} />
          <Route path="/wallet/transactions" element={<TransactionsPage />} />
          <Route path="/wallet/settings" element={<SettingsPage />} />
          
          {/* 다중 서명 페이지들 */}
          <Route path="/multisig/create" element={<CreateMultiSigPage />} />
          <Route path="/multisig/:address/join" element={<MultiSigJoinPage />} />
          <Route path="/multisig/:address" element={<MultiSigDashboardPage />} />
          <Route path="/multisig/:address/send" element={<MultiSigSendPage />} />
          <Route path="/multisig/:address/transactions" element={<MultiSigTransactionsPage />} />
          <Route path="/multisig/:address/members" element={<MultiSigMembersPage />} />
          <Route path="/multisig/:address/settings" element={<MultiSigSettingsPage />} />
        </Routes>
      </Layout>
    </WalletProvider>
  );
}

export default App;
