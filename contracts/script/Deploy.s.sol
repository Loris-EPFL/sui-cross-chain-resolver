// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IOrderMixin} from "limit-order-protocol/contracts/interfaces/IOrderMixin.sol";

// Import our contracts
import {TestEscrowFactory} from "../src/TestEscrowFactory.sol";
import {Resolver} from "../src/Resolver.sol";

/**
 * @title Deployment Script for Cross-Chain Resolver Contracts
 * @notice This script demonstrates the interconnection flow between contracts:
 * 
 * CONTRACT INTERCONNECTION FLOW:
 * ==============================
 * 
 * 1. TestEscrowFactory (inherits from EscrowFactory)
 *    - Constructor parameters:
 *      * limitOrderProtocol: Address of 1inch Limit Order Protocol
 *      * feeToken: IERC20 token used for fees (typically USDC/WETH)
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
 *      * lop: IOrderMixin (1inch Limit Order Protocol)
 *      * initialOwner: Address that owns the resolver
 *    - Uses the factory to deploy escrow contracts
 *    - Orchestrates cross-chain swaps via deploySrc/deployDst functions
 * 
 * DEPLOYMENT DEPENDENCIES:
 * =======================
 * TestEscrowFactory MUST be deployed before Resolver
 * Both contracts need the same Limit Order Protocol address
 * 
 * TEST INTEGRATION:
 * ================
 * The main.spec.ts test file shows how these contracts work together:
 * - initChain() function deploys both contracts in the correct order
 * - Tests demonstrate cross-chain swap flow using deploySrc/deployDst
 * - Shows how resolver uses factory to create escrow contracts
 */
contract DeployScript is Script {
    // Sepolia testnet addresses (update these for other networks)
    address constant LIMIT_ORDER_PROTOCOL_SEPOLIA = 0x119c71D3BbAC22029622cbaEc24854d3D32D2828; // 1inch LOP v4
    address constant USDC_SEPOLIA = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // USDC on Sepolia
    address constant WETH_SEPOLIA = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14; // WETH on Sepolia
    
    // Deployment configuration
    uint32 constant RESCUE_DELAY_SRC = 1800; // 30 minutes
    uint32 constant RESCUE_DELAY_DST = 1800; // 30 minutes
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Step 1: Deploy TestEscrowFactory
        console.log("\n=== Deploying TestEscrowFactory ===");
        console.log("Constructor parameters:");
        console.log("- limitOrderProtocol:", LIMIT_ORDER_PROTOCOL_SEPOLIA);
        console.log("- feeToken (USDC):", USDC_SEPOLIA);
        console.log("- accessToken:", address(0), "(zero address - no access control)");
        console.log("- owner:", deployer);
        console.log("- rescueDelaySrc:", RESCUE_DELAY_SRC, "seconds");
        console.log("- rescueDelayDst:", RESCUE_DELAY_DST, "seconds");
        
        TestEscrowFactory escrowFactory = new TestEscrowFactory(
            LIMIT_ORDER_PROTOCOL_SEPOLIA,  // limitOrderProtocol
            IERC20(USDC_SEPOLIA),          // feeToken
            IERC20(address(0)),            // accessToken (no access control)
            deployer,                      // owner
            RESCUE_DELAY_SRC,              // rescueDelaySrc
            RESCUE_DELAY_DST               // rescueDelayDst
        );
        
        console.log("TestEscrowFactory deployed at:", address(escrowFactory));
        console.log("EscrowSrc implementation:", escrowFactory.ESCROW_SRC_IMPLEMENTATION());
        console.log("EscrowDst implementation:", escrowFactory.ESCROW_DST_IMPLEMENTATION());
        
        // Step 2: Deploy Resolver
        console.log("\n=== Deploying Resolver ===");
        console.log("Constructor parameters:");
        console.log("- factory:", address(escrowFactory));
        console.log("- lop:", LIMIT_ORDER_PROTOCOL_SEPOLIA);
        console.log("- initialOwner:", deployer);
        
        Resolver resolver = new Resolver(
            escrowFactory,                 // factory (IEscrowFactory)
            IOrderMixin(LIMIT_ORDER_PROTOCOL_SEPOLIA), // lop (IOrderMixin)
            deployer                       // initialOwner
        );
        
        console.log("Resolver deployed at:", address(resolver));
        
        vm.stopBroadcast();
        
        // Display deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network: Sepolia Testnet");
        console.log("Deployer:", deployer);
        console.log("TestEscrowFactory:", address(escrowFactory));
        console.log("Resolver:", address(resolver));
        console.log("\n=== CONTRACT INTERCONNECTIONS ===");
        console.log("1. TestEscrowFactory creates EscrowSrc/EscrowDst implementations");
        console.log("2. Resolver uses TestEscrowFactory to deploy escrow contracts");
        console.log("3. Both contracts integrate with 1inch Limit Order Protocol");
        console.log("4. Cross-chain swaps orchestrated via Resolver.deploySrc/deployDst");
        
        // Save deployment addresses to file for verification
        string memory deploymentInfo = string.concat(
            "# Deployment Addresses\n",
            "ESCROW_FACTORY=", vm.toString(address(escrowFactory)), "\n",
            "RESOLVER=", vm.toString(address(resolver)), "\n",
            "ESCROW_SRC_IMPL=", vm.toString(escrowFactory.ESCROW_SRC_IMPLEMENTATION()), "\n",
            "ESCROW_DST_IMPL=", vm.toString(escrowFactory.ESCROW_DST_IMPLEMENTATION()), "\n",
            "DEPLOYER=", vm.toString(deployer), "\n",
            "NETWORK=sepolia\n"
        );
        
        //vm.writeFile("deployments.env", deploymentInfo);
        //console.log("\nDeployment addresses saved to deployments.env");

        console.log("\nDeployment info");
        console.log(deploymentInfo);
        
        console.log("\n=== VERIFICATION COMMANDS ===");
        console.log("To verify TestEscrowFactory:");
        console.log(string.concat(
            "forge verify-contract ",
            vm.toString(address(escrowFactory)),
            " src/TestEscrowFactory.sol:TestEscrowFactory",
            " --chain sepolia",
            " --constructor-args $(cast abi-encode \"constructor(address,address,address,address,uint32,uint32)\" ",
            vm.toString(LIMIT_ORDER_PROTOCOL_SEPOLIA), " ",
            vm.toString(USDC_SEPOLIA), " ",
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
            " --chain sepolia",
            " --constructor-args $(cast abi-encode \"constructor(address,address,address)\" ",
            vm.toString(address(escrowFactory)), " ",
            vm.toString(LIMIT_ORDER_PROTOCOL_SEPOLIA), " ",
            vm.toString(deployer), ")"
        ));
    }
}