'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';

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

const floatVariants = {
  animate: {
    y: [0, -12, 0],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
  }
};

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('crox_token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background orbs */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'fixed', top: '-20%', left: '-10%',
          width: '60vw', height: '60vh',
          background: 'radial-gradient(circle, rgba(131, 110, 249, 0.18) 0%, transparent 60%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'fixed', bottom: '-20%', right: '-10%',
          width: '50vw', height: '50vh',
          background: 'radial-gradient(circle, rgba(45, 156, 219, 0.12) 0%, transparent 60%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <motion.div variants={itemVariants} style={{ display: 'flex', justifyContent: 'center' }}>
          <motion.div
            variants={floatVariants}
            animate="animate"
            style={{
              width: 80, height: 80, borderRadius: 24,
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 32, color: 'white', marginBottom: 28,
              boxShadow: '0 16px 60px rgba(131, 110, 249, 0.4), 0 0 80px rgba(131, 110, 249, 0.15)',
              position: 'relative',
            }}
          >
            <img src="/crox-logo.jpg" alt="CroX Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
            {/* Glow ring */}
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', inset: -8,
                borderRadius: 28,
                border: '2px solid rgba(131, 110, 249, 0.4)',
                pointerEvents: 'none',
              }}
            />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1 variants={itemVariants} style={{ fontSize: 56, fontWeight: 800, marginBottom: 16, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          <span className="gradient-text">CroX</span>
        </motion.h1>

        <motion.p variants={itemVariants} style={{ fontSize: 22, color: 'var(--text-secondary)', maxWidth: 520, marginBottom: 12, margin: '0 auto 12px' }}>
          Smart Escrow Platform powered by AI & Blockchain
        </motion.p>

        <motion.p variants={itemVariants} style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 500, marginBottom: 48, margin: '0 auto 48px', lineHeight: 1.7 }}>
          Convert informal agreements into enforceable financial workflows with
          multi-agent AI analysis and Monad blockchain verification.
        </motion.p>

        {/* CTA buttons */}
        <motion.div variants={itemVariants} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 72 }}>
          <motion.button
            whileHover={{ scale: 1.06, boxShadow: '0 12px 35px rgba(131, 110, 249, 0.5)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/login')}
            className="btn-primary"
            style={{ fontSize: 17, padding: '16px 40px', letterSpacing: '0.5px' }}
          >
            Get Started
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.06, borderColor: 'var(--accent-secondary)' }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/demo')}
            className="btn-secondary"
            style={{ fontSize: 17, padding: '16px 40px', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)' }}
          >
            View AI Demo
          </motion.button>
        </motion.div>

        {/* Feature cards */}
        <motion.div variants={itemVariants} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
          maxWidth: 920,
          width: '100%',
        }}>
          {[
            { icon: '🤖', title: 'Multi-Agent AI', desc: 'Parser, Risk & Compliance agents analyze your contracts in real-time', accent: 'var(--accent-primary)' },
            { icon: '⛓️', title: 'Monad Blockchain', desc: 'Immutable contract verification with on-chain hash registration', accent: 'var(--accent-secondary)' },
            { icon: '🔐', title: 'Escrow Ledger', desc: 'Atomic, auditable fund management with milestone phasing', accent: 'var(--accent-success)' },
            { icon: '⚖️', title: 'Dispute Resolution', desc: 'Fair resolution with evidence tracking and admin arbitration', accent: 'var(--accent-amber)' },
          ].map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8, boxShadow: `0 12px 40px ${f.accent}20` }}
              className="glass-card"
              style={{ padding: 28, textAlign: 'left', cursor: 'default', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{
                position: 'absolute', top: 0, right: 0, width: 80, height: 80,
                background: `radial-gradient(circle, ${f.accent}15 0%, transparent 70%)`,
                transform: 'translate(30%, -30%)',
              }} />
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.01em' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer tagline */}
        <motion.p
          variants={itemVariants}
          className="font-mono"
          style={{
            marginTop: 64, fontSize: 12, color: 'var(--text-muted)',
            letterSpacing: '2px', textTransform: 'uppercase',
          }}
        >
          Secured by Monad Testnet • Powered by CroX Multi-Agent AI
        </motion.p>
      </motion.div>
    </div>
  );
}
