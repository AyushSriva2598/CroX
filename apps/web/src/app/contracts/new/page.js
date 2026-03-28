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
      <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at 90% 10%, rgba(131, 110, 249, 0.05) 0%, transparent 60%)', zIndex: 0 }} />
      <Navbar />
      <main style={{ maxWidth: 840, margin: '0 auto', padding: '64px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, gap: 24 }}>
          <div>
            <div className="badge-active" style={{ fontSize: 11, padding: '4px 12px', borderRadius: '9999px', width: 'fit-content', marginBottom: 16, fontWeight: 800 }}>PROVENANCE PROTOCOL</div>
            <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.04em' }}>
              Initialize <span style={{ color: 'var(--accent-primary)' }}>Mandate</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, fontWeight: 500 }}>
              Define strategic outcomes. AI will architect the milestone sequence.
            </p>
          </div>
          <WalletButton />
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '16px', padding: '16px 20px', marginBottom: 32,
            color: 'var(--accent-warning)', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span> {error}
          </div>
        )}

        {/* Form */}
        {/* Form */}
        <div className="glass-card" style={{ padding: 40, marginBottom: 32, borderRadius: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Title */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block' }}>
                Strategic Identifier (Title)
              </label>
              <input
                className="input-field"
                placeholder="E.G. NEXUS PROTOCOL CORE INFRASTRUCTURE"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ fontSize: 18, fontWeight: 600 }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block' }}>
                Mandate Scope (Description)
              </label>
              <textarea
                className="textarea-field"
                placeholder="Define the primary objectives and success conditions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ minHeight: 140, fontSize: 16, lineHeight: 1.6 }}
              />
            </div>

            {/* Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'block' }}>
                  Total Settlement Value (MON)
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
                    style={{ fontSize: 24, fontWeight: 900, color: 'var(--accent-primary)', paddingRight: 80 }}
                  />
                  <span className="mono-tech" style={{ position: 'absolute', right: 24, fontSize: 14, fontWeight: 800, color: 'var(--text-muted)' }}>MON</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Milestone Suggestion */}
        {/* AI Milestone Suggestion */}
        <div className="glass-card" style={{ padding: 40, marginBottom: 48, borderRadius: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>🗺 Strategic Milestones</h3>
            {!aiDone && (
              <button
                onClick={handleAISuggest}
                className="btn-primary"
                disabled={aiLoading}
                style={{ fontSize: 13, padding: '10px 24px' }}
              >
                {aiLoading ? '✨ PROCESSING ARCHITECTURE...' : '✨ SUGGEST WITH AI'}
              </button>
            )}
          </div>

          {milestones.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {milestones.map((m, i) => (
                <div key={i} className="animate-slide-in" style={{
                  display: 'flex', gap: 16, alignItems: 'center',
                  padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  animationDelay: `${i * 0.1}s`
                }}>
                  <div style={{ 
                    width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: 14, fontWeight: 800, color: '#fff'
                  }}>{i + 1}</div>
                  <input
                    className="input-field"
                    value={m.name}
                    onChange={(e) => updateMilestone(i, 'name', e.target.value)}
                    style={{ flex: 1, background: 'transparent', border: 'none', padding: 0, fontSize: 16, fontWeight: 600 }}
                    placeholder="Milestone Objective"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      className="input-field"
                      type="number"
                      step="0.01"
                      value={m.amount}
                      onChange={(e) => updateMilestone(i, 'amount', parseFloat(e.target.value) || 0)}
                      style={{ width: 100, textAlign: 'right', fontWeight: 800, color: 'var(--accent-secondary)' }}
                    />
                    <span className="mono-tech" style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>MON</span>
                  </div>
                  <button
                    onClick={() => removeMilestone(i)}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}
                  >✕</button>
                </div>
              ))}
              <button onClick={addMilestone} style={{
                background: 'transparent', border: '2px dashed var(--border-color)',
                borderRadius: '16px', padding: 16, color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: 14, fontWeight: 700, transition: 'all 0.2s ease',
                marginTop: 8
              }}
              onMouseOver={(e) => e.target.style.borderColor = 'var(--accent-primary)'}
              onMouseOut={(e) => e.target.style.borderColor = 'var(--border-color)'}
              >
                + ADD MANUAL MILESTONE
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed var(--border-color)', borderRadius: '24px' }}>
              <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
                Quantify the mandate scope and amount, then use the AI agent to generate<br/>a strategic milestone sequence automatically.
              </p>
              <button onClick={addMilestone} style={{
                background: 'rgba(131, 110, 249, 0.05)', border: '1px solid rgba(131, 110, 249, 0.2)',
                borderRadius: '9999px', padding: '12px 28px', color: 'var(--accent-primary)',
                cursor: 'pointer', fontSize: 14, fontWeight: 800
              }}>
                OR ARCHITECT MANUALLY
              </button>
            </div>
          )}
        </div>

        {/* Create Button */}
        {/* Create Button */}
        <button
          onClick={handleCreate}
          className="btn-primary"
          disabled={loading || !title || !totalAmount}
          style={{ width: '100%', fontSize: 18, padding: '20px 0', fontWeight: 800, boxShadow: '0 20px 40px rgba(131, 110, 249, 0.2)' }}
        >
          {loading ? '🚀 INITIALIZING Mandate...' : '🚀 DEPLOY PROTOCOL'}
        </button>
      </main>
    </div>
  );
}
