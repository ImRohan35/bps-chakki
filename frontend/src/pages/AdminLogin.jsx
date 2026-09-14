import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLogin({ navigate }) {
  const { adminLogin, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Safely redirect if already logged in as admin
  useEffect(() => {
    if (isAdmin) {
      navigate('admin-dashboard');
    }
  }, [isAdmin, navigate]);

  if (isAdmin) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both administrator email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminLogin(email.trim(), password);
      if (res.success) {
        navigate('admin-dashboard');
      } else {
        setError(res.message || 'Authentication failed. Please verify administrator credentials.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during administrator authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
        backgroundColor: '#F8FAFC'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
          padding: '2.5rem 2rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top Security Stripe */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            background: 'linear-gradient(90deg, #173D32, #2E8B57, #22C55E)'
          }}
        />

        {/* Brand & Security Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img
              src="/logo.png"
              alt="BPS Fresh Mills Logo"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                objectFit: 'contain',
                boxShadow: '0 4px 14px rgba(23,61,50,0.25)',
                border: '2px solid #C9A44C'
              }}
            />
          </div>

          <h1
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: '#173D32',
              margin: '0.2rem 0'
            }}
          >
            🌾 BPS Fresh Mills
          </h1>
          <div style={{ fontSize: '0.85rem', color: '#C9A44C', fontWeight: 700, fontStyle: 'italic', marginBottom: '0.6rem' }}>
            “Freshly Milled. Naturally Good.”
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#047857',
              backgroundColor: '#DEF7EC',
              padding: '0.35rem 0.9rem',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <ShieldCheck size={15} /> BPS Admin Console Login
          </div>
        </div>

        {/* Security Notice & Role Identity */}
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderLeft: '4px solid #16A34A',
            padding: '0.85rem 1rem',
            borderRadius: '6px',
            fontSize: '0.82rem',
            color: '#166534',
            lineHeight: 1.5,
            marginBottom: '1.5rem'
          }}
        >
          <strong>Ye BPS Admin Portal hai:</strong> Ye portal sirf BPS Fresh Mills ke store manager/owner ke liye hai. Yahan se store orders, inventory, aur AI Business Assistant manage hota hai.
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger-rust)',
              border: '1px solid rgba(192,57,43,0.3)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label
              htmlFor="admin-email"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
            >
              Administrator Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bpsfreshmills@gmail.com"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                autoComplete="email"
              />
              <Mail
                size={16}
                style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
            >
              Administrator Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{ width: '100%', paddingLeft: '2.5rem' }}
                autoComplete="current-password"
              />
              <Lock
                size={16}
                style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '0.5rem',
              padding: '0.85rem',
              backgroundColor: '#2E8B57',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '0.02em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(46,139,87,0.25)'
            }}
            id="admin-login-submit-btn"
          >
            {loading ? (
              'Authenticating...'
            ) : (
              <>
                <KeyRound size={17} /> Secure Administrator Login
              </>
            )}
          </button>
        </form>

        {/* Security Badges Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.25rem',
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.74rem',
            color: 'var(--text-muted)'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} style={{ color: 'var(--nature-green)' }} /> 256-Bit Encrypted
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={12} style={{ color: 'var(--wheat-gold)' }} /> JWT Verified
          </span>
        </div>

        {/* Back to store link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => navigate('home')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600
            }}
          >
            <ArrowLeft size={15} /> Return to BPS Fresh Mills Store
          </button>
        </div>
      </div>
    </div>
  );
}
