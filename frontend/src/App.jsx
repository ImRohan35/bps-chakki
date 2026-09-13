import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import SearchModal from './components/SearchModal';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderTracking from './pages/OrderTracking';
import Account from './pages/Account';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import AuthPages from './pages/AuthPages';
import AdminPanel from './pages/AdminPanel';
import AdminLogin from './pages/AdminLogin';
import DeliveryPortal from './pages/DeliveryPortal';
import PolicyPages from './pages/PolicyPages';
import { useAuth } from './context/AuthContext';

export default function App() {
  const getInitialRoute = () => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase().replace('#', '');
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('id') || searchParams.get('orderId') || path.startsWith('/tracking') || path === 'tracking') {
      return 'tracking';
    }
    if (path === '/admin/login' || hash === 'admin/login' || hash === '/admin/login') return 'admin-login';
    if (path === '/admin/dashboard' || path === '/admin' || hash === 'admin/dashboard' || hash === 'admin') return 'admin-dashboard';
    if (hash) return hash;
    if (path !== '/' && path !== '') return path.replace(/^\//, '');
    return 'home';
  };

  const getInitialTrackingId = () => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('id') || searchParams.get('orderId') || null;
  };

  const [route, setRoute] = useState(getInitialRoute);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [trackingOrderId, setTrackingOrderId] = useState(getInitialTrackingId);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [notifyModalProduct, setNotifyModalProduct] = useState(null);
  const [notifyEmailOrPhone, setNotifyEmailOrPhone] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const { isAuthenticated, isAdmin, isDelivery } = useAuth();

  // URL synchronization
  const navigate = (newRoute) => {
    const clean = (newRoute || '').toString().trim().replace(/^\//, '');
    let resolved = clean;
    if (clean === 'admin/login' || clean === 'admin-login') {
      resolved = 'admin-login';
      window.history.pushState(null, '', '/admin/login');
    } else if (clean === 'admin' || clean === 'admin/dashboard' || clean === 'admin-dashboard') {
      resolved = 'admin-dashboard';
      window.history.pushState(null, '', '/admin/dashboard');
    } else if (clean === 'home' || clean === '') {
      resolved = 'home';
      window.history.pushState(null, '', '/');
    } else if (clean.startsWith('tracking')) {
      resolved = 'tracking';
      window.history.pushState(null, '', `/${clean}`);
    } else {
      window.history.pushState(null, '', `/${clean}`);
    }
    setRoute(resolved);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getInitialRoute());
      const searchParams = new URLSearchParams(window.location.search);
      const idFromUrl = searchParams.get('id') || searchParams.get('orderId');
      if (idFromUrl) {
        setTrackingOrderId(idFromUrl);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectProduct = (product) => {
    setSelectedProductId(product._id || product.slug);
    navigate('product');
  };

  const handleOrderPlaced = (order) => {
    setCurrentOrder(order);
    navigate('order-confirmation');
  };

  const handleTrackOrder = (order) => {
    setTrackingOrderId(order._id || order.orderId);
    navigate('tracking');
  };

  const handleNotifyMe = (product) => {
    setNotifyModalProduct(product);
    setNotifySubmitted(false);
    setNotifyEmailOrPhone('');
  };

  const handleNotifySubmit = (e) => {
    e.preventDefault();
    if (!notifyEmailOrPhone.trim()) return;
    setNotifySubmitted(true);
    setTimeout(() => {
      setNotifyModalProduct(null);
      setNotifySubmitted(false);
    }, 2500);
  };

  const isStandalone = ['admin-dashboard', 'admin', 'admin-login', 'delivery'].includes(route);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {!isStandalone && (
        <Navbar
          currentRoute={route}
          navigate={navigate}
          onOpenSearch={() => setIsSearchOpen(true)}
        />
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {route === 'home' && (
          <Home
            navigate={navigate}
            onSelectProduct={handleSelectProduct}
            onNotifyMe={handleNotifyMe}
          />
        )}

        {route === 'shop' && (
          <Shop
            navigate={navigate}
            onSelectProduct={handleSelectProduct}
            onNotifyMe={handleNotifyMe}
          />
        )}

        {route === 'product' && (
          <ProductDetails
            productId={selectedProductId}
            navigate={navigate}
            onNotifyMe={handleNotifyMe}
          />
        )}

        {route === 'cart' && <Cart navigate={navigate} />}

        {route === 'checkout' && (
          <Checkout
            navigate={navigate}
            onOrderPlaced={handleOrderPlaced}
          />
        )}

        {route === 'order-confirmation' && (
          <OrderConfirmation
            order={currentOrder}
            navigate={navigate}
            onTrackOrder={handleTrackOrder}
          />
        )}

        {route === 'orders' && (
          <Account
            navigate={navigate}
            onTrackOrder={handleTrackOrder}
            activeTab="orders"
          />
        )}

        {route === 'tracking' && (
          <OrderTracking
            orderId={trackingOrderId}
            navigate={navigate}
            onReportIssue={(order) => {
              navigate('orders');
            }}
          />
        )}

        {route === 'wishlist' && (
          <Account
            navigate={navigate}
            onTrackOrder={handleTrackOrder}
            activeTab="wishlist"
          />
        )}

        {route === 'account' && (
          <Account
            navigate={navigate}
            onTrackOrder={handleTrackOrder}
            activeTab="profile"
          />
        )}

        {route === 'about' && <AboutUs navigate={navigate} />}

        {route === 'contact' && <ContactUs />}

        {route === 'login' && (
          <AuthPages
            mode="login"
            navigate={navigate}
            onAuthSuccess={(user) => {
              if (user.role === 'delivery') navigate('delivery');
              else navigate('home');
            }}
          />
        )}

        {route === 'signup' && (
          <AuthPages
            mode="signup"
            navigate={navigate}
            onAuthSuccess={() => navigate('home')}
          />
        )}

        {route === 'admin-login' && <AdminLogin navigate={navigate} />}

        {(route === 'admin-dashboard' || route === 'admin') && <AdminPanel navigate={navigate} />}

        {route === 'delivery' && <DeliveryPortal navigate={navigate} />}

        {['return-policy', 'delivery-info', 'terms', 'privacy'].includes(route) && (
          <PolicyPages policyType={route} navigate={navigate} />
        )}
      </main>

      {!isStandalone && <Footer navigate={navigate} />}

      {/* Global Product Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={handleSelectProduct}
        onNavigateShop={() => navigate('shop')}
      />

      {/* "Notify Me When Available" Modal for Out of Stock items */}
      {notifyModalProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(23,17,15,0.75)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              maxWidth: '450px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.4rem' }}>
              Notify Me When Available
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              We are currently preparing fresh grain for <strong>{notifyModalProduct.name}</strong>. Enter your mobile or email and we will alert you the moment the chakki batch is ready!
            </p>

            {notifySubmitted ? (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--nature-light)',
                  color: 'var(--nature-green)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textAlign: 'center'
                }}
              >
                ✔ Thank you! We will notify you as soon as this fresh batch is milled.
              </div>
            ) : (
              <form onSubmit={handleNotifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Enter mobile number or email"
                  value={notifyEmailOrPhone}
                  onChange={e => setNotifyEmailOrPhone(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Set Notification
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifyModalProduct(null)}
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
