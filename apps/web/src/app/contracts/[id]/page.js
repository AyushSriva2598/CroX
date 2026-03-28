'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StateBadge from '@/components/StateBadge';
import WalletButton from '@/components/WalletButton';
import { getContract, contractAction, getEscrowStatus, registerOnBlockchain, verifyOnBlockchain, createDispute, getContractHashToSign } from '@/lib/api';
import { sendMON, registerContractOnChain as walletRegisterOnChain, getConnectedAddress, connectWallet } from '@/lib/wallet';

export default function ContractDetailPage({ params }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const [data, setData] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [blockchain, setBlockchain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDispute, setShowDispute] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [workLink, setWorkLink] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('trustlayer_token');
    const userStr = localStorage.getItem('trustlayer_user');
    if (!token) { router.push('/login'); return; }
    if (userStr) setUser(JSON.parse(userStr));
    fetchData();
  }, [id, router]);

  const fetchData = async () => {
    try {
      const [contractData, escrowData] = await Promise.all([
        getContract(id),
        getEscrowStatus(id).catch(() => null),
      ]);
      setData(contractData);
      setEscrow(escrowData);

      if (contractData.contract.blockchain_tx_hash) {
        const bchain = await verifyOnBlockchain(id).catch(() => null);
        setBlockchain(bchain);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleAction = async (action) => {
    setActionLoading(action);
    setError('');
    try {
      let payload = {};
      
      if (action === 'accept') {
        let addr = await getConnectedAddress();
        if (!addr) {
          try { addr = await connectWallet(); } 
          catch (e) { throw new Error('You must connect your Phantom wallet to accept this contract.'); }
        }
        payload = { worker_wallet: addr };
      }

      if (action === 'approve') {
        const { worker_wallet } = data.contract;
        if (!worker_wallet) {
          throw new Error("No worker wallet address configured for this contract.");
        }
        // Send partial funds natively first
        await sendMON(worker_wallet, parseFloat(releaseAmount));
      }

      if (action === 'submit_work' || action === 'submit-work') {
        if (!showSubmitModal) {
          setShowSubmitModal(true);
          setActionLoading('');
          return;
        }
        if (!workLink.trim()) {
           throw new Error("Please provide a link to the submitted work.");
        }
        payload = { link: workLink.trim() };
      }

      await contractAction(id, action, payload);
      setShowSubmitModal(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Transaction failed');
    }
    setActionLoading('');
  };

  const handleBlockchain = async () => {
    setActionLoading('blockchain');
    try {
      // 1. Get hash from backend
      const { contract_hash, registry_address } = await getContractHashToSign(id);
      
      // 2. Register on chain using Phantom wallet
      const txHash = await walletRegisterOnChain(contract_hash, registry_address);
      
      // 3. Inform backend so it stores the tx hash
      const result = await registerOnBlockchain(id);
      setBlockchain(result);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
    setActionLoading('');
  };

  const handleDispute = async () => {
    setActionLoading('dispute');
    try {
      await createDispute(id, disputeReason);
      setShowDispute(false);
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
    setActionLoading('');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading contract...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: 80 }}>
          <p style={{ color: 'var(--accent-warning)' }}>{error || 'Contract not found'}</p>
        </div>
      </div>
    );
  }

  const contract = data.contract;
  const auditLog = data.audit_log || [];
  const actions = contract.available_actions || [];

  // Role determinations
  const isPayer = user?.id === contract.payer;
  const isWorker = user?.id === contract.payee || (!isPayer && contract.state === 'pending_acceptance');

  const milestones = contract.terms?.milestones || [];
  const currentMilestone = contract.current_milestone || 0;
  const isPartial = milestones.length > 0;

  const actionConfig = {
    submit: { label: 'Submit for Acceptance', class: 'btn-primary', icon: '📤' },
    accept: { label: 'Accept Contract', class: 'btn-success', icon: '✓' },
    pay: { label: 'Pay & Lock Funds', class: 'btn-success', icon: '💰' },
    'submit-work': { label: 'Submit Work', class: 'btn-primary', icon: '📎' },
    'submit_work': { label: 'Submit Work', class: 'btn-primary', icon: '📎' },
    approve: { 
      label: isPartial && currentMilestone < milestones.length - 1 
        ? `Approve Phase ${currentMilestone + 1}` 
        : 'Approve & Release Final', 
      class: 'btn-success', icon: '✅' },
    dispute: { label: 'Raise Dispute', class: 'btn-danger', icon: '⚠️' },
    cancel: { label: 'Cancel', class: 'btn-secondary', icon: '✕' },
  };

  // State machine visual
  const allStates = ['draft', 'pending_acceptance', 'active', 'funds_locked', 'work_submitted', 'completed'];
  const currentIdx = allStates.indexOf(contract.state);

  // The next amount to be released
  const releaseAmount = isPartial && currentMilestone < milestones.length
    ? milestones[currentMilestone].amount
    : contract.total_amount;

  let allowedActions = actions;
  if (isPayer && !isWorker) {
    allowedActions = actions.filter(a => ['submit', 'pay', 'approve', 'cancel', 'dispute'].includes(a));
  } else if (isWorker && !isPayer) {
    allowedActions = actions.filter(a => ['accept', 'submit_work', 'submit-work', 'dispute'].includes(a));
  } else if (!isPayer && !isWorker) {
    allowedActions = []; // Spectators cannot act
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflowX: 'hidden' }}>
      <div style={{ 
        position: 'absolute', top: '5%', right: '-10%', width: '50%', height: '50%', 
        background: 'radial-gradient(circle, rgba(131, 110, 249, 0.08) 0%, transparent 70%)', 
        zIndex: 0, pointerEvents: 'none' 
      }} />
      <Navbar />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px', position: 'relative', zIndex: 1 }}>
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-warning)',
            borderRadius: '16px', padding: '16px 20px', marginBottom: 32,
            color: 'var(--accent-warning)', fontSize: 14, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span> {error}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em' }}>{contract.title}</h1>
              <StateBadge state={contract.state} />
            </div>
            <p className="mono-tech" style={{ color: 'var(--text-muted)', fontSize: 12, opacity: 0.7 }}>Ecosystem ID: {contract.id}</p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 }}>
            <WalletButton />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)' }}>MON</span>
              <p className="mono-tech" style={{ fontSize: 42, fontWeight: 800, color: 'var(--accent-secondary)', lineHeight: 1 }}>
                {parseFloat(contract.total_amount).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* State Machine Progress */}
        <div className="glass-card" style={{ padding: '24px 32px', marginBottom: 40, borderRadius: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', padding: '10px 0' }}>
            {allStates.map((s, i) => {
              const isCurrent = s === contract.state;
              const isPast = i < currentIdx;
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 120 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: isCurrent ? 'var(--accent-primary)' : isPast ? 'rgba(131, 110, 249, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1.5px solid ${isCurrent ? 'var(--accent-primary)' : isPast ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: 'white', fontWeight: 800,
                      boxShadow: isCurrent ? '0 0 20px rgba(131, 110, 249, 0.4)' : 'none'
                    }}>
                      {isPast ? '✓' : i + 1}
                    </div>
                    <span style={{
                      fontSize: 10, marginTop: 10, textAlign: 'center',
                      color: isCurrent ? 'var(--accent-primary)' : isPast ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: isCurrent || isPast ? 700 : 500,
                      textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                      {s.replace('_', ' ')}
                    </span>
                  </div>
                  {i < allStates.length - 1 && (
                    <div style={{
                      height: 1, flex: '1 0 20px',
                      background: isPast ? 'var(--accent-primary)' : 'var(--border-color)',
                      marginTop: -22, margin: '0 8px'
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Details */}
            <div className="glass-card" style={{ padding: 32, borderRadius: '32px' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, letterSpacing: '-0.02em' }}>Ecosystem Scope</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {[
                  { label: 'Payer Account', value: contract.payer_detail?.phone_number || '—' },
                  { label: 'Payee Account', value: contract.payee_detail?.phone_number || contract.payee_phone || 'Unassigned' },
                  { label: 'Ecosystem Risk', value: `${contract.risk_score}/100`, color: contract.risk_score > 50 ? 'var(--accent-warning)' : 'var(--accent-success)' },
                  { label: 'Initialization', value: new Date(contract.created_at).toLocaleDateString() },
                ].map((item, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>{item.label}</p>
                    <p style={{ fontSize: 15, fontWeight: 600, color: item.color || 'white' }}>{item.value}</p>
                  </div>
                ))}
                {contract.worker_wallet && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 800 }}>Settlement Wallet</p>
                    <p className="mono-tech" style={{ fontSize: 13, color: 'var(--accent-primary)', wordBreak: 'break-all', background: 'rgba(131, 110, 249, 0.05)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(131, 110, 249, 0.1)' }}>{contract.worker_wallet}</p>
                  </div>
                )}
              </div>
              {contract.description && (
                <div style={{ marginTop: 24 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', fontWeight: 800 }}>Strategic Mandate</p>
                  <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{contract.description}</p>
                </div>
              )}
              {contract.terms && !contract.terms.milestones && Object.keys(contract.terms).length > 0 && (
                <details style={{ marginTop: 24 }}>
                  <summary style={{ fontSize: 13, color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 700 }}>VERIFY RAW PROTOCOL DATA</summary>
                  <pre className="mono-tech" style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', marginTop: 12, padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    {JSON.stringify(contract.terms, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            {/* Milestones */}
            {milestones.length > 0 && (
              <div className="glass-card" style={{ padding: 32, borderRadius: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>🗺 Strategic Milestones</h3>
                  <div className="badge-active" style={{ fontSize: 11, padding: '4px 12px', borderRadius: '9999px', fontWeight: 800 }}>
                    {currentMilestone >= milestones.length ? 'ALL COMPLETED' : `PHASE ${currentMilestone + 1} OF ${milestones.length}`}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {milestones.map((m, i) => {
                    const isPast = i < currentMilestone;
                    const isCurrent = i === currentMilestone && ['funds_locked', 'work_submitted'].includes(contract.state);
                    const isUpcoming = i > currentMilestone || (i === currentMilestone && ['draft', 'pending_acceptance', 'active'].includes(contract.state));
                    
                    return (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px',
                        background: isCurrent ? 'rgba(131, 110, 249, 0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isCurrent ? 'rgba(131, 110, 249, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                        borderRadius: '16px',
                        opacity: isUpcoming ? 0.6 : 1,
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: isPast ? 'var(--accent-success)' : isCurrent ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, color: isPast ? '#000' : '#fff', fontWeight: 800,
                            boxShadow: isCurrent ? '0 0 15px rgba(131, 110, 249, 0.3)' : 'none'
                          }}>
                            {isPast ? '✓' : i + 1}
                          </div>
                          <div>
                            <span style={{ fontSize: 15, fontWeight: isCurrent ? 800 : 600, color: isCurrent ? 'var(--accent-primary)' : '#fff', display: 'block' }}>
                              {m.name}
                            </span>
                            {m.description && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.description}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span className="mono-tech" style={{ fontSize: 16, fontWeight: 800, color: isCurrent ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                            {parseFloat(m.amount).toFixed(2)} <span style={{ fontSize: 11, opacity: 0.6 }}>MON</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            {allowedActions.length > 0 && (
              <div className="glass-card" style={{ padding: 32, borderRadius: '32px', borderLeft: '4px solid var(--accent-primary)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, letterSpacing: '-0.02em' }}>Administrative Nexus</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {allowedActions.filter(a => a !== 'dispute').map(action => {
                    const cfg = actionConfig[action] || { label: action, class: 'btn-primary', icon: '▶' };
                    return (
                      <button
                        key={action}
                        onClick={() => handleAction(action)}
                        className={cfg.class}
                        disabled={actionLoading === action}
                        style={{ padding: '14px 28px', fontSize: 14 }}
                      >
                        {actionLoading === action ? '⏳' : cfg.icon} {cfg.label}
                      </button>
                    );
                  })}
                  {allowedActions.includes('dispute') && (
                    <button
                      onClick={() => setShowDispute(!showDispute)}
                      className="btn-danger"
                      style={{ padding: '14px 28px', fontSize: 14 }}
                    >⚠️ Raise Dispute</button>
                  )}
                </div>

                {showSubmitModal && (
                  <div style={{ marginTop: 24, padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
                    <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Confirm Deliverables — Phase {currentMilestone + 1}</h4>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                      Please link the digital proof of work (GitHub PR, Figma, Doc). The Payer will review this link before settling the escrow fraction.
                    </p>
                    <input
                      className="input-field"
                      placeholder="https://github.com/provenance/nexus-alpha"
                      value={workLink}
                      onChange={(e) => setWorkLink(e.target.value)}
                      style={{ marginBottom: 20, width: '100%' }}
                    />
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => handleAction('submit_work')} className="btn-primary" disabled={!workLink || actionLoading === 'submit_work'}>
                        {actionLoading === 'submit_work' ? '⏳ PROCESSING...' : 'SETTLE PROOF'}
                      </button>
                      <button onClick={() => setShowSubmitModal(false)} className="btn-secondary">
                        DISCARD
                      </button>
                    </div>
                  </div>
                )}

                {showDispute && (
                  <div style={{ marginTop: 24, padding: '24px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Initiate Conflict Resolution</h4>
                    <textarea
                      className="textarea-field"
                      placeholder="Specify the breach of strategic mandate..."
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      style={{ minHeight: 100, marginBottom: 20, width: '100%' }}
                    />
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={handleDispute} className="btn-danger" disabled={!disputeReason || actionLoading === 'dispute'}>
                        {actionLoading === 'dispute' ? 'SIGNALING...' : 'CONFIRM DISPUTE'}
                      </button>
                      <button onClick={() => setShowDispute(false)} className="btn-secondary">
                        ABORT
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audit Log */}
            <div className="glass-card" style={{ padding: 32, borderRadius: '32px' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, letterSpacing: '-0.02em' }}>📝 Protocol Audit Log</h3>
              {auditLog.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No ledger entries found for this agreement.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {auditLog.map((log, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8,
                    }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{log.action}</span>
                        {log.old_state && (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
                            {log.old_state} → {log.new_state}
                          </span>
                        )}
                        {log.metadata?.tx_hash && (
                          <div style={{ marginTop: 6 }}>
                             <a
                              href={`https://testnet.monadscan.com/tx/${log.metadata.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: 11, color: 'var(--accent-primary)', textDecoration: 'none',
                                background: 'rgba(108, 99, 255, 0.1)', padding: '2px 6px', borderRadius: 4
                              }}
                            >
                              🔗 View MON Transfer Tx
                            </a>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Escrow */}
            <div className="glass-card" style={{ padding: 28, borderRadius: '32px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(131, 110, 249, 0.1) 0%, transparent 70%)', zIndex: 0 }} />
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, letterSpacing: '-0.02em', position: 'relative', zIndex: 1 }}>💸 Protocol Ledger</h3>
              {escrow ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
                  {[
                    { label: 'Total Locked', value: escrow.locked, color: 'white' },
                    { label: 'Phase Released', value: escrow.released, color: 'var(--accent-secondary)' },
                    { label: 'Clawbacked', value: escrow.refunded, color: 'var(--accent-warning)' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</span>
                      <span className="mono-tech" style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{parseFloat(item.value).toFixed(2)} <span style={{ fontSize: 10, opacity: 0.6 }}>MON</span></span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>LIQUIDITY</span>
                    <span className="mono-tech" style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-primary)' }}>{parseFloat(escrow.available).toFixed(2)} <span style={{ fontSize: 12, opacity: 0.6 }}>MON</span></span>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-muted)', position: 'relative', zIndex: 1 }}>Escrow protocol not yet initialized.</p>
              )}
            </div>

            {/* Blockchain */}
            <div className="glass-card" style={{ padding: 28, borderRadius: '32px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, letterSpacing: '-0.02em' }}>⛓ Proof of Intent</h3>
              {contract.blockchain_verified ? (
                <div className="animate-slide-in">
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)',
                    padding: '12px 14px', borderRadius: '16px', fontSize: 13, fontWeight: 700, marginBottom: 16,
                    textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}><span>✅</span> VERIFIED ON MONAD</div>
                  <a
                    href={`https://testnet.monadscan.com/tx/${contract.blockchain_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono-tech"
                    style={{
                      fontSize: 12, color: 'var(--accent-primary)', wordBreak: 'break-all',
                      display: 'block', textDecoration: 'none', background: 'rgba(255,255,255,0.02)',
                      padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)'
                    }}
                  >
                    🔗 {contract.blockchain_tx_hash?.slice(0, 16)}...{contract.blockchain_tx_hash?.slice(-16)}
                  </a>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                    Secure this agreement on the Monad testnet to ensure immutable project proof.
                  </p>
                  <button
                    onClick={handleBlockchain}
                    className="btn-primary"
                    disabled={actionLoading === 'blockchain'}
                    style={{ width: '100%', padding: '14px' }}
                  >
                    {actionLoading === 'blockchain' ? '✨ SYNCING...' : 'REGISTER ON-CHAIN'}
                  </button>
                </div>
              )}
            </div>

            {/* Risk */}
            {contract.risk_flags?.length > 0 && (
              <div className="glass-card" style={{ padding: 28, borderRadius: '32px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, letterSpacing: '-0.02em' }}>⚠️ Risk Matrix</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {contract.risk_flags.map((flag, i) => (
                    <div key={i} style={{
                      fontSize: 13, padding: '12px 16px', borderRadius: '12px',
                      background: flag.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' :
                                  flag.severity === 'warning' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(131, 110, 249, 0.05)',
                      color: flag.severity === 'critical' ? 'var(--accent-warning)' :
                             flag.severity === 'warning' ? 'var(--accent-amber)' : 'var(--text-secondary)',
                      border: `1px solid ${flag.severity === 'critical' ? 'rgba(239, 68, 68, 0.2)' : 'transparent'}`,
                      lineHeight: 1.4
                    }}>
                      <span style={{ fontWeight: 800, textTransform: 'uppercase', marginRight: 8 }}>[{flag.severity}]</span>
                      {flag.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
