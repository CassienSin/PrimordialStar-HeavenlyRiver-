'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('✅ Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1a0a12 0%, #0a0812 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Nunito', sans-serif",
      padding: '20px',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Nunito:wght@300;400;600;700&display=swap');
        .login-box {
          width: 100%; max-width: 420px;
          background: #16121f;
          border-radius: 8px; padding: 48px 40px;
          border: 1px solid rgba(201,168,76,0.15);
          box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(192,57,43,0.05);
        }
        .login-logo {
          font-family: 'Cinzel', serif;
          font-size: 28px; color: #f0c96a;
          letter-spacing: 5px; text-align: center;
          margin-bottom: 6px;
          text-shadow: 0 0 30px rgba(201,168,76,0.5);
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
          transition: all 0.2s; background: none; border-top: none;
          border-left: none; border-right: none;
          font-family: 'Nunito', sans-serif;
          margin-bottom: -1px;
        }
        .login-tab.active {
          color: #c9a84c;
          border-bottom-color: #c9a84c;
        }
        .field-label {
          display: block; font-size: 11px; font-weight: 700;
          color: rgba(240,230,211,0.4); letter-spacing: 1.5px;
          text-transform: uppercase; margin-bottom: 8px;
        }
        .field-input {
          width: 100%; padding: 13px 16px;
          background: #0f0c18;
          border: 1px solid rgba(201,168,76,0.12);
          border-radius: 5px; color: #f0e6d3;
          font-size: 15px; font-family: 'Nunito', sans-serif;
          outline: none; box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
          margin-bottom: 18px;
        }
        .field-input:focus {
          border-color: rgba(201,168,76,0.35);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.05);
        }
        .field-input::placeholder { color: rgba(240,230,211,0.15); }
        .submit-btn {
          width: 100%; padding: 14px;
          background: linear-gradient(135deg, #c0392b, #7b1a1a);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 5px; color: #f0c96a;
          font-size: 14px; font-weight: 700;
          letter-spacing: 1.5px; text-transform: uppercase;
          cursor: pointer; font-family: 'Cinzel', serif;
          transition: all 0.2s; margin-top: 4px;
        }
        .submit-btn:hover {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          box-shadow: 0 0 20px rgba(192,57,43,0.35);
        }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-msg {
          background: rgba(192,57,43,0.15);
          border: 1px solid rgba(192,57,43,0.3);
          border-radius: 4px; padding: 10px 14px;
          color: #e74c3c; font-size: 13px;
          margin-bottom: 16px; text-align: center;
        }
        .success-msg {
          background: rgba(39,174,96,0.1);
          border: 1px solid rgba(39,174,96,0.25);
          border-radius: 4px; padding: 10px 14px;
          color: #2ecc71; font-size: 13px;
          margin-bottom: 16px; text-align: center;
        }
        .divider {
          display: flex; align-items: center; gap: 12px;
          margin: 24px 0;
        }
        .divider-line { flex: 1; height: 1px; background: rgba(201,168,76,0.1); }
        .divider-text { font-size: 11px; color: rgba(240,230,211,0.2); letter-spacing: 1px; }
      `}</style>

      <div className="login-box">
        <div className="login-logo">HeavenlyRiver</div>
        <p className="login-sub">Your personal streaming world</p>

        {/* Tabs */}
        <div className="login-tabs">
          <button
            className={`login-tab ${!isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(false); setError(''); setMessage('') }}
          >Sign In</button>
          <button
            className={`login-tab ${isSignUp ? 'active' : ''}`}
            onClick={() => { setIsSignUp(true); setError(''); setMessage('') }}
          >Sign Up</button>
        </div>

        {error && <div className="error-msg">{error}</div>}
        {message && <div className="success-msg">{message}</div>}

        <label className="field-label">Email Address</label>
        <input
          className="field-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />

        <label className="field-label">Password</label>
        <input
          className="field-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />

        <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>

        {!isSignUp && (
          <>
            <div className="divider">
              <div className="divider-line" />
              <span className="divider-text">or</span>
              <div className="divider-line" />
            </div>
            <button
              className="submit-btn"
              style={{ background: 'rgba(240,230,211,0.05)', border: '1px solid rgba(201,168,76,0.15)', color: 'rgba(240,230,211,0.6)' }}
              onClick={() => { setIsSignUp(true); setError(''); setMessage('') }}
            >
              Create New Account
            </button>
          </>
        )}
      </div>
    </div>
  )
}