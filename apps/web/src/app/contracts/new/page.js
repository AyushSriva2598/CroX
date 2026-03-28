'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import WalletButton from '@/components/WalletButton';
import { createContract, parseContractAI, parseContractDemo } from '@/lib/api';

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

  // Use backend AI to auto-generate milestones from description
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
        // Default: split evenly into 2 milestones
        const half = parseFloat(totalAmount) / 2;
        setMilestones([
          { name: 'Initial Delivery', amount: half },
          { name: 'Final Delivery', amount: half },
        ]);
      }
      setAiDone(true);
    } catch (err) {
      // Fallback: just split evenly
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-5%', right: '-5%', width: '50%', height: '50%', background: 'radial-gradient(circle, rgba(124, 255, 224, 0.04) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(138, 161, 255, 0.04) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <Navbar />
      <main style={{ maxWidth: 840, margin: '0 auto', padding: '64px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56, gap: 24 }}>
          <div>
            <span className="badge badge-active" style={{ marginBottom: 20, display: 'inline-block' }}>PROVENANCE PROTOCOL</span>
            <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.04em' }}>
              Initialize <span className="gradient-text">Mandate</span>
            </h1>
            <p style={{ color: 'var(--ash-mist)', fontSize: 16, fontWeight: 500, lineHeight: 1.6 }}>
              Define strategic outcomes. AI will architect the milestone sequence.
            </p>
          </div>
          <WalletButton />
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 110, 110, 0.05)',
            border: '1px solid rgba(255, 110, 110, 0.2)',
            borderRadius: '16px', padding: '16px 20px', marginBottom: 32,
            color: 'var(--accent-warning)', fontSize: 13, fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: 12,
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Form */}
        <div className="glass-card" style={{ padding: 48, marginBottom: 32, borderRadius: '32px', border: '1px solid var(--nightline)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {/* Title */}
            <div>
              <label className="tracked-caps" style={{ display: 'block', marginBottom: 12, color: 'var(--text-muted)' }}>
                Strategic Identifier
              </label>
              <input
                className="input-field"
                placeholder="E.G. NEXUS PROTOCOL CORE INFRASTRUCTURE"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ fontSize: 18, fontWeight: 700, width: '100%' }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="tracked-caps" style={{ display: 'block', marginBottom: 12, color: 'var(--text-muted)' }}>
                Mandate Scope
              </label>
              <textarea
                className="textarea-field"
                placeholder="Define the primary objectives and success conditions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ minHeight: 160, fontSize: 16, lineHeight: 1.7, width: '100%', background: 'transparent', border: '1px solid var(--nightline)', borderRadius: '16px', padding: '16px 20px', color: '#fff' }}
              />
            </div>

            {/* Amount */}
            <div>
              <label className="tracked-caps" style={{ display: 'block', marginBottom: 12, color: 'var(--text-muted)' }}>
                Settlement Volume (MON)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  className="input-field"
                  type="number"
                  step="0.01"
                  min="0.001"
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  style={{ fontSize: 28, fontWeight: 900, color: 'var(--neon-mint)', paddingRight: 80, width: '100%' }}
                />
                <span className="mono-tech" style={{ position: 'absolute', right: 24, fontSize: 14, fontWeight: 800, color: 'var(--text-muted)' }}>MON</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Milestone Suggestion */}
        <div className="glass-card" style={{ padding: 48, marginBottom: 56, borderRadius: '32px', border: '1px solid var(--nightline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
            <h3 className="tracked-caps" style={{ color: 'var(--text-muted)' }}>Strategic Milestones</h3>
            {!aiDone && (
              <button
                onClick={handleAISuggest}
                className="btn-primary"
                disabled={aiLoading}
                style={{ fontSize: 12, padding: '12px 28px' }}
              >
                {aiLoading ? '✨ PROCESSING...' : '✨ SUGGEST WITH AI'}
              </button>
            )}
          </div>

          {milestones.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {milestones.map((m, i) => (
                <div key={i} className="animate-slide-in" style={{
                  display: 'flex', gap: 20, alignItems: 'center',
                  padding: '20px 28px', background: 'rgba(255,255,255,0.01)', borderRadius: '20px',
                  border: '1px solid var(--nightline)',
                  animationDelay: `${i * 0.1}s`
                }}>
                  <div className="timeline-dot active" style={{ width: 10, height: 10, flexShrink: 0 }} />
                  <input
                    className="input-field"
                    value={m.name}
                    onChange={(e) => updateMilestone(i, 'name', e.target.value)}
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, fontSize: 16, fontWeight: 700, boxShadow: 'none' }}
                    placeholder="Milestone Objective"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      className="input-field mono-tech"
                      type="number"
                      step="0.01"
                      value={m.amount}
                      onChange={(e) => updateMilestone(i, 'amount', parseFloat(e.target.value) || 0)}
                      style={{ width: 110, textAlign: 'right', fontWeight: 800, color: 'var(--neon-mint)', background: 'transparent', border: 'none', padding: '0 4px', boxShadow: 'none' }}
                    />
                    <span className="mono-tech" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 800 }}>MON</span>
                  </div>
                  <button
                    onClick={() => removeMilestone(i)}
                    style={{ background: 'rgba(255, 110, 110, 0.1)', border: 'none', color: 'var(--accent-warning)', cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}
                  >✕</button>
                </div>
              ))}
              <button onClick={addMilestone} style={{
                background: 'transparent', border: '1px dashed var(--nightline)',
                borderRadius: '20px', padding: 20, color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 12, fontWeight: 800, transition: 'all 0.3s ease',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8
              }}
              onMouseOver={(e) => { e.target.style.borderColor = 'var(--neon-mint)'; e.target.style.color = 'var(--neon-mint)'; }}
              onMouseOut={(e) => { e.target.style.borderColor = 'var(--nightline)'; e.target.style.color = 'var(--text-muted)'; }}
              >
                + Add Milestone
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '56px 20px', border: '1px dashed var(--nightline)', borderRadius: '24px' }}>
              <div style={{ fontSize: 32, marginBottom: 20, opacity: 0.2 }}>💠</div>
              <p style={{ fontSize: 15, color: 'var(--ash-mist)', marginBottom: 28, lineHeight: 1.7, fontWeight: 500 }}>
                Quantify the mandate scope and amount, then use the AI<br/>agent to generate a strategic milestone sequence.
              </p>
              <button onClick={addMilestone} className="btn-secondary" style={{ fontSize: 11, padding: '12px 28px' }}>
                ARCHITECT MANUALLY
              </button>
            </div>
          )}
        </div>

        {/* Deploy Button */}
        <button
          onClick={handleCreate}
          className="btn-primary"
          disabled={loading || !title || !totalAmount}
          style={{ width: '100%', fontSize: 16, padding: '22px 0', boxShadow: '0 0 40px rgba(124, 255, 224, 0.2)' }}
        >
          {loading ? 'INITIALIZING...' : 'DEPLOY MANDATE PROTOCOL'}
        </button>
      </main>
    </div>
  );
}
