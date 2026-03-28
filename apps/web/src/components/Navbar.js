'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('trustlayer_token');
    const userData = localStorage.getItem('trustlayer_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('trustlayer_token');
    localStorage.removeItem('trustlayer_user');
    router.push('/login');
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 12,
      left: 24,
      right: 24,
      zIndex: 50,
      background: 'rgba(11, 11, 15, 0.7)',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      border: '1px solid var(--glass-border)',
      borderRadius: '24px',
      margin: '0 24px',
      padding: '0 24px',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
      }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="pixel-logo" style={{
            fontSize: 24,
            fontWeight: 900,
            background: 'var(--accent-primary)',
            padding: '4px 10px',
            borderRadius: 8,
            color: '#fff'
          }}>TL</div>
          <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>TrustLayer</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            Dashboard
          </Link>
          <Link href="/contracts/new" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            New Contract
          </Link>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="mono-tech" style={{ color: 'var(--text-muted)', fontSize: 13, background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '9999px', border: '1px solid var(--border-color)' }}>
                {user.full_name || user.email || user.phone_number}
              </span>
              <button onClick={logout} style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>TERMINATE</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
