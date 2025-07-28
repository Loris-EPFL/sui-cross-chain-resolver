/**
 * Contract addresses for different networks
 * This file centralizes all contract addresses for easy modification
 */

export const CONTRACT_ADDRESSES = {
    // Ethereum Sepolia testnet
    sepolia: {
        chainId: 11155111, // Sepolia testnet
        rpcUrl:
            process.env.SEPOLIA_RPC_URL ||
            'https://g.w.lavanet.xyz:443/gateway/sep1/rpc-http/d3630392db153e71701cd89c262c116e',

        // Deployed contract addresses from latest deployment
        resolver: '0x5c6B9B8E34d8891b27b1541B5dEdF954414AE1b5' as `0x${string}`,
        escrowFactory: '0x97f343BcaFc099000ecf22d295B3962d51b39a0B' as `0x${string}`,
        escrowSrcImpl: '0x77b7de389F29D041536052Cb9F7796fCA75F4173' as `0x${string}`,
        escrowDstImpl: '0x3F57D804341Ac50eFA5c2793cC9b1108A07B0471' as `0x${string}`,

        // Mock token addresses
        tokens: {
            USDC: {
                address: '0x8fd3F00bc09f8F7680b099FD9a9EdA2Fe4714e1C' as `0x${string}`,
                decimals: 6
            },
            WETH: {
                address: '0xE612eC9927FcD1F8931fc1ffA0465bD08880659C' as `0x${string}`,
                decimals: 18
            }
        },

        // Mock Limit Order Protocol
        limitOrderProtocol: '0x9182db0E206dfb5D7C7BDAe0df79Cc3D91C993ff' as `0x${string}`,

        // Fee Bank
        feeBank: '0x3a2B5099f962A56EEA9890bc57CB6643441Ba4ac' as `0x${string}`,

        // Deployer address
        deployer: '0x897Ec8F290331cfb0916F57b064e0A78Eab0e4A5' as `0x${string}`
    },

    // Ethereum mainnet (for reference)
    mainnet: {
        chainId: 1,
        rpcUrl: process.env.MAINNET_RPC_URL || '',

        // Add mainnet addresses when available
        resolver: '' as `0x${string}`,
        escrowFactory: '' as `0x${string}`,
        escrowSrcImpl: '' as `0x${string}`,
        escrowDstImpl: '' as `0x${string}`,

        tokens: {
            USDC: {
                address: '0xA0b86a33E6441E6C7D3E4C7C5C6C7C5C6C7C5C6C' as `0x${string}`, // Example
                decimals: 6
            }
        }
    },

    // Sui testnet (non-EVM chain)
    sui: {
        chainId: 101, // Custom chainId for Sui (non-EVM)
        rpcUrl: 'https://fullnode.testnet.sui.io:443',

        // Sui testnet deployed Move packages (Sui object IDs)
        resolver: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29',
        escrowFactory: '0xb2fd8fc01a7f50db9693ad1415d0c193ad3906494428cf252621037bd7117e30',
        escrowSrcImpl: '0xc3fe9fd02b8f60db9693ad1415d0c193ad3906494428cf252621037bd7117e31',
        escrowDstImpl: '0xd4ff0fe03c9f70db9693ad1415d0c193ad3906494428cf252621037bd7117e32',

        tokens: {
            USDC: {
                // Sui USDC coin type (Move type identifier)
                address: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
                decimals: 6
            }
        }
    }
} as const

// Type helpers
export type NetworkName = keyof typeof CONTRACT_ADDRESSES
export type EthereumNetwork = 'sepolia' | 'mainnet'
export type SuiNetwork = 'sui'

// Helper functions
export function getEthereumConfig(network: EthereumNetwork) {
    return CONTRACT_ADDRESSES[network]
}

export function getSuiConfig() {
    return CONTRACT_ADDRESSES.sui
}

// Validation helpers
export function validateEthereumAddresses(network: EthereumNetwork): boolean {
    const config = CONTRACT_ADDRESSES[network]

    return !!(
        config.resolver &&
        config.escrowFactory &&
        config.escrowSrcImpl &&
        config.escrowDstImpl
    )
}

export function validateSuiAddresses(): boolean {
    const config = CONTRACT_ADDRESSES.sui

    return !!(config.resolver && config.escrowFactory && config.escrowSrcImpl && config.escrowDstImpl)
}
