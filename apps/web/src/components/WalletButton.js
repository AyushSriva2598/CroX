'use client';
import { useState, useEffect } from 'react';
import { connectWallet, getConnectedAddress } from '@/lib/wallet';

export default function WalletButton() {
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if already connected
    (async () => {
      const addr = await getConnectedAddress();
      if (addr) setAddress(addr);
    })();

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
        <div className="glass-card" style={{
          padding: '8px 18px', borderRadius: '9999px',
          background: 'rgba(124, 255, 224, 0.05)',
          border: '1px solid rgba(124, 255, 224, 0.15)',
          fontSize: 12, fontWeight: 800,
          display: 'flex', alignItems: 'center', gap: 10,
          color: 'var(--neon-mint)',
          boxShadow: '0 0 15px rgba(124, 255, 224, 0.1)'
        }}>
          <div className="timeline-dot active" style={{ width: 8, height: 8 }} />
          <span className="mono-tech" style={{ letterSpacing: '0.05em' }}>{truncate(address)}</span>
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
