import React, { useState } from 'react';
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
  Sun,
  Moon,
  Truck,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import ThemeSwitcher from './ThemeSwitcher';

export default function Navbar({ currentRoute, navigate, onOpenSearch }) {
  const { user, isAuthenticated, isAdmin, isDelivery, logout } = useAuth();
  const { totalItemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleNav = (route) => {
    navigate(route);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <header className="header-wrapper">

      {/* Main Flourist-Style Navigation Bar */}
      <div className="container">
        {/* Top Tier: Left delivery tag / mobile menu, Center Brand, Right Action Icons */}
        <div className="flourist-nav-top">
          {/* Left: mobile menu toggle */}
          <div className="flourist-nav-left">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="action-icon-btn mobile-toggle-btn"
              aria-label="Toggle navigation menu"
              id="mobile-menu-toggle-btn"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Centered Brand Title & Logo Emblem */}
          <div
            onClick={() => handleNav('home')}
            className="flourist-brand"
            style={{ cursor: 'pointer' }}
            id="brand-home-link"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.65rem' }}>
              <img
                src="/logo.png"
                alt="BPS Fresh Mills Logo"
                className="flourist-logo-img"
              />
              <span className="flourist-brand-text">BPS Fresh Mills</span>
            </div>
            <span className="flourist-brand-sub">Freshly Milled. Naturally Good.</span>
          </div>

          {/* Right Action Icons (Flourist minimalist icons: User, Search, Wishlist, Cart) */}
          <div className="flourist-nav-right">
            {/* Account / User Menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    handleNav('login');
                  } else {
                    setUserDropdownOpen(!userDropdownOpen);
                  }
                }}
                className="action-icon-btn"
                title={isAuthenticated ? user.name : 'Account'}
                id="account-btn"
              >
                <User size={19} />
              </button>

              {/* User Dropdown */}
              {isAuthenticated && userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    width: '210px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '0.5rem',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                >
                  <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{user.mobile}</div>
                    <span className={`badge ${user.role === 'admin' ? 'badge-red' : user.role === 'delivery' ? 'badge-amber' : 'badge-green'}`} style={{ marginTop: '4px' }}>
                      {user.role}
                    </span>
                  </div>

                  <button
                    onClick={() => handleNav('account')}
                    className="btn btn-sm btn-outline"
                    style={{ justifyContent: 'flex-start', border: 'none', width: '100%', padding: '0.5rem 0.75rem' }}
                  >
                    <User size={15} /> My Account
                  </button>

                  <button
                    onClick={() => handleNav('orders')}
                    className="btn btn-sm btn-outline"
                    style={{ justifyContent: 'flex-start', border: 'none', width: '100%', padding: '0.5rem 0.75rem' }}
                  >
                    <ShoppingBag size={15} /> My Orders
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleNav('admin')}
                      className="btn btn-sm"
                      style={{
                        justifyContent: 'flex-start',
                        backgroundColor: 'var(--earth-brown)',
                        color: '#FAF6F0',
                        width: '100%',
                        padding: '0.5rem 0.75rem'
                      }}
                    >
                      <ShieldCheck size={15} /> Admin Panel
                    </button>
                  )}

                  {(isDelivery || isAdmin) && (
                    <button
                      onClick={() => handleNav('delivery')}
                      className="btn btn-sm"
                      style={{
                        justifyContent: 'flex-start',
                        backgroundColor: 'var(--nature-green)',
                        color: '#FFFFFF',
                        width: '100%',
                        padding: '0.5rem 0.75rem'
                      }}
                    >
                      <Truck size={15} /> Delivery Portal
                    </button>
                  )}

                  <button
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                      handleNav('home');
                    }}
                    className="btn btn-sm"
                    style={{
                      justifyContent: 'flex-start',
                      color: 'var(--danger-rust)',
                      backgroundColor: 'var(--danger-light)',
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      marginTop: '0.35rem'
                    }}
                  >
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>

            {/* Theme Toggle System (Light / Dark / System Default) */}
            <ThemeSwitcher variant="dropdown" />

            {/* Search Trigger */}
            <button
              onClick={onOpenSearch}
              className="action-icon-btn"
              title="Search Flours & Grains"
              id="search-btn"
            >
              <Search size={19} />
            </button>

            {/* Wishlist */}
            <button
              onClick={() => handleNav('wishlist')}
              className="action-icon-btn"
              title="Wishlist"
              id="wishlist-btn"
            >
              <Heart size={19} />
              {wishlistCount > 0 && <span className="badge-count">{wishlistCount}</span>}
            </button>

            {/* Cart Bag */}
            <button
              onClick={() => handleNav('cart')}
              className="action-icon-btn cart-icon-highlight"
              title="Cart"
              id="cart-btn"
            >
              <ShoppingBag size={19} />
              {totalItemCount > 0 && <span className="badge-count">{totalItemCount}</span>}
            </button>
          </div>
        </div>

        {/* Bottom Tier: Centered Flourist Menu Links */}
        <div className="flourist-nav-bottom desktop-only">
          <ul className="flourist-nav-links">
            <li>
              <button
                onClick={() => handleNav('shop')}
                className={`flourist-link ${currentRoute === 'shop' ? 'active' : ''}`}
              >
                Shop
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNav('home')}
                className={`flourist-link ${currentRoute === 'home' ? 'active' : ''}`}
              >
                Our Chakki
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNav('about')}
                className={`flourist-link ${currentRoute === 'about' ? 'active' : ''}`}
              >
                About
              </button>
            </li>
            <li>
              <button
                onClick={() => handleNav('contact')}
                className={`flourist-link ${currentRoute === 'contact' ? 'active' : ''}`}
              >
                Contact
              </button>
            </li>
          </ul>
        </div>
      </div>



      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="flourist-mobile-drawer"
          style={{
            position: 'fixed',
            inset: '0',
            top: '68px',
            backgroundColor: 'var(--bg-surface)',
            zIndex: 1000,
            padding: '1.5rem',
            paddingBottom: '120px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            overflowY: 'auto'
          }}
        >
          <button
            onClick={() => handleNav('home')}
            className={`btn btn-outline ${currentRoute === 'home' ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start' }}
          >
            Home
          </button>
          <button
            onClick={() => handleNav('shop')}
            className={`btn btn-outline ${currentRoute === 'shop' ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start' }}
          >
            Shop All Flours
          </button>
          <button
            onClick={() => handleNav('about')}
            className={`btn btn-outline ${currentRoute === 'about' ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start' }}
          >
            About BPS Fresh Mills
          </button>
          <button
            onClick={() => handleNav('contact')}
            className={`btn btn-outline ${currentRoute === 'contact' ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start' }}
          >
            Contact & Directions
          </button>

          <div style={{ padding: '0.25rem 0' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Theme Mode
            </div>
            <ThemeSwitcher variant="pills" />
          </div>

          <hr style={{ borderColor: 'var(--border-subtle)', margin: '0.5rem 0' }} />

          {isAuthenticated ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{user.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.mobile}</div>
                </div>
                <span className="badge badge-green">{user.role}</span>
              </div>
              <button
                onClick={() => handleNav('account')}
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start' }}
              >
                <User size={16} /> My Account
              </button>
              <button
                onClick={() => handleNav('orders')}
                className="btn btn-outline"
                style={{ justifyContent: 'flex-start' }}
              >
                <ShoppingBag size={16} /> My Orders & Tracking
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleNav('admin')}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start' }}
                >
                  <ShieldCheck size={16} /> Admin Dashboard
                </button>
              )}
              {(isDelivery || isAdmin) && (
                <button
                  onClick={() => handleNav('delivery')}
                  className="btn btn-green"
                  style={{ justifyContent: 'flex-start' }}
                >
                  <Truck size={16} /> Delivery Portal
                </button>
              )}
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="btn"
                style={{ color: 'var(--danger-rust)', backgroundColor: 'var(--danger-light)', justifyContent: 'flex-start' }}
              >
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleNav('login')}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Login
              </button>
              <button
                onClick={() => handleNav('signup')}
                className="btn btn-outline"
                style={{ flex: 1 }}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <button
          onClick={() => handleNav('home')}
          className={`mobile-nav-item ${currentRoute === 'home' ? 'active' : ''}`}
        >
          <span>🌾</span>
          <span>Home</span>
        </button>
        <button
          onClick={() => handleNav('shop')}
          className={`mobile-nav-item ${currentRoute === 'shop' ? 'active' : ''}`}
        >
          <span>🛍️</span>
          <span>Shop</span>
        </button>
        <button
          onClick={() => handleNav('wishlist')}
          className={`mobile-nav-item ${currentRoute === 'wishlist' ? 'active' : ''}`}
        >
          <span>❤️</span>
          <span>Wishlist</span>
          {wishlistCount > 0 && <span className="badge-count">{wishlistCount}</span>}
        </button>
        <button
          onClick={() => handleNav('cart')}
          className={`mobile-nav-item ${currentRoute === 'cart' ? 'active' : ''}`}
        >
          <span>🛒</span>
          <span>Cart</span>
          {totalItemCount > 0 && <span className="badge-count">{totalItemCount}</span>}
        </button>
        <button
          onClick={() => handleNav(isAuthenticated ? 'account' : 'login')}
          className={`mobile-nav-item ${['account', 'login', 'orders'].includes(currentRoute) ? 'active' : ''}`}
        >
          <span>👤</span>
          <span>Account</span>
        </button>
      </div>
    </header>
  );
}
