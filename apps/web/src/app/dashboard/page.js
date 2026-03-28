'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StateBadge from '@/components/StateBadge';
import { listContracts, listAvailableContracts } from '@/lib/api';

export default function DashboardPage() {
  const [contracts, setContracts] = useState([]);
  const [availableContracts, setAvailableContracts] = useState([]);
  const [activeTab, setActiveTab] = useState('mine'); // 'mine' or 'available'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('trustlayer_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchContracts();

    // Auto-reload every 15 seconds
    const interval = setInterval(fetchContracts, 15000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchContracts = async () => {
    try {
      const [mine, available] = await Promise.all([
        listContracts(),
        listAvailableContracts()
      ]);
      setContracts(mine);
      setAvailableContracts(available);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => ['active', 'funds_locked', 'work_submitted'].includes(c.state)).length,
    completed: contracts.filter(c => c.state === 'completed').length,
    available: availableContracts.length,
  };

  const totalValue = contracts.reduce((sum, c) => sum + parseFloat(c.total_amount || 0), 0);
  
  const displayedContracts = activeTab === 'mine' ? contracts : availableContracts;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflowX: 'hidden' }}>
      {/* Dynamic Background Glows */}
      <div style={{ 
        position: 'absolute', top: '-10%', left: '-10%', width: '50%', height: '50%', 
        background: 'radial-gradient(circle, rgba(124, 255, 224, 0.04) 0%, transparent 70%)', 
        zIndex: 0, pointerEvents: 'none' 
      }} />
      <div style={{ 
        position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', 
        background: 'radial-gradient(circle, rgba(138, 161, 255, 0.04) 0%, transparent 70%)', 
        zIndex: 0, pointerEvents: 'none' 
      }} />
      
      <Navbar />
      
      <main style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 24px', position: 'relative', zIndex: 1 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 56 }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.04em' }}>
              Mandate <span className="gradient-text">Ecosystem</span>
            </h1>
            <p style={{ color: 'var(--ash-mist)', fontSize: 16, fontWeight: 500 }}>
              Oversee your secure digital settlement architecture.
            </p>
          </div>
          <button 
            onClick={() => router.push('/contracts/new')} 
            className="btn-primary" 
            style={{ padding: '16px 32px', fontSize: 13 }}
          >
            + INITIALIZE NEW MANDATE
          </button>
        </header>

        {/* Stats Pills */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 24,
          marginBottom: 64,
        }}>
          {[
            { label: 'Active Ecosystem', value: stats.total, unit: 'NODES', color: 'var(--neon-mint)' },
            { label: 'In Execution', value: stats.active, unit: 'NODES', color: 'var(--lumen-blue)' },
            { label: 'Marketplace', value: stats.available, unit: 'OPEN', color: 'var(--ash-mist)' },
            { label: 'Escrowed Volume', value: totalValue.toLocaleString(), unit: 'MON', color: 'var(--neon-mint)', isMon: true },
          ].map((s, i) => (
            <div key={i} className="glass-card" style={{ padding: '32px', border: '1px solid var(--nightline)' }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.15em' }}>{s.label}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <p className="mono-tech" style={{ fontSize: 36, fontWeight: 800, color: s.color, letterSpacing: '-0.03em' }}>{s.value}</p>
                <span className="mono-tech" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', opacity: 0.6 }}>{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 40, borderBottom: '1px solid var(--nightline)', paddingBottom: 0 }}>
          <button
            onClick={() => setActiveTab('mine')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'mine' ? '2px solid var(--neon-mint)' : '2px solid transparent',
              fontSize: 12,
              fontWeight: 800,
              color: activeTab === 'mine' ? 'var(--neon-mint)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '16px 24px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              transition: 'all 0.3s ease'
            }}
          >
            My Mandates
          </button>
          <button
            onClick={() => setActiveTab('available')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'available' ? '2px solid var(--neon-mint)' : '2px solid transparent',
              fontSize: 12,
              fontWeight: 800,
              color: activeTab === 'available' ? 'var(--neon-mint)' : 'var(--text-muted)',
              cursor: 'pointer',
              padding: '16px 24px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >
            Marketplace
            <span style={{ 
              background: activeTab === 'available' ? 'rgba(124, 255, 224, 0.2)' : 'var(--nightline)', 
              color: activeTab === 'available' ? 'var(--neon-mint)' : 'var(--text-muted)', 
              padding: '2px 8px', 
              borderRadius: '9999px', 
              fontSize: 10,
              fontWeight: 900
            }}>{availableContracts.length}</span>
          </button>
        </div>

        {/* Contracts Feed */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 100 }}>
            <div className="spinner" style={{ margin: '0 auto 24px', width: 40, height: 40, border: '3px solid rgba(124, 255, 224, 0.1)', borderTopColor: 'var(--neon-mint)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p className="tracked-caps" style={{ color: 'var(--text-muted)' }}>Synchronizing Nodes...</p>
          </div>
        ) : error ? (
          <div className="glass-card" style={{ padding: 48, textAlign: 'center', borderColor: 'rgba(255, 110, 110, 0.2)' }}>
            <p style={{ color: 'var(--accent-warning)', fontWeight: 700 }}>PROTOCOL SYNC ERROR: {error}</p>
          </div>
        ) : displayedContracts.length === 0 ? (
          <div className="glass-card" style={{ padding: 80, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 24, opacity: 0.3 }}>💠</div>
            <h3 style={{ fontSize: 20, marginBottom: 12, fontWeight: 700 }}>No Active Mandates Detected</h3>
            <p style={{ color: 'var(--ash-mist)', marginBottom: 32, fontSize: 16 }}>
              {activeTab === 'mine' ? 'Initialize your first digital escrow mandate to secure your value exchange.' : 'The marketplace is currently waiting for new mandates.'}
            </p>
            {activeTab === 'mine' && (
              <button 
                onClick={() => router.push('/contracts/new')} 
                className="btn-secondary"
                style={{ borderRadius: '12px' }}
              >
                INITIALIZE MANDATE
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {displayedContracts.map((contract, i) => (
              <div
                key={contract.id}
                className="glass-card animate-slide-in"
                style={{ 
                  padding: '32px 40px', 
                  cursor: 'pointer', 
                  borderRadius: '24px',
                  border: '1px solid var(--nightline)',
                  animationDelay: `${i * 0.05}s`
                }}
                onClick={() => router.push(`/contracts/${contract.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                      <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>{contract.title}</h3>
                      <StateBadge state={contract.state} />
                      {contract.blockchain_verified && (
                        <span className="badge" style={{
                          background: 'rgba(124, 255, 224, 0.05)',
                          color: 'var(--neon-mint)',
                          border: '1px solid rgba(124, 255, 224, 0.2)',
                          fontSize: 9
                        }}>⛓ DEPLOYED ON-CHAIN</span>
                      )}
                    </div>
                    <p style={{ fontSize: 15, color: 'var(--ash-mist)', lineHeight: '1.6', maxWidth: '85%', fontWeight: 500 }}>
                      {contract.description?.slice(0, 160) || 'Secure ecosystem mandate awaiting execution and settlement.'}
                      {contract.description?.length > 160 ? '...' : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="mono-tech" style={{ fontSize: 28, fontWeight: 800, color: 'var(--neon-mint)' }}>
                      {parseFloat(contract.total_amount).toLocaleString()}
                      <span style={{ fontSize: 12, opacity: 0.5, marginLeft: 8, fontWeight: 700 }}>MON</span>
                    </p>
                    <p className="tracked-caps" style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 12 }}>
                      INITIALIZED {new Date(contract.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
