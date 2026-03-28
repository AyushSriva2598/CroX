'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('trustlayer_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      textAlign: 'center',
      background: 'radial-gradient(ellipse at top, rgba(108, 99, 255, 0.1), transparent 60%), radial-gradient(ellipse at bottom right, rgba(0, 212, 170, 0.06), transparent 60%)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 0 24px 0',
        fontWeight: 800, fontSize: 13, background: 'rgba(124, 255, 224, 0.1)', color: 'var(--neon-mint)',
        border: '1px solid rgba(124, 255, 224, 0.2)', overflow: 'hidden'
      }}>
        <img src="/crox-logo.jpg" alt="CroX" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display='none'} />
      </div>

      <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16, lineHeight: 1.1 }}>
        <span className="gradient-text">CroX</span>
      </h1>
      <p style={{ fontSize: 20, color: 'var(--text-secondary)', maxWidth: 520, marginBottom: 12 }}>
        Smart Escrow Platform powered by AI & Blockchain
      </p>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 480, marginBottom: 40 }}>
        Convert informal agreements into enforceable financial workflows with 
        multi-agent AI analysis and Monad blockchain verification.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={() => router.push('/login')} className="btn-primary" style={{ fontSize: 16, padding: '14px 32px' }}>
          Login / Signup
        </button>
        <button onClick={() => router.push('/demo')} className="btn-secondary" style={{ fontSize: 16, padding: '14px 32px', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)' }}>
          View AI Agent Demo
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 20,
        maxWidth: 800,
        width: '100%',
        marginTop: 64,
      }}>
        {[
          { icon: '🤖', title: 'Multi-Agent AI', desc: 'Parser, Risk & Compliance agents analyze your contracts' },
          { icon: '⛓️', title: 'Monad Blockchain', desc: 'Immutable contract verification on-chain' },
          { icon: '🔒', title: 'Escrow Ledger', desc: 'Atomic, auditable fund management' },
          { icon: '⚖️', title: 'Dispute Resolution', desc: 'Fair resolution with evidence tracking' },
        ].map((f, i) => (
          <div key={i} className="glass-card" style={{ padding: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{f.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
