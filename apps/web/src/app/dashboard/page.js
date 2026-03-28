'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import StateBadge from '@/components/StateBadge';
import { listContracts, listAvailableContracts } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 260, damping: 20 }
  }
};

export default function DashboardPage() {
  const [contracts, setContracts] = useState([]);
  const [availableContracts, setAvailableContracts] = useState([]);
  const [activeTab, setActiveTab] = useState('mine');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('crox_token');
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
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navbar />
      
      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}
      >
        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 48 }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.03em' }}>Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Manage your escrow contracts securely on Monad.</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/contracts/new')} 
            className="btn-primary"
            style={{ padding: '14px 32px' }}
          >
            + Create Escrow
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 24,
          marginBottom: 48,
        }}>
          {[
            { label: 'My Contracts', value: stats.total, color: 'var(--text-primary)' },
            { label: 'Active', value: stats.active, color: 'var(--accent-secondary)' },
            { label: 'Available Work', value: stats.available, color: 'var(--accent-success)' },
            { label: 'Total Value', value: `MON ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`, color: 'var(--accent-primary)' },
          ].map((s, i) => (
            <motion.div 
              key={i} 
              whileHover={{ y: -5 }}
              className="glass-card" 
              style={{ padding: '28px 24px', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{
                position: 'absolute', top: 0, right: 0, width: 100, height: 100,
                background: `radial-gradient(circle, ${s.color}20 0%, transparent 70%)`,
                transform: 'translate(30%, -30%)'
              }} />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{s.label}</p>
              <p className="font-mono" style={{ fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <motion.div variants={itemVariants} style={{ display: 'flex', gap: 16, marginBottom: 32, paddingBottom: 16, position: 'relative' }}>
          <button
            onClick={() => setActiveTab('mine')}
            style={{
              background: 'none', border: 'none', fontSize: 16, fontWeight: activeTab === 'mine' ? 700 : 600,
              color: activeTab === 'mine' ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer', padding: '12px 24px', borderRadius: 9999,
              backgroundColor: activeTab === 'mine' ? 'rgba(131, 110, 249, 0.15)' : 'transparent',
              transition: 'all 0.3s ease'
            }}
          >
            My Contracts
          </button>
          <button
            onClick={() => setActiveTab('available')}
            style={{
              background: 'none', border: 'none', fontSize: 16, fontWeight: activeTab === 'available' ? 700 : 600,
              color: activeTab === 'available' ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer', padding: '12px 24px', borderRadius: 9999,
              backgroundColor: activeTab === 'available' ? 'rgba(131, 110, 249, 0.15)' : 'transparent',
              transition: 'all 0.3s ease'
            }}
          >
            Available Work 
            <span className="font-mono" style={{ background: 'var(--accent-primary)', color: 'white', padding: '2px 10px', borderRadius: 9999, fontSize: 12, marginLeft: 12 }}>
              {availableContracts.length}
            </span>
          </button>
        </motion.div>

        {/* Contracts list */}
        {loading ? (
          <motion.div variants={itemVariants} style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 24px' }}></div>
            <p className="font-mono" style={{ color: 'var(--accent-primary)', letterSpacing: '2px', textTransform: 'uppercase', fontSize: 12 }}>Initializing Node...</p>
          </motion.div>
        ) : error ? (
          <motion.div variants={itemVariants} className="glass-card" style={{ padding: 40, textAlign: 'center', border: '1px solid rgba(255, 82, 82, 0.3)' }}>
            <p style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>{error}</p>
          </motion.div>
        ) : displayedContracts.length === 0 ? (
          <motion.div variants={itemVariants} className="glass-card" style={{ padding: '80px 20px', textAlign: 'center' }}>
             <div style={{ fontSize: 64, marginBottom: 24, opacity: 0.8 }}>⚡️</div>
            <h3 style={{ fontSize: 24, marginBottom: 12, fontWeight: 700, letterSpacing: '-0.02em' }}>No Escrows Found</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 16 }}>
              {activeTab === 'mine' ? 'Deploy your first milestone-based contract on CroX.' : 'There are currently no open bounties available.'}
            </p>
            {activeTab === 'mine' && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/contracts/new')} 
                className="btn-primary"
              >
                Launch Contract
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div variants={containerVariants} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AnimatePresence>
              {displayedContracts.map(contract => (
                <motion.div
                  key={contract.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.01, x: 5 }}
                  className="glass-card"
                  style={{ padding: '28px 32px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                  onClick={() => router.push(`/contracts/${contract.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                        <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{contract.title}</h3>
                        <StateBadge state={contract.state} />
                        {contract.blockchain_verified && (
                          <span className="font-mono" style={{
                            fontSize: 11,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--accent-success)',
                            padding: '4px 10px',
                            borderRadius: 9999,
                            fontWeight: 700,
                            letterSpacing: '0.5px'
                          }}>● ON-CHAIN</span>
                        )}
                      </div>
                      <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {contract.description?.length > 120 ? contract.description.slice(0, 120) + '...' : (contract.description || 'No description provided')}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', paddingLeft: 24 }}>
                      <p className="font-mono gradient-text" style={{ fontSize: 28, fontWeight: 800 }}>
                        {parseFloat(contract.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} MON
                      </p>
                      <p className="font-mono" style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                        {new Date(contract.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.main>
    </div>
  );
}
