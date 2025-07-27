# Cross-Chain Resolver Contracts

This repository contains smart contracts for cross-chain atomic swaps using 1inch Limit Order Protocol and escrow mechanisms.

## Deploy

forge script script/Deploy.s.sol --rpc-url https://g.w.lavanet.xyz:443/gateway/sep1/rpc-http/d3630392db153e71701cd89c262c116e --broadcast --verify --etherscan-api-key Z9B5MXNKT667U3XME3GGU273AD4DHWHCVW -vvv

## Contract Architecture

### Contract Interconnection Flow

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│  1inch LOP v4       │    │   TestEscrowFactory  │    │     Resolver        │
│  (External)         │◄───┤   (Factory)          │◄───┤   (Orchestrator)    │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
                                      │                           │
                                      ▼                           ▼
                           ┌─────────────────────┐    ┌─────────────────────┐
                           │    EscrowSrc        │    │    Cross-chain      │
                           │  (Source Chain)     │    │    Swap Logic       │
                           └─────────────────────┘    └─────────────────────┘
                                      │
                                      ▼
                           ┌─────────────────────┐
                           │    EscrowDst        │
                           │ (Destination Chain) │
                           └─────────────────────┘
```

### Contract Descriptions

#### 1. TestEscrowFactory
- **Purpose**: Factory contract that creates escrow contracts for cross-chain swaps
- **Inherits from**: `EscrowFactory` (from cross-chain-swap library)
- **Constructor Parameters**:
  - `limitOrderProtocol`: Address of 1inch Limit Order Protocol v4
  - `feeToken`: IERC20 token used for fees (typically USDC)
  - `accessToken`: IERC20 token for access control (can be zero address)
  - `owner`: Address that owns the factory
  - `rescueDelaySrc`: Rescue delay for source chain escrows (seconds)
  - `rescueDelayDst`: Rescue delay for destination chain escrows (seconds)

#### 2. Resolver
- **Purpose**: Main orchestrator contract for cross-chain swaps
- **Constructor Parameters**:
  - `factory`: IEscrowFactory (the TestEscrowFactory instance)
  - `lop`: IOrderMixin (1inch Limit Order Protocol)
  - `initialOwner`: Address that owns the resolver
- **Key Functions**:
  - `deploySrc()`: Deploys escrow on source chain
  - `deployDst()`: Deploys escrow on destination chain
  - `withdraw()`: Withdraws funds from escrow
  - `cancel()`: Cancels escrow
  - `arbitraryCalls()`: Admin function for arbitrary calls

#### 3. EscrowSrc & EscrowDst
- **Purpose**: Escrow contracts that lock funds during cross-chain swaps
- **Created by**: TestEscrowFactory during deployment
- **Constructor Parameter**: `rescueDelay` (uint32)

## Deployment Dependencies

1. **TestEscrowFactory** must be deployed first
2. **Resolver** depends on TestEscrowFactory address
3. Both contracts need the same **1inch Limit Order Protocol** address
4. **Fee token** (USDC) must exist on the target network

## Test Integration

The `tests/main.spec.ts` file demonstrates the complete integration:

```typescript
// From initChain function in main.spec.ts
const escrowFactory = await deploy(
    factoryContract,
    [
        cnf.limitOrderProtocol,     // 1inch LOP address
        cnf.wrappedNative,          // feeToken (WETH/USDC)
        Address.fromBigInt(0n).toString(), // accessToken (none)
        deployer.address,           // owner
        60 * 30,                    // src rescue delay (30 min)
        60 * 30                     // dst rescue delay (30 min)
    ],
    provider,
    deployer
)

const resolver = await deploy(
    resolverContract,
    [
        escrowFactory,              // factory address
        cnf.limitOrderProtocol,     // 1inch LOP address
        computeAddress(resolverPk)  // resolver owner
    ],
    provider,
    deployer
)
```

## Deployment Guide

### Prerequisites

1. Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your values:
# PRIVATE_KEY=your_private_key
# SEPOLIA_RPC_URL=your_sepolia_rpc
# ETHERSCAN_API_KEY=your_etherscan_key
```

### Deploy to Sepolia

```bash
# Install dependencies
forge install

# Deploy contracts
forge script script/Deploy.s.sol:DeployScript --rpc-url sepolia --broadcast --verify
```

### Deploy to Other Networks

Update the constants in `script/Deploy.s.sol`:

```solidity
// For Mainnet
address constant LIMIT_ORDER_PROTOCOL_MAINNET = 0x111111125421cA6dc452d289314280a0f8842A65;
address constant USDC_MAINNET = 0xA0b86a33E6441b8435b662303c0f479c6e8c385;

// For Polygon
address constant LIMIT_ORDER_PROTOCOL_POLYGON = 0x111111125421cA6dc452d289314280a0f8842A65;
address constant USDC_POLYGON = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
```

## Contract Verification

After deployment, the script automatically generates verification commands. Example:

```bash
# Verify TestEscrowFactory
forge verify-contract 0x123... src/TestEscrowFactory.sol:TestEscrowFactory \
  --chain sepolia \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address,uint32,uint32)" \
    0x119c71D3BbAC22029622cbaEc24854d3D32D2828 \
    0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
    0x0000000000000000000000000000000000000000 \
    0xYourAddress \
    1800 \
    1800)

# Verify Resolver
forge verify-contract 0x456... src/Resolver.sol:Resolver \
  --chain sepolia \
  --constructor-args $(cast abi-encode "constructor(address,address,address)" \
    0x123... \
    0x119c71D3BbAC22029622cbaEc24854d3D32D2828 \
    0xYourAddress)
```

## Network Addresses

### Sepolia Testnet
- **1inch LOP v4**: `0x119c71D3BbAC22029622cbaEc24854d3D32D2828`
- **USDC**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- **WETH**: `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14`

### Mainnet
- **1inch LOP v4**: `0x111111125421cA6dc452d289314280a0f8842A65`
- **USDC**: `0xA0b86a33E6441b8435b662303c0f479c6e8c385`
- **WETH**: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`

## Security Considerations

1. **Rescue Delays**: Set appropriate rescue delays (recommended: 30 minutes to 24 hours)
2. **Access Control**: Consider using access tokens for additional security
3. **Fee Management**: Ensure fee token is properly configured
4. **Owner Privileges**: Resolver owner has significant privileges - use multisig

## Testing

Run the existing TypeScript tests to verify integration:

```bash
cd ../tests
npm install
npm test
```

## Troubleshooting

### Common Issues

1. **"Execution reverted for an unknown reason"**
   - Check constructor parameters match expected types
   - Ensure rescue delays are provided for EscrowSrc/EscrowDst

2. **"RPC Request failed"**
   - Try different RPC endpoints
   - Check network connectivity
   - Verify gas estimation

3. **Import Resolution Issues**
   - Ensure `remappings.txt` is properly configured
   - Run `forge remappings` to verify mappings

### Gas Optimization

The contracts are optimized with:
- `optimizer_runs = 1000000`
- `via-ir = true`
- `evm_version = 'shanghai'`

## License

MIT License - see LICENSE file for details.