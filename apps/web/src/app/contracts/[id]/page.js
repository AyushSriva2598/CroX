'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import StateBadge from '@/components/StateBadge';
import WalletButton from '@/components/WalletButton';
import { getContract, contractAction, getEscrowStatus, registerOnBlockchain, verifyOnBlockchain, createDispute, getContractHashToSign } from '@/lib/api';
import { sendMON, registerContractOnChain as walletRegisterOnChain, getConnectedAddress, connectWallet } from '@/lib/wallet';

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
    const token = localStorage.getItem('crox_token');
    const userStr = localStorage.getItem('crox_user');
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
      const { contract_hash, registry_address } = await getContractHashToSign(id);
      const txHash = await walletRegisterOnChain(contract_hash, registry_address);
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
      <div style={{ minHeight: '100vh', background: 'transparent' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: 80 }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p className="font-mono" style={{ color: 'var(--accent-primary)', letterSpacing: '2px', textTransform: 'uppercase', fontSize: 12 }}>Syncing Node...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', background: 'transparent' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: 120 }}>
          <p style={{ color: 'var(--accent-warning)', fontSize: 24, fontWeight: 700 }}>{error || 'Contract Not Found'}</p>
        </div>
      </div>
    );
  }

  const contract = data.contract;
  const auditLog = data.audit_log || [];
  const actions = contract.available_actions || [];

  const isPayer = user?.id === contract.payer;
  const isWorker = user?.id === contract.payee || (!isPayer && contract.state === 'pending_acceptance');

  const milestones = contract.terms?.milestones || [];
  const currentMilestone = contract.current_milestone || 0;
  const isPartial = milestones.length > 0;

  const actionConfig = {
    submit: { label: 'Submit for Acceptance', class: 'btn-primary' },
    accept: { label: 'Accept & Sign', class: 'btn-success' },
    pay: { label: 'Lock Funds in Escrow', class: 'btn-success' },
    'submit-work': { label: 'Submit Deliverable', class: 'btn-primary' },
    'submit_work': { label: 'Submit Deliverable', class: 'btn-primary' },
    approve: { 
      label: isPartial && currentMilestone < milestones.length - 1 
        ? `Approve Phase ${currentMilestone + 1}` 
        : 'Approve & Release Final', 
      class: 'btn-success' },
    dispute: { label: 'Raise Dispute', class: 'btn-danger' },
    cancel: { label: 'Cancel Contract', class: 'btn-secondary' },
  };

  const allStates = ['draft', 'pending_acceptance', 'active', 'funds_locked', 'work_submitted', 'completed'];
  const currentIdx = allStates.indexOf(contract.state);

  const releaseAmount = isPartial && currentMilestone < milestones.length
    ? milestones[currentMilestone].amount
    : contract.total_amount;

  let allowedActions = actions;
  if (isPayer && !isWorker) {
    allowedActions = actions.filter(a => ['submit', 'pay', 'approve', 'cancel', 'dispute'].includes(a));
  } else if (isWorker && !isPayer) {
    allowedActions = actions.filter(a => ['accept', 'submit_work', 'submit-work', 'dispute'].includes(a));
  } else if (!isPayer && !isWorker) {
    allowedActions = [];
  }

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navbar />
      <motion.main 
        variants={containerVariants} initial="hidden" animate="visible"
        style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px' }}
      >
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(255, 82, 82, 0.1)', border: '1px solid rgba(255, 82, 82, 0.3)',
                borderRadius: 12, padding: '16px 20px', marginBottom: 24,
                color: 'var(--accent-warning)', fontSize: 14, fontWeight: 600
              }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>{contract.title}</h1>
              <StateBadge state={contract.state} />
            </div>
            <p className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 13, letterSpacing: '1px', textTransform: 'uppercase' }}>
              PROTOCOL ID // {contract.id}
            </p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            <WalletButton />
            <p className="font-mono gradient-text" style={{ fontSize: 36, fontWeight: 800 }}>
              {parseFloat(contract.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} MON
            </p>
          </div>
        </motion.div>

        {/* State Machine Tracker */}
        <motion.div variants={itemVariants} className="glass-card" style={{ padding: 32, marginBottom: 32, overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative', zIndex: 1 }}>
            {allStates.map((s, i) => {
              const isCurrent = s === contract.state;
              const isPast = i < currentIdx;
              const isPastFundsLocked = (s === 'funds_locked' && contract.state === 'completed');
              const isPastWorkSubmitted = (s === 'work_submitted' && contract.state === 'completed');

              // Adjust the logic slightly since we loop back to funds_locked/work_submitted
              const finalPast = isPast || isPastFundsLocked || isPastWorkSubmitted;

              return (
                <div key={s + i} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, position: 'relative' }}>
                    <motion.div 
                      initial={false}
                      animate={{ 
                        scale: isCurrent ? 1.2 : 1,
                        boxShadow: isCurrent ? '0 0 20px rgba(131, 110, 249, 0.6)' : 'none'
                      }}
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: isCurrent ? 'var(--accent-primary)' : finalPast ? 'var(--accent-secondary)' : 'rgba(18, 18, 28, 0.6)',
                        border: `2px solid ${isCurrent ? 'var(--accent-primary)' : finalPast ? 'var(--accent-secondary)' : 'rgba(131, 110, 249, 0.2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: 'white', fontWeight: 800, zIndex: 2
                      }}
                    >
                      {finalPast ? '✓' : i + 1}
                    </motion.div>
                    <span className="font-mono" style={{
                      fontSize: 10, marginTop: 12, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px',
                      color: isCurrent ? 'white' : finalPast ? 'var(--accent-secondary)' : 'var(--text-muted)',
                      fontWeight: isCurrent ? 700 : 500,
                    }}>
                      {s.replace('_', ' ')}
                    </span>
                  </div>
                  {i < allStates.length - 1 && (
                    <div style={{
                      height: 2, flex: '0 0 20px',
                      background: finalPast ? 'var(--accent-secondary)' : 'rgba(131, 110, 249, 0.2)',
                      marginTop: -20, zIndex: 0
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Left Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Details */}
            <motion.div variants={itemVariants} className="glass-card" style={{ padding: 32 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Protocol Specifications</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Payer Identity</p>
                  <p className="font-mono" style={{ fontSize: 14, fontWeight: 600 }}>{contract.payer_detail?.phone_number || '—'}</p>
                </div>
                <div>
                  <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Worker Identity</p>
                  <p className="font-mono" style={{ fontSize: 14, fontWeight: 600 }}>{contract.payee_detail?.phone_number || contract.payee_phone || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Security Rating</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 60, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${contract.risk_score}%`, height: '100%', background: contract.risk_score > 50 ? 'var(--accent-warning)' : 'var(--accent-success)' }} />
                    </div>
                    <p className="font-mono" style={{ fontSize: 14, fontWeight: 700 }}>{contract.risk_score}</p>
                  </div>
                </div>
                <div>
                  <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Deployment Date</p>
                  <p className="font-mono" style={{ fontSize: 13, fontWeight: 500 }}>{new Date(contract.created_at).toLocaleString()}</p>
                </div>
                {contract.worker_wallet && (
                  <div style={{ gridColumn: '1 / -1', background: 'rgba(18, 18, 28, 0.4)', padding: 16, borderRadius: 12, border: '1px dashed rgba(131, 110, 249, 0.2)' }}>
                    <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '1px' }}>Authorized Worker Wallet</p>
                    <p className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)', wordBreak: 'break-all' }}>{contract.worker_wallet}</p>
                  </div>
                )}
              </div>
              {contract.description && (
                <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid rgba(131, 110, 249, 0.1)' }}>
                  <p className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Scope of Work</p>
                  <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6 }}>{contract.description}</p>
                </div>
              )}
            </motion.div>

            {/* Milestones */}
            {milestones.length > 0 && (
              <motion.div variants={itemVariants} className="glass-card" style={{ padding: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Execution Phasing</h3>
                  <span className="font-mono" style={{ fontSize: 11, background: 'var(--accent-primary)', padding: '4px 12px', borderRadius: 9999, fontWeight: 700, color: 'white', letterSpacing: '0.5px' }}>
                    {currentMilestone >= milestones.length ? 'ALL SYSTEMS COMPLETED' : `PHASE ${currentMilestone + 1} // ${milestones.length}`}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {milestones.map((m, i) => {
                    const isPast = i < currentMilestone;
                    const isCurrent = i === currentMilestone && ['funds_locked', 'work_submitted'].includes(contract.state);
                    const isUpcoming = i > currentMilestone || (i === currentMilestone && ['draft', 'pending_acceptance', 'active'].includes(contract.state));
                    
                    return (
                      <motion.div 
                        key={i} 
                        initial={false}
                        animate={{ scale: isCurrent ? 1.02 : 1 }}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px',
                          background: isCurrent ? 'linear-gradient(90deg, rgba(131, 110, 249, 0.1), rgba(131, 110, 249, 0.05))' : 'rgba(18, 18, 28, 0.4)',
                          border: isCurrent ? '1px solid rgba(131, 110, 249, 0.4)' : '1px solid transparent',
                          borderRadius: 12,
                          opacity: isUpcoming ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: isPast ? 'var(--accent-success)' : isCurrent ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, color: 'white', fontWeight: 800
                          }}>
                            {isPast ? '✓' : i + 1}
                          </div>
                          <span style={{ fontSize: 15, fontWeight: isCurrent ? 700 : 600, color: isCurrent ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                            {m.name}
                          </span>
                        </div>
                        <span className="font-mono" style={{ fontSize: 16, fontWeight: 800, color: isPast ? 'var(--accent-success)' : 'var(--accent-secondary)' }}>
                          {parseFloat(m.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} MON
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Actions Block */}
            {allowedActions.length > 0 && (
              <motion.div variants={itemVariants} className="glass-card" style={{ padding: 32, border: '1px solid rgba(131, 110, 249, 0.3)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at top right, rgba(131, 110, 249, 0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <h3 className="font-mono" style={{ fontSize: 12, fontWeight: 700, marginBottom: 20, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>Terminal Controls</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, position: 'relative', zIndex: 1 }}>
                  {allowedActions.filter(a => a !== 'dispute').map(action => {
                    const cfg = actionConfig[action] || { label: action, class: 'btn-primary' };
                    return (
                      <motion.button
                        key={action}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAction(action)}
                        className={cfg.class}
                        disabled={actionLoading === action}
                        style={{ padding: '16px 20px', fontSize: 14, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}
                      >
                        {actionLoading === action ? 'PROCESSING...' : cfg.label}
                      </motion.button>
                    );
                  })}
                  {allowedActions.includes('dispute') && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowDispute(!showDispute)}
                      className="btn-danger"
                      style={{ padding: '16px 20px', fontSize: 14, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}
                    >⚠️ Initialize Dispute</motion.button>
                  )}
                </div>

                <AnimatePresence>
                  {showSubmitModal && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      style={{ marginTop: 24, padding: 24, background: 'rgba(18, 18, 28, 0.6)', borderRadius: 16, border: '1px solid rgba(131, 110, 249, 0.4)' }}
                    >
                      <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Transmit Deliverable (Phase {currentMilestone + 1})</h4>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        Provide the URL resource endpoint to your completed work block.
                      </p>
                      <input
                        className="input-field font-mono"
                        placeholder="https://..."
                        value={workLink}
                        onChange={(e) => setWorkLink(e.target.value)}
                        style={{ marginBottom: 16 }}
                      />
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => handleAction('submit_work')} className="btn-primary" disabled={!workLink || actionLoading === 'submit_work'}>
                          {actionLoading === 'submit_work' ? 'UPLOADING...' : 'CONFIRM TRANSMISSION'}
                        </button>
                        <button onClick={() => setShowSubmitModal(false)} className="btn-secondary">
                          ABORT
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {showDispute && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                      style={{ marginTop: 24, padding: 24, background: 'rgba(255, 82, 82, 0.05)', borderRadius: 16, border: '1px solid rgba(255, 82, 82, 0.3)' }}
                    >
                      <textarea
                        className="textarea-field font-mono"
                        placeholder="Detail malfunction report..."
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        style={{ minHeight: 100, marginBottom: 16, border: '1px solid rgba(255, 82, 82, 0.3)' }}
                      />
                      <button onClick={handleDispute} className="btn-danger" disabled={!disputeReason || actionLoading === 'dispute'}>
                        {actionLoading === 'dispute' ? 'BROADCASTING...' : 'CONFIRM DISPUTE OVERRIDE'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Escrow Ledger */}
            <motion.div variants={itemVariants} className="glass-card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Treasury Ledger</h3>
              {escrow ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Locked</span>
                    <span className="font-mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-primary)' }}>{parseFloat(escrow.locked).toLocaleString(undefined, { minimumFractionDigits: 2 })} MON</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Released</span>
                    <span className="font-mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-success)' }}>{parseFloat(escrow.released).toLocaleString(undefined, { minimumFractionDigits: 2 })} MON</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Refunded</span>
                    <span className="font-mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-warning)' }}>{parseFloat(escrow.refunded).toLocaleString(undefined, { minimumFractionDigits: 2 })} MON</span>
                  </div>
                  <div style={{ borderTop: '1px dashed rgba(131, 110, 249, 0.3)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="font-mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Available</span>
                    <span className="font-mono" style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{parseFloat(escrow.available).toLocaleString(undefined, { minimumFractionDigits: 2 })} MON</span>
                  </div>
                </div>
              ) : (
                <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Treasury empty. Awaiting capital lock.</p>
              )}
            </motion.div>

            {/* Blockchain Sync */}
            <motion.div variants={itemVariants} className="glass-card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Network Sync</h3>
              {contract.blockchain_verified ? (
                <div>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '12px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 16,
                    textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}>● SECURED ON MONAD</div>
                  <div style={{ background: 'rgba(18, 18, 28, 0.4)', padding: '12px', borderRadius: 8 }}>
                    <p className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Transaction Hash</p>
                    <a
                      href={`https://testnet.monadscan.com/tx/${contract.blockchain_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{
                        fontSize: 12, color: 'var(--accent-primary)', wordBreak: 'break-all',
                        display: 'block', textDecoration: 'none', fontWeight: 600
                      }}
                    >
                      {contract.blockchain_tx_hash?.slice(0, 8)}...{contract.blockchain_tx_hash?.slice(-8)} ↗
                    </a>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-mono" style={{ fontSize: 12, color: 'var(--accent-warning)', marginBottom: 16 }}>NOT BROADCASTED</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleBlockchain}
                    className="btn-primary"
                    disabled={actionLoading === 'blockchain'}
                    style={{ width: '100%', fontSize: 13, padding: '12px 0' }}
                  >
                    {actionLoading === 'blockchain' ? 'SYNCING...' : 'BROADCAST TO MONAD'}
                  </motion.button>
                </div>
              )}
            </motion.div>

            {/* Audit Log */}
            <motion.div variants={itemVariants} className="glass-card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>System Logs</h3>
              {auditLog.length === 0 ? (
                <p className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 12 }}>No operations logged.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {auditLog.map((log, i) => (
                    <div key={i} style={{
                      padding: '12px', background: 'rgba(18, 18, 28, 0.5)', borderRadius: 10, borderLeft: '3px solid var(--accent-primary)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{log.action}</span>
                        <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {log.old_state && (
                        <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {log.old_state} → {log.new_state}
                        </div>
                      )}
                      {log.metadata?.tx_hash && (
                          <div style={{ marginTop: 6 }}>
                             <a
                              href={`https://testnet.monadscan.com/tx/${log.metadata.tx_hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: 11, color: 'var(--accent-primary)', textDecoration: 'none',
                                background: 'rgba(108, 99, 255, 0.1)', padding: '2px 6px', borderRadius: 4, display: 'inline-block'
                              }}
                            >
                              🔗 View TX
                            </a>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
