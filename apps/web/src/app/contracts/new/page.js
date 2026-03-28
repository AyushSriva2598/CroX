'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import WalletButton from '@/components/WalletButton';
import { createContract, parseContractAI, parseContractDemo } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function NewContractPage() {
  const router = useRouter();
  const hasToken = typeof window !== 'undefined' && localStorage.getItem('trustlayer_token');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [milestones, setMilestones] = useState([]);
  const [error, setError] = useState('');
  const [aiDone, setAiDone] = useState(false);

  const handleAISuggest = async () => {
    if (!description || !totalAmount) {
      setError('Please fill in description and amount first.');
      return;
    }
    setAiLoading(true);
    setError('');
    try {
      const text = `${title || 'Service Agreement'}. ${description}. Total amount: ${totalAmount} MON.`;
      const parseFn = hasToken ? parseContractAI : parseContractDemo;
      const result = await parseFn(text);
      
      if (result?.final_contract?.milestones) {
        setMilestones(result.final_contract.milestones.map((m, i) => ({
          name: m.name || m.description || `Milestone ${i + 1}`,
          amount: parseFloat(m.amount) || parseFloat(totalAmount) / result.final_contract.milestones.length,
        })));
      } else {
        const half = parseFloat(totalAmount) / 2;
        setMilestones([
          { name: 'Initial Delivery', amount: half },
          { name: 'Final Delivery', amount: half },
        ]);
      }
      setAiDone(true);
    } catch (err) {
      const half = parseFloat(totalAmount) / 2;
      setMilestones([
        { name: 'Initial Delivery', amount: half },
        { name: 'Final Delivery', amount: half },
      ]);
      setAiDone(true);
    }
    setAiLoading(false);
  };

  const handleCreate = async () => {
    if (!hasToken) { router.push('/login'); return; }
    if (!title || !totalAmount) {
      setError('Title and amount are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const contract = await createContract({
        title,
        description,
        total_amount: parseFloat(totalAmount),
        terms: { milestones: milestones.length > 0 ? milestones : undefined },
        risk_score: 25,
      });
      router.push(`/contracts/${contract.id}`);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const updateMilestone = (index, field, value) => {
    setMilestones(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const removeMilestone = (index) => {
    setMilestones(prev => prev.filter((_, i) => i !== index));
  };

  const addMilestone = () => {
    setMilestones(prev => [...prev, { name: '', amount: 0 }]);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Navbar />
      <motion.main 
        variants={containerVariants} initial="hidden" animate="visible"
        style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}
      >
        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.03em' }}>
              Launch <span className="gradient-text">Escrow</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
              Define terms securely and let AI map your delivery phasing.
            </p>
          </div>
          <WalletButton />
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(255, 82, 82, 0.1)', border: '1px solid rgba(255, 82, 82, 0.3)',
                borderRadius: 16, padding: '16px 20px', marginBottom: 24,
                color: 'var(--accent-warning)', fontSize: 14, fontWeight: 600
              }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <motion.div variants={itemVariants} className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Contract Title
              </label>
              <input
                className="input-field"
                placeholder="e.g. Next.js Protocol Dashboard"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Scope of Work
              </label>
              <textarea
                className="textarea-field"
                placeholder="Describe the deliverables..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ minHeight: 120 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Total Treasury (MON)
              </label>
              <input
                className="input-field font-mono"
                type="number" step="0.01" min="0.001"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-primary)' }}
              />
            </div>
          </div>
        </motion.div>

        {/* AI Milestones */}
        <motion.div variants={itemVariants} className="glass-card" style={{ padding: 32, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Project Phasing</h3>
            {!aiDone && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAISuggest}
                className="btn-primary"
                disabled={aiLoading}
                style={{ fontSize: 13, padding: '10px 20px', background: 'linear-gradient(135deg, var(--accent-secondary), #836EF9)' }}
              >
                {aiLoading ? '✨ Analyzing...' : '✨ Auto-Generate Protocol Phases'}
              </motion.button>
            )}
          </div>

          {milestones.length > 0 ? (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <AnimatePresence>
                {milestones.map((m, i) => (
                  <motion.div key={i} 
                    variants={itemVariants}
                    exit={{ opacity: 0, x: -20 }}
                    style={{
                      display: 'flex', gap: 12, alignItems: 'center',
                      padding: '16px', background: 'rgba(18, 18, 28, 0.4)', borderRadius: 16, border: '1px solid rgba(131, 110, 249, 0.1)'
                    }}
                  >
                    <div style={{ 
                      background: 'var(--accent-primary)', width: 28, height: 28, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 12
                    }}>
                      {i + 1}
                    </div>
                    <input
                      className="input-field"
                      value={m.name}
                      onChange={(e) => updateMilestone(i, 'name', e.target.value)}
                      style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px 0' }}
                      placeholder="Phase name"
                    />
                    <input
                      className="input-field font-mono"
                      type="number" step="0.01"
                      value={m.amount}
                      onChange={(e) => updateMilestone(i, 'amount', parseFloat(e.target.value) || 0)}
                      style={{ width: 120, border: 'none', background: 'rgba(5, 5, 10, 0.5)', textAlign: 'right', fontWeight: 700, color: 'var(--accent-secondary)' }}
                    />
                    <span className="font-mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>MON</span>
                    <button
                      onClick={() => removeMilestone(i)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-warning)', cursor: 'pointer', fontSize: 16, padding: '0 8px' }}
                    >✕</button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={addMilestone} className="btn-secondary" style={{ marginTop: 12 }}>
                + Add Phase Line
              </button>
            </motion.div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(18, 18, 28, 0.3)', borderRadius: 16, border: '1px dashed rgba(131, 110, 249, 0.2)' }}>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Describe your requirements and budget above, then use our AI engine to automatically structure the perfect payout milestones.
              </p>
              <button onClick={addMilestone} className="btn-secondary">
                Or Configure Manually
              </button>
            </div>
          )}
        </motion.div>

        {/* Create Button */}
        <motion.div variants={itemVariants}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            className="btn-success"
            disabled={loading || !title || !totalAmount}
            style={{ width: '100%', fontSize: 18, padding: '18px 0', letterSpacing: '0.5px' }}
          >
            {loading ? 'DEPLOYING ESCROW...' : 'SIGN & DEPLOY CONTRACT'}
          </motion.button>
        </motion.div>
      </motion.main>
    </div>
  );
}
