import os
import django
from web3 import Web3
from web3.middleware import geth_poa_middleware

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trustlayer_backend.settings')
django.setup()

from django.conf import settings
from blockchain.services import _get_web3, compute_contract_hash

w3, registry, account = _get_web3()
if w3:
    print(f"Connected: {w3.is_connected()}")
    print(f"Account: {account.address}")
    balance = w3.eth.get_balance(account.address)
    print(f"Balance: {w3.from_wei(balance, 'ether')} MON")
    
    # Try creating a dummy contract hash
    dummy_hash = b'\x00' * 32
    
    try:
        # inject poa middleware just in case
        w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        gas = registry.functions.registerContract(dummy_hash).estimate_gas({'from': account.address})
        print(f"Estimated Gas: {gas}")
        
    except Exception as e:
        print(f"Error estimating gas: {e}")
        
else:
    print("Could not connect to Web3")
