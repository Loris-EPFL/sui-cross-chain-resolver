// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IOrderMixin} from "limit-order-protocol/contracts/interfaces/IOrderMixin.sol";

// Import mock contracts
import {LimitOrderProtocol} from "limit-order-protocol/contracts/LimitOrderProtocol.sol";
import {TokenMock} from "solidity-utils/contracts/mocks/TokenMock.sol";
import {WrappedTokenMock} from "limit-order-protocol/contracts/mocks/WrappedTokenMock.sol";

// Import our contracts
import {TestEscrowFactory} from "../src/TestEscrowFactory.sol";
import {Resolver} from "../src/Resolver.sol";
import {ERC20True} from "../lib/limit-order-protocol/contracts/ERC20True.sol";

/**
 * @title Deployment Script for Cross-Chain Resolver Contracts
 * @notice This script deploys both mock contracts and main contracts:
 * 
 * DEPLOYMENT FLOW:
 * ===============
 * 1. Deploy Mock WETH (WrappedTokenMock)
 * 2. Deploy Mock USDC (TokenMock)
 * 3. Deploy Mock Limit Order Protocol (LimitOrderProtocol)
 * 4. Deploy TestEscrowFactory using mock addresses
 * 5. Deploy Resolver using factory and mock LOP
 * 6. Setup initial token balances for testing
 * 
 * This approach eliminates hardcoded addresses and ensures all dependencies
 * are properly deployed and configured for testing.
 * 
 * CONTRACT INTERCONNECTION FLOW:
 * ==============================
 * 
 * 1. TestEscrowFactory (inherits from EscrowFactory)
 *    - Constructor parameters:
 *      * limitOrderProtocol: Address of deployed mock LimitOrderProtocol
 *      * feeToken: IERC20 token used for fees (deployed mock USDC)
 *      * accessToken: IERC20 token for access control (can be zero address)
 *      * owner: Address that owns the factory
 *      * rescueDelaySrc: Rescue delay for source chain escrows (in seconds)
 *      * rescueDelayDst: Rescue delay for destination chain escrows (in seconds)
 *    - Creates EscrowSrc and EscrowDst implementations internally
 *    - Provides factory methods to deploy escrow contracts
 * 
 * 2. Resolver (main orchestrator contract)
 *    - Constructor parameters:
 *      * factory: IEscrowFactory (the TestEscrowFactory deployed above)
 *      * lop: IOrderMixin (deployed mock LimitOrderProtocol)
 *      * initialOwner: Address that owns the resolver
 *    - Uses the factory to deploy escrow contracts
 *    - Orchestrates cross-chain swaps via deploySrc/deployDst functions
 * 
 * DEPLOYMENT DEPENDENCIES:
 * =======================
 * Mock contracts MUST be deployed before main contracts
 * TestEscrowFactory MUST be deployed before Resolver
 * All contracts use the same mock LimitOrderProtocol address
 */
contract DeployScript is Script {
    // Deployment configuration
    uint32 constant RESCUE_DELAY_SRC = 1800; // 30 minutes
    uint32 constant RESCUE_DELAY_DST = 1800; // 30 minutes
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Deploy Mock WETH
        console.log("\n=== Deploying Mock WETH ====");
        WrappedTokenMock mockWETH = new WrappedTokenMock("Wrapped Ether", "WETH");
        console.log("Mock WETH deployed at:", address(mockWETH));
        
        // Step 2: Deploy Mock USDC
        console.log("\n=== Deploying Mock USDC ====");
        TokenMock mockUSDC = new TokenMock("USD Coin", "USDC");
        console.log("Mock USDC deployed at:", address(mockUSDC));

        //Step 2.1: Deploy ERC20True
        console.log("\n=== Deploying ERC20True ====");
        ERC20True erc20True = new ERC20True();
        console.log("ERC20True deployed at:", address(erc20True));
        
        // Step 2.5: Deploy ERC20True token for 1inch compatibility
        console.log("\n=== Deploying ERC20True Token ====");
        ERC20True erc20True = new ERC20True();
        console.log("ERC20True deployed at:", address(erc20True));
        
        // Step 3: Deploy Mock Limit Order Protocol
        console.log("\n=== Deploying Mock Limit Order Protocol ====");
        LimitOrderProtocol mockLOP = new LimitOrderProtocol(mockWETH);
        console.log("Mock LOP deployed at:", address(mockLOP));
        
        // Step 4: Deploy TestEscrowFactory
        console.log("\n=== Deploying TestEscrowFactory ===");
        console.log("Constructor parameters:");
        console.log("- limitOrderProtocol:", address(mockLOP));
        console.log("- feeToken (Mock USDC):", address(mockUSDC));
        console.log("- accessToken:", address(0), "(zero address - no access control)");
        console.log("- owner:", deployer);
        console.log("- rescueDelaySrc:", RESCUE_DELAY_SRC, "seconds");
        console.log("- rescueDelayDst:", RESCUE_DELAY_DST, "seconds");
        
        TestEscrowFactory escrowFactory = new TestEscrowFactory(
            address(mockLOP),              // limitOrderProtocol
            IERC20(address(mockUSDC)),     // feeToken
            IERC20(address(0)),            // accessToken (no access control)
            deployer,                      // owner
            RESCUE_DELAY_SRC,              // rescueDelaySrc
            RESCUE_DELAY_DST               // rescueDelayDst
        );
        
        console.log("TestEscrowFactory deployed at:", address(escrowFactory));
        console.log("EscrowSrc implementation:", escrowFactory.ESCROW_SRC_IMPLEMENTATION());
        console.log("EscrowDst implementation:", escrowFactory.ESCROW_DST_IMPLEMENTATION());
        
        // Step 5: Deploy Resolver
        console.log("\n=== Deploying Resolver ===");
        console.log("Constructor parameters:");
        console.log("- factory:", address(escrowFactory));
        console.log("- lop:", address(mockLOP));
        console.log("- initialOwner:", deployer);
        
        Resolver resolver = new Resolver(
            escrowFactory,                 // factory (IEscrowFactory)
            IOrderMixin(address(mockLOP)), // lop (IOrderMixin)
            deployer                       // initialOwner
        );
        
        console.log("Resolver deployed at:", address(resolver));
        
        // Step 6: Setup initial token balances for testing
        console.log("\n=== Setting up test token balances ====");
        
        // Mint some USDC to deployer for testing
        mockUSDC.mint(deployer, 1000000 * 10**18); // 1M USDC (6 decimals)
        console.log("Minted 1,000,000 USDC to deployer");
        
        // Deposit some ETH to get WETH for testing
        mockWETH.deposit{value: 0.001 ether}();
        console.log("Deposited 10 ETH to get WETH for deployer");
        
        vm.stopBroadcast();
        
        // Display deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Local/Testnet with Mock Contracts");
        console.log("Deployer:", deployer);
        console.log("Mock WETH:", address(mockWETH));
        console.log("Mock USDC:", address(mockUSDC));
        console.log("ERC20True:", address(erc20True));
        console.log("Mock LimitOrderProtocol:", address(mockLOP));
        console.log("TestEscrowFactory:", address(escrowFactory));
        console.log("Resolver:", address(resolver));
        console.log("\n=== CONTRACT INTERCONNECTIONS ===");
        console.log("1. Mock contracts deployed first (WETH, USDC, LimitOrderProtocol)");
        console.log("2. TestEscrowFactory creates EscrowSrc/EscrowDst implementations");
        console.log("3. Resolver uses TestEscrowFactory to deploy escrow contracts");
        console.log("4. All contracts integrate with mock LimitOrderProtocol");
        console.log("5. Cross-chain swaps orchestrated via Resolver.deploySrc/deployDst");
        
        // Save deployment addresses to file for verification
        string memory deploymentInfo = string.concat(
            "# Deployment Addresses\n",
            "MOCK_WETH=", vm.toString(address(mockWETH)), "\n",
            "MOCK_USDC=", vm.toString(address(mockUSDC)), "\n",
            "ERC20_TRUE=", vm.toString(address(erc20True)), "\n",
            "MOCK_LIMIT_ORDER_PROTOCOL=", vm.toString(address(mockLOP)), "\n",
            "ESCROW_FACTORY=", vm.toString(address(escrowFactory)), "\n",
            "RESOLVER=", vm.toString(address(resolver)), "\n",
            "ESCROW_SRC_IMPL=", vm.toString(escrowFactory.ESCROW_SRC_IMPLEMENTATION()), "\n",
            "ESCROW_DST_IMPL=", vm.toString(escrowFactory.ESCROW_DST_IMPLEMENTATION()), "\n",
            "DEPLOYER=", vm.toString(deployer), "\n",
            "NETWORK=mock\n"
        );
        
        //vm.writeFile("deployments.env", deploymentInfo);
        //console.log("\nDeployment addresses saved to deployments.env");

        console.log("\nDeployment info");
        console.log(deploymentInfo);
        
        console.log("\n=== NEXT STEPS ====");
        console.log("1. Update your test files to use these deployed contract addresses");
        console.log("2. The mock contracts are fully functional for testing");
        console.log("3. Mock USDC and WETH have been minted to the deployer address");
        console.log("4. You can now run tests without contract revert errors");
        console.log("5. For production deployment, replace mock contracts with real ones");
        
        console.log("\n=== VERIFICATION COMMANDS (if deploying to testnet) ===");
        console.log("To verify TestEscrowFactory:");
        console.log(string.concat(
            "forge verify-contract ",
            vm.toString(address(escrowFactory)),
            " src/TestEscrowFactory.sol:TestEscrowFactory",
            " --constructor-args $(cast abi-encode \"constructor(address,address,address,address,uint32,uint32)\" ",
            vm.toString(address(mockLOP)), " ",
            vm.toString(address(mockUSDC)), " ",
            vm.toString(address(0)), " ",
            vm.toString(deployer), " ",
            vm.toString(RESCUE_DELAY_SRC), " ",
            vm.toString(RESCUE_DELAY_DST), ")"
        ));
        
        console.log("\nTo verify Resolver:");
        console.log(string.concat(
            "forge verify-contract ",
            vm.toString(address(resolver)),
            " src/Resolver.sol:Resolver",
            " --constructor-args $(cast abi-encode \"constructor(address,address,address)\" ",
            vm.toString(address(escrowFactory)), " ",
            vm.toString(address(mockLOP)), " ",
            vm.toString(deployer), ")"
        ));
    }
}