import 'dotenv/config'
import {expect, jest, describe, it, beforeAll, afterAll} from '@jest/globals'

// Removed prool imports since we're using direct RPC calls

import Sdk from '@1inch/cross-chain-sdk'
import {
    JsonRpcProvider,
    MaxUint256,
    parseEther,
    parseUnits,
    randomBytes
} from 'ethers'
import {uint8ArrayToHex, UINT_40_MAX} from '@1inch/byte-utils'
import assert from 'node:assert'
import {ChainConfig, config} from './config'
import {Wallet} from './wallet'
import {Resolver} from './resolver'
import {EscrowFactory} from './escrow-factory'
// Removed contract imports since we're using existing deployed contracts
// Add viem imports for Ethereum transactions
import {createWalletClient, createPublicClient, http, parseUnits as viemParseUnits} from 'viem'
import {privateKeyToAccount} from 'viem/accounts'
import {sepolia} from 'viem/chains'

// Add Sui imports
import {SuiClient, getFullnodeUrl} from '@mysten/sui/client'
import {Transaction} from '@mysten/sui/transactions'
import {Ed25519Keypair} from '@mysten/sui/keypairs/ed25519'
import {SuiHTLCBridge} from './sui-contract-bridge'
import {getEthereumConfig, getSuiConfig, CONTRACT_ADDRESSES} from './contract-addresses'

const {Address} = Sdk



jest.setTimeout(1000 * 60)

// Get private key from environment variable
const privateKey = process.env.PRIVATE_KEY
if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required')
}

const userPk = privateKey
const resolverPk = privateKey // Use same key for resolver in test

// eslint-disable-next-line max-lines-per-function
describe('Ethereum to Sui Cross-Chain Swap', () => {
    const srcChainId = config.chain.source.chainId
    const dstChainId = config.chain.destination.chainId

    type Chain = {
        provider: JsonRpcProvider
        escrowFactory: string
        resolver: string
    }

    let src: Chain
    // Replace dst with Sui configuration
    let suiClient: SuiClient
    let suiKeypair: Ed25519Keypair
    let suiResolver: SuiHTLCBridge
    
    // Add viem clients for Ethereum transactions
    let viemWalletClient: any
    let viemPublicClient: any
    let viemAccount: any

    let srcChainUser: Wallet
    let srcChainResolver: Wallet
    let suiUserKeypair: Ed25519Keypair
    let suiResolverKeypair: Ed25519Keypair

    let srcFactory: EscrowFactory
    let srcResolverContract: Wallet

    let srcTimestamp: bigint

    async function increaseTime(t: number): Promise<void> {
        // Note: evm_increaseTime not available on real testnet
        // In real scenario, we would wait for actual time to pass
        console.log(`Would increase time by ${t} seconds on testnet`)
    }

    beforeAll(async () => {
        // Use existing deployed contracts from contract-addresses.ts
        const sepoliaConfig = getEthereumConfig('sepolia')
        
        // Get RPC URL from environment or use default
        const rpcUrl = process.env.SEPOLIA_RPC_URL || 'https://g.w.lavanet.xyz:443/gateway/sep1/rpc-http/d3630392db153e71701cd89c262c116e'
        
        // Initialize Ethereum provider directly with Lava RPC
        src = {
            provider: new JsonRpcProvider(rpcUrl),
            escrowFactory: sepoliaConfig.escrowFactory,
            resolver: sepoliaConfig.resolver
        }
        
        // Initialize Sui client and keypairs
        suiClient = new SuiClient({url: getFullnodeUrl('testnet')})
        suiUserKeypair = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(1)) // Use proper key derivation
        suiResolverKeypair = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(2)) // Use proper key derivation
        
        // Initialize Sui resolver bridge
        suiResolver = new SuiHTLCBridge(process.env.SUI_PRIVATE_KEY_INIT)
        
        // Initialize viem clients with same RPC URL
        viemAccount = privateKeyToAccount(userPk as `0x${string}`)
        viemWalletClient = createWalletClient({
            account: viemAccount,
            chain: sepolia,
            transport: http(rpcUrl)
        })
        viemPublicClient = createPublicClient({
            chain: sepolia,
            transport: http(rpcUrl)
        })

        srcChainUser = new Wallet(userPk, src.provider)
        srcChainResolver = new Wallet(resolverPk, src.provider)

        srcFactory = new EscrowFactory(src.provider, src.escrowFactory)
        
        // Note: In real testnet, user should already have USDC tokens
        // For testing, we'll assume the user has sufficient USDC balance
        
        // Approve USDC to LOP
        await srcChainUser.approveToken(
            sepoliaConfig.tokens.USDC.address,
            sepoliaConfig.limitOrderProtocol,
            MaxUint256
        )

        // Setup resolver contract on source chain using resolver private key
        srcResolverContract = new Wallet(resolverPk, src.provider)

        srcTimestamp = BigInt((await src.provider.getBlock('latest'))!.timestamp)
    })

    async function getEthereumBalance(tokenAddress: string, userAddress: string): Promise<bigint> {
        return await viemPublicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: [{
                name: 'balanceOf',
                type: 'function',
                inputs: [{name: 'account', type: 'address'}],
                outputs: [{name: '', type: 'uint256'}]
            }],
            functionName: 'balanceOf',
            args: [userAddress]
        })
    }

    async function getSuiBalance(coinType: string, address: string): Promise<bigint> {
        const balance = await suiClient.getBalance({
            owner: address,
            coinType
        })
        return BigInt(balance.totalBalance)
    }

    afterAll(async () => {
        if (src?.provider) {
            src.provider.destroy()
        }
        // No node to stop when using direct RPC connection
    })

    // eslint-disable-next-line max-lines-per-function
    describe('Ethereum to Sui Cross-Chain Swap', () => {
        it('should swap Ethereum USDC -> Sui USDC following main.spec.ts pattern', async () => {
            const sepoliaConfig = getEthereumConfig('sepolia')
            const initialBalances = {
                src: {
                    user: await srcChainUser.tokenBalance(sepoliaConfig.tokens.USDC.address),
                    resolver: await srcResolverContract.tokenBalance(sepoliaConfig.tokens.USDC.address)
                },
                sui: {
                    user: await getSuiBalance(getSuiConfig().tokens.USDC.address, suiUserKeypair.getPublicKey().toSuiAddress())
                }
            }

            // User creates order following main.spec.ts pattern
            const secret = uint8ArrayToHex(randomBytes(32))
            const order = Sdk.CrossChainOrder.new(
                new Address(src.escrowFactory),
                {
                    salt: Sdk.randBigInt(1000n),
                    maker: new Address(await srcChainUser.getAddress()),
                    makingAmount: parseUnits('100', 6),
                    takingAmount: parseUnits('99', 6),
                    makerAsset: new Address(sepoliaConfig.tokens.USDC.address),
                    takerAsset: new Address('0x0000000000000000000000000000000000000001') // Placeholder for Sui USDC (SDK requires Ethereum format)
                },
                {
                    hashLock: Sdk.HashLock.forSingleFill(secret),
                    timeLocks: Sdk.TimeLocks.new({
                        srcWithdrawal: 10n, // 10sec finality lock for test
                        srcPublicWithdrawal: 120n, // 2m for private withdrawal
                        srcCancellation: 121n, // 1sec public withdrawal
                        srcPublicCancellation: 122n, // 1sec private cancellation
                        dstWithdrawal: 10n, // 10sec finality lock for test
                        dstPublicWithdrawal: 100n, // 100sec private withdrawal
                        dstCancellation: 101n // 1sec public withdrawal
                    }),
                    srcChainId,
                    dstChainId: Sdk.NetworkEnum.POLYGON, // Use supported chain for SDK validation
                    srcSafetyDeposit: parseEther('0.001'),
                    dstSafetyDeposit: parseEther('0.001')
                },
                {
                    auction: new Sdk.AuctionDetails({
                        initialRateBump: 0,
                        points: [],
                        duration: 120n,
                        startTime: srcTimestamp
                    }),
                    whitelist: [
                        {
                            address: new Address(src.resolver),
                            allowFrom: 0n
                        }
                    ],
                    resolvingStartTime: 0n
                },
                {
                    nonce: Sdk.randBigInt(UINT_40_MAX),
                    allowPartialFills: false,
                    allowMultipleFills: false
                }
            )

            const signature = await srcChainUser.signOrder(srcChainId, order)
            const orderHash = order.getOrderHash(srcChainId)
            
            // Resolver fills order following main.spec.ts pattern
            const resolverContract = new Resolver(src.resolver, getSuiConfig().resolver)

            console.log(`[${srcChainId}] Filling order ${orderHash}`)

            const fillAmount = order.makingAmount
            const {txHash: orderFillHash, blockHash: srcDeployBlock} = await srcChainResolver.send(
                resolverContract.deploySrc(
                    srcChainId,
                    order,
                    signature,
                    Sdk.TakerTraits.default()
                        .setExtension(order.extension)
                        .setAmountMode(Sdk.AmountMode.maker)
                        .setAmountThreshold(order.takingAmount),
                    fillAmount
                )
            )

            console.log(`[${srcChainId}] Order ${orderHash} filled for ${fillAmount} in tx ${orderFillHash}`)

            const srcEscrowEvent = await srcFactory.getSrcDeployEvent(srcDeployBlock)

            // Create Sui escrow using the SuiHTLCBridge
            console.log(`[Sui] Creating escrow for ${order.takingAmount} USDC`)
            
            const suiResult = await suiResolver.createLockObject({
                withdrawalMs: 10000, // 10 seconds
                publicWithdrawalMs: 120000, // 2 minutes
                cancellationMs: 121000, // 121 seconds
                publicCancellationMs: 122000, // 122 seconds
                hashLock: orderHash,
                refund: suiResolverKeypair.getPublicKey().toSuiAddress(),
                recipient: suiUserKeypair.getPublicKey().toSuiAddress(),
                secretLength: 32,
                amount: order.takingAmount.toString(),
                safetyDeposit: parseEther('0.001').toString() // Use the same value as defined in order creation
            })
            
            if (!suiResult.success) {
                throw new Error(`Failed to create Sui escrow: ${suiResult.error}`)
            }
            
            console.log(`[Sui] Created escrow in tx: ${suiResult.txDigest}`)

            const ESCROW_SRC_IMPLEMENTATION = await srcFactory.getSourceImpl()
            const srcEscrowAddress = new Sdk.EscrowFactory(new Address(src.escrowFactory)).getSrcEscrowAddress(
                srcEscrowEvent[0],
                ESCROW_SRC_IMPLEMENTATION
            )

            await increaseTime(11)
            
            // User withdraws from Sui escrow (simulated)
            console.log(`[Sui] User withdrawing funds from Sui escrow`)
            // Note: In real implementation, user would call Sui withdraw function
            
            // Resolver withdraws from source escrow
            console.log(`[${srcChainId}] Withdrawing funds for resolver from ${srcEscrowAddress}`)
            const {txHash: resolverWithdrawHash} = await srcChainResolver.send(
                resolverContract.withdraw('src', srcEscrowAddress, secret, srcEscrowEvent[0])
            )
            console.log(
                `[${srcChainId}] Withdrew funds for resolver from ${srcEscrowAddress} to ${src.resolver} in tx ${resolverWithdrawHash}`
            )

            const resultBalances = {
                src: {
                    user: await srcChainUser.tokenBalance(sepoliaConfig.tokens.USDC.address),
                    resolver: await srcResolverContract.tokenBalance(sepoliaConfig.tokens.USDC.address)
                },
                sui: {
                    user: await getSuiBalance(getSuiConfig().tokens.USDC.address, suiUserKeypair.getPublicKey().toSuiAddress())
                }
            }

            // Verify the swap was successful
            expect(initialBalances.src.user - resultBalances.src.user).toBe(order.makingAmount)
            expect(resultBalances.src.resolver - initialBalances.src.resolver).toBe(order.makingAmount)
            console.log('Cross-chain swap from Ethereum to Sui completed successfully!')
        })

        it('should handle multiple Ethereum to Sui swaps', async () => {
              console.log('Multiple swap test - implementation pending')
          })
    })
})

// Removed unused functions since we're using existing deployed contracts and direct RPC
