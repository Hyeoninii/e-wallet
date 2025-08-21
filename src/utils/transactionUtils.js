import { ethers } from 'ethers';

/**
 * 트랜잭션 서명 및 처리를 위한 유틸리티
 */
export class TransactionSigner {
  constructor(privateKey) {
    this.wallet = new ethers.Wallet(privateKey);
  }

  /**
   * 트랜잭션 서명
   * @param {Object} transaction - 트랜잭션 객체
   * @param {number} chainId - 체인 ID
   * @returns {Promise<string>} 서명된 트랜잭션 (16진수)
   */
  async signTransaction(transaction, chainId) {
    try {
      // EIP-155 트랜잭션 객체 생성
      const tx = {
        to: transaction.to,
        value: transaction.value || '0x0',
        gas: transaction.gasLimit || transaction.gas,
        gasPrice: transaction.gasPrice,
        nonce: transaction.nonce,
        data: transaction.data || '0x',
        chainId: chainId
      };

      // 트랜잭션 서명
      const signedTx = await this.wallet.signTransaction(tx);
      return signedTx;
    } catch (error) {
      console.error('트랜잭션 서명 실패:', error);
      throw new Error('트랜잭션 서명에 실패했습니다.');
    }
  }

  /**
   * 메시지 서명 (개인 서명)
   * @param {string} message - 서명할 메시지
   * @returns {Promise<string>} 서명
   */
  async signMessage(message) {
    try {
      return await this.wallet.signMessage(message);
    } catch (error) {
      console.error('메시지 서명 실패:', error);
      throw new Error('메시지 서명에 실패했습니다.');
    }
  }

  /**
   * 지갑 주소 반환
   * @returns {string} 지갑 주소
   */
  getAddress() {
    return this.wallet.address;
  }
}

/**
 * 트랜잭션 빌더
 */
export class TransactionBuilder {
  constructor(rpcClient) {
    this.rpcClient = rpcClient;
  }

  /**
   * 기본 ETH 전송 트랜잭션 생성
   * @param {string} from - 송신자 주소
   * @param {string} to - 수신자 주소
   * @param {string} amount - 전송할 ETH 양
   * @param {Object} options - 추가 옵션 (gasPrice, gasLimit)
   * @returns {Promise<Object>} 트랜잭션 객체
   */
  async buildTransferTransaction(from, to, amount, options = {}) {
    try {
      // 현재 nonce 조회
      const nonceHex = await this.rpcClient.getTransactionCount(from);
      const nonce = this.rpcClient.decimalToHex(this.rpcClient.hexToDecimal(nonceHex));

      // Wei 단위로 변환
      const valueWei = this.rpcClient.ethToWei(amount.toString());

      // 가스 가격 설정 (옵션이 없으면 네트워크에서 조회)
      let gasPrice;
      if (options.gasPrice) {
        gasPrice = this.rpcClient.ethToWei((parseFloat(options.gasPrice) / 1e9).toString()); // Gwei to Wei
      } else {
        gasPrice = await this.rpcClient.getGasPrice();
      }

      // 기본 트랜잭션 객체
      const transaction = {
        from: from,
        to: to,
        value: valueWei,
        gasPrice: gasPrice,
        nonce: nonce
      };

      // 가스 한도 추정 또는 설정
      if (options.gasLimit) {
        transaction.gasLimit = this.rpcClient.decimalToHex(options.gasLimit);
      } else {
        const estimatedGas = await this.rpcClient.estimateGas({
          from: from,
          to: to,
          value: valueWei
        });
        transaction.gasLimit = estimatedGas;
      }

      return transaction;
    } catch (error) {
      console.error('트랜잭션 생성 실패:', error);
      throw new Error('트랜잭션 생성에 실패했습니다: ' + error.message);
    }
  }

  /**
   * 컨트랙트 호출 트랜잭션 생성
   * @param {string} from - 송신자 주소
   * @param {string} contractAddress - 컨트랙트 주소
   * @param {string} data - 호출 데이터 (인코딩된 함수 호출)
   * @param {Object} options - 추가 옵션
   * @returns {Promise<Object>} 트랜잭션 객체
   */
  async buildContractTransaction(from, contractAddress, data, options = {}) {
    try {
      const nonceHex = await this.rpcClient.getTransactionCount(from);
      const nonce = this.rpcClient.decimalToHex(this.rpcClient.hexToDecimal(nonceHex));

      let gasPrice;
      if (options.gasPrice) {
        gasPrice = this.rpcClient.ethToWei((parseFloat(options.gasPrice) / 1e9).toString());
      } else {
        gasPrice = await this.rpcClient.getGasPrice();
      }

      const transaction = {
        from: from,
        to: contractAddress,
        value: options.value || '0x0',
        data: data,
        gasPrice: gasPrice,
        nonce: nonce
      };

      // 가스 한도 추정
      if (options.gasLimit) {
        transaction.gasLimit = this.rpcClient.decimalToHex(options.gasLimit);
      } else {
        const estimatedGas = await this.rpcClient.estimateGas(transaction);
        // 컨트랙트 호출은 10% 여유분 추가
        const gasWithBuffer = Math.ceil(this.rpcClient.hexToDecimal(estimatedGas) * 1.1);
        transaction.gasLimit = this.rpcClient.decimalToHex(gasWithBuffer);
      }

      return transaction;
    } catch (error) {
      console.error('컨트랙트 트랜잭션 생성 실패:', error);
      throw new Error('컨트랙트 트랜잭션 생성에 실패했습니다: ' + error.message);
    }
  }
}