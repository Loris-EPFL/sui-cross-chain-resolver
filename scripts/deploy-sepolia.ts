import { createWalletClient, createPublicClient, http, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Load contract artifacts
const loadContractArtifact = (contractName: string) => {
  const artifactPath = path.join(
    __dirname,
    '../dist/contracts',
    `${contractName}.sol`,
    `${contractName}.json`
  );
  return JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
};

const resolverArtifact = loadContractArtifact('Resolver');
const escrowFactoryArtifact = loadContractArtifact('EscrowFactory');
const escrowSrcArtifact = loadContractArtifact('EscrowSrc');
const escrowDstArtifact = loadContractArtifact('EscrowDst');
const feeBankArtifact = loadContractArtifact('FeeBank');

async function deployToSepolia() {
  // Validate environment variables
  const privateKey = process.env.PRIVATE_KEY;
  const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
  
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  // Create viem clients
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(sepoliaRpcUrl),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(sepoliaRpcUrl),
  });

  console.log('🚀 Starting deployment to Sepolia...');
  console.log('📍 Deployer address:', account.address);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('💰 Balance:', balance.toString(), 'wei');
  
  if (balance < parseEther('0.1')) {
    console.warn('⚠️  Low balance detected. Make sure you have enough ETH for deployment.');
  }

  try {
    // Step 1: Deploy EscrowSrc implementation
    console.log('\n📦 Deploying EscrowSrc implementation...');
    const escrowSrcHash = await walletClient.deployContract({
      abi: escrowSrcArtifact.abi,
      bytecode: escrowSrcArtifact.bytecode.object as `0x${string}`,
      args: [86400], // rescueDelay: 24 hours in seconds
    });
    
    const escrowSrcReceipt = await publicClient.waitForTransactionReceipt({ hash: escrowSrcHash });
    const escrowSrcAddress = escrowSrcReceipt.contractAddress!;
    console.log('✅ EscrowSrc deployed at:', escrowSrcAddress);

    // Step 2: Deploy EscrowDst implementation
    console.log('\n📦 Deploying EscrowDst implementation...');
    const escrowDstHash = await walletClient.deployContract({
      abi: escrowDstArtifact.abi,
      bytecode: escrowDstArtifact.bytecode.object as `0x${string}`,
      args: [86400], // rescueDelay: 24 hours in seconds
    });
    
    const escrowDstReceipt = await publicClient.waitForTransactionReceipt({ hash: escrowDstHash });
    const escrowDstAddress = escrowDstReceipt.contractAddress!;
    console.log('✅ EscrowDst deployed at:', escrowDstAddress);

    // Step 3: Skip FeeBank for now (optional component)
    console.log('\n⏭️  Skipping FeeBank deployment (optional component)');
    const feeBankAddress = '0x0000000000000000000000000000000000000000';

    // Step 4: Deploy EscrowFactory
    console.log('\n📦 Deploying EscrowFactory...');
    const escrowFactoryHash = await walletClient.deployContract({
      abi: escrowFactoryArtifact.abi,
      bytecode: escrowFactoryArtifact.bytecode.object as `0x${string}`,
      args: [
        '0x111111125421cA6dc452d289314280a0f8842A65', // 1inch LimitOrderProtocol on Sepolia
        '0x0000000000000000000000000000000000000000', // feeToken (zero address)
        '0x0000000000000000000000000000000000000000', // accessToken (zero address)
        account.address, // owner
        86400, // rescueDelaySrc (24 hours)
        86400, // rescueDelayDst (24 hours)
      ],
    });
    
    const escrowFactoryReceipt = await publicClient.waitForTransactionReceipt({ hash: escrowFactoryHash });
    const escrowFactoryAddress = escrowFactoryReceipt.contractAddress!;
    console.log('✅ EscrowFactory deployed at:', escrowFactoryAddress);

    // Step 5: Deploy Resolver
    console.log('\n📦 Deploying Resolver...');
    const resolverHash = await walletClient.deployContract({
      abi: resolverArtifact.abi,
      bytecode: resolverArtifact.bytecode.object as `0x${string}`,
      args: [
        escrowFactoryAddress, // factory
        '0x111111125421cA6dc452d289314280a0f8842A65', // 1inch LimitOrderProtocol on Sepolia
        account.address, // initialOwner
      ],
    });
    
    const resolverReceipt = await publicClient.waitForTransactionReceipt({ hash: resolverHash });
    const resolverAddress = resolverReceipt.contractAddress!;
    console.log('✅ Resolver deployed at:', resolverAddress);

    // Summary
    console.log('\n🎉 Deployment completed successfully!');
    console.log('\n📋 Contract Addresses:');
    console.log('├── EscrowSrc Implementation:', escrowSrcAddress);
    console.log('├── EscrowDst Implementation:', escrowDstAddress);
    console.log('├── FeeBank:', feeBankAddress);
    console.log('├── EscrowFactory:', escrowFactoryAddress);
    console.log('└── Resolver:', resolverAddress);
    
    // Save deployment info
    const deploymentInfo = {
      network: 'sepolia',
      chainId: 11155111,
      deployer: account.address,
      timestamp: new Date().toISOString(),
      contracts: {
        escrowSrcImplementation: escrowSrcAddress,
        escrowDstImplementation: escrowDstAddress,
        feeBank: feeBankAddress,
        escrowFactory: escrowFactoryAddress,
        resolver: resolverAddress,
      },
      transactionHashes: {
        escrowSrc: escrowSrcHash,
        escrowDst: escrowDstHash,
        feeBank: feeBankHash,
        escrowFactory: escrowFactoryHash,
        resolver: resolverHash,
      },
    };
    
    const deploymentPath = path.join(__dirname, '../deployments/sepolia.json');
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('\n💾 Deployment info saved to:', deploymentPath);
    
    console.log('\n🔗 Etherscan URLs:');
    console.log('├── EscrowSrc:', `https://sepolia.etherscan.io/address/${escrowSrcAddress}`);
    console.log('├── EscrowDst:', `https://sepolia.etherscan.io/address/${escrowDstAddress}`);
    console.log('├── FeeBank:', `https://sepolia.etherscan.io/address/${feeBankAddress}`);
    console.log('├── EscrowFactory:', `https://sepolia.etherscan.io/address/${escrowFactoryAddress}`);
    console.log('└── Resolver:', `https://sepolia.etherscan.io/address/${resolverAddress}`);
    
    return {
      escrowFactory: escrowFactoryAddress,
      resolver: resolverAddress,
    };
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

// Run deployment if this script is executed directly
if (require.main === module) {
  deployToSepolia()
    .then(() => {
      console.log('\n✨ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Deployment failed:', error);
      process.exit(1);
    });
}

export { deployToSepolia };