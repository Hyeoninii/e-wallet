import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

/**
 * 홈 페이지 컴포넌트 (기본 버전)
 */
const HomePage = () => {
  const navigate = useNavigate();
  const { 
    savedWallets, 
    selectWallet, 
    openWalletByAddress, 
    recoverWalletByPrivateKey,
    recoverWalletByMnemonic,
    isLoading, 
    error, 
    clearError 
  } = useWallet();

  // 주소 입력 상태
  const [addressInput, setAddressInput] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [walletNameInput, setWalletNameInput] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [openMode, setOpenMode] = useState('address'); // 'address', 'privateKey', or 'mnemonic'

  /**
   * 새 지갑 생성 페이지로 이동
   */
  const handleCreateWallet = () => {
    navigate('/create');
  };

  /**
   * 주소로 지갑 열기 (읽기 전용)
   */
  const handleOpenByAddress = async () => {
    if (!addressInput.trim()) {
      return;
    }

    try {
      clearError();
      await openWalletByAddress(addressInput.trim());
      navigate('/wallet');
    } catch (error) {
      // 에러는 컨텍스트에서 처리됨
    }
  };

  /**
   * 개인키로 지갑 열기 (진짜 지갑)
   */
  const handleOpenByPrivateKey = async () => {
    if (!privateKeyInput.trim() || !walletNameInput.trim()) {
      return;
    }

    try {
      clearError();
      await recoverWalletByPrivateKey(privateKeyInput.trim(), walletNameInput.trim());
      navigate('/wallet');
    } catch (error) {
      // 에러는 컨텍스트에서 처리됨
    }
  };

  /**
   * 니모닉으로 지갑 열기 (진짜 지갑)
   */
  const handleOpenByMnemonic = async () => {
    if (!mnemonicInput.trim() || !walletNameInput.trim()) {
      return;
    }

    try {
      clearError();
      console.log('니모닉 입력값:', mnemonicInput.trim());
      console.log('지갑 이름:', walletNameInput.trim());
      
      await recoverWalletByMnemonic(mnemonicInput.trim(), walletNameInput.trim());
      navigate('/wallet');
    } catch (error) {
      console.error('니모닉 지갑 열기 실패:', error);
      // 에러는 컨텍스트에서 처리됨
    }
  };

  /**
   * 저장된 지갑 선택
   */
  const handleSelectWallet = (wallet) => {
    selectWallet(wallet);
    navigate('/wallet');
  };

  /**
   * 모달 닫기
   */
  const handleCloseModal = () => {
    setShowAddressInput(false);
    setAddressInput('');
    setPrivateKeyInput('');
    setMnemonicInput('');
    setWalletNameInput('');
    setOpenMode('address');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>E-Wallet</h1>
        <p style={{ color: '#666' }}>안전하고 간편한 개인 암호화폐 지갑</p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc', 
          borderRadius: '4px', 
          marginBottom: '20px',
          color: '#c33'
        }}>
          {error}
        </div>
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#eef', 
          border: '1px solid #ccf', 
          borderRadius: '4px', 
          marginBottom: '20px',
          color: '#33c'
        }}>
          로딩 중...
        </div>
      )}

      {/* 메인 액션 버튼들 */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', justifyContent: 'center' }}>
        {/* 새 지갑 생성 */}
        <button
          onClick={handleCreateWallet}
          disabled={isLoading}
          style={{
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            backgroundColor: 'white',
            cursor: 'pointer',
            minWidth: '200px',
            textAlign: 'left'
          }}
        >
          <h3 style={{ margin: '0 0 10px 0' }}>새 지갑 생성</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            새로운 암호화폐 지갑을 생성하고 니모닉을 안전하게 보관하세요.
          </p>
        </button>

        {/* 지갑 열기 */}
        <button
          onClick={() => setShowAddressInput(true)}
          disabled={isLoading}
          style={{
            padding: '20px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            backgroundColor: 'white',
            cursor: 'pointer',
            minWidth: '200px',
            textAlign: 'left'
          }}
        >
          <h3 style={{ margin: '0 0 10px 0' }}>지갑 열기</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            주소로 읽기 전용 또는 개인키로 진짜 지갑을 열어보세요.
          </p>
        </button>
      </div>

      {/* 지갑 열기 모달 */}
      {showAddressInput && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>지갑 열기</h3>
            
            {/* 모드 선택 */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setOpenMode('address')}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: openMode === 'address' ? '#0066cc' : 'white',
                    color: openMode === 'address' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  주소로 열기 (읽기 전용)
                </button>
                <button
                  onClick={() => setOpenMode('privateKey')}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: openMode === 'privateKey' ? '#0066cc' : 'white',
                    color: openMode === 'privateKey' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  개인키로 열기
                </button>
                <button
                  onClick={() => setOpenMode('mnemonic')}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: openMode === 'mnemonic' ? '#0066cc' : 'white',
                    color: openMode === 'mnemonic' ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  니모닉으로 열기
                </button>
              </div>
            </div>

            {/* 주소 모드 */}
            {openMode === 'address' && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  지갑 주소
                </label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="0x..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginBottom: '20px'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleOpenByAddress()}
                />
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
                  주소만 입력하면 잔액을 확인할 수 있습니다. 트랜잭션은 불가능합니다.
                </p>
              </div>
            )}

            {/* 개인키 모드 */}
            {openMode === 'privateKey' && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  지갑 이름
                </label>
                <input
                  type="text"
                  value={walletNameInput}
                  onChange={(e) => setWalletNameInput(e.target.value)}
                  placeholder="내 지갑"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginBottom: '15px'
                  }}
                />
                
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  개인키
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <code style={{ 
                    flex: 1, 
                    padding: '12px', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontFamily: 'monospace',
                    border: '1px solid #e5e7eb',
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap',
                    minWidth: 0
                  }}>
                    {privateKeyInput.length > 0 ? 
                      privateKeyInput.match(/.{1,32}/g)?.join('\n') || privateKeyInput :
                      '•'.repeat(32) + '\n' + '•'.repeat(32) + '\n' + '•'.repeat(32)
                    }
                  </code>
                  <button
                    onClick={() => setPrivateKeyInput('')} // Clear input on button click
                    style={{ padding: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                    title="개인키 표시/숨김"
                  >
                    {privateKeyInput.length > 0 ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
                  개인키를 입력하면 트랜잭션을 보낼 수 있는 진짜 지갑으로 열립니다.
                </p>
              </div>
            )}

            {/* 니모닉 모드 */}
            {openMode === 'mnemonic' && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  지갑 이름
                </label>
                <input
                  type="text"
                  value={walletNameInput}
                  onChange={(e) => setWalletNameInput(e.target.value)}
                  placeholder="내 지갑"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginBottom: '15px'
                  }}
                />
                
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  니모닉 구문 (12단어)
                </label>
                <textarea
                  value={mnemonicInput}
                  onChange={(e) => setMnemonicInput(e.target.value)}
                  placeholder="steak entry begin fox napkin original almost pilot ladder multiply guide coil"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    minHeight: '80px',
                    resize: 'vertical',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleOpenByMnemonic()}
                />
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>입력 형식:</strong> 12개의 영어 단어를 공백으로 구분하여 입력
                  </p>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>예시:</strong> steak entry begin fox napkin original almost pilot ladder multiply guide coil
                  </p>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>주의:</strong> 대소문자는 자동으로 처리되며, 여러 줄이나 탭은 무시됩니다.
                  </p>
                  <p style={{ margin: 0 }}>
                    니모닉 구문을 입력하면 트랜잭션을 보낼 수 있는 진짜 지갑으로 열립니다.
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCloseModal}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white'
                }}
              >
                취소
              </button>
              <button
                onClick={
                  openMode === 'address' ? handleOpenByAddress : 
                  openMode === 'privateKey' ? handleOpenByPrivateKey :
                  openMode === 'mnemonic' ? handleOpenByMnemonic : handleOpenByAddress
                }
                disabled={
                  (openMode === 'address' && !addressInput.trim()) ||
                  (openMode === 'privateKey' && (!privateKeyInput.trim() || !walletNameInput.trim())) ||
                  (openMode === 'mnemonic' && (!mnemonicInput.trim() || !walletNameInput.trim())) ||
                  isLoading
                }
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  cursor: 'pointer',
                  opacity: (
                    (openMode === 'address' && !addressInput.trim()) ||
                    (openMode === 'privateKey' && (!privateKeyInput.trim() || !walletNameInput.trim())) ||
                    (openMode === 'mnemonic' && (!mnemonicInput.trim() || !walletNameInput.trim())) ||
                    isLoading
                  ) ? 0.5 : 1
                }}
              >
                {isLoading ? '열는 중...' : '열기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 저장된 지갑 목록 */}
      {savedWallets.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h2>내 지갑</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {savedWallets.map((wallet) => (
              <button
                key={wallet.address}
                onClick={() => handleSelectWallet(wallet)}
                style={{
                  padding: '15px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{wallet.name}</div>
                <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {wallet.type === 'hd' ? 'HD 지갑' : '개인키 지갑'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 디버그 정보 */}
      <div style={{ 
        marginTop: '40px', 
        padding: '15px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '4px' 
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>디버그 정보:</h3>
        <p style={{ margin: '5px 0' }}>저장된 지갑 수: {savedWallets.length}</p>
        <p style={{ margin: '5px 0' }}>로딩 상태: {isLoading ? 'true' : 'false'}</p>
        <p style={{ margin: '5px 0' }}>에러: {error || '없음'}</p>
      </div>
    </div>
  );
};

export default HomePage;
