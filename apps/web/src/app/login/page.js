'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendOTP, verifyOTP, demoOAuthLogin, googleOAuthLogin } from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleDemoLogin = async (role) => {
    setLoading(true);
    setError('');
    try {
      const res = await demoOAuthLogin(role);
      localStorage.setItem('trustlayer_token', res.token);
      localStorage.setItem('trustlayer_user', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

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
      localStorage.setItem('trustlayer_token', res.token);
      localStorage.setItem('trustlayer_user', JSON.stringify(res.user));
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
      localStorage.setItem('trustlayer_token', res.token);
      localStorage.setItem('trustlayer_user', JSON.stringify(res.user));
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
      padding: 24,
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', 
        background: 'radial-gradient(circle, rgba(131, 110, 249, 0.12) 0%, transparent 70%)', 
        zIndex: 0 
      }} />
      <div style={{ 
        position: 'absolute', bottom: '-20%', right: '-10%', width: '60%', height: '60%', 
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)', 
        zIndex: 0 
      }} />

      <div className="glass-card" style={{ 
        padding: '56px 48px', 
        width: '100%', 
        maxWidth: 460, 
        borderRadius: '32px',
        position: 'relative',
        zIndex: 1,
        boxShadow: '0 24px 80px rgba(0,0,0,0.4), 0 0 40px rgba(131, 110, 249, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div className="pixel-logo" style={{
            fontSize: 32,
            fontWeight: 900,
            background: 'var(--accent-primary)',
            padding: '8px 16px',
            borderRadius: 12,
            color: '#fff',
            display: 'inline-block',
            marginBottom: 24,
            boxShadow: '0 10px 30px rgba(131, 110, 249, 0.3)'
          }}>TL</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.04em' }}>
            TrustLayer <span style={{ color: 'var(--accent-primary)' }}>Ecosystem</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1.5, fontWeight: 500 }}>
            Secure your digital strategic mandates with<br />AI-verified escrow protocols.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '16px',
            padding: '14px 18px',
            marginBottom: 28,
            color: 'var(--accent-warning)',
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span> {error}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                Full Name
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="PROVENANCE STEWARD"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>
                Operational Identity (Phone)
              </label>
              <input
                className="input-field"
                type="tel"
                placeholder="+1 888 555 1212"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '16px', fontSize: 16 }}>
              {loading ? 'INITIALIZING...' : 'GENERATE ACCESS CODE'}
            </button>
            
            <div style={{ marginTop: 36, padding: '32px 0 0', borderTop: '1px solid var(--border-color)' }}>
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', marginBottom: 20, fontWeight: 500 }}>
                Strategic Authentication
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
                <GoogleLogin
                  onSuccess={handleRealGoogleLogin}
                  onError={() => setError('Authentication Failed')}
                  disabled={loading}
                  theme="filled_black"
                  shape="pill"
                />
              </div>

              <div style={{ padding: '24px 0 0', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <p className="mono-tech" style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 16, textTransform: 'uppercase', fontWeight: 700 }}>Bypass Protocol (Demo)</p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => handleDemoLogin('admin')}
                    style={{ flex: 1, fontSize: 12, padding: '10px 0', borderRadius: '9999px', border: '1px solid rgba(131, 110, 249, 0.2)', color: 'var(--accent-primary)' }}
                    disabled={loading}
                  >
                    SYNC ADMIN
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => handleDemoLogin('worker')}
                    style={{ flex: 1, fontSize: 12, padding: '10px 0', borderRadius: '9999px', border: '1px solid rgba(168, 85, 247, 0.2)', color: 'var(--accent-secondary)' }}
                    disabled={loading}
                  >
                    SYNC WORKER
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              OTP sent to <strong style={{ color: 'var(--text-primary)' }}>{phone}</strong>
            </p>
            {devOtp && (
              <div style={{
                background: 'rgba(0, 212, 170, 0.1)',
                border: '1px solid rgba(0, 212, 170, 0.2)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 16,
                fontSize: 13,
                color: 'var(--accent-secondary)',
              }}>
                🔑 Dev OTP: <strong>{devOtp}</strong>
              </div>
            )}
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              Enter OTP
            </label>
            <input
              className="input-field"
              type="text"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              style={{ marginBottom: 24, fontSize: 24, textAlign: 'center', letterSpacing: 8 }}
            />
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep('phone')}
              style={{ width: '100%', marginTop: 12 }}
            >Back</button>
          </form>
        )}
      </div>
    </div>
  );
}
