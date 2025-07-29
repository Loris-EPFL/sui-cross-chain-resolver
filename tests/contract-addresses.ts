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

        // Deployed contract addresses from terminal output
        resolver: '0x84c1c077d66fC8732aeAf7E49a16ED8Ac8f4Eb29' as `0x${string}`,
        escrowFactory: '0xB7738459D3625dDCDe88f643cd6f7c203151F866' as `0x${string}`,
        escrowSrcImpl: '0x498EC343133E3F8773C8E58D9D4092b0ae8Ab9E6' as `0x${string}`,
        escrowDstImpl: '0x1aD0b5004c20acdB7761F035c5f1749D2E78Db47' as `0x${string}`,
        limitOrderProtocol: '0x739Ba97D4e5796Fe36f970E1E37b2098296Edd40' as `0x${string}`,

        // Token addresses
        tokens: {
            USDC: {
                address: '0xF48FE19D9F4800Df46953B94DC6B45E8E059EA7E' as `0x${string}`,
                decimals: 6
            }
        }
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
        limitOrderProtocol: '' as `0x${string}`,

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
        config.escrowDstImpl &&
        config.limitOrderProtocol
    )
}

export function validateSuiAddresses(): boolean {
    const config = CONTRACT_ADDRESSES.sui

    return !!(config.resolver && config.escrowFactory && config.escrowSrcImpl && config.escrowDstImpl)
}
