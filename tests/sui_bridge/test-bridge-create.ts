import { SuiHTLCBridge, HTLCLockParams, HTLCWithdrawParams, HTLCCancelParams } from '../../mock-backend/sui-contract-bridge';

/**
 * Test the Sui HTLC Bridge System
 * 
 * This demonstrates how to call your Move contract functions from TypeScript
 */
async function testBridge() {
    console.log('🧪 Testing Sui HTLC Bridge System...');
    console.log('📦 Following patterns from Sui Move Bootcamp H4');
    console.log('');

    // Initialize the bridge
    const bridge = new SuiHTLCBridge();

    try {
        // Test 1: Check balance
        console.log('=== Test 1: Check Balance ===');
        await bridge.getBalance();
        console.log('');

        // Test 2: Check objects
        console.log('=== Test 2: Check Objects ===');
        await bridge.getObjects();
        console.log('');

        // Test 3: Create HTLC lock object
        console.log('=== Test 3: Create HTLC Lock Object ===');
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

        console.log('📝 Calling TypeScript function: bridge.createLockObject()');
        console.log('🔧 This will call Move function: oneinch_move::create_lock_object');
        console.log('📦 Parameters:', JSON.stringify(createParams, null, 2));
        console.log('');

        const createResult = await bridge.createLockObject(createParams);
        
        if (createResult.success) {
            console.log('✅ Success! TypeScript → Move contract call worked!');
            console.log('📦 Lock ID:', createResult.lockId);
            console.log('📋 Transaction:', createResult.txDigest);
            console.log('🔗 View on explorer:', `https://suiexplorer.com/txblock/${createResult.txDigest}?network=testnet`);
            console.log('');

            // Test 4: Withdraw (commented out for safety)
            console.log('=== Test 4: Withdraw Lock Object (Commented for Safety) ===');
            console.log('💡 Uncomment the following code to test withdrawal:');
            console.log('');
            console.log('const withdrawParams: HTLCWithdrawParams = {');
            console.log('    lockId: createResult.lockId!,');
            console.log('    secret: "my-secret-key-123"');
            console.log('};');
            console.log('const withdrawResult = await bridge.withdrawLock(withdrawParams);');
            console.log('console.log("Withdraw result:", withdrawResult);');
            console.log('');

            // Test 5: Cancel (commented out for safety)
            console.log('=== Test 5: Cancel Lock Object (Commented for Safety) ===');
            console.log('💡 Uncomment the following code to test cancellation:');
            console.log('');
            console.log('const cancelParams: HTLCCancelParams = {');
            console.log('    lockId: createResult.lockId!');
            console.log('};');
            console.log('const cancelResult = await bridge.cancelLock(cancelParams);');
            console.log('console.log("Cancel result:", cancelResult);');
            console.log('');

        } else {
            console.error('❌ Failed to create lock:', createResult.error);
            console.log('📋 Error details:', createResult.details);
        }

    } catch (error) {
        console.error('❌ Test execution error:', error);
        console.log('');
        console.log('💡 Tips:');
        console.log('1. Make sure you have SUI tokens on testnet');
        console.log('2. Get testnet SUI from: https://suiexplorer.com/faucet');
        console.log('3. Check the transaction on: https://suiexplorer.com/');
        console.log('4. Your package on testnet: https://suiexplorer.com/object/0xab2f571babee3b229c3bc5602bdb80a7167028fb2961f0757e2008de90370f00?network=testnet');
    }
}

// Run the test
testBridge().catch(console.error); 