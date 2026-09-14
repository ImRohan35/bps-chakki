import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('BPS App Caught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F8FAFC',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
            border: '1px solid #E2E8F0'
          }}>
            <img
              src="/logo.png"
              alt="BPS Fresh Mills"
              style={{ width: 64, height: 64, borderRadius: '50%', marginBottom: '1rem', border: '2px solid #C9A44C' }}
            />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#173D32', marginBottom: '0.5rem' }}>
              BPS Fresh Mills
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              A temporary display error occurred. Please click below to reload the fresh session.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                style={{
                  backgroundColor: '#2E8B57',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                🔄 Reload Page
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('bps_token');
                  window.location.href = '/';
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: '#173D32',
                  border: '1px solid #CBD5E1',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
