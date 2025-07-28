// Jest setup file to handle ES modules and global configurations

// Mock the problematic ES modules
jest.mock('prool', () => ({
    createServer: jest.fn(),
    instances: {
        anvil: jest.fn()
    }
}));

// Global setup for ES modules
global.process = global.process || {};
global.process.env = global.process.env || {}; 