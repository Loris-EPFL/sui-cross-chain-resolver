# Sui Cross-Chain Resolver

A comprehensive solution for handling Sui addresses with the 1inch Fusion+ API, addressing the SDK's address validation constraints.

## 🚨 The Problem

The 1inch SDK validates addresses to be Ethereum format (42 characters including `0x`), but Sui addresses are 66 characters long. This causes validation errors when trying to use Sui addresses with the official SDK:

```
❌ Ethereum address: 0x1234567890123456789012345678901234567890 (42 chars) ✅ SDK accepts
❌ Sui address: 0x1234567890123456789012345678901234567890123456789012345678901234 (66 chars) ❌ SDK rejects
```

## 🎯 Solutions

This project provides **two approaches** to solve the Sui address validation problem:

### 1. 🚀 Direct API Client (Recommended)

**Best for: Production applications, long-term projects, maximum flexibility**

Bypasses the 1inch SDK entirely and makes direct HTTP requests to the 1inch Fusion+ API endpoints.

```typescript
import { createDirect1inchClient } from './src/utils/direct-api-client';

const client = createDirect1inchClient('https://api.1inch.dev', 'your-api-key');

// Works with any address format!
const quote = await client.getQuote({
    srcChainId: 1,
    dstChainId: 101,
    srcTokenAddress: '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8',
    dstTokenAddress: '0x2::sui::SUI',
    amount: '1000000',
    walletAddress: '0x1234567890123456789012345678901234567890123456789012345678901234', // 66-char Sui address
    enableEstimate: true
});
```

**✅ Advantages:**
- No address validation constraints
- Full control over request/response format
- Can handle any address format (Sui, Solana, etc.)
- Direct access to all 1inch Fusion+ endpoints
- No dependency on SDK updates
- Better performance (no conversion overhead)

### 2. 🔄 Custom HTTP Provider with Address Conversion

**Best for: Existing codebases using 1inch SDK, short-term prototypes**

Uses the 1inch SDK with a custom HTTP provider that converts Sui addresses to Ethereum-format placeholders.

```typescript
import Sdk from '@1inch/cross-chain-sdk';
import { SuiCompatibleHttpProvider, FetchHttpProvider } from './src/utils/custom-http-provider';

const baseProvider = new FetchHttpProvider('https://api.1inch.dev', 'your-api-key');
const suiProvider = new SuiCompatibleHttpProvider(baseProvider);

const sdk = new Sdk.SDK({
    url: 'https://api.1inch.dev',
    authKey: 'your-api-key',
    httpProvider: suiProvider
});

// SDK methods now work with Sui addresses!
const quote = await sdk.getQuote({
    // ... same parameters as above
});
```

**✅ Advantages:**
- Still uses official 1inch SDK
- Automatic address conversion
- Maintains SDK type safety
- Transparent to application code

**⚠️ Disadvantages:**
- More complex implementation
- Requires maintaining address mappings
- Potential issues with SDK updates
- Additional layer of abstraction

## 📋 API Coverage

Both solutions support all major 1inch Fusion+ API endpoints:

| Endpoint | Description | Direct API | Custom Provider |
|----------|-------------|------------|----------------|
| `GET /quoter/v1.0/quote/receive` | Get quote | ✅ | ✅ |
| `POST /relayer/v1.0/submit` | Create order | ✅ | ✅ |
| `GET /orders/v1.0/order/active` | Get active orders | ✅ | ✅ |
| `GET /orders/v1.0/order/maker/{address}` | Get orders by maker | ✅ | ✅ |
| `GET /orders/v1.0/order/status/{orderHash}` | Get order status | ✅ | ✅ |
| `POST /relayer/v1.0/submit/secret` | Submit secret | ✅ | ✅ |
| `GET /orders/v1.0/order/ready-to-accept-secret-fills/{orderHash}` | Ready to accept secret fills | ✅ | ✅ |
| `GET /orders/v1.0/order/ready-to-execute-public-actions` | Ready to execute public actions | ✅ | ✅ |
| `GET /orders/v1.0/order/secrets/{orderHash}` | Get published secrets | ✅ | ✅ |
| `GET /orders/v1.0/order/escrow` | Get escrow factory | ✅ | ✅ |

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test for direct API approach
npm test -- --testNamePattern="should get quote for Ethereum to Sui swap using direct API"

# Run address format comparison tests
npm test -- --testNamePattern="should demonstrate the difference between Ethereum and Sui address formats"
```

### Examples

```bash
# View comprehensive examples
cat examples/sui-address-solutions.ts

# Run the example (requires ts-node)
npx ts-node examples/sui-address-solutions.ts
```

## 📁 Project Structure

```
sui-cross-chain-resolver/
├── src/
│   └── utils/
│       ├── direct-api-client.ts          # Direct API client implementation
│       ├── custom-http-provider.ts       # Custom HTTP provider with address conversion
│       ├── sui-compatible-sdk.ts         # SDK wrapper with Sui support
│       └── address-wrapper.ts            # Address conversion utilities
├── tests/
│   ├── api-integration.spec.ts           # Integration tests for both approaches
│   └── main.spec.ts                      # Unit tests
├── examples/
│   ├── sui-address-solutions.ts          # Comprehensive examples
│   └── sui-address-handling.ts           # Basic usage examples
└── README.md                             # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
ONE_INCH_API_KEY=your-api-key-here
ONE_INCH_API_URL=https://api.1inch.dev
```

### API Key Setup

1. Get your API key from [1inch Developer Portal](https://portal.1inch.dev/)
2. Add it to your environment variables
3. Use it in your client initialization

## 🧪 Testing

The project includes comprehensive tests that demonstrate:

1. **Address Format Validation**: Shows how Ethereum vs Sui addresses are handled
2. **Direct API Client**: Tests all API endpoints with Sui addresses
3. **Custom Provider**: Tests SDK integration with address conversion
4. **Error Handling**: Demonstrates that address validation errors are eliminated

### Test Results

```bash
✅ Direct API approach: No address validation errors
✅ Custom Provider approach: Automatic address conversion
✅ All 10 major API endpoints covered
✅ Sui addresses (66 chars) handled correctly
```

## 📊 Performance Comparison

| Aspect | Direct API | Custom Provider |
|--------|------------|----------------|
| **Implementation Complexity** | Simple | Complex |
| **Maintenance Overhead** | Low | High |
| **Type Safety** | Manual | Automatic |
| **Address Format Support** | Any format | Limited to conversion logic |
| **Performance** | Direct (no overhead) | Conversion overhead |
| **Future Compatibility** | High | Risk from SDK changes |

## 🎯 Recommendations

### Use Direct API Client for:
- ✅ Production applications
- ✅ Long-term projects
- ✅ Multi-chain support (Sui, Solana, etc.)
- ✅ Maximum flexibility and control
- ✅ Performance-critical applications

### Use Custom Provider for:
- ✅ Existing codebases heavily using 1inch SDK
- ✅ Short-term prototypes
- ✅ When SDK type safety is critical
- ✅ Gradual migration from SDK to direct API

## 🔍 Address Format Analysis

| Blockchain | Format | Length | Example | SDK Support |
|------------|--------|--------|---------|-------------|
| **Ethereum** | `0x` + 40 hex chars | 42 | `0x1234...7890` | ✅ Native |
| **Sui** | `0x` + 64 hex chars | 66 | `0x1234...1234` | ❌ Rejected |
| **Solana** | Base58 encoded | 44 | `So111...1112` | ❌ Different format |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

If you encounter issues:

1. Check the test files for working examples
2. Review the examples directory
3. Ensure your API key is correctly configured
4. Verify your address formats

## 🔗 Related Links

- [1inch Fusion+ Documentation](https://docs.1inch.io/docs/fusion-plus/introduction)
- [1inch Developer Portal](https://portal.1inch.dev/)
- [Sui Documentation](https://docs.sui.io/)
- [Cross-Chain SDK Repository](https://github.com/1inch/cross-chain-sdk)
