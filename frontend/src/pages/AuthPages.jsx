import React, { useState } from 'react';
import { Lock, Phone, Mail, User, MapPin, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';

export default function AuthPages({ mode = 'login', navigate, onAuthSuccess }) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Signup form state
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [houseFlat, setHouseFlat] = useState('');
  const [streetArea, setStreetArea] = useState('');
  const [pincode, setPincode] = useState('110085');

  // Forgot password state
  const [forgotMobile, setForgotMobile] = useState('');
  const [forgotResult, setForgotResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login, signup } = useAuth();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await login(identifier, password);
      if (res.success) {
        if (onAuthSuccess) onAuthSuccess(res.user);
        else {
          const role = res.user?.role;
          if (role === 'admin' || role === 'super_admin') navigate('admin');
          else if (role === 'delivery') navigate('delivery');
          else navigate('home');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email/mobile or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await signup({
        name,
        mobile,
        email,
        password: signupPassword,
        houseFlat,
        streetArea,
        pincode
      });

      if (res.success) {
        if (onAuthSuccess) onAuthSuccess(res.user);
        else navigate('home');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ mobile: forgotMobile })
      });
      if (res.success) {
        setForgotResult(res.message);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not send reset OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: '3.5rem 1.25rem 5rem', maxWidth: '480px' }}>
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem 2rem',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '0.25rem' }}>🌾</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {currentMode === 'login' && 'Welcome Back'}
            {currentMode === 'signup' && 'Create Customer Account'}
            {currentMode === 'forgot' && 'Reset Your Password'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '4px' }}>
            {currentMode === 'login' && 'Log in to order fresh chakki flour and track your deliveries'}
            {currentMode === 'signup' && 'Join BPS Fresh Mills for doorstep delivery within 15 KM'}
            {currentMode === 'forgot' && 'Enter your mobile number to receive password reset OTP'}
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.85rem',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger-rust)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {currentMode === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                Mobile Number or Email
              </label>
              <input
                type="text"
                placeholder="e.g. 9899001122 or admin@bpsfreshmills.com"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
                style={{ width: '100%' }}
                id="login-identifier"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Password</label>
                <button
                  type="button"
                  onClick={() => setCurrentMode('forgot')}
                  style={{ fontSize: '0.78rem', color: 'var(--wheat-gold)', fontWeight: 600 }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              id="login-submit-btn"
            >
              {loading ? 'Logging in...' : 'Sign In to Account'}
            </button>

            {/* Quick Demo Credentials Reminder */}
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div><strong>Admin Demo:</strong> admin@bpsfreshmills.com / Admin@123</div>
              <div><strong>Customer Demo:</strong> 9899001122 / Customer@123</div>
              <div><strong>Delivery Boy Demo:</strong> 9812345678 / Delivery@123</div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setCurrentMode('signup');
                }}
                style={{ color: 'var(--wheat-gold)', fontWeight: 700 }}
              >
                Sign Up
              </button>
            </div>
          </form>
        )}

        {/* 2. SIGNUP FORM */}
        {currentMode === 'signup' && (
          <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Pooja Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                style={{ width: '100%' }}
                id="signup-name"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                Mobile Number (10 Digits) *
              </label>
              <input
                type="tel"
                placeholder="e.g. 9899001122"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                required
                style={{ width: '100%' }}
                id="signup-mobile"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="e.g. pooja@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                Password (Min. 6 Characters) *
              </label>
              <input
                type="password"
                placeholder="Create secure password"
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%' }}
                id="signup-password"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                House / Flat / Apartment *
              </label>
              <input
                type="text"
                placeholder="e.g. Flat 302, Palm Heights"
                value={houseFlat}
                onChange={e => setHouseFlat(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Street / Area *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sector 15, Rohini"
                  value={streetArea}
                  onChange={e => setStreetArea(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  PIN Code *
                </label>
                <input
                  type="text"
                  placeholder="110085"
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              id="signup-submit-btn"
            >
              {loading ? 'Creating Account...' : 'Create My Account'}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setCurrentMode('login');
                }}
                style={{ color: 'var(--wheat-gold)', fontWeight: 700 }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {currentMode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {forgotResult && (
              <div style={{ padding: '0.85rem', backgroundColor: 'var(--nature-light)', color: 'var(--nature-green)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem' }}>
                {forgotResult}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                Registered Mobile Number
              </label>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={forgotMobile}
                onChange={e => setForgotMobile(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </button>

            <button
              type="button"
              onClick={() => setCurrentMode('login')}
              className="btn btn-outline"
              style={{ width: '100%' }}
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
