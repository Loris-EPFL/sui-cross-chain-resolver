import { SuiHTLCBridge } from '../../mock-backend/sui-contract-bridge';

/**
 * Test the Sui HTLC Bridge Utility Functions
 * 
 * This demonstrates how to use the utility functions for account information
 */
async function testUtilityFunctions() {
    console.log('🧪 Testing Sui HTLC Bridge Utility Functions...');
    console.log('📦 Following patterns from Sui Move Bootcamp H4');
    console.log('');

    // Initialize the bridge
    const bridge = new SuiHTLCBridge();

    try {
        // Test 1: Get account balance
        console.log('=== Test 1: Get Account Balance ===');
        console.log('📝 Calling TypeScript function: bridge.getBalance()');
        console.log('🔧 This will call Sui SDK: client.getBalance()');
        console.log('');

        const balance = await bridge.getBalance();
        
        console.log('✅ Success! Balance retrieved successfully!');
        console.log('💰 Total Balance:', balance.totalBalance, 'MIST');
        console.log('🪙 Coin Type:', balance.coinType);
        console.log('📊 Coin Object Count:', balance.coinObjectCount);
        console.log('🔒 Locked Balance:', balance.lockedBalance);
        console.log('');

        // Test 2: Get account objects
        console.log('=== Test 2: Get Account Objects ===');
        console.log('📝 Calling TypeScript function: bridge.getObjects()');
        console.log('🔧 This will call Sui SDK: client.getOwnedObjects()');
        console.log('');

        const objects = await bridge.getObjects();
        
        console.log('✅ Success! Objects retrieved successfully!');
        console.log('📦 Total Objects:', objects.data.length);
        console.log('🔄 Has Next Page:', objects.hasNextPage);
        console.log('📋 Next Cursor:', objects.nextCursor);
        console.log('');

        // Test 3: Display object details
        if (objects.data.length > 0) {
            console.log('=== Test 3: Object Details ===');
            console.log('📋 Detailed object information:');
            
            objects.data.forEach((obj: any, index: number) => {
                console.log(`\n📦 Object ${index + 1}:`);
                console.log('   ID:', obj.data.objectId);
                console.log('   Type:', obj.data.type);
                console.log('   Owner:', obj.data.owner);
                console.log('   Version:', obj.data.version);
                
                if (obj.data.content) {
                    console.log('   Content Type:', obj.data.content.dataType);
                    if (obj.data.content.fields) {
                        console.log('   Fields:', Object.keys(obj.data.content.fields));
                    }
                }
            });
            console.log('');
        } else {
            console.log('📭 No objects found in account');
            console.log('');
        }

        // Test 4: Summary
        console.log('=== Test 4: Account Summary ===');
        const suiBalance = parseInt(balance.totalBalance) / 1_000_000_000; // Convert MIST to SUI
        console.log('💰 Account Balance:', suiBalance.toFixed(9), 'SUI');
        console.log('📦 Total Objects:', objects.data.length);
        console.log('🔑 Account Address:', bridge['keypair'].getPublicKey().toSuiAddress());
        console.log('🌐 Network: testnet');
        console.log('');

        console.log('✅ All utility function tests completed successfully!');
        console.log('💡 These functions are useful for:');
        console.log('   - Checking account balance before transactions');
        console.log('   - Verifying object ownership');
        console.log('   - Monitoring account state');
        console.log('   - Debugging transaction issues');

    } catch (error) {
        console.error('❌ Test execution error:', error);
        console.log('');
        console.log('💡 Tips:');
        console.log('1. Make sure you have a valid account with some SUI');
        console.log('2. Check network connectivity to Sui testnet');
        console.log('3. Verify your private key is correctly configured');
        console.log('4. Get testnet SUI from: https://suiexplorer.com/faucet');
    }
}

// Run the test
testUtilityFunctions().catch(console.error); 