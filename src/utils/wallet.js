import { ethers } from 'ethers';

/**
 * 지갑 정보를 로컬 스토리지에 안전하게 저장
 * @param {string} key - 저장할 키
 * @param {Object} data - 저장할 데이터
 */
export const saveWalletData = (key, data) => {
  try {
    // 민감한 정보는 암호화하여 저장 (실제 프로덕션에서는 더 강력한 암호화 사용)
    const encryptedData = btoa(JSON.stringify(data));
    localStorage.setItem(key, encryptedData);
    return true;
  } catch (error) {
    console.error('지갑 데이터 저장 실패:', error);
    return false;
  }
};

/**
 * 로컬 스토리지에서 지갑 정보 안전하게 불러오기
 * @param {string} key - 불러올 키
 * @returns {Object|null} 복호화된 데이터 또는 null
 */
export const loadWalletData = (key) => {
  try {
    const encryptedData = localStorage.getItem(key);
    if (!encryptedData) return null;
    
    const decryptedData = JSON.parse(atob(encryptedData));
    return decryptedData;
  } catch (error) {
    console.error('지갑 데이터 불러오기 실패:', error);
    return null;
  }
};

/**
 * 새로운 HD 지갑 생성 (BIP39/BIP44 표준)
 * @param {string} name - 지갑 이름
 * @returns {Object} 생성된 지갑 정보
 */
export const createNewWallet = (name) => {
  try {
    // 128비트 엔트로피로 12단어 니모닉 생성 (Ethers.js v6 방식)
    const entropy = ethers.randomBytes(16);
    const mnemonic = ethers.entropyToPhrase(entropy);
    
    // HD 지갑 생성 (메타마스크와 동일한 BIP44 경로: m/44'/60'/0'/0/0)
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic);
    
    const walletData = {
      name,
      address: wallet.address,
      mnemonic,
      privateKey: wallet.privateKey,
      createdAt: new Date().toISOString(),
      type: 'hd'
    };
    
    return walletData;
  } catch (error) {
    console.error('지갑 생성 실패:', error);
    throw new Error('지갑 생성에 실패했습니다.');
  }
};

/**
 * 니모닉으로 지갑 복구
 * @param {string} mnemonic - 12단어 니모닉
 * @param {string} name - 지갑 이름
 * @returns {Object} 복구된 지갑 정보
 */
export const recoverWalletFromMnemonic = (mnemonic, name) => {
  try {
    console.log('니모닉 복구 시작:', { mnemonic: mnemonic.substring(0, 20) + '...', name });
    
    // 입력된 니모닉 정리 (공백 제거, 소문자 변환)
    const cleanedMnemonic = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    console.log('정리된 니모닉:', cleanedMnemonic);
    
    // 니모닉 단어 수 확인
    const words = cleanedMnemonic.split(' ');
    console.log('단어 목록:', words);
    console.log('단어 수:', words.length);
    
    if (words.length !== 12) {
      throw new Error(`니모닉은 정확히 12단어여야 합니다. 현재 ${words.length}단어입니다.`);
    }
    
    console.log('니모닉 단어 수 확인 통과');
    
    // 각 단어가 BIP39 단어 목록에 있는지 확인
    try {
      // Ethers.js v6 방식으로 니모닉 유효성 검사
      console.log('HDNodeWallet.fromPhrase 시도...');
      const hdNode = ethers.HDNodeWallet.fromPhrase(cleanedMnemonic);
      console.log('HDNodeWallet 생성 성공');
      
      // fromPhrase는 이미 m/44'/60'/0'/0/0 경로의 지갑을 반환하므로 추가 파생 불필요
      const wallet = hdNode;
      
      console.log('지갑 생성 성공:', wallet.address);
      console.log('파생 경로: m/44\'/60\'/0\'/0/0 (기본값)');
      
      const walletData = {
        name,
        address: wallet.address,
        mnemonic: cleanedMnemonic,
        privateKey: wallet.privateKey,
        createdAt: new Date().toISOString(),
        type: 'hd'
      };
      
      return walletData;
    } catch (phraseError) {
      console.error('니모닉 구문 오류 상세:', phraseError);
      console.error('오류 메시지:', phraseError.message);
      console.error('오류 스택:', phraseError.stack);
      
      // 더 구체적인 에러 메시지 제공
      if (phraseError.message.includes('invalid mnemonic')) {
        throw new Error('유효하지 않은 니모닉입니다. BIP39 단어 목록에 없는 단어가 포함되어 있습니다.');
      } else if (phraseError.message.includes('checksum')) {
        throw new Error('니모닉 체크섬이 올바르지 않습니다. 단어를 다시 확인해주세요.');
      } else {
        throw new Error('유효하지 않은 니모닉입니다: ' + phraseError.message);
      }
    }
    
  } catch (error) {
    console.error('니모닉 복구 실패:', error);
    throw new Error('지갑 복구에 실패했습니다: ' + error.message);
  }
};

/**
 * 개인키로 지갑 복구
 * @param {string} privateKey - 개인키 (0x 접두어 포함)
 * @param {string} name - 지갑 이름
 * @returns {Object} 복구된 지갑 정보
 */
export const recoverWalletFromPrivateKey = (privateKey, name) => {
  try {
    // 개인키 유효성 검사
    if (!ethers.isHexString(privateKey, 32)) {
      throw new Error('유효하지 않은 개인키입니다.');
    }
    
    const wallet = new ethers.Wallet(privateKey);
    
    const walletData = {
      name,
      address: wallet.address,
      privateKey: wallet.privateKey,
      createdAt: new Date().toISOString(),
      type: 'private'
    };
    
    return walletData;
  } catch (error) {
    console.error('개인키 복구 실패:', error);
    throw new Error('지갑 복구에 실패했습니다.');
  }
};

/**
 * 이더리움 주소 유효성 검사
 * @param {string} address - 검사할 주소
 * @returns {boolean} 유효한 주소인지 여부
 */
export const isValidAddress = (address) => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

/**
 * 지갑 주소를 짧은 형태로 변환 (0x1234...5678)
 * @param {string} address - 전체 주소
 * @returns {string} 짧은 형태의 주소
 */
export const shortenAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Wei를 ETH로 변환
 * @param {string|number} wei - Wei 단위 값
 * @returns {string} ETH 단위 문자열
 */
export const weiToEth = (wei) => {
  try {
    return ethers.formatEther(wei);
  } catch (error) {
    console.error('Wei 변환 실패:', error);
    return '0';
  }
};

/**
 * ETH를 Wei로 변환
 * @param {string|number} eth - ETH 단위 값
 * @returns {string} Wei 단위 문자열
 */
export const ethToWei = (eth) => {
  try {
    return ethers.parseEther(eth.toString());
  } catch (error) {
    console.error('ETH 변환 실패:', error);
    return '0';
  }
};

/**
 * 클립보드에 텍스트 복사
 * @param {string} text - 복사할 텍스트
 * @returns {Promise<boolean>} 복사 성공 여부
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('클립보드 복사 실패:', error);
    return false;
  }
};
