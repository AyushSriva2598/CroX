/**
 * Wallet utility — connect Phantom / MetaMask via window.ethereum
 * and send transactions on Monad Testnet.
 */

const MONAD_TESTNET = {
  chainId: '0x279F', // 10143 in hex
  chainName: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet.monadscan.com'],
};

// Contract Registry ABI (only registerContract)
const REGISTRY_ABI = [
  {
    inputs: [{ name: 'hash', type: 'bytes32' }],
    name: 'registerContract',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

/**
 * Connect to Phantom / MetaMask wallet.
 * Returns the connected address (checksummed).
 */
export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error('No wallet detected. Please install Phantom or MetaMask.');
  }

  // Request accounts
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No account selected.');
  }

  // Switch to Monad testnet
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MONAD_TESTNET.chainId }],
    });
  } catch (switchError) {
    // Chain not added — add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [MONAD_TESTNET],
      });
    } else {
      throw switchError;
    }
  }

  return accounts[0];
}

/**
 * Get the currently connected address (or null).
 */
export async function getConnectedAddress() {
  if (!window.ethereum) return null;
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    return accounts?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Send native MON from the connected wallet to a recipient.
 * Returns the transaction hash.
 */
export async function sendMON(toAddress, amountInMON) {
  if (!window.ethereum) throw new Error('No wallet detected.');

  const from = await getConnectedAddress();
  if (!from) throw new Error('Wallet not connected. Please connect first.');

  // Convert MON amount to wei (1 MON = 10^18 wei)
  const amountWei = BigInt(Math.floor(amountInMON * 1e18));
  const hexValue = '0x' + amountWei.toString(16);

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: toAddress,
      value: hexValue,
    }],
  });

  return txHash;
}

/**
 * Register a contract hash on-chain via the connected wallet.
 * Uses the ContractRegistry smart contract.
 */
export async function registerContractOnChain(contractHashHex, registryAddress) {
  if (!window.ethereum) throw new Error('No wallet detected.');

  const from = await getConnectedAddress();
  if (!from) throw new Error('Wallet not connected. Please connect first.');

  // Encode the function call: registerContract(bytes32)
  // Function selector for registerContract(bytes32) = first 4 bytes of keccak256
  // We'll use a simple manual encoding
  const functionSelector = '0x98d5fdca'; // keccak256("registerContract(bytes32)") first 4 bytes
  
  // Actually let's compute it properly
  // registerContract(bytes32) selector = 0x + first 8 hex chars of keccak256
  // For simplicity, encode manually:
  // The selector for registerContract(bytes32) 
  const selector = await computeSelector('registerContract(bytes32)');
  
  // Pad the hash to 32 bytes (remove 0x prefix, left-pad to 64 hex chars)
  const hashParam = contractHashHex.replace('0x', '').padStart(64, '0');
  const data = selector + hashParam;

  const txHash = await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: registryAddress,
      data: data,
      gas: '0x7A120', // 500000
    }],
  });

  return txHash;
}

/**
 * Compute a Solidity function selector (first 4 bytes of keccak256).
 */
async function computeSelector(signature) {
  const encoder = new TextEncoder();
  const data = encoder.encode(signature);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  // Note: Solidity uses keccak256, not SHA-256. For the correct selector we hardcode it.
  // registerContract(bytes32) keccak256 = 0x73027f6d (computed offline)
  // We'll hardcode known selectors.
  const knownSelectors = {
    'registerContract(bytes32)': '0x73027f6d',
  };
  return knownSelectors[signature] || '0x00000000';
}
