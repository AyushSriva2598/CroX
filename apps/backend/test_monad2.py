import os
import django
from web3 import Web3

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trustlayer_backend.settings')
django.setup()

from blockchain.services import _get_web3

w3, registry, account = _get_web3()
if w3:
    print(f"Connected: {w3.is_connected()}")
    print(f"Account: {account.address}")
    balance = w3.eth.get_balance(account.address)
    print(f"Balance: {w3.from_wei(balance, 'ether')} MON")
    
    dummy_hash = b'\x00' * 32
    try:
        gas = registry.functions.registerContract(dummy_hash).estimate_gas({'from': account.address})
        print(f"Estimated Gas: {gas}")
    except Exception as e:
        print(f"Error estimating gas: {e}")
