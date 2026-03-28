'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendOTP, verifyOTP, demoOAuthLogin, googleOAuthLogin } from '@/lib/api';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('both'); // 'both' | 'google-only'
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
      const res = await sendOTP(email, name);
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
      const res = await verifyOTP(email, otp);
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
      {/* Dynamic Gradients */}
      <div style={{ 
        position: 'absolute', top: '-10%', left: '-5%', width: '50%', height: '50%', 
        background: 'radial-gradient(circle, rgba(124, 255, 224, 0.05) 0%, transparent 70%)', 
        zIndex: 0 
      }} />
      <div style={{ 
        position: 'absolute', bottom: '-10%', right: '-5%', width: '50%', height: '50%', 
        background: 'radial-gradient(circle, rgba(138, 161, 255, 0.05) 0%, transparent 70%)', 
        zIndex: 0 
      }} />

      <div className="glass-card" style={{ 
        padding: '64px 48px', 
        width: '100%', 
        maxWidth: 480, 
        borderRadius: '32px',
        position: 'relative',
        zIndex: 1,
        border: '1px solid var(--nightline)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 48, height: 48, background: 'var(--neon-mint)', borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            fontWeight: 800, fontSize: 13, background: 'rgba(124, 255, 224, 0.1)', color: 'var(--neon-mint)',
            border: '1px solid rgba(124, 255, 224, 0.2)', overflow: 'hidden'
          }}>
            <img src="/crox-logo.jpg" alt="CroX" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => e.target.style.display='none'} />
          </div>
          
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.04em', color: '#fff' }}>
            Cro<span style={{ color: 'var(--neon-mint)' }}>X</span> Gateway
          </h1>
          <p style={{ color: 'var(--ash-mist)', fontSize: 15, lineHeight: 1.6, fontWeight: 500 }}>
            Authorize your digital mandates within the<br />CroX ecosystem.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 110, 110, 0.05)',
            border: '1px solid rgba(255, 110, 110, 0.2)',
            borderRadius: '16px',
            padding: '14px 18px',
            marginBottom: 32,
            color: 'var(--accent-warning)',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          {authMode === 'google-only' ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <p style={{ color: 'var(--ash-mist)', marginBottom: 28, fontSize: 13, fontWeight: 600 }}>
                Secure gateway restricted to Strategic Identity
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleRealGoogleLogin}
                  onError={() => setError('AUTHENTICATION FAILED')}
                  disabled={loading}
                  theme="filled_black"
                  shape="pill"
                />
              </div>
            </div>
          ) : (
            <>
              {step === 'email' ? (
                <form onSubmit={handleSendOTP}>
                  <div style={{ marginBottom: 24 }}>
                    <label className="tracked-caps" style={{ display: 'block', marginBottom: 10, color: 'var(--text-muted)' }}>
                      OPERATIONAL IDENTITY
                    </label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="ENTER FULL NAME"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{ width: '100%', fontSize: 14 }}
                    />
                  </div>
                  <div style={{ marginBottom: 36 }}>
                    <label className="tracked-caps" style={{ display: 'block', marginBottom: 10, color: 'var(--text-muted)' }}>
                      STRATEGIC IDENTITY (EMAIL)
                    </label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="STRATEGIC@CROX.DEV"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ width: '100%', fontSize: 14 }}
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '18px' }}>
                    {loading ? 'INITIALIZING...' : 'GENERATE ACCESS CODE'}
                  </button>
                  
                  <div style={{ marginTop: 40, padding: '32px 0 0', borderTop: '1px solid var(--nightline)' }}>
                    <p className="tracked-caps" style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 24 }}>
                      OR USE SSO GATEWAY
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <GoogleLogin
                        onSuccess={handleRealGoogleLogin}
                        onError={() => setError('AUTHENTICATION FAILED')}
                        disabled={loading}
                        theme="filled_black"
                        shape="pill"
                      />
                    </div>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP}>
                  <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <p style={{ fontSize: 14, color: 'var(--ash-mist)', marginBottom: 8, fontWeight: 600 }}>
                      Validating mandate for <span style={{ color: 'var(--neon-mint)' }}>{email}</span>
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Enter the 6-digit access protocol sent to your email.</p>
                  </div>

                  <div style={{ marginBottom: 36 }}>
                    <label className="tracked-caps" style={{ display: 'block', marginBottom: 16, color: 'var(--text-muted)', textAlign: 'center' }}>
                      Verification Code
                    </label>
                    <input
                      className="input-field mono-tech"
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      maxLength={6}
                      style={{ 
                        width: '100%', fontSize: 32, textAlign: 'center', 
                        letterSpacing: 12, padding: '24px 0', 
                        color: 'var(--neon-mint)',
                        border: '1px solid var(--nightline)'
                      }}
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '18px' }}>
                    {loading ? 'VALIDATING...' : 'AUTHORIZE ACCESS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    style={{ 
                      width: '100%', marginTop: 24, fontSize: 11, fontWeight: 800, 
                      background: 'transparent', border: 'none', color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' 
                    }}
                  >
                    ← RE-ENTER IDENTITY
                  </button>
                </form>
              )}
            </>
          )}

          {/* Dev Bypass */}
          <div style={{ marginTop: 32, padding: '32px 0 0', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
            <p className="mono-tech" style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-muted)', marginBottom: 20, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.15em' }}>DEVELOPMENT BYPASS</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => handleDemoLogin('admin')}
                style={{ flex: 1, fontSize: 10, padding: '12px 0', borderColor: 'rgba(124, 255, 224, 0.1)', color: 'rgba(124, 255, 224, 0.6)' }}
                disabled={loading}
              >
                SYNC ADMIN
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => handleDemoLogin('worker')}
                style={{ flex: 1, fontSize: 10, padding: '12px 0', borderColor: 'rgba(138, 161, 255, 0.1)', color: 'rgba(138, 161, 255, 0.6)' }}
                disabled={loading}
              >
                SYNC WORKER
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

