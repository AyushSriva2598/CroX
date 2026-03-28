'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderRadius: 9999,
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent-success)',
          boxShadow: '0 0 10px var(--accent-success)'
        }} />
        <span className="font-mono" style={{ color: 'var(--accent-success)', fontSize: 13, fontWeight: 700, letterSpacing: '0.5px' }}>
          {truncate(address)}
        </span>
      </div>
    );
  }

  return (
    <div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleConnect}
        disabled={connecting}
        style={{
          padding: '10px 20px', borderRadius: 9999,
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          color: 'white', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
          opacity: connecting ? 0.7 : 1,
          boxShadow: '0 4px 15px rgba(131, 110, 249, 0.4)'
        }}
      >
        {connecting ? 'SYNCING...' : '🔗 CONNECT WALLET'}
      </motion.button>
      {error && <p className="font-mono" style={{ color: 'var(--accent-warning)', fontSize: 11, marginTop: 8, textAlign: 'right' }}>{error}</p>}
    </div>
  );
}
