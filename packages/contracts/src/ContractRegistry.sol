// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ContractRegistry
 * @notice Stores contract hashes on Monad blockchain for CroX escrow verification.
 * @dev Each contract is represented by its SHA-256 hash. Once registered, the hash 
 *      and timestamp are immutably stored on-chain.
 */
contract ContractRegistry {
    /// @notice Mapping from contract hash to registration timestamp
    mapping(bytes32 => uint256) public contractTimestamps;
    
    /// @notice Mapping from contract hash to the address that registered it
    mapping(bytes32 => address) public contractRegistrars;
    
    /// @notice Total number of registered contracts
    uint256 public totalContracts;
    
    /// @notice Emitted when a contract is registered on-chain
    event ContractRegistered(
        bytes32 indexed contractHash, 
        address indexed registrar,
        uint256 timestamp
    );
    
    /// @notice Register a contract hash on-chain
    /// @param hash The SHA-256 hash of the contract data
    function registerContract(bytes32 hash) external {
        require(contractTimestamps[hash] == 0, "Contract already registered");
        
        contractTimestamps[hash] = block.timestamp;
        contractRegistrars[hash] = msg.sender;
        totalContracts++;
        
        emit ContractRegistered(hash, msg.sender, block.timestamp);
    }
    
    /// @notice Verify if a contract hash exists on-chain
    /// @param hash The SHA-256 hash to verify
    /// @return exists Whether the hash is registered
    /// @return timestamp When it was registered (0 if not found)
    function verifyContract(bytes32 hash) external view returns (bool exists, uint256 timestamp) {
        timestamp = contractTimestamps[hash];
        exists = timestamp > 0;
    }
    
    /// @notice Get the registrar of a contract hash
    /// @param hash The contract hash
    /// @return The address that registered the hash
    function getRegistrar(bytes32 hash) external view returns (address) {
        return contractRegistrars[hash];
    }
}
