'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    const cleanEmail = email.trim()
    if (!cleanEmail || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    setError('')
    setMessage('')
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email: cleanEmail, password })
      if (error) setError(error.message)
      else setMessage('✅ Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (error) setError(error.message)
      else router.push('/')
    }
    setLoading(false)
  }

  const switchMode = (signUp: boolean) => {
    setIsSignUp(signUp)
    setError('')
    setMessage('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1a0a12 0%, #0a0812 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Nunito', sans-serif",
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        /* ── Ambient background ─────────────────────────────── */
        @keyframes login-river-drift {
          0%   { transform: translateX(-12%) skewX(-14deg); opacity: 0.04; }
          50%  { opacity: 0.1; }
          100% { transform: translateX(12%) skewX(-14deg); opacity: 0.04; }
        }
        .login-river {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(100deg, transparent 32%, rgba(240,201,106,0.07) 48%, rgba(201,168,76,0.04) 52%, transparent 68%);
          animation: login-river-drift 16s ease-in-out infinite;
        }

        /* ── Entrance ───────────────────────────────────────── */
        @keyframes login-rise {
          from { opacity: 0; transform: translateY(24px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes login-item {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes login-glow {
          0%, 100% { text-shadow: 0 0 30px rgba(201,168,76,0.5); }
          50%      { text-shadow: 0 0 44px rgba(240,201,106,0.75); }
        }
        @keyframes login-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes login-spin { to { transform: rotate(360deg); } }

        .login-box {
          width: 100%; max-width: 420px;
          background: #16121f;
          border-radius: 8px; padding: 48px 40px;
          border: 1px solid rgba(201,168,76,0.15);
          box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(192,57,43,0.05), 0 0 30px rgba(201,168,76,0.04);
          position: relative;
          animation: login-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .login-box > * { animation: login-item 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .login-box > *:nth-child(1) { animation-delay: 0.1s; }
        .login-box > *:nth-child(2) { animation-delay: 0.18s; }
        .login-box > *:nth-child(3) { animation-delay: 0.26s; }
        .login-box > *:nth-child(n+4) { animation-delay: 0.34s; }

        .login-logo {
          font-family: 'Cinzel', serif;
          font-size: 28px; color: #f0c96a;
          letter-spacing: 5px; text-align: center;
          margin-bottom: 6px;
          animation: login-item 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both,
                     login-glow 5s ease-in-out 0.7s infinite;
        }
        .login-sub {
          color: rgba(240,230,211,0.3); text-align: center;
          font-size: 12px; margin-bottom: 36px;
          letter-spacing: 2px; text-transform: uppercase;
          font-family: 'Cinzel', serif;
        }
        .login-tabs {
          display: flex; margin-bottom: 28px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
        }
        .login-tab {
          flex: 1; padding: 10px; text-align: center;
          font-size: 13px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; cursor: pointer;
          color: rgba(240,230,211,0.3);
          border-bottom: 2px solid transparent;
          transition: all 0.25s; background: none;
          border-top: none; border-left: none; border-right: none;
          font-family: 'Nunito', sans-serif;
          margin-bottom: -1px;
        }
        .login-tab:hover { color: rgba(240,230,211,0.6); }
        .login-tab.active { color: #c9a84c; border-bottom-color: #c9a84c; }

        .login-input {
          width: 100%; padding: 13px 16px;
          background: #0f0c18;
          border: 1px solid rgba(201,168,76,0.12);
          border-radius: 5px; color: #f0e6d3;
          font-size: 15px; font-family: 'Nunito', sans-serif;
          outline: none; box-sizing: border-box;
          transition: border-color 0.25s, box-shadow 0.25s;
          margin-bottom: 18px; display: block;
        }
        .login-input:focus {
          border-color: rgba(201,168,76,0.4);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.06), 0 0 16px rgba(201,168,76,0.08);
        }
        .login-input::placeholder { color: rgba(240,230,211,0.15); }
        .login-label {
          display: block; font-size: 11px; font-weight: 700;
          color: rgba(240,230,211,0.4); letter-spacing: 1.5px;
          text-transform: uppercase; margin-bottom: 8px;
        }

        .login-pass-wrap { position: relative; }
        .login-pass-wrap .login-input { padding-right: 46px; }
        .login-pass-eye {
          position: absolute; right: 6px; top: 6px;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer;
          color: rgba(240,230,211,0.3); font-size: 15px;
          border-radius: 4px;
          transition: color 0.2s, background 0.2s;
        }
        .login-pass-eye:hover { color: #c9a84c; background: rgba(201,168,76,0.08); }

        .submit-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 5px; color: #f0c96a;
          font-size: 14px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
          cursor: pointer; font-family: 'Cinzel', serif;
          transition: all 0.25s; margin-top: 4px;
          display: inline-flex; align-items: center; justify-content: center; gap: 10px;
        }
        .submit-btn:hover {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          box-shadow: 0 0 24px rgba(192,57,43,0.4);
          transform: translateY(-1px);
        }
        .submit-btn:active { transform: translateY(0) scale(0.98); transition-duration: 0.08s; }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .submit-spinner {
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid rgba(240,201,106,0.25);
          border-top-color: #f0c96a;
          animation: login-spin 0.8s linear infinite;
        }

        .error-msg {
          background: rgba(192,57,43,0.15);
          border: 1px solid rgba(192,57,43,0.3);
          border-radius: 4px; padding: 10px 14px;
          color: #e74c3c; font-size: 13px;
          margin-bottom: 16px; text-align: center;
          animation: login-shake 0.4s ease;
        }
        .success-msg {
          background: rgba(39,174,96,0.1);
          border: 1px solid rgba(39,174,96,0.25);
          border-radius: 4px; padding: 10px 14px;
          color: #2ecc71; font-size: 13px;
          margin-bottom: 16px; text-align: center;
          animation: login-item 0.4s ease both;
        }
        .login-divider {
          display: flex; align-items: center; gap: 12px; margin: 24px 0;
        }
        .login-divider-line { flex: 1; height: 1px; background: rgba(201,168,76,0.1); }
        .login-divider-text { font-size: 11px; color: rgba(240,230,211,0.2); letter-spacing: 1px; }

        @media (max-width: 480px) {
          .login-box { padding: 32px 20px; }
          .login-logo { font-size: 22px; letter-spacing: 3px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .login-box, .login-box > *, .login-logo, .login-river,
          .error-msg, .success-msg { animation: none !important; }
          .login-input, .login-tab, .submit-btn, .login-pass-eye { transition: none; }
          .submit-btn:hover { transform: none; }
          .submit-spinner { animation: login-spin 1.6s linear infinite; }
        }
      `}</style>

      <div className="login-river" aria-hidden="true" />

      <div className="login-box">
        <div className="login-logo">HeavenlyRiver</div>
        <p className="login-sub">Your personal streaming world</p>

        <div className="login-tabs">
          <button
            className={`login-tab ${!isSignUp ? 'active' : ''}`}
            onClick={() => switchMode(false)}
          >Sign In</button>
          <button
            className={`login-tab ${isSignUp ? 'active' : ''}`}
            onClick={() => switchMode(true)}
          >Sign Up</button>
        </div>

        {error && <div className="error-msg">{error}</div>}
        {message && <div className="success-msg">{message}</div>}

        <label className="login-label">Email Address</label>
        <input
          className="login-input"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />

        <label className="login-label">Password</label>
        <div className="login-pass-wrap">
          <input
            className="login-input"
            type={showPassword ? 'text' : 'password'}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <button
            type="button"
            className="login-pass-eye"
            onClick={() => setShowPassword(s => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading && <span className="submit-spinner" aria-hidden="true" />}
          {loading ? 'Please wait' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>

        {!isSignUp && (
          <>
            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">or</span>
              <div className="login-divider-line" />
            </div>
            <button
              className="submit-btn"
              style={{ background: 'rgba(240,230,211,0.05)', border: '1px solid rgba(201,168,76,0.15)', color: 'rgba(240,230,211,0.6)' }}
              onClick={() => switchMode(true)}
            >
              Create New Account
            </button>
          </>
        )}
      </div>
    </div>
  )
}