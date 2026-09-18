import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import './styles/index.css';

// ── PWA: Dynamic Portal Manifest & Service Worker Registration ──
(function setupPwaPortal() {
  if (typeof window === 'undefined') return;

  // 1. Dynamic Portal Manifest according to URL path
  const path = window.location.pathname.toLowerCase();
  let manifestUrl = '/manifest-customer.json';
  let title = 'BPS Fresh Mills — Customer App';
  let themeColor = '#173D32';

  if (path.startsWith('/admin')) {
    manifestUrl = '/manifest-admin.json';
    title = 'BPS Fresh Mills — Admin Portal';
    themeColor = '#121F1A';
  } else if (path.startsWith('/delivery')) {
    manifestUrl = '/manifest-delivery.json';
    title = 'BPS Fresh Mills — Delivery Partner';
    themeColor = '#173D32';
  }

  document.title = title;
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    manifestLink.setAttribute('href', manifestUrl);
  }
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', themeColor);
  }

  // 2. Register Service Worker for PWA installability
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('PWA Service Worker registration note:', err);
      });
    });
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <App />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
