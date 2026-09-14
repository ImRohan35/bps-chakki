import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';

export default function InstallPwaButton({ portalType = 'customer', style = {} }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const getPortalInfo = () => {
    switch (portalType) {
      case 'admin':
        return {
          title: 'Install Admin Portal',
          badge: 'Admin App',
          bg: '#173D32',
          border: '#C9A44C',
          textColor: '#FFFFFF',
          appName: 'BPS Fresh Mills — Admin Portal'
        };
      case 'delivery':
        return {
          title: 'Install Delivery App',
          badge: 'Rider App',
          bg: '#2E8B57',
          border: '#2E8B57',
          textColor: '#FFFFFF',
          appName: 'BPS Fresh Mills — Delivery Partner'
        };
      default:
        return {
          title: 'Install Customer App',
          badge: 'Customer App',
          bg: '#173D32',
          border: '#C9A44C',
          textColor: '#FFFFFF',
          appName: 'BPS Fresh Mills — Customer App'
        };
    }
  };

  const info = getPortalInfo();

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuide(true);
    }
  };

  if (installed) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0.4rem 0.85rem',
        borderRadius: '8px',
        background: 'rgba(46,139,87,0.15)',
        color: '#2E8B57',
        fontSize: '0.8rem',
        fontWeight: 700,
        ...style
      }}>
        <Check size={14} /> {info.badge} Installed
      </span>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleInstallClick}
        title={`Install ${info.appName} on your device`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '0.45rem 0.95rem',
          borderRadius: '8px',
          background: info.bg,
          border: `1.5px solid ${info.border}`,
          color: info.textColor,
          fontSize: '0.82rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
          ...style
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >
        <Smartphone size={16} style={{ color: '#C9A44C' }} />
        <span>{info.title}</span>
      </button>

      {/* Guide Modal / Tooltip for browsers where beforeinstallprompt isn't active (iOS Safari / Desktop) */}
      {showGuide && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            padding: '1.75rem',
            maxWidth: '420px',
            width: '100%',
            color: '#111827',
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <img src="/logo.png" alt="BPS Logo" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'contain' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#173D32' }}>
                  {info.appName}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                  Add to Mobile Home Screen or Desktop App
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              <p style={{ margin: '0 0 0.5rem' }}><strong>Android / Chrome / Edge:</strong></p>
              <div style={{ padding: '0.5rem 0.75rem', background: '#F8FAFC', borderRadius: '6px', marginBottom: '0.75rem' }}>
                Browser menu (⋮) click karein aur <strong>"Add to Home screen"</strong> ya <strong>"Install App"</strong> select karein.
              </div>

              <p style={{ margin: '0 0 0.5rem' }}><strong>iPhone / iOS Safari:</strong></p>
              <div style={{ padding: '0.5rem 0.75rem', background: '#F8FAFC', borderRadius: '6px' }}>
                Safari Share icon (⎋) tap karein aur scroll karke <strong>"Add to Home Screen"</strong> [+] chunein.
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              style={{
                width: '100%',
                padding: '0.65rem',
                borderRadius: '8px',
                background: '#173D32',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Samajh Gaya (Close)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
