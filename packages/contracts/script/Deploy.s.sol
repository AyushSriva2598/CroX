// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ContractRegistry.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        ContractRegistry registry = new ContractRegistry();
        
        console.log("ContractRegistry deployed at:", address(registry));
        
        vm.stopBroadcast();
    }
}
