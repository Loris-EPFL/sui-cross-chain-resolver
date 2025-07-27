const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());

// Parse JSON bodies with error handling for null/empty bodies
app.use(express.json({
    verify: (req, res, buf, encoding) => {
        // Handle empty or null bodies
        if (buf.length === 0 || buf.toString() === 'null') {
            req.body = {};
        }
    }
}));
app.use(express.urlencoded({ extended: true }));

// Handle JSON parsing errors
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        console.log('⚠️  JSON parsing error, setting empty body');
        req.body = {};
        next();
    } else {
        next(error);
    }
});

// Enhanced logging middleware to capture all requests and responses
app.use((req, res, next) => {
    console.log('\n=== INCOMING REQUEST ===');
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Query params:', JSON.stringify(req.query, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('========================\n');
    
    // Capture the original res.json method
    const originalJson = res.json;
    
    // Override res.json to log responses
    res.json = function(data) {
        console.log('\n=== OUTGOING RESPONSE ===');
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        console.log('Status:', res.statusCode);
        console.log('Response data:', JSON.stringify(data, null, 2));
        console.log('=========================\n');
        
        // Call the original json method
        return originalJson.call(this, data);
    };
    
    next();
});

// Mock data storage
const mockOrders = new Map();
const mockSecrets = new Map();
let orderCounter = 1;

// Helper function to generate mock order hash
function generateOrderHash() {
    return '0x' + Math.random().toString(16).substr(2, 64).padStart(64, '0');
}

// Helper function to generate mock quote ID
function generateQuoteId() {
    return 'quote_' + Math.random().toString(36).substr(2, 16);
}

// F+ Quoter API endpoints
app.post('/mock-1inch-api/quoter/v1.0/quote/receive', (req, res) => {
    console.log('📊 F+ Quoter API: Getting quote');
    
    const { srcChain, dstChain, srcTokenAddress, dstTokenAddress, amount, walletAddress, enableEstimate } = req.query;
    const quoteId = generateQuoteId();
    
    const mockQuote = {
        quoteId: quoteId,
        srcTokenAmount: amount || '1000000',
        dstTokenAmount: (parseInt(amount || '1000000') * 0.99).toString(), // 1% slippage
        srcChainId: parseInt(srcChain) || 1,
        dstChainId: parseInt(dstChain) || 101,
        srcTokenAddress: srcTokenAddress || '0xA0b86a33E6441c8C06DD2b7c94b7E0e8c0c8c8c8',
        dstTokenAddress: dstTokenAddress || '0x2::sui::SUI',
        walletAddress: walletAddress,
        presets: {
            fast: {
                auctionDuration: 60,
                startAuctionIn: 30,
                initialRateBump: 0,
                auctionEndAmount: (parseInt(amount || '1000000') * 0.98).toString()
            },
            medium: {
                auctionDuration: 120,
                startAuctionIn: 60,
                initialRateBump: 0,
                auctionEndAmount: (parseInt(amount || '1000000') * 0.985).toString()
            },
            slow: {
                auctionDuration: 300,
                startAuctionIn: 120,
                initialRateBump: 0,
                auctionEndAmount: (parseInt(amount || '1000000') * 0.99).toString()
            }
        },
        timestamp: new Date().toISOString()
    };
    
    res.status(200).json(mockQuote);
});

// F+ Relayer API endpoints
app.post('/mock-1inch-api/relayer/v1.0/submit', (req, res) => {
    console.log('📝 F+ Relayer API: Submitting order');
    
    const orderHash = generateOrderHash();
    const orderData = {
        orderHash: orderHash,
        status: 'pending',
        order: req.body.order,
        srcChainId: req.body.srcChainId,
        signature: req.body.signature,
        extension: req.body.extension,
        quoteId: req.body.quoteId,
        secretHashes: req.body.secretHashes,
        createdAt: new Date().toISOString()
    };
    
    // Store the order
    mockOrders.set(orderHash, orderData);
    
    res.status(201).json({
        orderHash: orderHash,
        status: 'created',
        message: 'Order successfully submitted'
    });
});

app.post('/mock-1inch-api/relayer/v1.0/submit/secret', (req, res) => {
    console.log('🔐 F+ Relayer API: Submitting secret');
    
    const { secret, orderHash } = req.body;
    
    // Store the secret
    mockSecrets.set(orderHash, {
        secret: secret,
        orderHash: orderHash,
        submittedAt: new Date().toISOString()
    });
    
    // Update order status if it exists
    if (mockOrders.has(orderHash)) {
        const order = mockOrders.get(orderHash);
        order.status = 'secret_submitted';
        mockOrders.set(orderHash, order);
    }
    
    res.status(201).json({
        message: 'Secret successfully submitted',
        orderHash: orderHash,
        status: 'accepted'
    });
});

// F+ Orders API endpoints
app.get('/mock-1inch-api/orders/v1.0/order/active', (req, res) => {
    console.log('📋 F+ Orders API: Getting active orders');
    
    const { page = 1, limit = 100 } = req.query;
    const activeOrders = Array.from(mockOrders.values())
        .filter(order => order.status === 'pending' || order.status === 'active')
        .slice((page - 1) * limit, page * limit);
    
    res.status(200).json({
        orders: activeOrders,
        meta: {
            totalItems: activeOrders.length,
            itemsPerPage: parseInt(limit),
            totalPages: Math.ceil(activeOrders.length / limit),
            currentPage: parseInt(page)
        }
    });
});

app.get('/mock-1inch-api/orders/v1.0/order/maker/:address', (req, res) => {
    console.log('👤 F+ Orders API: Getting orders by maker:', req.params.address);
    
    const { address } = req.params;
    const { page = 1, limit = 100 } = req.query;
    
    const makerOrders = Array.from(mockOrders.values())
        .filter(order => order.order && order.order.maker === address)
        .slice((page - 1) * limit, page * limit);
    
    res.status(200).json({
        orders: makerOrders,
        meta: {
            totalItems: makerOrders.length,
            itemsPerPage: parseInt(limit),
            totalPages: Math.ceil(makerOrders.length / limit),
            currentPage: parseInt(page)
        }
    });
});

app.get('/mock-1inch-api/orders/v1.0/order/status/:orderHash', (req, res) => {
    console.log('📊 F+ Orders API: Getting order status:', req.params.orderHash);
    
    const { orderHash } = req.params;
    const order = mockOrders.get(orderHash);
    
    if (!order) {
        return res.status(404).json({
            error: 'Order not found',
            orderHash: orderHash
        });
    }
    
    res.status(200).json({
        orderHash: orderHash,
        status: order.status,
        validation: 'valid',
        order: order.order,
        approximateTakingAmount: order.order?.takingAmount || '0',
        positiveSurplus: '0',
        fills: [],
        createdAt: order.createdAt
    });
});

app.get('/mock-1inch-api/orders/v1.0/order/escrow', (req, res) => {
    console.log('🏭 F+ Orders API: Getting escrow factory');
    
    const { chainId = 1 } = req.query;
    
    // Mock escrow factory addresses for different chains
    const escrowFactories = {
        1: '0x1111111111111111111111111111111111111111', // Ethereum
        101: '0x2222222222222222222222222222222222222222', // Sui
        137: '0x3333333333333333333333333333333333333333', // Polygon
        56: '0x4444444444444444444444444444444444444444' // BSC
    };
    
    res.status(200).json({
        address: escrowFactories[chainId] || escrowFactories[1]
    });
});

app.get('/mock-1inch-api/orders/v1.0/order/ready-to-accept-secret-fills/:orderHash', (req, res) => {
    console.log('🔄 F+ Orders API: Getting ready-to-accept secret fills:', req.params.orderHash);
    
    const { orderHash } = req.params;
    const order = mockOrders.get(orderHash);
    
    if (!order) {
        return res.status(404).json({
            error: 'Order not found',
            orderHash: orderHash
        });
    }
    
    res.status(200).json({
        orderHash: orderHash,
        readyToAccept: order.status === 'secret_submitted',
        fills: [],
        timestamp: new Date().toISOString()
    });
});

app.get('/mock-1inch-api/orders/v1.0/order/ready-to-execute-public-actions', (req, res) => {
    console.log('⚡ F+ Orders API: Getting ready-to-execute public actions');
    
    const readyActions = Array.from(mockOrders.values())
        .filter(order => order.status === 'ready_to_execute')
        .map(order => ({
            orderHash: order.orderHash,
            action: 'execute',
            timestamp: order.createdAt
        }));
    
    res.status(200).json({
        actions: readyActions,
        count: readyActions.length
    });
});

app.get('/mock-1inch-api/orders/v1.0/order/secrets/:orderHash', (req, res) => {
    console.log('📖 F+ Orders API: Getting published secrets:', req.params.orderHash);
    
    const { orderHash } = req.params;
    const secret = mockSecrets.get(orderHash);
    
    if (!secret) {
        return res.status(404).json({
            error: 'No secrets found for this order',
            orderHash: orderHash
        });
    }
    
    res.status(200).json({
        orderHash: orderHash,
        secrets: [{
            secret: secret.secret,
            submittedAt: secret.submittedAt,
            status: 'published'
        }]
    });
});

// Catch-all route for unhandled 1inch API endpoints
app.all('/mock-1inch-api/*', (req, res) => {
    const endpoint = req.path.replace('/mock-1inch-api', '');
    console.log(`❓ Unhandled 1inch API endpoint: ${endpoint}`);
    
    res.status(404).json({
        error: 'API endpoint not implemented',
        endpoint: endpoint,
        method: req.method,
        message: 'This endpoint is not yet implemented in the mock backend',
        availableEndpoints: [
            'POST /quoter/v1.0/quote/receive',
            'POST /relayer/v1.0/submit',
            'POST /relayer/v1.0/submit/secret',
            'GET /orders/v1.0/order/active',
            'GET /orders/v1.0/order/maker/{address}',
            'GET /orders/v1.0/order/status/{orderHash}',
            'GET /orders/v1.0/order/escrow',
            'GET /orders/v1.0/order/ready-to-accept-secret-fills/{orderHash}',
            'GET /orders/v1.0/order/ready-to-execute-public-actions',
            'GET /orders/v1.0/order/secrets/{orderHash}'
        ]
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Mock 1inch backend is running' });
});

// Catch-all for any other routes
app.all('*', (req, res) => {
    console.log(`🔍 Unknown endpoint called: ${req.path}`);
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        message: 'This mock backend only handles /mock-1inch-api/* routes'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Mock 1inch Backend Server running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🎯 Mock API base: http://localhost:${PORT}/mock-1inch-api`);
    console.log('\n📝 Server will log all incoming requests...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down mock backend server...');
    process.exit(0);
});