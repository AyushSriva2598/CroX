"""
Blockchain Service — Monad testnet integration via web3.py.

Registers contract hashes on-chain and verifies them.
Falls back gracefully if no private key or contract address is configured.
"""
import hashlib
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from web3 import Web3
    HAS_WEB3 = True
except ImportError:
    HAS_WEB3 = False

# ABI for ContractRegistry (only the functions we need)
CONTRACT_REGISTRY_ABI = [
    {
        "inputs": [{"name": "hash", "type": "bytes32"}],
        "name": "registerContract",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "hash", "type": "bytes32"}],
        "name": "verifyContract",
        "outputs": [
            {"name": "", "type": "bool"},
            {"name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "", "type": "bytes32"}],
        "name": "contractTimestamps",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "contractHash", "type": "bytes32"},
            {"indexed": False, "name": "timestamp", "type": "uint256"}
        ],
        "name": "ContractRegistered",
        "type": "event"
    }
]


def _get_web3():
    """Get Web3 instance connected to Monad testnet."""
    if not HAS_WEB3:
        logger.warning("web3 package not installed")
        return None, None, None

    rpc_url = settings.MONAD_RPC_URL
    private_key = settings.MONAD_PRIVATE_KEY
    contract_address = settings.CONTRACT_REGISTRY_ADDRESS

    if not private_key or not contract_address:
        logger.info("Monad not configured — private key or contract address missing")
        return None, None, None

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    if not w3.is_connected():
        logger.error("Cannot connect to Monad RPC")
        return None, None, None

    contract = w3.eth.contract(
        address=Web3.to_checksum_address(contract_address),
        abi=CONTRACT_REGISTRY_ABI,
    )
    account = w3.eth.account.from_key(private_key)

    return w3, contract, account


def compute_contract_hash(contract_data):
    """Compute SHA-256 hash of contract data for on-chain storage."""
    data_str = json.dumps({
        'id': str(contract_data.get('id', '')),
        'title': contract_data.get('title', ''),
        'total_amount': str(contract_data.get('total_amount', '')),
        'payer': str(contract_data.get('payer_id', '')),
        'payee': str(contract_data.get('payee_id', '')),
        'terms': contract_data.get('terms', {}),
    }, sort_keys=True)

    hash_bytes = hashlib.sha256(data_str.encode()).digest()
    return hash_bytes


def register_contract_on_chain(contract):
    """
    Register a contract hash on Monad blockchain.
    
    Returns: {'success': bool, 'tx_hash': str, 'contract_hash': str, 'explorer_url': str}
    """
    contract_data = {
        'id': str(contract.id),
        'title': contract.title,
        'total_amount': str(contract.total_amount),
        'payer_id': str(contract.payer_id),
        'payee_id': str(contract.payee_id) if contract.payee_id else '',
        'terms': contract.terms,
    }

    contract_hash = compute_contract_hash(contract_data)
    hash_hex = '0x' + contract_hash.hex()

    w3, registry, account = _get_web3()

    if not w3:
        # Mock response for demo
        mock_tx = f"0x{'a' * 64}"
        logger.info(f"[Blockchain] Mock registration — hash: {hash_hex}")
        return {
            'success': True,
            'tx_hash': mock_tx,
            'contract_hash': hash_hex,
            'explorer_url': f"https://testnet.monadscan.com/tx/{mock_tx}",
            'mock': True,
        }

    try:
        # Estimate gas properly on Monad network, fallback if it fails
        try:
            gas_estimate = registry.functions.registerContract(contract_hash).estimate_gas({'from': account.address})
            gas_limit = int(gas_estimate * 1.5) # Add 50% buffer to be super safe
        except Exception as e_gas:
            logger.warning(f"[Blockchain] Gas estimation failed, using static high gas: {e_gas}")
            gas_limit = 500000

        # Build transaction
        nonce = w3.eth.get_transaction_count(account.address)
        gas_price = int(w3.eth.gas_price * 1.2) # Bump gas price by 20%
        
        tx = registry.functions.registerContract(contract_hash).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': gas_limit,
            'gasPrice': gas_price,
            'chainId': settings.MONAD_CHAIN_ID,
        })

        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(tx, account.key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hex = tx_hash.hex()

        logger.info(f"[Blockchain] Contract registered — tx: {tx_hex}")

        return {
            'success': True,
            'tx_hash': tx_hex,
            'contract_hash': hash_hex,
            'explorer_url': f"https://testnet.monadscan.com/tx/{tx_hex}",
            'mock': False,
        }
    except Exception as e:
        logger.error(f"[Blockchain] Registration failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'contract_hash': hash_hex,
        }


def verify_contract_on_chain(contract):
    """
    Verify a contract hash exists on-chain.
    
    Returns: {'verified': bool, 'timestamp': int, 'contract_hash': str}
    """
    contract_data = {
        'id': str(contract.id),
        'title': contract.title,
        'total_amount': str(contract.total_amount),
        'payer_id': str(contract.payer_id),
        'payee_id': str(contract.payee_id) if contract.payee_id else '',
        'terms': contract.terms,
    }

    contract_hash = compute_contract_hash(contract_data)
    hash_hex = '0x' + contract_hash.hex()

    w3, registry, account = _get_web3()

    if not w3:
        return {
            'verified': bool(contract.blockchain_tx_hash),
            'timestamp': 0,
            'contract_hash': hash_hex,
            'mock': True,
        }

    try:
        verified, timestamp = registry.functions.verifyContract(contract_hash).call()
        return {
            'verified': verified,
            'timestamp': timestamp,
            'contract_hash': hash_hex,
            'mock': False,
        }
    except Exception as e:
        logger.error(f"[Blockchain] Verification failed: {e}")
        return {
            'verified': False,
            'error': str(e),
            'contract_hash': hash_hex,
        }

def transfer_monad(to_address, amount_in_mon):
    """
    Transfers native MON tokens to a specific address on Monad Testnet.
    Returns: {'success': bool, 'tx_hash': str, 'explorer_url': str}
    """
    w3, _, account = _get_web3()
    if not w3 or not to_address:
        return {'success': False, 'mock': True}
        
    try:
        amount_wei = w3.to_wei(amount_in_mon, 'ether')
        nonce = w3.eth.get_transaction_count(account.address)
        
        # Add a 20% multiplier to current gas price to ensure faster inclusion on testnet
        gas_price = int(w3.eth.gas_price * 1.2)
        
        tx = {
            'nonce': nonce,
            'to': Web3.to_checksum_address(to_address),
            'value': amount_wei,
            'gas': 25000, # basic transfer takes 21000
            'gasPrice': gas_price,
            'chainId': settings.MONAD_CHAIN_ID,
        }
        
        signed_tx = w3.eth.account.sign_transaction(tx, account.key)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        tx_hex = tx_hash.hex()
        
        logger.info(f"[Blockchain] Transferred {amount_in_mon} MON to {to_address} — tx: {tx_hex}")
        
        return {
            'success': True,
            'tx_hash': tx_hex,
            'explorer_url': f"https://testnet.monadscan.com/tx/{tx_hex}"
        }
    except Exception as e:
        logger.error(f"[Blockchain] Transfer failed: {e}")
        return {'success': False, 'error': str(e)}
