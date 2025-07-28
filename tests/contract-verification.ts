import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { getEthereumConfig } from './contract-addresses'

// Import the actual contract ABIs from compiled artifacts
import ResolverArtifact from '../contracts/out/Resolver.sol/Resolver.json'

const RESOLVER_ABI = ResolverArtifact.abi

async function verifyContractDeployment() {
    console.log('🔍 Verifying contract deployment...')
    
    const config = getEthereumConfig('sepolia')
    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http()
    })

    try {
        // Check if resolver contract exists
        console.log('📍 Checking resolver contract at:', config.resolver)
        
        const code = await publicClient.getBytecode({ address: config.resolver })
        if (!code || code === '0x') {
            console.error('❌ Resolver contract not deployed or empty')
            return false
        }
        console.log('✅ Resolver contract exists')

        // Check resolver owner
        try {
            const owner = await publicClient.readContract({
                address: config.resolver,
                abi: RESOLVER_ABI,
                functionName: 'owner'
            })
            console.log('👑 Resolver owner:', owner)
            
            // Check if the test account is the owner
            const testAccount = '0x897Ec8F290331cfb0916F57b064e0A78Eab0e4A5'
            if (owner.toLowerCase() === testAccount.toLowerCase()) {
                console.log('✅ Test account is the owner')
            } else {
                console.log('❌ Test account is NOT the owner')
                console.log('   Expected:', testAccount)
                console.log('   Actual:  ', owner)
            }
        } catch (error) {
            console.error('❌ Error reading owner:', error)
        }

        // Check escrow factory
        console.log('📍 Checking escrow factory at:', config.escrowFactory)
        const factoryCode = await publicClient.getBytecode({ address: config.escrowFactory })
        if (!factoryCode || factoryCode === '0x') {
            console.error('❌ Escrow factory not deployed or empty')
            return false
        }
        console.log('✅ Escrow factory exists')

        // Check limit order protocol
        console.log('📍 Checking limit order protocol at:', config.limitOrderProtocol)
        const lopCode = await publicClient.getBytecode({ address: config.limitOrderProtocol })
        if (!lopCode || lopCode === '0x') {
            console.error('❌ Limit order protocol not deployed or empty')
            return false
        }
        console.log('✅ Limit order protocol exists')

        return true
    } catch (error) {
        console.error('❌ Error verifying contracts:', error)
        return false
    }
}

// Run verification
verifyContractDeployment()
    .then((success) => {
        if (success) {
            console.log('✅ Contract verification completed successfully')
        } else {
            console.log('❌ Contract verification failed')
        }
    })
    .catch((error) => {
        console.error('❌ Verification error:', error)
    }) 