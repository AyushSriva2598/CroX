'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

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
      top: 0,
      zIndex: 50,
      background: 'rgba(5, 5, 10, 0.65)',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 24px',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 72,
      }}>
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <motion.div
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ duration: 0.5, type: "spring" }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 18,
              color: 'white',
              boxShadow: '0 4px 20px rgba(131, 110, 249, 0.4)'
            }}
          >
            TL
          </motion.div>
          <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>TrustLayer</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 15, fontWeight: 600, transition: 'color 0.2s' }}>
            Dashboard
          </Link>
          <Link href="/contracts/new" className="btn-primary" style={{ textDecoration: 'none', fontSize: 14 }}>
            + New Contract
          </Link>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: 13, background: 'rgba(131, 110, 249, 0.1)', padding: '6px 14px', borderRadius: 9999 }}>
                {user.phone_number}
              </span>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout} 
                className="btn-secondary" 
                style={{ padding: '8px 20px', fontSize: 13 }}
              >
                Logout
              </motion.button>
            </div>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/login')} 
              className="btn-secondary"
            >
              Log In
            </motion.button>
          )}
        </div>
      </div>
    </nav>
  );
}
