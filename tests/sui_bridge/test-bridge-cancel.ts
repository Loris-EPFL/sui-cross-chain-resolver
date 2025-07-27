import { SuiHTLCBridge, HTLCCancelParams } from '../../mock-backend/sui-contract-bridge';

/**
 * Test the Sui HTLC Bridge Cancel Function
 * 
 * This demonstrates how to call the cancel function from your Move contract
 */
async function testCancel() {
    console.log('🧪 Testing Sui HTLC Bridge Cancel Function...');
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

        // Test 3: Cancel HTLC lock object
        console.log('=== Test 3: Cancel HTLC Lock Object ===');
        
        // You need to provide a valid lock ID from a previously created lock
        const lockId = process.env.TEST_LOCK_ID || '0x732cf44f8249f439e8a8088da34aa5bb21eca65569a01d95b0b4b1ed6f55d282';
        
        const cancelParams: HTLCCancelParams = {
            lockId: lockId
        };

        console.log('📝 Calling TypeScript function: bridge.cancelLock()');
        console.log('🔧 This will call Move function: oneinch_move::cancel');
        console.log('📦 Parameters:', JSON.stringify(cancelParams, null, 2));
        console.log('');

        const cancelResult = await bridge.cancelLock(cancelParams);
        
        if (cancelResult.success) {
            console.log('✅ Success! TypeScript → Move contract cancel call worked!');
            console.log('📋 Transaction:', cancelResult.txDigest);
            console.log('🔗 View on explorer:', `https://suiexplorer.com/txblock/${cancelResult.txDigest}?network=testnet`);
            console.log('');
            console.log('❌ Cancellation completed successfully!');
            console.log('📦 Lock object has been consumed');
            console.log('💎 Safety deposit has been claimed');
            console.log('💰 Locked funds have been returned to refund address');
        } else {
            console.error('❌ Failed to cancel lock:', cancelResult.error);
            console.log('📋 Error details:', cancelResult.details);
            console.log('');
            console.log('💡 Possible reasons for failure:');
            console.log('1. Lock object does not exist');
            console.log('2. Timelock has not expired');
            console.log('3. You are not the authorized canceller');
            console.log('4. Lock has already been withdrawn');
        }

    } catch (error) {
        console.error('❌ Test execution error:', error);
        console.log('');
        console.log('💡 Tips:');
        console.log('1. Make sure you have a valid lock ID from a previous create operation');
        console.log('2. Ensure the timelock conditions are met for cancellation');
        console.log('3. Verify you have the correct permissions to cancel');
        console.log('4. Check that the lock hasn\'t already been withdrawn');
        console.log('5. Your package on testnet: https://suiexplorer.com/object/0x4ee770a4c02fccfef7583c973f452c84708e6a08ed34c0d8477d8efe71612031?network=testnet');
    }
}

// Run the test
testCancel().catch(console.error); 