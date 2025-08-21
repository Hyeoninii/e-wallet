/**
 * 직접 JSON-RPC 통신을 위한 클라이언트
 */
class EthereumRPCClient {
  constructor(rpcUrl, chainId = 11155111) { // Sepolia chainId
    this.rpcUrl = rpcUrl;
    this.chainId = chainId;
    this.requestId = 1;
  }

  /**
   * JSON-RPC 요청 전송
   * @param {string} method - RPC 메소드
   * @param {Array} params - 파라미터 배열
   * @returns {Promise<any>} 응답 데이터
   */
  async request(method, params = []) {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: this.requestId++
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message} (Code: ${data.error.code})`);
      }

      return data.result;
    } catch (error) {
      console.error(`RPC 요청 실패 [${method}]:`, error);
      throw error;
    }
  }

  /**
   * 잔액 조회
   * @param {string} address - 지갑 주소
   * @returns {Promise<string>} Wei 단위 잔액 (16진수)
   */
  async getBalance(address) {
    return await this.request('eth_getBalance', [address, 'latest']);
  }

  /**
   * 현재 가스 가격 조회
   * @returns {Promise<string>} Wei 단위 가스 가격 (16진수)
   */
  async getGasPrice() {
    return await this.request('eth_gasPrice');
  }

  /**
   * 트랜잭션 개수 조회 (nonce)
   * @param {string} address - 지갑 주소
   * @returns {Promise<string>} 트랜잭션 개수 (16진수)
   */
  async getTransactionCount(address) {
    return await this.request('eth_getTransactionCount', [address, 'latest']);
  }

  /**
   * 가스 한도 추정
   * @param {Object} transaction - 트랜잭션 객체
   * @returns {Promise<string>} 가스 한도 (16진수)
   */
  async estimateGas(transaction) {
    return await this.request('eth_estimateGas', [transaction]);
  }

  /**
   * 서명된 트랜잭션 전송
   * @param {string} signedTransaction - 서명된 트랜잭션 (16진수)
   * @returns {Promise<string>} 트랜잭션 해시
   */
  async sendRawTransaction(signedTransaction) {
    return await this.request('eth_sendRawTransaction', [signedTransaction]);
  }

  /**
   * 트랜잭션 영수증 조회
   * @param {string} txHash - 트랜잭션 해시
   * @returns {Promise<Object>} 트랜잭션 영수증
   */
  async getTransactionReceipt(txHash) {
    return await this.request('eth_getTransactionReceipt', [txHash]);
  }

  /**
   * 최신 블록 번호 조회
   * @returns {Promise<string>} 블록 번호 (16진수)
   */
  async getBlockNumber() {
    return await this.request('eth_blockNumber');
  }

  /**
   * 네트워크 체인 ID 조회
   * @returns {Promise<string>} 체인 ID (16진수)
   */
  async getChainId() {
    return await this.request('eth_chainId');
  }

  /**
   * 16진수를 10진수로 변환
   * @param {string} hex - 16진수 문자열
   * @returns {number} 10진수
   */
  hexToDecimal(hex) {
    return parseInt(hex, 16);
  }

  /**
   * 10진수를 16진수로 변환
   * @param {number} decimal - 10진수
   * @returns {string} 16진수 문자열 (0x 접두어 포함)
   */
  decimalToHex(decimal) {
    return '0x' + decimal.toString(16);
  }

  /**
   * Wei를 ETH로 변환
   * @param {string} weiHex - Wei 단위 16진수
   * @returns {string} ETH 단위 문자열
   */
  weiToEth(weiHex) {
    const wei = BigInt(weiHex);
    const eth = wei / BigInt(10 ** 18);
    const remainder = wei % BigInt(10 ** 18);
    
    if (remainder === 0n) {
      return eth.toString();
    } else {
      // 소수점 처리
      const remainderStr = remainder.toString().padStart(18, '0');
      const trimmed = remainderStr.replace(/0+$/, '');
      return `${eth}.${trimmed}`;
    }
  }

  /**
   * ETH를 Wei로 변환
   * @param {string} eth - ETH 단위
   * @returns {string} Wei 단위 16진수
   */
  ethToWei(eth) {
    const [integer, decimal = ''] = eth.split('.');
    const paddedDecimal = decimal.padEnd(18, '0');
    const wei = BigInt(integer) * BigInt(10 ** 18) + BigInt(paddedDecimal);
    return '0x' + wei.toString(16);
  }
}

export default EthereumRPCClient;