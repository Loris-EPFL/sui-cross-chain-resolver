import { SuiHTLCBridge, HTLCWithdrawParams } from '../../mock-backend/sui-contract-bridge';

/**
 * Test the Sui HTLC Bridge Withdraw Function
 * 
 * This demonstrates how to call the withdraw function from your Move contract
 */
async function testWithdraw() {
    console.log('🧪 Testing Sui HTLC Bridge Withdraw Function...');
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

        // Test 3: Withdraw from HTLC lock object
        console.log('=== Test 3: Withdraw from HTLC Lock Object ===');
        
        // You need to provide a valid lock ID from a previously created lock
        const lockId = process.env.TEST_LOCK_ID || '0x732cf44f8249f439e8a8088da34aa5bb21eca65569a01d95b0b4b1ed6f55d282';
        const secret = process.env.TEST_SECRET || 'my-secret-key-123';
        
        const withdrawParams: HTLCWithdrawParams = {
            lockId: lockId,
            secret: secret
        };

        console.log('📝 Calling TypeScript function: bridge.withdrawLock()');
        console.log('🔧 This will call Move function: oneinch_move::withdraw');
        console.log('📦 Parameters:', JSON.stringify(withdrawParams, null, 2));
        console.log('');

        const withdrawResult = await bridge.withdrawLock(withdrawParams);
        
        if (withdrawResult.success) {
            console.log('✅ Success! TypeScript → Move contract withdraw call worked!');
            console.log('📋 Transaction:', withdrawResult.txDigest);
            console.log('🔗 View on explorer:', `https://suiexplorer.com/txblock/${withdrawResult.txDigest}?network=testnet`);
            console.log('');
            console.log('💰 Withdrawal completed successfully!');
            console.log('📦 Lock object has been consumed');
            console.log('💎 Safety deposit has been claimed');
        } else {
            console.error('❌ Failed to withdraw from lock:', withdrawResult.error);
            console.log('📋 Error details:', withdrawResult.details);
            console.log('');
            console.log('💡 Possible reasons for failure:');
            console.log('1. Lock object does not exist');
            console.log('2. Secret is incorrect');
            console.log('3. Timelock has not expired');
            console.log('4. You are not the authorized withdrawer');
        }

    } catch (error) {
        console.error('❌ Test execution error:', error);
        console.log('');
        console.log('💡 Tips:');
        console.log('1. Make sure you have a valid lock ID from a previous create operation');
        console.log('2. Ensure the secret matches the hash used to create the lock');
        console.log('3. Check that the timelock conditions are met');
        console.log('4. Verify you have the correct permissions to withdraw');
        console.log('5. Your package on testnet: https://suiexplorer.com/object/0x4ee770a4c02fccfef7583c973f452c84708e6a08ed34c0d8477d8efe71612031?network=testnet');
    }
}

// Run the test
testWithdraw().catch(console.error); 