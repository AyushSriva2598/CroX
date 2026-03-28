'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { resolveDispute } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
};

export default function DisputeDetailPage({ params }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolutionType, setResolutionType] = useState('full_release');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [releaseAmt, setReleaseAmt] = useState('');
  const [refundAmt, setRefundAmt] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('trustlayer_token');
    const userData = localStorage.getItem('trustlayer_user');
    if (!token || !userData) { router.push('/login'); return; }
    setUser(JSON.parse(userData));
    fetchDispute(token);
  }, [id, router]);

  const fetchDispute = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/disputes/${id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch dispute details');
      const data = await res.json();
      setDispute(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleResolve = async () => {
    setResolving(true);
    setError('');
    try {
      await resolveDispute(id, {
        resolution_type: resolutionType,
        resolution_notes: resolutionNotes,
        release_amount: resolutionType === 'partial_split' ? releaseAmt : 0,
        refund_amount: resolutionType === 'partial_split' ? refundAmt : 0,
      });
      await fetchDispute(localStorage.getItem('trustlayer_token'));
    } catch (err) {
      setError(err.message);
    }
    setResolving(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto 24px' }}></div>
          <p className="font-mono" style={{ color: 'var(--accent-primary)', letterSpacing: '2px', textTransform: 'uppercase', fontSize: 12 }}>
            Loading dispute data...
          </p>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent' }}>
        <Navbar />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: 120 }}
        >
          <div style={{ fontSize: 56, marginBottom: 20, opacity: 0.7 }}>⚠️</div>
          <p style={{ color: 'var(--accent-warning)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            {error || 'Dispute not found'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            This dispute may have been removed or you don't have access.
          </p>
        </motion.div>
      </div>
    );
  }

  const isAdmin = user?.is_staff || user?.role === 'admin';

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navbar />
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}
      >
        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(255, 82, 82, 0.1)', border: '1px solid rgba(255, 82, 82, 0.3)',
                borderRadius: 16, padding: '14px 20px', marginBottom: 24,
                color: 'var(--accent-warning)', fontSize: 14, fontWeight: 600,
              }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Dispute <span className="gradient-text">#{dispute.id}</span>
            </h1>
            <p className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 12, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Case Investigation
            </p>
          </div>

          <motion.div
            animate={dispute.status === 'open' ? {
              boxShadow: ['0 0 10px rgba(255, 179, 71, 0)', '0 0 20px rgba(255, 179, 71, 0.3)', '0 0 10px rgba(255, 179, 71, 0)'],
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              padding: '8px 20px', borderRadius: 9999, fontSize: 12, fontWeight: 800,
              background: dispute.status === 'open' ? 'rgba(255, 179, 71, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: dispute.status === 'open' ? 'var(--accent-amber)' : 'var(--accent-success)',
              textTransform: 'uppercase', letterSpacing: '1px',
              fontFamily: "'JetBrains Mono', monospace",
              border: `1px solid ${dispute.status === 'open' ? 'rgba(255, 179, 71, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            }}
          >
            ● {dispute.status}
          </motion.div>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Dispute Information Card */}
          <motion.div variants={itemVariants} className="glass-card" style={{ padding: 32 }}>
            <h3 className="font-mono" style={{ fontSize: 12, fontWeight: 700, marginBottom: 24, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Case Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Linked Contract</p>
                <motion.p
                  whileHover={{ color: 'var(--accent-secondary)' }}
                  style={{ fontSize: 14, cursor: 'pointer', color: 'var(--accent-primary)', fontWeight: 600 }}
                  onClick={() => router.push(`/contracts/${dispute.contract}`)}
                >
                  View Contract ↗
                </motion.p>
              </div>
              <div>
                <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filed By</p>
                <p className="font-mono" style={{ fontSize: 14, fontWeight: 600 }}>{dispute.raised_by_detail?.phone_number || 'Unknown'}</p>
              </div>
              <div>
                <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date Filed</p>
                <p className="font-mono" style={{ fontSize: 13, fontWeight: 500 }}>{new Date(dispute.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(131, 110, 249, 0.1)' }}>
              <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>Reason for Dispute</p>
              <div style={{
                padding: 20, background: 'rgba(255, 82, 82, 0.05)', borderRadius: 12,
                fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.7,
                border: '1px solid rgba(255, 82, 82, 0.1)',
              }}>
                {dispute.reason || 'No specific reason provided.'}
              </div>
            </div>
          </motion.div>

          {/* Resolution Result (if resolved) */}
          <AnimatePresence>
            {dispute.status === 'resolved' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{
                  padding: 32,
                  borderLeft: '4px solid var(--accent-success)',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, right: 0, width: 120, height: 120,
                  background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
                  transform: 'translate(30%, -30%)',
                }} />
                <h3 className="font-mono" style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-success)' }}>
                  ✓ Resolution
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  <div>
                    <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Type</p>
                    <p className="font-mono" style={{ fontSize: 14, fontWeight: 700 }}>{dispute.resolution_type.replace('_', ' ').toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Resolved At</p>
                    <p className="font-mono" style={{ fontSize: 13 }}>{new Date(dispute.resolved_at).toLocaleString()}</p>
                  </div>
                </div>

                {dispute.resolution_type === 'partial_split' && (
                  <div style={{ display: 'flex', gap: 32, marginBottom: 20 }}>
                    <div>
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Released: </span>
                      <span className="font-mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-secondary)' }}>MON {dispute.release_amount}</span>
                    </div>
                    <div>
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Refunded: </span>
                      <span className="font-mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-amber)' }}>MON {dispute.refund_amount}</span>
                    </div>
                  </div>
                )}

                {dispute.resolution_notes && (
                  <div>
                    <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>Admin Notes</p>
                    <div style={{ padding: 16, background: 'rgba(18, 18, 28, 0.4)', borderRadius: 10, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {dispute.resolution_notes}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Admin Resolution Panel */}
          <AnimatePresence>
            {dispute.status === 'open' && isAdmin && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card"
                style={{
                  padding: 32,
                  border: '1px solid var(--accent-primary)',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, right: 0, width: '50%', height: '100%',
                  background: 'radial-gradient(circle at top right, rgba(131, 110, 249, 0.08) 0%, transparent 60%)',
                  pointerEvents: 'none',
                }} />

                <h3 className="font-mono" style={{ fontSize: 12, fontWeight: 700, marginBottom: 24, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
                  🛠 Admin Resolution Panel
                </h3>

                <div style={{ marginBottom: 20 }}>
                  <label className="font-mono" style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Resolution Type
                  </label>
                  <select
                    className="input-field"
                    value={resolutionType}
                    onChange={(e) => setResolutionType(e.target.value)}
                    style={{ width: '100%', marginBottom: 16, cursor: 'pointer' }}
                  >
                    <option value="full_release">Full Release (Pay to Payee)</option>
                    <option value="full_refund">Full Refund (Return to Payer)</option>
                    <option value="partial_split">Partial Split (Split between Payer & Payee)</option>
                  </select>
                </div>

                <AnimatePresence>
                  {resolutionType === 'partial_split' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ display: 'flex', gap: 16, marginBottom: 20 }}
                    >
                      <div style={{ flex: 1 }}>
                        <label className="font-mono" style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Release Amount (MON)
                        </label>
                        <input type="number" className="input-field font-mono" value={releaseAmt} onChange={(e) => setReleaseAmt(e.target.value)} placeholder="0.00" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="font-mono" style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Refund Amount (MON)
                        </label>
                        <input type="number" className="input-field font-mono" value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)} placeholder="0.00" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ marginBottom: 24 }}>
                  <label className="font-mono" style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Resolution Notes
                  </label>
                  <textarea
                    className="textarea-field"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Explain the reasoning for this resolution..."
                    style={{ minHeight: 80 }}
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(131, 110, 249, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleResolve}
                  className="btn-primary"
                  disabled={resolving || (resolutionType === 'partial_split' && (!releaseAmt || !refundAmt))}
                  style={{ width: '100%', fontSize: 15, padding: '16px 0', letterSpacing: '1px', textTransform: 'uppercase' }}
                >
                  {resolving ? 'RESOLVING...' : 'CONFIRM RESOLUTION'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Non-admin waiting message */}
          {dispute.status === 'open' && !isAdmin && (
            <motion.div variants={itemVariants} className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ fontSize: 40, marginBottom: 16 }}
              >
                ⏳
              </motion.div>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
                This dispute is currently being reviewed by a CroX administrator.
                You will be notified once a resolution is reached.
              </p>
            </motion.div>
          )}
        </div>
      </motion.main>
    </div>
  );
}
