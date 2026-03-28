'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { resolveDispute } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading dispute...</p>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: 80 }}>
          <p style={{ color: 'var(--accent-warning)' }}>{error || 'Dispute not found'}</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.is_staff || user?.role === 'admin';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {error && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.2)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            color: 'var(--accent-warning)', fontSize: 13,
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Dispute Details</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>ID: {dispute.id}</p>
          </div>
          <div style={{
            padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: dispute.status === 'open' ? 'rgba(255, 179, 71, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            color: dispute.status === 'open' ? 'var(--accent-amber)' : '#22c55e',
            textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>
            {dispute.status}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Dispute Info */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Contract</p>
                <p style={{ fontSize: 14, cursor: 'pointer', color: 'var(--accent-primary)', textDecoration: 'underline' }} 
                   onClick={() => router.push(`/contracts/${dispute.contract}`)}>
                  View Contract
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Raised By</p>
                <p style={{ fontSize: 14 }}>{dispute.raised_by_detail?.phone_number || 'Unknown'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Raised At</p>
                <p style={{ fontSize: 14 }}>{new Date(dispute.created_at).toLocaleString()}</p>
              </div>
            </div>
            
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Reason for Dispute</p>
              <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 14, color: 'var(--text-secondary)' }}>
                {dispute.reason || 'No specific reason provided.'}
              </div>
            </div>
          </div>

          {/* Resolution Result (if resolved) */}
          {dispute.status === 'resolved' && (
            <div className="glass-card" style={{ padding: 24, borderLeft: '4px solid #22c55e' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Resolution</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Type</p>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{dispute.resolution_type.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Resolved At</p>
                  <p style={{ fontSize: 14 }}>{new Date(dispute.resolved_at).toLocaleString()}</p>
                </div>
              </div>
              
              {dispute.resolution_type === 'partial_split' && (
                <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Released: </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-secondary)' }}>MON {dispute.release_amount}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Refunded: </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-amber)' }}>MON {dispute.refund_amount}</span>
                  </div>
                </div>
              )}
              
              {dispute.resolution_notes && (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Admin Notes</p>
                  <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                    {dispute.resolution_notes}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin Resolution Panel */}
          {dispute.status === 'open' && isAdmin && (
            <div className="glass-card" style={{ padding: 24, border: '1px solid var(--accent-primary)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>🛠 Admin Resolution Actions</h3>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Resolution Type</label>
                <select 
                  className="input-field" 
                  value={resolutionType} 
                  onChange={(e) => setResolutionType(e.target.value)}
                  style={{ width: '100%', marginBottom: 16 }}
                >
                  <option value="full_release">Full Release (Pay to Payee)</option>
                  <option value="full_refund">Full Refund (Return to Payer)</option>
                  <option value="partial_split">Partial Split (Split between Payer & Payee)</option>
                </select>
              </div>

              {resolutionType === 'partial_split' && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Release Amount (MON )</label>
                    <input type="number" className="input-field" value={releaseAmt} onChange={(e) => setReleaseAmt(e.target.value)} placeholder="0.00" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Refund Amount (MON )</label>
                    <input type="number" className="input-field" value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)} placeholder="0.00" />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Resolution Notes</label>
                <textarea 
                  className="textarea-field" 
                  value={resolutionNotes} 
                  onChange={(e) => setResolutionNotes(e.target.value)} 
                  placeholder="Explain the reasoning for this resolution..."
                  style={{ minHeight: 80 }}
                />
              </div>

              <button 
                onClick={handleResolve} 
                className="btn-primary" 
                disabled={resolving || (resolutionType === 'partial_split' && (!releaseAmt || !refundAmt))}
                style={{ width: '100%' }}
              >
                {resolving ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          )}

          {dispute.status === 'open' && !isAdmin && (
            <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                This dispute is currently being reviewed by a TrustLayer administrator. You will be notified once a resolution is reached.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
