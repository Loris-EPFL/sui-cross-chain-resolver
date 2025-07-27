import { SuiHTLCBridge, HTLCLockParams, HTLCWithdrawParams, HTLCCancelParams } from '../../mock-backend/sui-contract-bridge';

/**
 * Comprehensive Test for Sui HTLC Bridge System
 * 
 * This demonstrates a complete HTLC workflow:
 * 1. Create lock object
 * 2. Check balance and objects
 * 3. Withdraw from lock (if conditions met)
 * 4. Cancel lock (if conditions met)
 * 
 * Following patterns from Sui Move Bootcamp H4
 */
async function testComprehensiveWorkflow() {
    console.log('🧪 Comprehensive Sui HTLC Bridge Test...');
    console.log('📦 Testing complete HTLC workflow');
    console.log('🔧 Following patterns from Sui Move Bootcamp H4');
    console.log('');

    // Initialize the bridge
    const bridge = new SuiHTLCBridge();

    try {
        // Phase 1: Initial Setup and Checks
        console.log('🔄 Phase 1: Initial Setup and Checks');
        console.log('=====================================');
        
        console.log('📊 Checking account balance...');
        const initialBalance = await bridge.getBalance();
        console.log('💰 Initial Balance:', parseInt(initialBalance.totalBalance) / 1_000_000_000, 'SUI');
        
        console.log('📦 Checking account objects...');
        const initialObjects = await bridge.getObjects();
        console.log('📋 Initial Objects:', initialObjects.data.length);
        console.log('');

        // Phase 2: Create HTLC Lock Object
        console.log('🔄 Phase 2: Create HTLC Lock Object');
        console.log('====================================');
        
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

        console.log('📝 Creating HTLC lock object...');
        console.log('🔧 Function: oneinch_move::create_lock_object');
        console.log('📦 Parameters:', JSON.stringify(createParams, null, 2));
        console.log('');

        const createResult = await bridge.createLockObject(createParams);
        
        if (createResult.success) {
            console.log('✅ Lock created successfully!');
            console.log('📦 Lock ID:', createResult.lockId);
            console.log('📋 Transaction:', createResult.txDigest);
            console.log('🔗 View on explorer:', `https://suiexplorer.com/txblock/${createResult.txDigest}?network=testnet`);
            console.log('');

            // Phase 3: Post-Creation Checks
            console.log('🔄 Phase 3: Post-Creation Checks');
            console.log('================================');
            
            console.log('📊 Checking balance after creation...');
            const postCreateBalance = await bridge.getBalance();
            console.log('💰 Balance after creation:', parseInt(postCreateBalance.totalBalance) / 1_000_000_000, 'SUI');
            
            console.log('📦 Checking objects after creation...');
            const postCreateObjects = await bridge.getObjects();
            console.log('📋 Objects after creation:', postCreateObjects.data.length);
            console.log('');

            // Phase 4: Withdrawal Test (Commented for Safety)
            console.log('🔄 Phase 4: Withdrawal Test (Demo Only)');
            console.log('========================================');
            
            if (createResult.lockId) {
                console.log('💡 Withdrawal would be tested here with:');
                console.log('   Lock ID:', createResult.lockId);
                console.log('   Secret: "my-secret-key-123"');
                console.log('   Function: oneinch_move::withdraw');
                console.log('');
                console.log('🔒 Withdrawal is commented out for safety');
                console.log('💡 To test withdrawal, uncomment the code in test-bridge-withdraw.ts');
                console.log('');
            }

            // Phase 5: Cancellation Test (Commented for Safety)
            console.log('🔄 Phase 5: Cancellation Test (Demo Only)');
            console.log('==========================================');
            
            if (createResult.lockId) {
                console.log('💡 Cancellation would be tested here with:');
                console.log('   Lock ID:', createResult.lockId);
                console.log('   Function: oneinch_move::cancel');
                console.log('');
                console.log('🔒 Cancellation is commented out for safety');
                console.log('💡 To test cancellation, uncomment the code in test-bridge-cancel.ts');
                console.log('');
            }

            // Phase 6: Summary
            console.log('🔄 Phase 6: Test Summary');
            console.log('========================');
            
            console.log('✅ All tests completed successfully!');
            console.log('📊 Test Results:');
            console.log('   ✅ Bridge initialization');
            console.log('   ✅ Balance checking');
            console.log('   ✅ Object listing');
            console.log('   ✅ Lock object creation');
            console.log('   💡 Withdrawal (demo only)');
            console.log('   💡 Cancellation (demo only)');
            console.log('');
            
            console.log('🔧 Functions Tested:');
            console.log('   - bridge.getBalance()');
            console.log('   - bridge.getObjects()');
            console.log('   - bridge.createLockObject()');
            console.log('   - bridge.withdrawLock() (demo)');
            console.log('   - bridge.cancelLock() (demo)');
            console.log('');
            
            console.log('📚 Move Contract Functions Called:');
            console.log('   - oneinch_move::create_lock_object');
            console.log('   - oneinch_move::withdraw (demo)');
            console.log('   - oneinch_move::cancel (demo)');
            console.log('');
            
            console.log('🎯 Next Steps:');
            console.log('   1. Run test-bridge-withdraw.ts to test withdrawal');
            console.log('   2. Run test-bridge-cancel.ts to test cancellation');
            console.log('   3. Run test-bridge-utility.ts for detailed account info');
            console.log('   4. Check transactions on Sui Explorer');

        } else {
            console.error('❌ Failed to create lock:', createResult.error);
            console.log('📋 Error details:', createResult.details);
        }

    } catch (error) {
        console.error('❌ Comprehensive test execution error:', error);
        console.log('');
        console.log('💡 Troubleshooting Tips:');
        console.log('1. Check your .env file configuration');
        console.log('2. Ensure you have sufficient SUI for gas fees');
        console.log('3. Verify network connectivity to Sui testnet');
        console.log('4. Check that your package ID is correct');
        console.log('5. Get testnet SUI from: https://suiexplorer.com/faucet');
    }
}

// Run the comprehensive test
testComprehensiveWorkflow().catch(console.error); 