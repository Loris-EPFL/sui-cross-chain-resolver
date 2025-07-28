# Project Structure Documentation

This document provides a detailed overview of the Sui Cross-Chain Resolver project structure, explaining the purpose and organization of each component.

## 📁 Root Directory Structure

```
sui-cross-chain-resolver/
├── 📁 mock-backend/                    # Sui HTLC Bridge System
├── 📁 tests/                          # Test Suite
├── 📁 contracts/                      # Solidity Contracts
├── 📁 src/                           # Source Code
├── 📄 package.json                   # Root dependencies & scripts
├── 📄 tsconfig.json                  # TypeScript configuration
├── 📄 README.md                      # Main project documentation
├── 📄 README-CROSS-CHAIN.md         # Cross-chain swap logic
├── 📄 PROJECT-STRUCTURE.md           # This file
├── 📄 .env                          # Environment variables
├── 📄 .gitignore                    # Git ignore rules
├── 📄 .gitmodules                   # Git submodules
├── 📄 .prettierrc.js                # Prettier configuration
├── 📄 eslint.config.mjs             # ESLint configuration
├── 📄 foundry.toml                  # Foundry configuration
├── 📄 jest.config.mjs               # Jest configuration
├── 📄 remappings.txt                # Solidity import remappings
└── 📄 pnpm-lock.yaml                # Package lock file
```

## 🔧 Core Components

### 1. Sui HTLC Bridge System (`mock-backend/`)

**Purpose**: Provides a clean TypeScript interface to call Sui Move contract functions.

**Key Files**:
- `sui-contract-bridge.ts` - Main bridge implementation with all HTLC functions
- `server.js` - Mock 1inch API server for testing
- `package.json` - Bridge-specific dependencies
- `README-BRIDGE.md` - Detailed bridge documentation

**Bridge Functions**:
- `createLockObject()` - Creates HTLC lock objects
- `withdrawLock()` - Withdraws from HTLC locks
- `cancelLock()` - Cancels HTLC locks
- `getBalance()` - Gets account balance
- `getObjects()` - Gets account objects

### 2. Test Suite (`tests/`)

**Purpose**: Comprehensive testing for all project components.

**Structure**:
```
tests/
├── 📁 sui_bridge/                    # Sui Bridge Tests
│   ├── test-bridge-create.ts         # Create lock objects
│   ├── test-bridge-withdraw.ts       # Withdraw from locks
│   ├── test-bridge-cancel.ts         # Cancel locks
│   ├── test-bridge-utility.ts        # Account utilities
│   ├── test-bridge-comprehensive.ts  # Complete workflow
│   └── README.md                     # Test documentation
├── main.spec.ts                      # Original 1inch tests
├── api-integration.spec.ts           # API integration tests
├── config.ts                         # Test configuration
├── escrow-factory.ts                 # Escrow factory utilities
├── resolver.ts                       # Resolver utilities
└── wallet.ts                         # Wallet utilities
```

**Test Coverage**:
- ✅ Create HTLC lock objects
- ✅ Withdraw from HTLC locks
- ✅ Cancel HTLC locks
- ✅ Account balance and objects
- ✅ Complete workflow testing
- ✅ 1inch API integration
- ✅ Cross-chain swap logic

### 3. Smart Contracts (`contracts/`)

**Purpose**: Solidity contracts for Ethereum-side cross-chain functionality.

**Structure**:
```
contracts/
├── 📁 src/
│   ├── Resolver.sol                  # Cross-chain resolver contract
│   └── TestEscrowFactory.sol         # Escrow factory contract
├── 📁 lib/                          # Dependencies
│   ├── cross-chain-swap/            # 1inch cross-chain swap library
│   └── forge-std/                   # Foundry standard library
├── foundry.toml                     # Foundry configuration
└── remappings.txt                   # Import remappings
```

**Contract Functions**:
- `deploySrc()` - Deploy source chain escrow
- `deployDst()` - Deploy destination chain escrow
- `withdraw()` - Withdraw from escrow
- `cancel()` - Cancel escrow
- `arbitraryCalls()` - Execute arbitrary calls

### 4. Source Code (`src/`)

**Purpose**: Core application logic and utilities.

**Structure**:
```
src/
└── 📁 utils/
    └── direct-api-client.ts          # 1inch API client implementation
```

**Key Features**:
- Direct 1inch API integration
- Sui address handling
- Cross-chain quote generation
- Order management

## 🧪 Testing Strategy

### Test Organization

1. **Sui Bridge Tests** (`tests/sui_bridge/`)
   - Individual function tests
   - Comprehensive workflow tests
   - Error handling tests
   - Integration tests

2. **1inch Integration Tests** (`tests/`)
   - API integration tests
   - Cross-chain swap tests
   - Address validation tests

3. **Contract Tests** (`contracts/`)
   - Solidity contract tests
   - Escrow functionality tests
   - Cross-chain logic tests

### Test Execution

```bash
# Sui Bridge Tests
npm run test:bridge-create      # Create lock objects
npm run test:bridge-withdraw    # Withdraw from locks
npm run test:bridge-cancel      # Cancel locks
npm run test:bridge-utility     # Account utilities
npm run test:bridge-comprehensive  # Complete workflow

# All Bridge Tests
npm run test:all

# Original 1inch Tests
npm test

# Contract Tests
forge test
```

## 🔧 Configuration Files

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "node"
  },
  "include": [
    "mock-backend/**/*.ts",
    "tests/**/*.ts",
    "src/**/*.ts"
  ]
}
```

### Package Configuration (`package.json`)

**Root Dependencies**:
- `@1inch/cross-chain-sdk` - 1inch cross-chain SDK
- `@mysten/sui.js` - Sui TypeScript SDK
- `ethers` - Ethereum library
- `axios` - HTTP client

**Test Scripts**:
- `test:bridge-*` - Individual bridge function tests
- `test:all` - All bridge tests
- `test` - Original 1inch tests

### Environment Configuration (`.env`)

```env
# Sui Configuration
SUI_PACKAGE_ID=0x4ee770a4c02fccfef7583c973f452c84708e6a08ed34c0d8477d8efe71612031
SUI_UPGRADE_CAP_ID=0xf962022f4dbc88e69273beb03d04911c7618b31bf4537e14f5766d040814a2e0
SUI_NETWORK=testnet
SUI_PRIVATE_KEY=your_private_key_here

# 1inch Configuration
ONE_INCH_API_KEY=your_api_key_here
ONE_INCH_API_URL=https://api.1inch.dev
```

## 🚀 Development Workflow

### 1. Setup

```bash
# Clone repository
git clone <repository-url>
cd sui-cross-chain-resolver

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration
```

### 2. Development

```bash
# Start mock server
cd mock-backend
npm start

# Run tests
npm run test:all

# Build contracts
forge build
```

### 3. Testing

```bash
# Test specific functions
npm run test:bridge-create
npm run test:bridge-withdraw
npm run test:bridge-cancel

# Test all bridge functions
npm run test:all

# Test 1inch integration
npm test
```

### 4. Deployment

```bash
# Deploy contracts
forge script Deploy

# Deploy Sui contracts
sui client publish --gas-budget 10000000
```

## 📚 Documentation Structure

### Main Documentation

1. **README.md** - Main project overview and quick start
2. **README-CROSS-CHAIN.md** - Cross-chain swap logic details
3. **PROJECT-STRUCTURE.md** - This file, detailed structure overview

### Component Documentation

1. **`mock-backend/README-BRIDGE.md`** - Sui HTLC Bridge system
2. **`tests/sui_bridge/README.md`** - Test suite documentation

### Code Documentation

- Inline comments in all TypeScript files
- JSDoc comments for all functions
- Comprehensive error messages
- Detailed logging for debugging

## 🔄 Cross-Chain Architecture

### Flow Diagram

```
User Request → TypeScript Frontend
                    ↓
            Sui HTLC Bridge → Sui Move Contracts
                    ↓
            1inch Fusion+ API → Ethereum Escrow Contracts
                    ↓
            Atomic Swap Completion
```

### Key Integration Points

1. **Sui Side**:
   - HTLC lock object creation
   - Secret-based withdrawal
   - Timelock-based cancellation

2. **Ethereum Side**:
   - Escrow deployment
   - Order management
   - Cross-chain coordination

3. **1inch Integration**:
   - Quote generation
   - Order creation
   - Address validation bypass

## 🛠️ Maintenance

### Regular Tasks

1. **Update Dependencies**:
   ```bash
   npm update
   forge update
   ```

2. **Run All Tests**:
   ```bash
   npm run test:all
   npm test
   forge test
   ```

3. **Update Documentation**:
   - Update README files
   - Update inline comments
   - Update test documentation

### Adding New Features

1. **Bridge Functions**:
   - Add to `mock-backend/sui-contract-bridge.ts`
   - Create test in `tests/sui_bridge/`
   - Update documentation

2. **Contract Functions**:
   - Add to `contracts/src/`
   - Create tests
   - Update deployment scripts

3. **API Integration**:
   - Add to `src/utils/`
   - Create integration tests
   - Update configuration

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Follow the existing code structure
2. Add comprehensive tests
3. Update documentation
4. Ensure all tests pass
5. Submit pull request

## 🔗 Links

- [Sui Documentation](https://docs.sui.io/)
- [1inch Fusion+ API](https://docs.1inch.io/docs/fusion-plus/introduction)
- [Sui Move Bootcamp](https://github.com/MystenLabs/sui-move-bootcamp)
- [Cross-Chain SDK](https://github.com/1inch/cross-chain-sdk) 