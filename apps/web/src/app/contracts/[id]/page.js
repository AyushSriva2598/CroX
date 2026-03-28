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

    // Auto-reload every 5 seconds for active contracts
    const interval = setInterval(() => {
      if (data && ['completed', 'cancelled', 'refunded'].includes(data.contract.state)) {
        clearInterval(interval);
        return;
      }
      fetchData();
    }, 5000);

    return () => clearInterval(interval);
  }, [id, router, !!data]);

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
        ? `Approve ${milestones[currentMilestone]?.name || `Phase ${currentMilestone + 1}`}` 
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
      {/* Dynamic Background Glows */}
      <div style={{ 
        position: 'absolute', top: '10%', right: '-10%', width: '50%', height: '50%', 
        background: 'radial-gradient(circle, rgba(138, 161, 255, 0.04) 0%, transparent 70%)', 
        zIndex: 0, pointerEvents: 'none' 
      }} />
      <div style={{ 
        position: 'absolute', bottom: '10%', left: '-10%', width: '40%', height: '40%', 
        background: 'radial-gradient(circle, rgba(124, 255, 224, 0.03) 0%, transparent 70%)', 
        zIndex: 0, pointerEvents: 'none' 
      }} />
      
      <Navbar />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px', position: 'relative', zIndex: 1 }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
              <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em' }}>{contract.title}</h1>
              <StateBadge state={contract.state} />
            </div>
            <p className="mono-tech" style={{ color: 'var(--text-muted)', fontSize: 11, opacity: 0.6, letterSpacing: '0.05em' }}>MANDATE_ID: {contract.id}</p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 24 }}>
            <WalletButton />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="tracked-caps" style={{ fontSize: 11, color: 'var(--text-muted)' }}>SETTLEMENT VOLUME</span>
              <p className="mono-tech" style={{ fontSize: 44, fontWeight: 800, color: 'var(--neon-mint)', lineHeight: 1 }}>
                {parseFloat(contract.total_amount).toLocaleString()} <span style={{ fontSize: 14, opacity: 0.5 }}>MON</span>
              </p>
            </div>
          </div>
        </div>

        {/* Progress Timeline */}
        <div className="glass-card" style={{ padding: '32px 48px', marginBottom: 64, borderRadius: '32px', border: '1px solid var(--nightline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '10px 0' }}>
            {allStates.map((s, i) => {
              const isCurrent = s === contract.state;
              const isPast = i < currentIdx;
              const label = s.replace('_', ' ').toUpperCase();
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 150 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div className={`timeline-dot ${isCurrent || isPast ? 'active' : ''}`} style={{ 
                      width: 14, height: 14,
                      background: isCurrent || isPast ? 'var(--neon-mint)' : 'var(--nightline)',
                      zIndex: 1
                    }}>
                    </div>
                    <span style={{
                      fontSize: 10, marginTop: 16, textAlign: 'center',
                      color: isCurrent ? 'var(--neon-mint)' : isPast ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      transition: 'all 0.3s ease'
                    }}>
                      {label}
                    </span>
                  </div>
                  {i < allStates.length - 1 && (
                    <div style={{
                      height: 1, flex: '1 0 40px',
                      background: isPast ? 'var(--neon-mint)' : 'var(--nightline)',
                      opacity: isPast ? 0.4 : 1,
                      marginTop: -26, margin: '0 0'
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
            {/* Details Grid */}
            <div className="glass-card" style={{ padding: 48, borderRadius: '32px', border: '1px solid var(--nightline)' }}>
              <h3 className="tracked-caps" style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Mandate Architecture</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
                {[
                  { label: 'Originating node', value: contract.payer_detail?.email || '—', color: 'var(--lumen-blue)' },
                  { label: 'Executing node', value: contract.payee_detail?.email || contract.payee_email || 'AWAITING AUTHORIZATION', color: contract.payee_email ? 'var(--neon-mint)' : 'var(--text-muted)' },
                  { label: 'Ecosystem integrity', value: `${contract.risk_score}/100 PROBABILITY`, color: contract.risk_score > 50 ? 'var(--accent-warning)' : 'var(--neon-mint)' },
                  { label: 'Mandate genesis', value: new Date(contract.created_at).toLocaleDateString() },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="tracked-caps" style={{ color: 'var(--text-muted)', marginBottom: 12, fontSize: 10 }}>{item.label}</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: item.color || '#fff', letterSpacing: '-0.01em' }}>{item.value}</p>
                  </div>
                ))}
                {contract.worker_wallet && (
                  <div style={{ gridColumn: '1 / -1', padding: '24px', background: 'rgba(124, 255, 224, 0.03)', borderRadius: '16px', border: '1px solid rgba(124, 255, 224, 0.1)' }}>
                    <p className="tracked-caps" style={{ color: 'var(--neon-mint)', marginBottom: 12, fontSize: 9 }}>SETTLEMENT WALLET ADDRESS</p>
                    <p className="mono-tech" style={{ fontSize: 14, color: 'var(--neon-mint)', wordBreak: 'break-all', fontWeight: 700 }}>{contract.worker_wallet}</p>
                  </div>
                )}
              </div>
              {contract.description && (
                <div style={{ marginTop: 48 }}>
                  <p className="tracked-caps" style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Detailed Strategic Mandate</p>
                  <p style={{ fontSize: 17, color: 'var(--ash-mist)', lineHeight: 1.8, fontWeight: 500 }}>{contract.description}</p>
                </div>
              )}
            </div>

            {/* Milestones Sections */}
            {milestones.length > 0 && (
              <div className="glass-card" style={{ padding: 48, borderRadius: '32px', border: '1px solid var(--nightline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                  <h3 className="tracked-caps" style={{ color: 'var(--text-muted)' }}>Strategic Milestones</h3>
                  <div className="badge-active" style={{ fontSize: 11, padding: '6px 16px' }}>
                    {currentMilestone >= milestones.length ? 'SETTLED' : `PHASE ${currentMilestone + 1} OF ${milestones.length}`}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {milestones.map((m, i) => {
                    const isPast = i < currentMilestone;
                    const isCurrent = i === currentMilestone && ['funds_locked', 'work_submitted'].includes(contract.state);
                    const isUpcoming = i > currentMilestone || (i === currentMilestone && ['draft', 'pending_acceptance', 'active'].includes(contract.state));
                    
                    return (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px',
                        background: isCurrent ? 'rgba(124, 255, 224, 0.03)' : 'rgba(255,255,255,0.01)',
                        border: `1px solid ${isCurrent ? 'rgba(124, 255, 224, 0.2)' : 'var(--nightline)'}`,
                        borderRadius: '20px',
                        opacity: isUpcoming ? 0.6 : 1,
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                          <div className={`timeline-dot ${isPast || isCurrent ? 'active' : ''}`} style={{ width: 10, height: 10 }} />
                          <div>
                            <span style={{ fontSize: 16, fontWeight: 800, color: isCurrent ? 'var(--neon-mint)' : '#fff', display: 'block', letterSpacing: '-0.01em' }}>
                              {m.name}
                            </span>
                            {m.description && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 4, display: 'block' }}>{m.description}</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p className="mono-tech" style={{ fontSize: 18, fontWeight: 800, color: isCurrent ? 'var(--neon-mint)' : 'var(--ash-mist)' }}>
                            {parseFloat(m.amount).toLocaleString()} <span style={{ fontSize: 11, opacity: 0.5 }}>MON</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Operational Nexus (Actions) */}
            {allowedActions.length > 0 && (
              <div className="glass-card" style={{ padding: 48, borderRadius: '32px', border: '1px solid var(--neon-mint)', background: 'rgba(124, 255, 224, 0.02)' }}>
                <h3 className="tracked-caps" style={{ color: 'var(--neon-mint)', marginBottom: 32 }}>Administrative Nexus</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {allowedActions.filter(a => a !== 'dispute').map(action => {
                    const cfg = actionConfig[action] || { label: action, class: 'btn-primary', icon: '▶' };
                    return (
                      <button
                        key={action}
                        onClick={() => handleAction(action)}
                        className={cfg.class}
                        disabled={!!actionLoading}
                        style={{ padding: '16px 32px', fontSize: 13, flex: 1, minWidth: 200 }}
                      >
                        {actionLoading === action ? '⏳' : cfg.icon} {cfg.label}
                      </button>
                    );
                  })}
                  {allowedActions.includes('dispute') && (
                    <button
                      onClick={() => setShowDispute(!showDispute)}
                      className="btn-danger"
                      style={{ padding: '16px 32px', fontSize: 13, minWidth: 200 }}
                    >⚠️ Raise Dispute</button>
                  )}
                </div>

                {showSubmitModal && (
                  <div style={{ marginTop: 24, padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid var(--glass-border)' }}>
                    <h4 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12 }}>Confirm Deliverables — {milestones[currentMilestone]?.name || `Phase ${currentMilestone + 1}`}</h4>
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
            {/* Escrow Vault */}
            <div className="glass-card" style={{ padding: 32, borderRadius: '32px', border: '1px solid var(--nightline)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(124, 255, 224, 0.05) 0%, transparent 70%)', zIndex: 0 }} />
              <h3 className="tracked-caps" style={{ color: 'var(--text-muted)', marginBottom: 24, position: 'relative', zIndex: 1 }}>Protocol Ledger</h3>
              {escrow ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 1 }}>
                  {[
                    { label: 'TOTAL LOCKED', value: escrow.locked, color: 'white' },
                    { label: 'PHASE RELEASED', value: escrow.released, color: 'var(--lumen-blue)' },
                    { label: 'CLAWBACKED', value: escrow.refunded, color: 'var(--accent-warning)' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em' }}>{item.label}</span>
                      <span className="mono-tech" style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{parseFloat(item.value).toLocaleString()} <span style={{ fontSize: 10, opacity: 0.5 }}>MON</span></span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--nightline)', paddingTop: 20, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="tracked-caps" style={{ color: 'var(--neon-mint)' }}>LIQUIDITY</span>
                    <span className="mono-tech" style={{ fontSize: 22, fontWeight: 800, color: 'var(--neon-mint)' }}>{parseFloat(escrow.available).toLocaleString()} <span style={{ fontSize: 11, opacity: 0.5 }}>MON</span></span>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', position: 'relative', zIndex: 1, fontWeight: 500 }}>Escrow vault not yet initialized.</p>
              )}
            </div>

            {/* Blockchain Proof */}
            <div className="glass-card" style={{ padding: 32, borderRadius: '32px', border: '1px solid var(--nightline)' }}>
              <h3 className="tracked-caps" style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Proof of Intent</h3>
              {contract.blockchain_verified ? (
                <div className="animate-slide-in">
                  <div style={{
                    background: 'rgba(124, 255, 224, 0.05)', color: 'var(--neon-mint)',
                    padding: '14px 16px', borderRadius: '16px', fontSize: 11, fontWeight: 800, marginBottom: 20,
                    textAlign: 'center', border: '1px solid rgba(124, 255, 224, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    letterSpacing: '0.1em', textTransform: 'uppercase'
                  }}>⛓ VERIFIED ON MONAD</div>
                  <a
                    href={`https://testnet.monadscan.com/tx/${contract.blockchain_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono-tech"
                    style={{
                      fontSize: 11, color: 'var(--neon-mint)', wordBreak: 'break-all',
                      display: 'block', textDecoration: 'none', background: 'rgba(124, 255, 224, 0.03)',
                      padding: '14px', borderRadius: '12px', border: '1px solid rgba(124, 255, 224, 0.1)',
                      fontWeight: 700
                    }}
                  >
                    🔗 {contract.blockchain_tx_hash?.slice(0, 16)}...{contract.blockchain_tx_hash?.slice(-16)}
                  </a>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--ash-mist)', marginBottom: 24, lineHeight: 1.6, fontWeight: 500 }}>
                    Anchor this mandate on the Monad testnet for immutable settlement proof.
                  </p>
                  <button
                    onClick={handleBlockchain}
                    className="btn-secondary"
                    disabled={actionLoading === 'blockchain'}
                    style={{ width: '100%', padding: '14px', borderColor: 'rgba(124, 255, 224, 0.2)', color: 'var(--neon-mint)' }}
                  >
                    {actionLoading === 'blockchain' ? 'SYNCING...' : 'REGISTER ON-CHAIN'}
                  </button>
                </div>
              )}
            </div>

            {/* Risk Matrix */}
            {contract.risk_flags?.length > 0 && (
              <div className="glass-card" style={{ padding: 32, borderRadius: '32px', border: '1px solid rgba(255, 110, 110, 0.15)' }}>
                <h3 className="tracked-caps" style={{ color: 'var(--accent-warning)', marginBottom: 24 }}>Risk Matrix</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {contract.risk_flags.map((flag, i) => (
                    <div key={i} style={{
                      fontSize: 12, padding: '14px 18px', borderRadius: '14px',
                      background: flag.severity === 'critical' ? 'rgba(255, 110, 110, 0.05)' :
                                  flag.severity === 'warning' ? 'rgba(255, 209, 102, 0.05)' : 'rgba(138, 161, 255, 0.05)',
                      color: flag.severity === 'critical' ? 'var(--accent-warning)' :
                             flag.severity === 'warning' ? 'var(--accent-amber)' : 'var(--ash-mist)',
                      border: `1px solid ${flag.severity === 'critical' ? 'rgba(255, 110, 110, 0.2)' : 'var(--nightline)'}`,
                      lineHeight: 1.5, fontWeight: 600
                    }}>
                      <span style={{ fontWeight: 800, textTransform: 'uppercase', marginRight: 10, letterSpacing: '0.05em', fontSize: 10 }}>[{flag.severity}]</span>
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
