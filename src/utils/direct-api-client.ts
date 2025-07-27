/**
 * Direct 1inch API client that bypasses SDK address validation
 * 
 * This client makes direct HTTP requests to 1inch Fusion+ API endpoints,
 * allowing us to send Sui addresses without SDK validation constraints.
 */

import axios, { AxiosInstance } from 'axios';

export interface QuoteParams {
    srcChainId: number;
    dstChainId: number;
    srcTokenAddress: string;
    dstTokenAddress: string;
    amount: string;
    walletAddress: string;
    enableEstimate?: boolean;
}

export interface OrderParams {
    walletAddress: string;
    hashLock: any;
    secretHashes: string[];
    fee?: {
        takingFeeBps: number;
        takingFeeReceiver: string;
    };
}

export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface OrdersByMakerParams extends PaginationParams {
    address: string;
}

export class Direct1inchApiClient {
    private client: AxiosInstance;
    private baseUrl: string;
    private authKey: string;

    constructor(baseUrl: string, authKey: string) {
        this.baseUrl = baseUrl;
        this.authKey = authKey;
        this.client = axios.create({
            baseURL: baseUrl,
            headers: {
                'Authorization': `Bearer ${authKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Get quote for cross-chain swap
     * Direct API call to /quoter/v1.0/quote/receive
     */
    async getQuote(params: QuoteParams): Promise<any> {
        console.log('🔄 Making direct API call to get quote with params:', params);
        
        try {
            const response = await this.client.post('/quoter/v1.0/quote/receive', null, {
                params: {
                    srcChain: params.srcChainId,
                    dstChain: params.dstChainId,
                    srcTokenAddress: params.srcTokenAddress,
                    dstTokenAddress: params.dstTokenAddress,
                    amount: params.amount,
                    walletAddress: params.walletAddress,
                    enableEstimate: params.enableEstimate
                }
            });
            
            console.log('✅ Quote API response received:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Quote API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Create order
     * Direct API call to /relayer/v1.0/submit
     */
    async createOrder(quote: any, orderParams: OrderParams): Promise<any> {
        console.log('🔄 Making direct API call to create order');
        
        const orderData = {
            order: {
                salt: "42", // This would normally be generated
                makerAsset: quote.srcTokenAddress,
                takerAsset: quote.dstTokenAddress,
                maker: orderParams.walletAddress,
                receiver: orderParams.walletAddress,
                makingAmount: quote.srcTokenAmount,
                takingAmount: quote.dstTokenAmount,
                makerTraits: "0"
            },
            srcChainId: quote.srcChainId,
            signature: "mock-signature", // This would normally be generated
            extension: "0x",
            quoteId: quote.quoteId || "mock-quote-id",
            secretHashes: orderParams.secretHashes
        };

        try {
            const response = await this.client.post('/relayer/v1.0/submit', orderData);
            console.log('✅ Order creation API response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Order creation API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get active orders
     * Direct API call to /orders/v1.0/order/active
     */
    async getActiveOrders(params: PaginationParams = {}): Promise<any> {
        console.log('🔄 Making direct API call to get active orders');
        
        try {
            const response = await this.client.get('/orders/v1.0/order/active', {
                params: {
                    page: params.page || 1,
                    limit: params.limit || 100
                }
            });
            
            console.log('✅ Active orders API response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Active orders API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get orders by maker
     * Direct API call to /orders/v1.0/order/maker/{address}
     */
    async getOrdersByMaker(params: OrdersByMakerParams): Promise<any> {
        console.log('🔄 Making direct API call to get orders by maker:', params.address);
        
        try {
            const response = await this.client.get(`/orders/v1.0/order/maker/${params.address}`, {
                params: {
                    page: params.page || 1,
                    limit: params.limit || 100,
                    chainId: 1 // This might need to be dynamic
                }
            });
            
            console.log('✅ Orders by maker API response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Orders by maker API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get order status
     * Direct API call to /orders/v1.0/order/status/{orderHash}
     */
    async getOrderStatus(orderHash: string): Promise<any> {
        console.log('🔄 Making direct API call to get order status:', orderHash);
        
        try {
            const response = await this.client.get(`/orders/v1.0/order/status/${orderHash}`);
            console.log('✅ Order status API response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Order status API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Submit secret
     * Direct API call to /relayer/v1.0/submit/secret
     */
    async submitSecret(orderHash: string, secret: string): Promise<any> {
        console.log('🔄 Making direct API call to submit secret for order:', orderHash);
        
        const secretData = {
            secret: secret,
            orderHash: orderHash
        };

        try {
            const response = await this.client.post('/relayer/v1.0/submit/secret', secretData);
            console.log('✅ Submit secret API response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Submit secret API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get ready to accept secret fills
     * Direct API call to /orders/v1.0/order/ready-to-accept-secret-fills/{orderHash}
     */
    async getReadyToAcceptSecretFills(orderHash: string): Promise<any> {
        console.log('🔄 Making direct API call to get ready to accept secret fills:', orderHash);
        
        try {
            const response = await this.client.get(`/orders/v1.0/order/ready-to-accept-secret-fills/${orderHash}`);
            console.log('✅ Ready to accept secret fills API response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Ready to accept secret fills API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get ready to execute public actions
     * Direct API call to /orders/v1.0/order/ready-to-execute-public-actions
     */
    async getReadyToExecutePublicActions(): Promise<any> {
        console.log('🔄 Making direct API call to get ready to execute public actions');
        
        try {
            const response = await this.client.get('/orders/v1.0/order/ready-to-execute-public-actions');
            console.log('✅ Ready to execute public actions API response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Ready to execute public actions API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get published secrets
     * Direct API call to /orders/v1.0/order/secrets/{orderHash}
     */
    async getPublishedSecrets(orderHash: string): Promise<any> {
        console.log('🔄 Making direct API call to get published secrets:', orderHash);
        
        try {
            const response = await this.client.get(`/orders/v1.0/order/secrets/${orderHash}`);
            console.log('✅ Published secrets API response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Published secrets API error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get escrow factory address
     * Direct API call to /orders/v1.0/order/escrow
     */
    async getEscrowFactory(chainId: number): Promise<any> {
        console.log('🔄 Making direct API call to get escrow factory for chain:', chainId);
        
        try {
            const response = await this.client.get('/orders/v1.0/order/escrow', {
                params: { chainId }
            });
            console.log('✅ Escrow factory API response:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('❌ Escrow factory API error:', error.response?.data || error.message);
            throw error;
        }
    }
}

/**
 * Factory function to create a Direct1inchApiClient instance
 */
export function createDirect1inchClient(baseUrl: string, authKey: string): Direct1inchApiClient {
    return new Direct1inchApiClient(baseUrl, authKey);
}