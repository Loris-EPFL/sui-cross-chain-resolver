import 'dotenv/config';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { fromB64 } from '@mysten/sui.js/utils';

// Environment variables for Sui configuration
const SUI_PACKAGE_ID = process.env.SUI_PACKAGE_ID;
const SUI_UPGRADE_CAP_ID = process.env.SUI_UPGRADE_CAP_ID;
const SUI_NETWORK = process.env.SUI_NETWORK || 'testnet';
const SUI_PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;

// Validate required environment variables
if (!SUI_PACKAGE_ID) {
    throw new Error('SUI_PACKAGE_ID environment variable is required');
}

if (!SUI_UPGRADE_CAP_ID) {
    throw new Error('SUI_UPGRADE_CAP_ID environment variable is required');
}

// Types for the bridge system
export interface HTLCLockParams {
    hashLock: string;
    amount: string;
    recipient: string;
    refund: string;
    withdrawalMs: number;
    publicWithdrawalMs: number;
    cancellationMs: number;
    publicCancellationMs: number;
    secretLength: number;
    safetyDeposit: string;
}

export interface HTLCWithdrawParams {
    lockId: string;
    secret: string;
}

export interface HTLCCancelParams {
    lockId: string;
}

export interface HTLCResult {
    success: boolean;
    txDigest?: string;
    lockId?: string;
    error?: string;
    details?: any;
}

/**
 * Sui HTLC Contract Bridge
 * 
 * This class provides a clean TypeScript interface to call your Sui Move contract functions.
 * It follows the patterns from the Sui Move Bootcamp H4 solution.
 */
export class SuiHTLCBridge {
    private client: SuiClient;
    private keypair: Ed25519Keypair;

    constructor(privateKey?: string) {
        // Initialize Sui client for the configured network
        this.client = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK as any) });
        
        // Initialize keypair with proper error handling
        if (privateKey) {
            // Use provided private key
            this.keypair = Ed25519Keypair.fromSecretKey(new Uint8Array(Buffer.from(privateKey, "hex")));
        } else if (SUI_PRIVATE_KEY && SUI_PRIVATE_KEY.trim() !== "" && SUI_PRIVATE_KEY !== "undefined") {
            // Use environment variable private key
            this.keypair = Ed25519Keypair.fromSecretKey(new Uint8Array(Buffer.from(SUI_PRIVATE_KEY, "hex")));
        } else {
            // Generate new keypair for testing
            this.keypair = Ed25519Keypair.generate();
        }
        
        console.log('🔑 Using keypair address:', this.keypair.getPublicKey().toSuiAddress());
        console.log('🌐 Connected to Sui', SUI_NETWORK);
        console.log('📦 Package ID:', SUI_PACKAGE_ID);
        console.log('🔧 Upgrade Cap ID:', SUI_UPGRADE_CAP_ID);
    }

    /**
     * Create HTLC Lock Object
     * 
     * TypeScript function that calls the Move contract's create_lock_object function
     * 
     * @param params HTLCLockParams - Parameters for creating the lock
     * @returns Promise<HTLCResult> - Result of the operation
     */
    async createLockObject(params: HTLCLockParams): Promise<HTLCResult> {
        console.log('🏗️ Creating HTLC lock object...');
        console.log('📦 Package ID:', SUI_PACKAGE_ID);
        console.log('🔧 Function: oneinch_move::create_lock_object');
        
        try {
            const tx = new TransactionBlock();
            
            // Split coins for the lock amount and safety deposit
            const [lockCoin] = tx.splitCoins(tx.gas, [tx.pure(params.amount)]);
            const [depositCoin] = tx.splitCoins(tx.gas, [tx.pure(params.safetyDeposit)]);
            
            // Convert hashLock from hex string to byte array
            const hashLockBytes = Array.from(Buffer.from(params.hashLock.slice(2), 'hex'));
            
            // Call the Move contract function with ALL required arguments
            tx.moveCall({
                target: `${SUI_PACKAGE_ID}::oneinch_move::create_lock_object`,
                typeArguments: ['0x2::sui::SUI'], 
                arguments: [
                    tx.object('0x6'),                                    
                    tx.pure(params.withdrawalMs),             // withdrawal_ms: u64
                    tx.pure(params.publicWithdrawalMs),       // public_withdrawal_ms: u64
                    tx.pure(params.cancellationMs),           // cancellation_ms: u64
                    tx.pure(params.publicCancellationMs),     // public_cancellation_ms: u64
                    tx.pure(hashLockBytes),                   // hashed: vector<u8>
                    tx.pure(params.recipient),                // target: address
                    tx.pure(params.refund),                   // refund: address
                    lockCoin,                                 // amount: Coin<T>
                    depositCoin,                              // deposit: Coin<T>
                    tx.pure(params.secretLength),             // secret_length: u8
                ]
            });

            // Set gas budget
            tx.setGasBudget(10_000_000);

            console.log('📝 Transaction created, executing...');
            console.log('🔑 Using keypair address:', this.keypair.getPublicKey().toSuiAddress());
            console.log('💰 Lock amount:', params.amount, 'MIST');
            console.log('💎 Safety deposit:', params.safetyDeposit, 'MIST');
            
            const result = await this.client.signAndExecuteTransactionBlock({
                transactionBlock: tx,
                signer: this.keypair,
                options: {
                    showEffects: true,
                    showObjectChanges: true,
                    showInput: true,
                    showEvents: true
                }
            });

            console.log('✅ HTLC lock object created successfully!');
            console.log('📋 Transaction digest:', result.digest);
            console.log('🔗 View on explorer:', `https://suiexplorer.com/txblock/${result.digest}?network=${SUI_NETWORK}`);
            
            // Extract created lock object ID from object changes
            const createdObjects = result.objectChanges?.filter((change: any) => change.type === 'created');
            let lockId: string | undefined;
            
            if (createdObjects && createdObjects.length > 0) {
                const lockObject = createdObjects[0] as any;
                lockId = lockObject.objectId;
                console.log('📦 Created lock object ID:', lockId);
            }
            
            return {
                success: true,
                txDigest: result.digest,
                lockId: lockId,
                details: result
            };
            
        } catch (error: any) {
            console.error('❌ Error creating HTLC lock object:', error);
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }

    /**
     * Withdraw from HTLC Lock Object
     * 
     * TypeScript function that calls the Move contract's withdraw function
     * 
     * @param params HTLCWithdrawParams - Parameters for withdrawal
     * @returns Promise<HTLCResult> - Result of the operation
     */
    async withdrawLock(params: HTLCWithdrawParams): Promise<HTLCResult> {
        console.log('💰 Withdrawing from HTLC lock object...');
        console.log('📦 Lock ID:', params.lockId);
        console.log('🔧 Function: oneinch_move::withdraw');
        
        try {
            const tx = new TransactionBlock();
            
            
            // Call the Move contract function
            tx.moveCall({
                target: `${SUI_PACKAGE_ID}::oneinch_move::withdraw`,
                typeArguments: ['0x2::sui::SUI'],
                arguments: [
                  tx.object(params.lockId),                  // LockObject<T> (shared)
                  tx.object('0x6'),                          // &Clock shared object
                  tx.pure(Array.from(Buffer.from(params.secret, 'utf8'))), // vector<u8>
                ],
              });

            console.log('📝 Withdrawal transaction created, executing...');

            tx.setGasBudget(10_000_000);
            
            const result = await this.client.signAndExecuteTransactionBlock({
                transactionBlock: tx,
                signer: this.keypair,
                options: {
                    showEffects: true,
                    showObjectChanges: true,
                    showInput: true,
                    showEvents: true
                }
            });

            console.log('✅ HTLC lock object withdrawn successfully!');
            console.log('📋 Transaction digest:', result.digest);
            console.log('🔗 View on explorer:', `https://suiexplorer.com/txblock/${result.digest}?network=${SUI_NETWORK}`);
            
            return {
                success: true,
                txDigest: result.digest,
                details: result
            };
            
        } catch (error: any) {
            console.error('❌ Error withdrawing from HTLC lock object:', error);
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }

    /**
     * Cancel HTLC Lock Object
     * 
     * TypeScript function that calls the Move contract's cancel function
     * 
     * @param params HTLCCancelParams - Parameters for cancellation
     * @returns Promise<HTLCResult> - Result of the operation
     */
    async cancelLock(params: HTLCCancelParams): Promise<HTLCResult> {
        console.log('❌ Cancelling HTLC lock object...');
        console.log('📦 Lock ID:', params.lockId);
        console.log('🔧 Function: oneinch_move::cancel');
        
        try {
            const tx = new TransactionBlock();
            
            tx.moveCall({
                target: `${SUI_PACKAGE_ID}::oneinch_move::cancel`,
                typeArguments: ['0x2::sui::SUI'],
                arguments: [
                  tx.object(params.lockId),
                  tx.object('0x6'),
                ],
              });

            console.log('📝 Cancellation transaction created, executing...');

            tx.setGasBudget(10_000_000);
            
            const result = await this.client.signAndExecuteTransactionBlock({
                transactionBlock: tx,
                signer: this.keypair,
                options: {
                    showEffects: true,
                    showObjectChanges: true,
                    showInput: true,
                    showEvents: true
                }
            });

            console.log('✅ HTLC lock object cancelled successfully!');
            console.log('📋 Transaction digest:', result.digest);
            console.log('🔗 View on explorer:', `https://suiexplorer.com/txblock/${result.digest}?network=${SUI_NETWORK}`);
            
            return {
                success: true,
                txDigest: result.digest,
                details: result
            };
            
        } catch (error: any) {
            console.error('❌ Error cancelling HTLC lock object:', error);
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    }

    /**
     * Get account balance
     */
    async getBalance(): Promise<any> {
        console.log('💰 Getting account balance...');
        
        try {
            const address = this.keypair.getPublicKey().toSuiAddress();
            const balance = await this.client.getBalance({
                owner: address,
                coinType: '0x2::sui::SUI'
            });

            console.log('📊 Balance:', balance);
            return balance;
        } catch (error) {
            console.error('❌ Error getting balance:', error);
            throw error;
        }
    }

    /**
     * Get account objects
     */
    async getObjects(): Promise<any> {
        console.log('📦 Getting account objects...');
        
        try {
            const address = this.keypair.getPublicKey().toSuiAddress();
            const objects = await this.client.getOwnedObjects({
                owner: address,
                options: {
                    showContent: true,
                    showDisplay: true
                }
            });

            console.log('📋 Objects:', objects);
            return objects;
        } catch (error) {
            console.error('❌ Error getting objects:', error);
            throw error;
        }
    }
}

// Example usage function
export async function exampleUsage() {
    console.log('🚀 Starting Sui HTLC Bridge Example...');
    console.log('�� Package ID:', SUI_PACKAGE_ID);
    console.log('🔧 Upgrade Cap ID:', SUI_UPGRADE_CAP_ID);
    console.log('🌐 Network:', SUI_NETWORK);
    console.log('');

    // Initialize the bridge
    const bridge = new SuiHTLCBridge();

    try {
        // Step 1: Check balance
        console.log('=== Step 1: Check Balance ===');
        await bridge.getBalance();
        console.log('');

        // Step 2: Check objects
        console.log('=== Step 2: Check Objects ===');
        await bridge.getObjects();
        console.log('');

        // Step 3: Create HTLC lock object
        console.log('=== Step 3: Create HTLC Lock Object ===');
        const createParams: HTLCLockParams = {
            hashLock: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            amount: '1000000', // 1 SUI in MIST
            recipient: '0x772cb3ccb855aac45bd2df96b250184fee970522871407d5f5f1074bf0585ee0',
            refund: '0x772cb3ccb855aac45bd2df96b250184fee970522871407d5f5f1074bf0585ee0',
            withdrawalMs: 600000, // 1 minute
            publicWithdrawalMs: 120000, // 2 minutes
            cancellationMs: 180000, // 3 minutes
            publicCancellationMs: 240000, // 4 minutes
            secretLength: 16,
            safetyDeposit: '100000' // 0.1 SUI in MIST
        };

        const createResult = await bridge.createLockObject(createParams);
        
        if (createResult.success && createResult.lockId) {
            console.log('✅ Lock created successfully!');
            console.log('📦 Lock ID:', createResult.lockId);
            console.log('📋 Transaction:', createResult.txDigest);
            console.log('');

            // Step 4: Get lock object info (optional)
            console.log('=== Step 4: Get Lock Object Info ===');
            // You can add a method to get lock object info here
            console.log('');

            // Uncomment to test withdrawal
            // console.log('=== Step 5: Withdraw Lock Object ===');
            // const withdrawParams: HTLCWithdrawParams = {
            //     lockId: createResult.lockId,
            //     secret: 'my-secret-key-123'
            // };
            // const withdrawResult = await bridge.withdrawLock(withdrawParams);
            // console.log('Withdraw result:', withdrawResult);
            // console.log('');

            // Uncomment to test cancellation
            console.log('=== Step 6: Cancel Lock Object ===');
            const cancelParams: HTLCCancelParams = {
                lockId: createResult.lockId
            };
            const cancelResult = await bridge.cancelLock(cancelParams);
            console.log('Cancel result:', cancelResult);
            console.log('');
        } else {
            console.error('❌ Failed to create lock:', createResult.error);
        }

    } catch (error) {
        console.error('❌ Example execution error:', error);
        console.log('');
        console.log('💡 Tips:');
        console.log('1. Make sure you have SUI tokens on', SUI_NETWORK);
        console.log('2. Get testnet SUI from: https://suiexplorer.com/faucet');
        console.log('3. Check the transaction on: https://suiexplorer.com/');
        console.log('4. Your package on', SUI_NETWORK, ':', `https://suiexplorer.com/object/${SUI_PACKAGE_ID}?network=${SUI_NETWORK}`);
    }
}

// Run if this file is executed directly
if (require.main === module) {
    exampleUsage().catch(console.error);
}
