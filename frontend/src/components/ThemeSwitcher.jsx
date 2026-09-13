import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSwitcher({ variant = 'dropdown', className = '' }) {
  const { theme, themeMode, setThemeMode, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Pill segmented control (for mobile drawer, account settings, admin profile)
  if (variant === 'pills') {
    return (
      <div
        className={`theme-switcher-pills ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          width: '100%',
          maxWidth: '360px'
        }}
      >
        <button
          type="button"
          onClick={() => setThemeMode('light')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '7px',
            fontSize: '0.82rem',
            fontWeight: themeMode === 'light' ? 700 : 500,
            backgroundColor: themeMode === 'light' ? '#2E8B57' : 'transparent',
            color: themeMode === 'light' ? '#FFFFFF' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Light Mode"
        >
          <Sun size={15} />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setThemeMode('dark')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '7px',
            fontSize: '0.82rem',
            fontWeight: themeMode === 'dark' ? 700 : 500,
            backgroundColor: themeMode === 'dark' ? '#2E8B57' : 'transparent',
            color: themeMode === 'dark' ? '#FFFFFF' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Dark Mode"
        >
          <Moon size={15} />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setThemeMode('system')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '7px',
            fontSize: '0.82rem',
            fontWeight: themeMode === 'system' ? 700 : 500,
            backgroundColor: themeMode === 'system' ? '#2E8B57' : 'transparent',
            color: themeMode === 'system' ? '#FFFFFF' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="System Default"
        >
          <Monitor size={15} />
          <span>System</span>
        </button>
      </div>
    );
  }

  // Dropdown button (for desktop Navbar and Admin header)
  const CurrentIcon = themeMode === 'system' ? Monitor : resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <div
      ref={dropdownRef}
      style={{ position: 'relative', display: 'inline-block' }}
      className={className}
    >
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="action-icon-btn"
        title={`Theme: ${themeMode.charAt(0).toUpperCase() + themeMode.slice(1)} (Click to change)`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        id="theme-switcher-btn"
      >
        <CurrentIcon size={18} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '180px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
            padding: '6px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
        >
          <div style={{ padding: '6px 10px 4px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Select Theme
          </div>

          <button
            type="button"
            onClick={() => { setThemeMode('light'); setIsOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: themeMode === 'light' ? 'var(--soft-green-bg)' : 'transparent',
              color: themeMode === 'light' ? 'var(--primary-fresh-green)' : 'var(--text-primary)',
              fontWeight: themeMode === 'light' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sun size={16} />
              <span>Light Mode</span>
            </div>
            {themeMode === 'light' && <Check size={16} color="var(--primary-fresh-green)" />}
          </button>

          <button
            type="button"
            onClick={() => { setThemeMode('dark'); setIsOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: themeMode === 'dark' ? 'var(--soft-green-bg)' : 'transparent',
              color: themeMode === 'dark' ? 'var(--primary-fresh-green)' : 'var(--text-primary)',
              fontWeight: themeMode === 'dark' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Moon size={16} />
              <span>Dark Mode</span>
            </div>
            {themeMode === 'dark' && <Check size={16} color="var(--primary-fresh-green)" />}
          </button>

          <button
            type="button"
            onClick={() => { setThemeMode('system'); setIsOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: themeMode === 'system' ? 'var(--soft-green-bg)' : 'transparent',
              color: themeMode === 'system' ? 'var(--primary-fresh-green)' : 'var(--text-primary)',
              fontWeight: themeMode === 'system' ? 700 : 500,
              fontSize: '0.86rem',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Monitor size={16} />
              <span>System Default</span>
            </div>
            {themeMode === 'system' && <Check size={16} color="var(--primary-fresh-green)" />}
          </button>
        </div>
      )}
    </div>
  );
}
