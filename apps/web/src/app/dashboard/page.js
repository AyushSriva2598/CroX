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
      <div style={{ 
        position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', 
        background: 'radial-gradient(circle, rgba(131, 110, 249, 0.1) 0%, transparent 70%)', 
        zIndex: 0, pointerEvents: 'none' 
      }} />
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.03em' }}>Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Manage your secure escrow ecosystem</p>
          </div>
          <button onClick={() => router.push('/contracts/new')} className="btn-primary" style={{ padding: '14px 28px' }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> New Contract
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          marginBottom: 48,
        }}>
          {[
            { label: 'Active Contracts', value: stats.total, color: 'var(--accent-primary)' },
            { label: 'In Progress', value: stats.active, color: 'var(--accent-secondary)' },
            { label: 'Marketplace', value: stats.available, color: 'var(--accent-blue)' },
            { label: 'Escrowed Value', value: totalValue.toFixed(2), color: 'var(--accent-success)', isMon: true },
          ].map((s, i) => (
            <div key={i} className="glass-card" style={{ padding: '28px', borderRadius: '32px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em' }}>{s.label}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                {s.isMon && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>MON</span>}
                <p className={s.isMon ? "mono-tech" : ""} style={{ fontSize: 36, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32, background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: '9999px', width: 'fit-content', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('mine')}
            style={{
              background: activeTab === 'mine' ? 'var(--accent-primary)' : 'transparent',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              color: activeTab === 'mine' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '10px 24px',
              borderRadius: '9999px',
              transition: 'all 0.3s ease'
            }}
          >
            My Ecosystem
          </button>
          <button
            onClick={() => setActiveTab('available')}
            style={{
              background: activeTab === 'available' ? 'var(--accent-primary)' : 'transparent',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              color: activeTab === 'available' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '10px 24px',
              borderRadius: '9999px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            Marketplace
            <span style={{ 
              background: activeTab === 'available' ? 'rgba(255,255,255,0.2)' : 'var(--accent-primary)', 
              color: 'white', 
              padding: '2px 8px', 
              borderRadius: '9999px', 
              fontSize: 11 
            }}>{availableContracts.length}</span>
          </button>
        </div>

        {/* Contracts list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <p style={{ color: 'var(--text-muted)' }}>Loading contracts...</p>
          </div>
        ) : error ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--accent-warning)' }}>{error}</p>
          </div>
        ) : displayedContracts.length === 0 ? (
          <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <h3 style={{ fontSize: 18, marginBottom: 8, fontWeight: 600 }}>No contracts found</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              {activeTab === 'mine' ? 'Create your first escrow contract with AI assistance' : 'There are currently no available contracts looking for a worker.'}
            </p>
            {activeTab === 'mine' && (
              <button onClick={() => router.push('/contracts/new')} className="btn-primary">
                Create Contract
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {displayedContracts.map(contract => (
              <div
                key={contract.id}
                className="glass-card"
                style={{ padding: '24px 32px', cursor: 'pointer', borderRadius: '24px' }}
                onClick={() => router.push(`/contracts/${contract.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{contract.title}</h3>
                      <StateBadge state={contract.state} />
                      {contract.blockchain_verified && (
                        <span className="mono-tech" style={{
                          fontSize: 10,
                          background: 'rgba(131, 110, 249, 0.1)',
                          color: 'var(--accent-primary)',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontWeight: 700,
                          border: '1px solid rgba(131, 110, 249, 0.2)'
                        }}>⛓ ON-CHAIN</span>
                      )}
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: '1.5', maxWidth: '80%' }}>
                      {contract.description?.slice(0, 120) || 'No description provided for this ecosystem agreement.'}
                      {contract.description?.length > 120 ? '...' : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p className="mono-tech" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-primary)' }}>
                      <span style={{ fontSize: 14, opacity: 0.6, marginRight: 4 }}>MON</span>
                      {parseFloat(contract.total_amount).toFixed(2)}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontWeight: 500 }}>
                      Created {new Date(contract.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
