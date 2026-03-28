'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { sendOTP, verifyOTP, demoOAuthLogin, googleOAuthLogin } from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';

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

export default function LoginPage() {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await sendOTP(phone, name);
      setDevOtp(res.otp_code_dev_only || '');
      setStep('otp');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await verifyOTP(phone, otp);
      localStorage.setItem('crox_token', res.token);
      localStorage.setItem('crox_user', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDemoLogin = async (role) => {
    setLoading(true);
    setError('');
    try {
      const res = await demoOAuthLogin(role);
      localStorage.setItem('crox_token', res.token);
      localStorage.setItem('crox_user', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleRealGoogleLogin = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const res = await googleOAuthLogin(credentialResponse.credential);
      localStorage.setItem('crox_token', res.token);
      localStorage.setItem('crox_user', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.2, 0.12] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'fixed', top: '10%', left: '30%',
          width: '40vw', height: '40vh',
          background: 'radial-gradient(circle, rgba(131, 110, 249, 0.15) 0%, transparent 60%)',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="glass-card"
        style={{ padding: 40, width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        {/* Header */}
        <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 60, height: 60, borderRadius: 18,
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 24, color: 'white',
              margin: '0 auto 20px',
              boxShadow: '0 12px 40px rgba(131, 110, 249, 0.35)',
              position: 'relative',
            }}
          >
            <img src="/crox-logo.png" alt="CroX Logo" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
          </motion.div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Welcome to <span className="gradient-text">CroX</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Smart escrow with AI & blockchain verification
          </p>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid rgba(255, 107, 107, 0.2)',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 20,
                color: 'var(--accent-warning)',
                fontSize: 13,
              }}
            >
              ⚠️ {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 'phone' ? (
            <motion.form
              key="phone-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onSubmit={handleSendOTP}
            >
              <motion.div variants={itemVariants}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Full Name
                </label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ marginBottom: 16 }}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Phone Number
                </label>
                <input
                  className="input-field"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  style={{ marginBottom: 24 }}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(131, 110, 249, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', fontSize: 15, padding: '14px 0' }}
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </motion.button>
              </motion.div>

              {/* Divider */}
              <div style={{ marginTop: 28, padding: '20px 0 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Or continue with
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <GoogleLogin
                    onSuccess={handleRealGoogleLogin}
                    onError={() => setError('Google Login Failed')}
                    disabled={loading}
                  />
                </div>

                <div style={{ padding: '16px 0 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="font-mono" style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Demo Quick Access
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDemoLogin('admin')}
                      style={{
                        flex: 1, fontSize: 13, padding: '10px 16px',
                        background: 'rgba(131, 110, 249, 0.08)',
                      }}
                      disabled={loading}
                    >
                      🛡️ Admin
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleDemoLogin('worker')}
                      style={{
                        flex: 1, fontSize: 13, padding: '10px 16px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                        color: 'var(--accent-success)',
                      }}
                      disabled={loading}
                    >
                      ⚡ Worker
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onSubmit={handleVerifyOTP}
            >
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                OTP sent to <strong style={{ color: 'var(--text-primary)' }}>{phone}</strong>
              </p>

              <AnimatePresence>
                {devOtp && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      borderRadius: 12,
                      padding: '12px 16px',
                      marginBottom: 16,
                      fontSize: 13,
                      color: 'var(--accent-success)',
                    }}
                  >
                    🔑 Dev OTP: <strong className="font-mono">{devOtp}</strong>
                  </motion.div>
                )}
              </AnimatePresence>

              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                Enter OTP
              </label>
              <input
                className="input-field font-mono"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                style={{ marginBottom: 24, fontSize: 28, textAlign: 'center', letterSpacing: 12 }}
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: '100%', fontSize: 15, padding: '14px 0' }}
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className="btn-secondary"
                onClick={() => setStep('phone')}
                style={{ width: '100%', marginTop: 12 }}
              >
                ← Back
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
