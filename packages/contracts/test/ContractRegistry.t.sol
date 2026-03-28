// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ContractRegistry.sol";

contract ContractRegistryTest is Test {
    ContractRegistry public registry;

    function setUp() public {
        registry = new ContractRegistry();
    }

    function testRegisterContract() public {
        bytes32 hash = keccak256("test-contract-data");
        
        registry.registerContract(hash);
        
        (bool exists, uint256 timestamp) = registry.verifyContract(hash);
        assertTrue(exists);
        assertGt(timestamp, 0);
        assertEq(registry.totalContracts(), 1);
        assertEq(registry.getRegistrar(hash), address(this));
    }

    function testCannotRegisterTwice() public {
        bytes32 hash = keccak256("test-contract-data");
        
        registry.registerContract(hash);
        
        vm.expectRevert("Contract already registered");
        registry.registerContract(hash);
    }

    function testVerifyUnregistered() public view {
        bytes32 hash = keccak256("nonexistent");
        
        (bool exists, uint256 timestamp) = registry.verifyContract(hash);
        assertFalse(exists);
        assertEq(timestamp, 0);
    }

    function testMultipleContracts() public {
        bytes32 hash1 = keccak256("contract-1");
        bytes32 hash2 = keccak256("contract-2");
        
        registry.registerContract(hash1);
        registry.registerContract(hash2);
        
        assertEq(registry.totalContracts(), 2);
        
        (bool exists1,) = registry.verifyContract(hash1);
        (bool exists2,) = registry.verifyContract(hash2);
        assertTrue(exists1);
        assertTrue(exists2);
    }
}
