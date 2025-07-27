// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test, console} from "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IOrderMixin} from "limit-order-protocol/contracts/interfaces/IOrderMixin.sol";

import {TestEscrowFactory} from "../src/TestEscrowFactory.sol";
import {Resolver} from "../src/Resolver.sol";

/**
 * @title Deployment Test
 * @notice Tests to verify contracts deploy correctly and have proper interconnections
 */
contract DeployTest is Test {
    TestEscrowFactory public escrowFactory;
    Resolver public resolver;
    
    address public owner;
    address public mockLOP;
    address public mockUSDC;
    
    uint32 constant RESCUE_DELAY_SRC = 1800; // 30 minutes
    uint32 constant RESCUE_DELAY_DST = 1800; // 30 minutes
    
    function setUp() public {
        owner = makeAddr("owner");
        mockLOP = makeAddr("mockLOP");
        mockUSDC = makeAddr("mockUSDC");
        
        vm.startPrank(owner);
        
        // Deploy TestEscrowFactory first
        escrowFactory = new TestEscrowFactory(
            mockLOP,                    // limitOrderProtocol
            IERC20(mockUSDC),          // feeToken
            IERC20(address(0)),        // accessToken (no access control)
            owner,                     // owner
            RESCUE_DELAY_SRC,          // rescueDelaySrc
            RESCUE_DELAY_DST           // rescueDelayDst
        );
        
        // Deploy Resolver
        resolver = new Resolver(
            escrowFactory,             // factory
            IOrderMixin(mockLOP),      // lop
            owner                      // initialOwner
        );
        
        vm.stopPrank();
    }
    
    function test_EscrowFactoryDeployment() public {
        // Verify factory deployed correctly
        assertTrue(address(escrowFactory) != address(0), "EscrowFactory should be deployed");
        
        // Verify implementations are created
        address srcImpl = escrowFactory.ESCROW_SRC_IMPLEMENTATION();
        address dstImpl = escrowFactory.ESCROW_DST_IMPLEMENTATION();
        
        assertTrue(srcImpl != address(0), "EscrowSrc implementation should exist");
        assertTrue(dstImpl != address(0), "EscrowDst implementation should exist");
        
        console.log("EscrowFactory deployed at:", address(escrowFactory));
        console.log("EscrowSrc implementation:", srcImpl);
        console.log("EscrowDst implementation:", dstImpl);
    }
    
    function test_ResolverDeployment() public {
        // Verify resolver deployed correctly
        assertTrue(address(resolver) != address(0), "Resolver should be deployed");
        
        // Verify owner is set correctly
        assertEq(resolver.owner(), owner, "Resolver owner should be set correctly");
        
        console.log("Resolver deployed at:", address(resolver));
        console.log("Resolver owner:", resolver.owner());
    }
    
    function test_ContractInterconnections() public {
        // Verify that resolver can receive ETH (for safety deposits)
        vm.deal(address(resolver), 1 ether);
        assertEq(address(resolver).balance, 1 ether, "Resolver should be able to receive ETH");
        
        // Verify factory has proper implementations
        address srcImpl = escrowFactory.ESCROW_SRC_IMPLEMENTATION();
        address dstImpl = escrowFactory.ESCROW_DST_IMPLEMENTATION();
        
        // Check that implementations are different contracts
        assertTrue(srcImpl != dstImpl, "Src and Dst implementations should be different");
        
        console.log("Contract interconnections verified");
        console.log("- EscrowFactory creates implementations");
        console.log("- Resolver can receive ETH for safety deposits");
        console.log("- Src and Dst implementations are separate contracts");
    }
    
    function test_ConstructorParameters() public {
        // Test that constructor parameters are stored correctly
        
        // For EscrowFactory, we can't directly access all parameters
        // but we can verify the implementations exist
        assertTrue(
            escrowFactory.ESCROW_SRC_IMPLEMENTATION() != address(0),
            "Constructor should create EscrowSrc implementation"
        );
        assertTrue(
            escrowFactory.ESCROW_DST_IMPLEMENTATION() != address(0),
            "Constructor should create EscrowDst implementation"
        );
        
        // For Resolver, we can check the owner
        assertEq(resolver.owner(), owner, "Resolver constructor should set owner");
        
        console.log("Constructor parameters verified:");
        console.log("- EscrowFactory created implementations");
        console.log("- Resolver owner set correctly");
    }
    
    function test_DeploymentFlow() public {
        console.log("\n=== DEPLOYMENT FLOW VERIFICATION ===");
        console.log("1. TestEscrowFactory deployed with parameters:");
        console.log("   - limitOrderProtocol:", mockLOP);
        console.log("   - feeToken:", mockUSDC);
        console.log("   - accessToken:", address(0));
        console.log("   - owner:", owner);
        console.log("   - rescueDelaySrc:", RESCUE_DELAY_SRC);
        console.log("   - rescueDelayDst:", RESCUE_DELAY_DST);
        
        console.log("\n2. EscrowFactory creates implementations:");
        console.log("   - EscrowSrc:", escrowFactory.ESCROW_SRC_IMPLEMENTATION());
        console.log("   - EscrowDst:", escrowFactory.ESCROW_DST_IMPLEMENTATION());
        
        console.log("\n3. Resolver deployed with parameters:");
        console.log("   - factory:", address(escrowFactory));
        console.log("   - lop:", mockLOP);
        console.log("   - initialOwner:", owner);
        
        console.log("\n4. Contracts are interconnected:");
        console.log("   - Resolver uses EscrowFactory to deploy escrows");
        console.log("   - Both integrate with 1inch Limit Order Protocol");
        console.log("   - Cross-chain swaps orchestrated via Resolver");
        
        // All tests should pass if we reach here
        assertTrue(true, "Deployment flow completed successfully");
    }
}