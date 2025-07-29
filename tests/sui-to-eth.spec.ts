import 'dotenv/config';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { createDirect1inchClient, Direct1inchApiClient } from '../src/utils/direct-api-client';
import { getEthereumConfig, getSuiConfig } from './contract-addresses';
import { parseUnits, keccak256, toHex } from 'viem';
import { SuiHTLCBridge } from './sui-contract-bridge';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

// ABI for your Resolver & Factory
import ResolverArtifact from '../contracts/out/Resolver.sol/Resolver.json';
import TestEscrowFactoryArtifact from '../contracts/out/TestEscrowFactory.sol/TestEscrowFactory.json';
const RESOLVER_ABI = ResolverArtifact.abi;
const FACTORY_ABI = TestEscrowFactoryArtifact.abi;

// Config from helpers
const TEST_CONFIG = {
  ethereum: getEthereumConfig('sepolia'),
  sui: getSuiConfig(),
  api: {
    baseUrl: 'http://localhost:3001/mock-1inch-api',
    authKey: 'test-auth-key',
  },
};

// Transform EVM address → uint256 (for IBaseEscrow.Immutables)
function addressToUint256(addr: string): bigint {
  const clean = addr.startsWith('0x') ? addr.slice(2) : addr;
  const result = BigInt(`0x${clean}`);
  console.log(`Converting address ${addr} to uint256: ${result.toString()}`);
  return result;
}

// Ethereum opposite side wrapper
class EthereumResolver {
  private account: any;
  private walletClient: any;
  private publicClient: any;

  constructor(
    privateKey: string,
    private resolverAddress: `0x${string}`,
    private escrowFactoryAddress?: `0x${string}`,
  ) {
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    this.walletClient = createWalletClient({
      account: this.account,
      chain: sepolia,
      transport: http(),
    });
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });
    this.escrowFactoryAddress = (escrowFactoryAddress || TEST_CONFIG.ethereum.escrowFactory) as `0x${string}`;
  }

  getAddress() {
    return this.account.address as `0x${string}`;
  }

  getResolverAddress() {
    return this.resolverAddress;
  }

  getWalletClient() {
    return this.walletClient;
  }

  getPublicClient() {
    return this.publicClient;
  }

  /**
   * Deploy dst escrow on Ethereum via Resolver.deployDst.
   */
  async deployDst(
    immutables: any,
    srcCancellationTimestamp: bigint,
    safetyDeposit?: bigint
  ): Promise<{ txHash: string; escrowAddress: string }> {
    await this.ensureIsOwner();
    console.log('Deploying DST with:');
    console.log('- Immutables:', JSON.stringify(immutables, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    console.log('- srcCancellationTimestamp:', srcCancellationTimestamp.toString());
    console.log('- safetyDeposit (ETH value):', (safetyDeposit ?? 0n).toString());

    try {
      const txHash = await this.walletClient.writeContract({
        address: this.resolverAddress,
        abi: RESOLVER_ABI,
        functionName: 'deployDst',
        args: [immutables, srcCancellationTimestamp],
        value: safetyDeposit ?? 0n,
      });

      await this.publicClient.waitForTransactionReceipt({ hash: txHash });

      // EscrowDst is created by the factory, not the resolver; we return txHash only.
      // Escrow address will be computed via factory call.
      return {
        txHash,
        escrowAddress: `0x${''.padEnd(40, '0')}`
      };
    } catch (err: any) {
      console.error('deployDst failed:', err);
      if (err?.data) {
        try {
          const { decodeErrorResult } = await import('viem');
          const decoded = decodeErrorResult({ abi: RESOLVER_ABI, data: err.data });
          console.error('Decoded error:', decoded);
        } catch {
          console.error('Could not decode error — verify Resolver onlyOwner and input shape.');
        }
      }
      throw err;
    }
  }

  async ensureIsOwner() {
    const owner = await this.publicClient.readContract({
      address: this.resolverAddress,
      abi: RESOLVER_ABI,
      functionName: 'owner',
    });
    if (owner.toLowerCase() !== this.account.address.toLowerCase()) {
      throw new Error(
        `Resolver onlyOwner check failed: owner=${owner}, caller=${this.account.address}. Use the resolver owner private key.`
      );
    }
    console.log(`✅ Resolver owner verified (${owner})`);
  }

  /**
   * Withdraw from escrow: calls Resolver.withdraw(IEscrow, bytes32, Immutables)
   */
  async withdraw(escrowAddress: `0x${string}`, secret: string, immutables: any) {
    const txHash = await this.walletClient.writeContract({
      address: this.resolverAddress,
      abi: RESOLVER_ABI,
      functionName: 'withdraw',
      args: [escrowAddress, secret, immutables],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    return { txHash, receipt };
  }

  /**
   * Cancel escrow: for completeness (not used in main flow test).
   */
  async cancel(escrowAddress: `0x${string}`, immutables: any) {
    const txHash = await this.walletClient.writeContract({
      address: this.resolverAddress,
      abi: RESOLVER_ABI,
      functionName: 'cancel',
      args: [escrowAddress, immutables],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: txHash });
    return { txHash, receipt };
  }

  /**
   * Read EscrowDst address computed by factory.
   */
  async computeEscrowDstAddress(immutables: any): Promise<`0x${string}`> {
    try {
      const addr = await this.publicClient.readContract({
        address: this.escrowFactoryAddress!,
        abi: FACTORY_ABI,
        functionName: 'addressOfEscrowDst',
        args: [immutables],
      });
      console.log('🔮 Predicted EscrowDst:', addr);
      return addr as `0x${string}`;
    } catch (e) {
      console.warn('Could not read addressOfEscrowDst from factory; returning zero address.');
      return `0x${''.padEnd(40, '0')}`;
    }
  }
}

// Orchestration for Sui → Ethereum flow
class CrossChainOrderManager {
  constructor(
    private apiClient: Direct1inchApiClient,
    private ethResolver: EthereumResolver,
    private suiResolver: SuiHTLCBridge,
  ) {}

  /**
   * 1) Create Sui HTLC Lock first
   */
  async executeSuiSwap(
    amountSui: bigint,
    secret: string,
    recipientSui: string,
    cfg?: { withdrawalMs: number; publicWithdrawalMs: number; cancellationMs: number; publicCancellationMs: number; }
  ): Promise<{ lockId: string; txDigest: string; initVersion: bigint; cancellationTsSec: bigint }> {
    const wMs = cfg?.withdrawalMs ?? 10_000;
    const pwMs = cfg?.publicWithdrawalMs ?? 60_000;
    const cMs = cfg?.cancellationMs ?? 120_000;
    const pcMs = cfg?.publicCancellationMs ?? 180_000;

    const secretHash = keccak256(toHex(secret));
    const res = await this.suiResolver.createLockObject({
      hashLock: secretHash, // Must be same Keccak-256 on both chains
      amount: amountSui.toString(),
      recipient: recipientSui,
      refund: this.suiResolver.getAddress(),
      withdrawalMs: wMs,
      publicWithdrawalMs: pwMs,
      cancellationMs: cMs,
      publicCancellationMs: pcMs,
      secretLength: secret.length,
      safetyDeposit: '100000', // 0.0001 SUI
    });

    if (!res.success || !res.lockId || !res.txDigest) {
      throw new Error(`Sui createLockObject failed: ${res.error}`);
    }

    // Conservative srcCancellation timestamp for Ethereum side reference
    const nowMs = BigInt(Date.now());
    const srcCancellationTsSec = (nowMs + 24n * 60n * 60n * 1000n) / 1000n;

    return {
      lockId: res.lockId!,
      txDigest: res.txDigest!,
      initVersion: res.initVersion!,
      cancellationTsSec: srcCancellationTsSec,
    };
  }

  /**
   * 2) Deploy ETH Escrow as destination via Resolver.deployDst
   */
async executeEthereumEscrowAfterSui(params: {
    amountEth: bigint;
    secret: string;
    apiOrder?: any;
    dstToken?: `0x${string}`;
    userEth?: `0x${string}`;
    srcCancellationTsSec: bigint;
  }): Promise<{ txHash: string; escrowAddress: string; immutables: any }> {
    const { amountEth, secret, apiOrder, dstToken, userEth, srcCancellationTsSec } = params;
    const secretHash = keccak256(toHex(secret));
  
    // Timelocks packing remains unchanged (A2..A5 are Sui, B2..B4 are ETH)
    const A2 = 8n * 60n, A3 = 16n * 60n, A4 = 24n * 60n, A5 = 32n * 60n;
    const B2 = 10n * 60n, B3 = 20n * 60n, B4 = 30n * 60n, deployedAt = 0n;
  
    const packedTimelocks = (A2 << 0n)
      | (A3 << 32n)
      | (A4 << 64n)
      | (A5 << 96n)
      | (B2 << 128n)
      | (B3 << 160n)
      | (B4 << 192n)
      | (deployedAt << 224n);
  
    const token = (dstToken ?? TEST_CONFIG.ethereum.tokens.USDC.address) as `0x${string}`;
    const maker = addressToUint256(this.ethResolver.getAddress());
    const taker = addressToUint256(userEth ?? this.ethResolver.getAddress());
    const tokenAsUint = addressToUint256(token);
  
    const immutables = {
      orderHash: (apiOrder?.orderHash?.length === 66 ? apiOrder.orderHash : keccak256(toHex(`dst-${Date.now()}`))) as `0x${string}`,
      hashlock: secretHash as `0x${string}`,
      maker,
      taker,
      token: tokenAsUint,
      amount: amountEth,
      safetyDeposit: 1000000000000000n, // 0.001 ETH
      timelocks: packedTimelocks,
    };
  
    // ✅ 1) Approve USDC for the FACTORY to pull the amount via transferFrom(...)
    const factoryAddr = TEST_CONFIG.ethereum.escrowFactory as `0x${string}`;
    await this.approveUSDCToFactory(factoryAddr, token, amountEth);
  
    // Optional: predict the future EscrowDst address (nice-to-have)
    const predictedEscrow = await this.ethResolver.computeEscrowDstAddress(immutables);
  
    console.log('About to call deployDst with:');
    console.log('- immutables:', JSON.stringify(immutables, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    console.log('- srcCancellationTsSec:', srcCancellationTsSec.toString());
    console.log('- safetyDeposit:', immutables.safetyDeposit.toString());
    console.log('- predicted escrow:', predictedEscrow);
  
    // ✅ 2) Deploy Dst Escrow on Ethereum using Resolver.deployDst(...)
    const res = await this.ethResolver.deployDst(immutables, srcCancellationTsSec, immutables.safetyDeposit);
    return { ...res, escrowAddress: predictedEscrow, immutables };
  }
  
  /**
   * Approve USDC allowance to FACTORY (resolver-funded Dst escrow requires ERC-20 pull)
   */
  private async approveUSDCToFactory(
    factoryAddress: `0x${string}`,
    token: `0x${string}`,
    amount: bigint
  ) {
    const USDC_ABI = [
      {
        "constant": false,
        "inputs": [
          {"name": "_spender", "type": "address"},
          {"name": "_value", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ] as const;
  
    const txHash = await this.ethResolver.getWalletClient().writeContract({
      address: token,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [factoryAddress, amount],
    });
  
    await this.ethResolver.getPublicClient().waitForTransactionReceipt({ hash: txHash });
    console.log(`✅ USDC approved for factory: ${factoryAddress}, amount: ${amount.toString()}`);
  }

  /**
   * 3) Reveal secret on Sui → withdraw from HTLC lock
   */
  async completeOnSui(params: { lockId: string; secret: string; initVersion: bigint }) {
    return this.suiResolver.withdrawLock({
      lockId: params.lockId,
      secret: params.secret,
      initVersion: params.initVersion,
    });
  }

  /**
   * 4) Withdraw on Ethereum from EscrowDst using the same secret
   */
  async completeOnEthereum(params: { escrowAddress: string; secret: string; immutables: any }) {
    return this.ethResolver.withdraw(
      params.escrowAddress as `0x${string}`,
      params.secret,
      params.immutables
    );
  }
}

describe('Sui → Ethereum Flow (Sui lock first, then ETH escrow)', () => {
  let apiClient: Direct1inchApiClient;
  let suiResolver: SuiHTLCBridge;
  let ethResolver: EthereumResolver;
  let orderManager: CrossChainOrderManager;

  let userEth: `0x${string}`;
  let userSui: string;

  beforeAll(async () => {
    const PRIVATE_KEY = process.env.PRIVATE_KEY!;
    if (!PRIVATE_KEY) throw new Error('Missing PRIVATE_KEY for Sepolia owner of Resolver');
    if (!process.env.SUI_PRIVATE_KEY_INIT) throw new Error('Missing SUI_PRIVATE_KEY_INIT for Sui HTLC initiator');

    apiClient = createDirect1inchClient(TEST_CONFIG.api.baseUrl, TEST_CONFIG.api.authKey);

    ethResolver = new EthereumResolver(
      PRIVATE_KEY,
      TEST_CONFIG.ethereum.resolver as `0x${string}`,
      TEST_CONFIG.ethereum.escrowFactory as `0x${string}`,
    );

    // Validate ownership before trying deployDst
    await ethResolver.ensureIsOwner();

    suiResolver = new SuiHTLCBridge(process.env.SUI_PRIVATE_KEY_INIT);
    orderManager = new CrossChainOrderManager(apiClient, ethResolver, suiResolver);

    userEth = ethResolver.getAddress();
    userSui = suiResolver.getAddress();
  }, 30000);

  it('should execute Sui → Ethereum full flow: Sui lock → ETH escrow → Sui withdraw → ETH withdraw', async () => {
    const srcAmountSui = parseUnits('99', TEST_CONFIG.sui.tokens.USDC.decimals);
    const dstAmountEth = parseUnits('100', TEST_CONFIG.ethereum.tokens.USDC.decimals);

    const secret = `0x${Buffer.from(Array(32).fill(7)).toString('hex')}`;
    const secretHash = keccak256(toHex(secret));

    // 1) API mock - request path
    const quote = await apiClient.getQuote({
      srcChainId: TEST_CONFIG.sui.chainId,
      dstChainId: TEST_CONFIG.ethereum.chainId,
      srcTokenAddress: TEST_CONFIG.sui.tokens.USDC.address,
      dstTokenAddress: TEST_CONFIG.ethereum.tokens.USDC.address,
      amount: srcAmountSui.toString(),
      walletAddress: userEth,
      enableEstimate: true,
    });

    const apiOrder = await apiClient.createOrder(quote, {
      walletAddress: userEth,
      hashLock: { hashLock: secretHash, srcChainId: TEST_CONFIG.sui.chainId, dstChainId: TEST_CONFIG.ethereum.chainId },
      secretHashes: [secretHash],
    });

    // 2) Sui first (lock HTLC)
    const suiLock = await orderManager.executeSuiSwap(
      srcAmountSui,
      secret,
      userSui,
      {
        withdrawalMs: 10_000,
        publicWithdrawalMs: 30_000,
        cancellationMs: 60_000,
        publicCancellationMs: 90_000,
      }
    );
    expect(suiLock.lockId).toBeDefined();

    // Optionally wait/poll Sui finality instead of arbitrary sleep.
    await new Promise((r) => setTimeout(r, 2000));

    // 3) Deploy ETH escrow
    const ethDst = await orderManager.executeEthereumEscrowAfterSui({
      amountEth: dstAmountEth,
      secret,
      apiOrder,
      dstToken: TEST_CONFIG.ethereum.tokens.USDC.address as `0x${string}`,
      userEth,
      srcCancellationTsSec: suiLock.cancellationTsSec,
    });
    expect(ethDst.txHash).toBeDefined();
    expect(ethDst.escrowAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);

    // 4) Secret reveal on Sui (withdraw)
    const suiWithdraw = await orderManager.completeOnSui({
      lockId: suiLock.lockId,
      secret,
      initVersion: suiLock.initVersion,
    });
    expect(suiWithdraw.success).toBe(true);

    // 5) Resolver withdraw on Ethereum using the same secret
    const ethWithdraw = await orderManager.completeOnEthereum({
      escrowAddress: ethDst.escrowAddress,
      secret,
      immutables: ethDst.immutables,
    });
    expect(ethWithdraw.txHash).toBeDefined();
  }, 120000);
});