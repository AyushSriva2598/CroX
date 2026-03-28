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
      top: 16,
      left: 24,
      right: 24,
      zIndex: 100,
      background: 'rgba(6, 8, 15, 0.6)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--nightline)',
      borderRadius: '24px',
      margin: '0 24px',
      padding: '0 24px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
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
          <img src="/crox-logo.jpg" alt="CroX Logo" style={{ width: 32, height: 32, borderRadius: '8px', objectFit: 'cover', boxShadow: '0 0 15px rgba(124, 255, 224, 0.3)' }} onError={(e) => e.target.style.display='none'} />
          <span style={{ 
            fontFamily: 'Sora',
            fontWeight: 800, 
          }}>
            Cro<span style={{ color: 'var(--neon-mint)' }}>X</span>
          </span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/dashboard" style={{ color: 'var(--ash-mist)', textDecoration: 'none', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Dashboard
          </Link>
          <Link href="/contracts/new" style={{ color: 'var(--ash-mist)', textDecoration: 'none', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Initialize
          </Link>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="mono-tech" style={{ 
                color: 'var(--neon-mint)', 
                fontSize: 11, 
                background: 'rgba(124, 255, 224, 0.05)', 
                padding: '6px 16px', 
                borderRadius: '9999px', 
                border: '1px solid rgba(124, 255, 224, 0.1)',
                fontWeight: 700
              }}>
                {user.email || user.full_name || 'AUTHENTICATED'}
              </span>
              <button onClick={logout} className="btn-secondary" style={{
                padding: '8px 16px',
                fontSize: 10,
                borderColor: 'rgba(255, 110, 110, 0.2)',
                color: 'rgba(255, 110, 110, 0.6)'
              }}>TERMINATE</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
