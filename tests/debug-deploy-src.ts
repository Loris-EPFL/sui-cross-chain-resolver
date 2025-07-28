import { createWalletClient, createPublicClient, http, parseUnits, keccak256, toHex, parseSignature } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { getEthereumConfig } from './contract-addresses'
import ResolverArtifact from '../contracts/out/Resolver.sol/Resolver.json'

const RESOLVER_ABI = ResolverArtifact.abi

async function debugDeploySrc() {
    console.log('🔍 Debugging deploySrc function...')
    
    const config = getEthereumConfig('sepolia')
    const privateKey = process.env.PRIVATE_KEY as `0x${string}`
    
    if (!privateKey) {
        console.error('❌ PRIVATE_KEY environment variable not set')
        return
    }
    
    const account = privateKeyToAccount(privateKey)
    const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: http()
    })
    
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http()
    })
    
    console.log('👤 Account:', account.address)
    console.log('🏭 Resolver:', config.resolver)
    
    // Test 1: Check if we can read the owner
    try {
        const owner = await publicClient.readContract({
            address: config.resolver as `0x${string}`,
            abi: RESOLVER_ABI,
            functionName: 'owner'
        })
        console.log('👑 Owner:', owner)
        console.log('✅ Owner check passed')
    } catch (error) {
        console.error('❌ Owner check failed:', error)
        return
    }
    
    // Test 2: Create minimal test parameters
    const testOrderHash = keccak256(toHex('test-order'))
    const testHashlock = keccak256(toHex('test-hashlock'))
    const testSalt = keccak256(toHex('test-salt'))
    
    const makerAddress = account.address
    const takerAddress = config.resolver
    const tokenAddress = config.tokens.USDC.address
    
    const makerAddressUint = BigInt(makerAddress)
    const takerAddressUint = BigInt(takerAddress)
    const tokenAddressUint = BigInt(tokenAddress)
    
    const amount = parseUnits('0.001', 6) // 0.001 USDC
    const safetyDeposit = parseUnits('0.001', 18) // 0.001 ETH
    const timelocks = BigInt(Math.floor(Date.now() / 1000) + 3600)
    
    const immutables = [
        testOrderHash,
        testHashlock,
        makerAddressUint,
        takerAddressUint,
        tokenAddressUint,
        amount,
        safetyDeposit,
        timelocks
    ]
    
    const order = [
        testSalt,
        makerAddressUint,
        takerAddressUint,
        tokenAddressUint,
        tokenAddressUint, // Same as makerAsset for now
        amount,
        amount,
        BigInt(1) // makerTraits
    ]
    
    // Create a dummy signature
    const dummySignature = '0x' + '1'.repeat(130)
    const { r, s, yParity } = parseSignature(dummySignature as `0x${string}`)
    const sBigInt = BigInt(s)
    const yParityBit = BigInt(yParity) << 255n
    const vsBigInt = sBigInt | yParityBit
    const vs = `0x${vsBigInt.toString(16).padStart(64, '0')}` as `0x${string}`
    
    console.log('🔍 Test parameters:')
    console.log('  Immutables:', immutables)
    console.log('  Order:', order)
    console.log('  R:', r)
    console.log('  VS:', vs)
    console.log('  Amount:', amount)
    console.log('  Safety Deposit:', safetyDeposit)
    
    // Test 3: Try to call deploySrc with minimal parameters
    try {
        console.log('🔄 Attempting deploySrc call...')
        
        const hash = await walletClient.writeContract({
            address: config.resolver as `0x${string}`,
            abi: RESOLVER_ABI,
            functionName: 'deploySrc',
            args: [
                {
                    orderHash: immutables[0],
                    hashlock: immutables[1],
                    maker: immutables[2],
                    taker: immutables[3],
                    token: immutables[4],
                    amount: immutables[5],
                    safetyDeposit: immutables[6],
                    timelocks: immutables[7]
                },
                {
                    salt: order[0],
                    maker: order[1],
                    receiver: order[2],
                    makerAsset: order[3],
                    takerAsset: order[4],
                    makingAmount: order[5],
                    takingAmount: order[6],
                    makerTraits: order[7]
                },
                r,
                vs,
                amount,
                BigInt(1), // takerTraits
                '0x' // args
            ],
            value: safetyDeposit
        })
        
        console.log('✅ deploySrc call successful!')
        console.log('📍 Transaction hash:', hash)
        
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        console.log('📋 Receipt:', receipt)
        
    } catch (error) {
        console.error('❌ deploySrc call failed:', error)
        
        // Try to get more details about the error
        if (error && typeof error === 'object' && 'cause' in error) {
            console.error('🔍 Error cause:', error.cause)
        }
    }
}

debugDeploySrc().catch(console.error) 