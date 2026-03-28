'use client';
import { useState, useEffect } from 'react';
import { connectWallet, getConnectedAddress } from '@/lib/wallet';

export default function WalletButton() {
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already connected
    getConnectedAddress().then(addr => {
      if (addr) setAddress(addr);
    }).catch(() => {});

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on?.('accountsChanged', (accounts) => {
        setAddress(accounts?.[0] || null);
      });
    }
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      const addr = await connectWallet();
      setAddress(addr);
      // Store in localStorage for other components
      localStorage.setItem('wallet_address', addr);
    } catch (err) {
      setError(err.message);
    }
    setConnecting(false);
  };

  const truncate = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

  if (address) {
    return (
        <div style={{
          padding: '8px 16px', borderRadius: '9999px',
          background: 'rgba(131, 110, 249, 0.1)',
          border: '1px solid var(--glass-border)',
          fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--accent-primary)'
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent-primary)',
            boxShadow: '0 0 10px var(--accent-primary)'
          }} />
          <span className="mono-tech">{truncate(address)}</span>
        </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="btn-primary"
        style={{ padding: '12px 28px', fontSize: 14, fontWeight: 800, borderRadius: '9999px', letterSpacing: '0.02em' }}
      >
        {connecting ? '⏳ SYNCING...' : 'CONNECT WALLET'}
      </button>
      {error && <p className="mono-tech" style={{ color: 'var(--accent-warning)', fontSize: 11, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
