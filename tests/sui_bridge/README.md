# Sui HTLC Bridge Tests

This directory contains comprehensive tests for the Sui HTLC Bridge system, demonstrating how to call Move contract functions from TypeScript.

## 🧪 Test Files

### Core Function Tests

| Test File | Purpose | Move Function | Status |
|-----------|---------|---------------|--------|
| `test-bridge-create.ts` | Create HTLC lock objects | `oneinch_move::create_lock_object` | ✅ Working |
| `test-bridge-withdraw.ts` | Withdraw from HTLC locks | `oneinch_move::withdraw` | ✅ Working |
| `test-bridge-cancel.ts` | Cancel HTLC locks | `oneinch_move::cancel` | ✅ Working |
| `test-bridge-utility.ts` | Account balance and objects | SDK utilities | ✅ Working |
| `test-bridge-comprehensive.ts` | Complete workflow demo | All functions | ✅ Working |

## 🚀 Quick Start

### Prerequisites

1. **Environment Setup**: Ensure `.env` file is in the root directory with:
   ```env
   SUI_PACKAGE_ID=0x4ee770a4c02fccfef7583c973f452c84708e6a08ed34c0d8477d8efe71612031
   SUI_UPGRADE_CAP_ID=0xf962022f4dbc88e69273beb03d04911c7618b31bf4537e14f5766d040814a2e0
   SUI_NETWORK=testnet
   SUI_PRIVATE_KEY=your_private_key_here
   ```

2. **Dependencies**: Install from root directory:
   ```bash
   npm install
   ```

### Running Tests

#### Individual Tests
```bash
# Create HTLC lock object
npm run test:bridge-create

# Withdraw from HTLC lock
npm run test:bridge-withdraw

# Cancel HTLC lock
npm run test:bridge-cancel

# Check account utilities
npm run test:bridge-utility

# Run comprehensive workflow
npm run test:bridge-comprehensive
```

#### All Tests
```bash
# Run all bridge tests
npm run test:all
```

## 📋 Test Details

### 1. Create Lock Object Test (`test-bridge-create.ts`)

**Purpose**: Demonstrates creating HTLC lock objects on Sui

**What it tests**:
- ✅ Bridge initialization
- ✅ Account balance checking
- ✅ Object listing
- ✅ HTLC lock object creation
- ✅ Transaction execution
- ✅ Lock object ID extraction

**Move Contract Call**:
```move
oneinch_move::create_lock_object<T>(
    clock: &Clock,
    withdrawal_ms: u64,
    public_withdrawal_ms: u64,
    cancellation_ms: u64,
    public_cancellation_ms: u64,
    hashed: vector<u8>,
    target: address,
    refund: address,
    amount: Coin<T>,
    deposit: Coin<T>,
    secret_length: u8,
    ctx: &mut TxContext
)
```

**Example Output**:
```
✅ Success! TypeScript → Move contract call worked!
📦 Lock ID: 0x72941d13de32e2551b6ffaadc4c0973b4f8850c5815c412e6e700240fdd76949
📋 Transaction: 6DnafagFFDcYXDDyEY91QuJzcBzX2FgJsFu856m6BhJP
```

### 2. Withdraw Lock Test (`test-bridge-withdraw.ts`)

**Purpose**: Demonstrates withdrawing from HTLC locks using secrets

**What it tests**:
- ✅ Lock object validation
- ✅ Secret verification
- ✅ Timelock conditions
- ✅ Withdrawal execution
- ✅ Object consumption

**Move Contract Call**:
```move
oneinch_move::withdraw<T>(
    lock: LockObject<T>,
    clock: &Clock,
    secret: vector<u8>,
    ctx: &mut TxContext
)
```

**Usage**:
```bash
# Set environment variables for testing
export TEST_LOCK_ID="0x72941d13de32e2551b6ffaadc4c0973b4f8850c5815c412e6e700240fdd76949"
export TEST_SECRET="my-secret-key-123"

npm run test:bridge-withdraw
```

### 3. Cancel Lock Test (`test-bridge-cancel.ts`)

**Purpose**: Demonstrates cancelling HTLC locks after timelock expiry

**What it tests**:
- ✅ Timelock validation
- ✅ Authorization checks
- ✅ Cancellation execution
- ✅ Fund return to refund address

**Move Contract Call**:
```move
oneinch_move::cancel<T>(
    lock: LockObject<T>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

### 4. Utility Functions Test (`test-bridge-utility.ts`)

**Purpose**: Demonstrates account information utilities

**What it tests**:
- ✅ Account balance retrieval
- ✅ Object listing
- ✅ Object details display
- ✅ Account summary

**Example Output**:
```
💰 Account Balance: 2.016581897 SUI
📦 Total Objects: 1
🔑 Account Address: 0x772cb3ccb855aac45bd2df96b250184fee970522871407d5f5f1074bf0585ee0
```

### 5. Comprehensive Test (`test-bridge-comprehensive.ts`)

**Purpose**: Demonstrates complete HTLC workflow

**What it tests**:
- ✅ Complete workflow from creation to completion
- ✅ Balance tracking
- ✅ Object management
- ✅ Transaction monitoring
- ✅ Error handling

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Sui HTLC Contract Configuration
SUI_PACKAGE_ID=0x4ee770a4c02fccfef7583c973f452c84708e6a08ed34c0d8477d8efe71612031
SUI_UPGRADE_CAP_ID=0xf962022f4dbc88e69273beb03d04911c7618b31bf4537e14f5766d040814a2e0
SUI_NETWORK=testnet
SUI_PRIVATE_KEY=f82983de553ff4d558e3ff728d1e93a9e66e41d7b2365500acdaafc024b0d551
```

### Test Parameters

Each test uses these default parameters:

```typescript
const createParams: HTLCLockParams = {
    hashLock: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    amount: '1000000000', // 1 SUI in MIST
    recipient: '0x1234567890123456789012345678901234567890123456789012345678901234',
    refund: '0x1234567890123456789012345678901234567890123456789012345678901234',
    withdrawalMs: 3600000, // 1 hour
    publicWithdrawalMs: 7200000, // 2 hours
    cancellationMs: 1800000, // 30 minutes
    publicCancellationMs: 3600000, // 1 hour
    secretLength: 16,
    safetyDeposit: '100000000' // 0.1 SUI in MIST
};
```

## 🚨 Troubleshooting

### Common Issues

1. **"SUI_PACKAGE_ID environment variable is required"**
   - Ensure `.env` file exists in root directory
   - Check environment variable names are correct

2. **"The following input objects are invalid"**
   - Lock object has been consumed or doesn't exist
   - Use a fresh lock ID from a recent creation

3. **"Transaction failed"**
   - Check account has sufficient SUI for gas
   - Verify network connectivity
   - Ensure package ID is correct

4. **"Timelock not expired"**
   - Wait for timelock conditions to be met
   - Check timelock parameters in test

### Debug Tips

1. **Check transaction on explorer**:
   ```bash
   # View transaction details
   echo "https://suiexplorer.com/txblock/{TRANSACTION_DIGEST}?network=testnet"
   ```

2. **Verify package deployment**:
   ```bash
   # Check package exists
   curl "https://fullnode.testnet.sui.io:443" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "id": 1,
       "method": "sui_getObject",
       "params": ["0x4ee770a4c02fccfef7583c973f452c84708e6a08ed34c0d8477d8efe71612031", {"showContent": true}]
     }'
   ```

3. **Get testnet SUI**:
   - Visit: https://suiexplorer.com/faucet
   - Request testnet SUI tokens

## 📚 References

- [Sui Move Bootcamp H4 Solution](https://github.com/MystenLabs/sui-move-bootcamp/tree/h4-solution/H4)
- [Sui TypeScript SDK](https://docs.sui.io/guides/developer/first-app/client-tssdk)
- [Sui Move Documentation](https://docs.sui.io/guides/developer/move)
- [Bridge Implementation](../mock-backend/sui-contract-bridge.ts)

## 🤝 Contributing

When adding new tests:

1. Follow the existing naming convention: `test-bridge-{function}.ts`
2. Include comprehensive error handling
3. Add detailed logging for debugging
4. Update this README with test details
5. Ensure tests are safe to run (use environment variables for sensitive data)

## 📄 License

MIT License - see LICENSE file for details 