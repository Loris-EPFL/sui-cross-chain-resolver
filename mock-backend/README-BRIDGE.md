# Sui HTLC Contract Bridge System

This system provides a clean TypeScript interface to call your Sui Move contract functions, following the patterns from the [Sui Move Bootcamp H4 solution](https://github.com/MystenLabs/sui-move-bootcamp/tree/h4-solution/H4).

## 🏗️ System Architecture

```
TypeScript Function Call → Bridge Class → Sui SDK → Move Contract Function
```

### Key Components

1. **`SuiHTLCBridge`** - Main bridge class that handles TypeScript → Move contract calls
2. **Type Interfaces** - Strongly typed parameters for each function
3. **Error Handling** - Comprehensive error handling and result types
4. **Transaction Management** - Proper transaction building and execution

## 📁 Files

- `sui-contract-bridge.ts` - Main bridge implementation
- `test-bridge.ts` - Test script to demonstrate usage
- `sui-client.ts` - Original client (for reference)
- `sui_server.ts` - Mock server for testing

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Bridge Test

```bash
npm run test-bridge
```

### 3. Use in Your Code

```typescript
import { SuiHTLCBridge, HTLCLockParams } from './sui-contract-bridge';

// Initialize the bridge
const bridge = new SuiHTLCBridge();

// Create HTLC lock object
const params: HTLCLockParams = {
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

const result = await bridge.createLockObject(params);

if (result.success) {
    console.log('Lock created:', result.lockId);
    console.log('Transaction:', result.txDigest);
} else {
    console.error('Error:', result.error);
}
```

## 🔧 Available Functions

### 1. Create Lock Object

```typescript
async createLockObject(params: HTLCLockParams): Promise<HTLCResult>
```

**TypeScript Call:**
```typescript
const result = await bridge.createLockObject({
    hashLock: '0x...',
    amount: '1000000000',
    recipient: '0x...',
    refund: '0x...',
    withdrawalMs: 3600000,
    publicWithdrawalMs: 7200000,
    cancellationMs: 1800000,
    publicCancellationMs: 3600000,
    secretLength: 16,
    safetyDeposit: '100000000'
});
```

**Move Contract Call:**
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

### 2. Withdraw Lock Object

```typescript
async withdrawLock(params: HTLCWithdrawParams): Promise<HTLCResult>
```

**TypeScript Call:**
```typescript
const result = await bridge.withdrawLock({
    lockId: '0x...',
    secret: 'my-secret-key-123'
});
```

**Move Contract Call:**
```move
oneinch_move::withdraw<T>(
    lock: LockObject<T>,
    clock: &Clock,
    secret: vector<u8>,
    ctx: &mut TxContext
)
```

### 3. Cancel Lock Object

```typescript
async cancelLock(params: HTLCCancelParams): Promise<HTLCResult>
```

**TypeScript Call:**
```typescript
const result = await bridge.cancelLock({
    lockId: '0x...'
});
```

**Move Contract Call:**
```move
oneinch_move::cancel<T>(
    lock: LockObject<T>,
    clock: &Clock,
    ctx: &mut TxContext
)
```

## 📊 Type Definitions

### HTLCLockParams
```typescript
interface HTLCLockParams {
    hashLock: string;           // Hash of the secret (32 bytes)
    amount: string;             // Amount in MIST
    recipient: string;          // Target address
    refund: string;             // Refund address
    withdrawalMs: number;       // Withdrawal timelock in milliseconds
    publicWithdrawalMs: number; // Public withdrawal timelock in milliseconds
    cancellationMs: number;     // Cancellation timelock in milliseconds
    publicCancellationMs: number; // Public cancellation timelock in milliseconds
    secretLength: number;       // Secret length in bytes
    safetyDeposit: string;      // Safety deposit amount in MIST
}
```

### HTLCWithdrawParams
```typescript
interface HTLCWithdrawParams {
    lockId: string;  // Lock object ID
    secret: string;  // Secret to unlock
}
```

### HTLCCancelParams
```typescript
interface HTLCCancelParams {
    lockId: string;  // Lock object ID
}
```

### HTLCResult
```typescript
interface HTLCResult {
    success: boolean;      // Whether the operation succeeded
    txDigest?: string;     // Transaction digest
    lockId?: string;       // Created lock object ID (for create operations)
    error?: string;        // Error message if failed
    details?: any;         // Full transaction details
}
```

## 🔍 Key Features

### 1. **Type Safety**
- Strongly typed parameters and return values
- TypeScript interfaces for all Move contract functions
- Compile-time error checking

### 2. **Error Handling**
- Comprehensive error handling with detailed error messages
- Graceful failure with result objects
- Full transaction details for debugging

### 3. **Transaction Management**
- Proper transaction building following Sui SDK patterns
- Clock object handling
- Coin splitting for amounts and deposits
- Type arguments for generic functions

### 4. **Bootcamp Patterns**
- Follows patterns from [Sui Move Bootcamp H4](https://github.com/MystenLabs/sui-move-bootcamp/tree/h4-solution/H4)
- Proper Clock object usage
- Correct argument formatting for Move functions
- Transaction block management

## 🧪 Testing

### Run Tests
```bash
# Test the bridge system
npm run test-bridge

# Test the original client
npm run sui-client

# Start the mock server
npm run sui
```

### Test Output
The test will show:
1. ✅ Balance check
2. ✅ Objects check  
3. ✅ Create lock object (TypeScript → Move contract call)
4. 💡 Withdrawal example (commented for safety)
5. 💡 Cancellation example (commented for safety)

## 🔧 Configuration

### Package IDs
```typescript
const SUI_PACKAGE_ID = '0xab2f571babee3b229c3bc5602bdb80a7167028fb2961f0757e2008de90370f00';
const SUI_UPGRADE_CAP_ID = '0xf962022f4dbc88e69273beb03d04911c7618b31bf4537e14f5766d040814a2e0';
```

### Network
- **Testnet**: `getFullnodeUrl('testnet')`
- **Mainnet**: `getFullnodeUrl('mainnet')`

## 🚨 Troubleshooting

### Common Issues

1. **"Incorrect number of arguments"**
   - Ensure all required parameters are provided
   - Check parameter types match Move function signature
   - Verify Clock object is properly obtained

2. **"Transaction failed"**
   - Check account has sufficient SUI for gas
   - Verify package ID is correct
   - Ensure network connectivity

3. **"Object not found"**
   - Verify lock object ID exists
   - Check object ownership
   - Ensure object hasn't been consumed

### Debug Tips

1. **Enable detailed logging**
   ```typescript
   console.log('Transaction details:', result.details);
   ```

2. **Check transaction on explorer**
   ```typescript
   console.log('View on explorer:', `https://suiexplorer.com/txblock/${result.txDigest}?network=testnet`);
   ```

3. **Verify package deployment**
   ```typescript
   // Check package exists
   const packageDetails = await client.getObject({
       id: SUI_PACKAGE_ID,
       options: { showContent: true }
   });
   ```

## 📚 References

- [Sui Move Bootcamp H4 Solution](https://github.com/MystenLabs/sui-move-bootcamp/tree/h4-solution/H4)
- [Sui TypeScript SDK Documentation](https://docs.sui.io/guides/developer/first-app/client-tssdk)
- [Sui Move Documentation](https://docs.sui.io/guides/developer/move)
- [Hedera Smart Contract Documentation](https://docs.hedera.com/hedera/sdks-and-apis/sdks/smart-contracts/call-a-smart-contract-function)

## 🤝 Contributing

1. Follow the existing patterns from the bootcamp
2. Add proper TypeScript types for new functions
3. Include comprehensive error handling
4. Add tests for new functionality
5. Update documentation

## 📄 License

MIT License - see LICENSE file for details 