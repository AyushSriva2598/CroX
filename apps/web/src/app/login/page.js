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
      padding: 20,
      background: 'radial-gradient(ellipse at top, rgba(108, 99, 255, 0.08), transparent 60%)',
    }}>
      <div className="glass-card" style={{ padding: 40, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 22,
            color: 'white',
            margin: '0 auto 16px',
          }}>TL</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Welcome to <span className="gradient-text">TrustLayer</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Smart escrow with AI & blockchain verification
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.2)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 20,
            color: 'var(--accent-warning)',
            fontSize: 13,
          }}>{error}</div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOTP}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
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
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
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
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            
            <div style={{ marginTop: 24, padding: '20px 0 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Or sign in with Google Account
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <GoogleLogin
                  onSuccess={handleRealGoogleLogin}
                  onError={() => setError('Google Login Failed')}
                  disabled={loading}
                />
              </div>

              <div style={{ padding: '20px 0 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Demo Quick Logins</p>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => handleDemoLogin('admin')}
                  style={{ width: '100%', marginBottom: 10, background: 'rgba(108, 99, 255, 0.1)', fontSize: 13, padding: '8px 16px' }}
                  disabled={loading}
                >
                  Quick Sign in (Admin)
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => handleDemoLogin('worker')}
                  style={{ width: '100%', background: 'rgba(0, 212, 170, 0.1)', fontSize: 13, padding: '8px 16px' }}
                  disabled={loading}
                >
                  Quick Sign in (Worker)
                </button>
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
