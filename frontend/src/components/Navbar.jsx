import React, { useState } from 'react';
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Phone,
  LogOut,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useTheme } from '../context/ThemeContext';
import ThemeSwitcher from './ThemeSwitcher';
import NotificationBell from './NotificationBell';

export default function Navbar({ currentRoute, navigate, onOpenSearch }) {
  const { user, isAuthenticated, isAdmin, isDelivery, logout } = useAuth();
  const { totalItemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [recipesModalOpen, setRecipesModalOpen] = useState(false);

  const handleNav = (route) => {
    if (route === 'recipes') {
      setRecipesModalOpen(true);
      return;
    }
    if (route === 'our-process') {
      if (currentRoute === 'home') {
        const el = document.getElementById('farm-to-table');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      navigate('about');
      return;
    }
    if (route === 'offers') {
      if (currentRoute === 'home') {
        const el = document.getElementById('offers-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
      navigate('shop');
      return;
    }

    navigate(route);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  return (
    <header className="header-wrapper" style={{ position: 'sticky', top: 0, zIndex: 900, background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
      {/* ── 1. TOP ANNOUNCEMENT BAR (Reference Design) ── */}
      <div style={{
        backgroundColor: '#0B3B24',
        color: '#FFFFFF',
        fontSize: '0.78rem',
        padding: '0.45rem 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          {/* Left Highlights */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <Truck size={14} color="#C9A44C" /> Free Delivery within 15 KM
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <CheckCircle2 size={14} color="#16A34A" /> 100% Pure & Natural
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <ShieldCheck size={14} color="#C9A44C" /> Cash on Delivery Available
            </span>
          </div>

          {/* Right Links & Social */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button
              onClick={() => handleNav('tracking')}
              style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}
            >
              Track Order
            </button>
            <span style={{ opacity: 0.4 }}>|</span>
            <button
              onClick={() => handleNav('contact')}
              style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}
            >
              Help & Support
            </button>
            <span style={{ opacity: 0.4 }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" style={{ color: '#FFFFFF', opacity: 0.9 }} title="WhatsApp">
                <Phone size={13} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. MAIN NAVBAR ── */}
      <div className="container" style={{ padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem' }}>
          {/* Left: Mobile Menu Toggle + Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="action-icon-btn mobile-toggle-btn"
              aria-label="Toggle navigation menu"
              id="mobile-menu-toggle-btn"
              style={{ display: 'none' }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div
              onClick={() => handleNav('home')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
              id="brand-home-link"
            >
              <img
                src="/logo.png"
                alt="BPS Fresh Mills Logo"
                style={{ width: 44, height: 44, objectFit: 'contain' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 900, fontSize: '1.25rem', color: '#0B3B24', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  BPS Fresh Mills
                </span>
                <span style={{ fontSize: '0.72rem', color: '#667085', fontWeight: 600, marginTop: '2px' }}>
                  Pure Atta. Healthier Tomorrow.
                </span>
              </div>
            </div>
          </div>

          {/* Center: Desktop Navigation Links (matching reference) */}
          <nav className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            {[
              { id: 'home', label: 'Home', route: 'home' },
              { id: 'shop', label: 'Shop', route: 'shop' },
              { id: 'about', label: 'About Us', route: 'about' },
              { id: 'our-process', label: 'Our Process', route: 'our-process' },
              { id: 'recipes', label: 'Recipes', route: 'recipes' },
              { id: 'offers', label: 'Offers', route: 'offers' },
              { id: 'contact', label: 'Contact', route: 'contact' },
            ].map(link => {
              const active = currentRoute === link.route;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNav(link.route)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.4rem 0',
                    fontSize: '0.92rem',
                    fontWeight: active ? 800 : 600,
                    color: active ? '#0B3B24' : '#374151',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'color 0.15s ease'
                  }}
                >
                  {link.label}
                  {active && (
                    <span style={{
                      position: 'absolute',
                      bottom: -2,
                      left: 0,
                      right: 0,
                      height: '2.5px',
                      backgroundColor: '#16A34A',
                      borderRadius: '2px'
                    }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Search Input + User + Cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            {/* Embedded Search Input */}
            <div
              onClick={onOpenSearch}
              style={{
                position: 'relative',
                cursor: 'pointer',
                minWidth: '220px',
                display: 'flex',
                alignItems: 'center'
              }}
              className="desktop-only"
            >
              <Search size={15} style={{ position: 'absolute', left: 12, color: '#9CA3AF' }} />
              <input
                readOnly
                placeholder="Search for atta, besan, multigrain..."
                style={{
                  width: '100%',
                  padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                  fontSize: '0.82rem',
                  border: '1px solid #E5E7EB',
                  borderRadius: '999px',
                  background: '#F9FAFB',
                  cursor: 'pointer',
                  outline: 'none',
                  color: '#374151'
                }}
              />
            </div>

            {/* Quick Badges for Delivery & Admin */}
            {isDelivery && (
              <button
                onClick={() => handleNav('delivery')}
                style={{
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
                title="Open Delivery Boy Portal"
              >
                <Truck size={14} /> Deliveries
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => handleNav('admin')}
                style={{
                  backgroundColor: '#0B3B24',
                  color: '#FAF6F0',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
                title="Open Admin Dashboard"
              >
                <ShieldCheck size={14} /> Admin
              </button>
            )}

            {/* User Profile / Login */}
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
                title={isAuthenticated ? user.name : 'Login / Signup'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#1F2937', display: 'flex', alignItems: 'center' }}
                id="account-btn"
              >
                <User size={20} />
              </button>

              {/* User Dropdown */}
              {isAuthenticated && userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    width: '210px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    padding: '0.5rem',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}
                >
                  <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827' }}>{user.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{user.mobile}</div>
                    <span style={{ display: 'inline-block', fontSize: '0.7rem', fontWeight: 800, background: '#DEF7EC', color: '#03543F', padding: '2px 6px', borderRadius: '4px', marginTop: '4px' }}>
                      {user.role}
                    </span>
                  </div>

                  <button onClick={() => handleNav('account')} style={{ textAlign: 'left', background: 'none', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.86rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    My Account
                  </button>
                  <button onClick={() => handleNav('orders')} style={{ textAlign: 'left', background: 'none', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.86rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    My Orders
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleNav('admin')} style={{ textAlign: 'left', background: 'none', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.86rem', fontWeight: 700, color: '#0B3B24', cursor: 'pointer' }}>
                      Admin Panel
                    </button>
                  )}
                  <button onClick={() => { logout(); setUserDropdownOpen(false); handleNav('home'); }} style={{ textAlign: 'left', background: 'none', border: 'none', padding: '0.5rem 0.75rem', fontSize: '0.86rem', fontWeight: 700, color: '#DC2626', cursor: 'pointer' }}>
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Wishlist */}
            <button
              onClick={() => handleNav('wishlist')}
              className="action-icon-btn"
              title="Wishlist"
              id="wishlist-btn"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#1F2937', position: 'relative', display: 'flex', alignItems: 'center' }}
            >
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: -2, background: '#16A34A', color: '#FFFFFF',
                  fontSize: '0.65rem', fontWeight: 800, width: 16, height: 16, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Bag */}
            <button
              onClick={() => handleNav('cart')}
              title="Cart"
              id="cart-btn"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#0B3B24',
                position: 'relative', display: 'flex', alignItems: 'center'
              }}
            >
              <ShoppingBag size={21} />
              <span style={{
                position: 'absolute', top: 0, right: -4, background: '#16A34A', color: '#FFFFFF',
                fontSize: '0.65rem', fontWeight: 900, width: 17, height: 17, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {totalItemCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── RECIPES MODAL ── */}
      {recipesModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
          onClick={() => setRecipesModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF', borderRadius: '16px', maxWidth: '640px', width: '100%',
              padding: '1.75rem', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={22} color="#16A34A" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0B3B24' }}>
                  BPS Chakki Kitchen Recipes
                </h3>
              </div>
              <button onClick={() => setRecipesModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, color: '#0B3B24', fontSize: '1.05rem' }}>1. Soft & Puffed Phulka Rotis</div>
                <div style={{ fontSize: '0.82rem', color: '#16A34A', fontWeight: 700, margin: '2px 0 6px' }}>Best with: Premium Chakki Atta</div>
                <div style={{ fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.5 }}>
                  Knead 2 cups of BPS Premium Chakki Atta with warm water and a pinch of salt. Let dough rest for 15 minutes. Roll into thin discs and cook on medium flame until it naturally puffs like a balloon.
                </div>
              </div>

              <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, color: '#0B3B24', fontSize: '1.05rem' }}>2. High-Protein Desi Chana Chilla</div>
                <div style={{ fontSize: '0.82rem', color: '#16A34A', fontWeight: 700, margin: '2px 0 6px' }}>Best with: Desi Chana Besan</div>
                <div style={{ fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.5 }}>
                  Whisk 1 cup BPS Desi Chana Besan with finely chopped onions, green chilies, grated ginger, ajwain, and fresh coriander. Pour onto a lightly oiled cast-iron tawa and cook until golden crisp on both sides.
                </div>
              </div>

              <div style={{ padding: '1rem', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 800, color: '#0B3B24', fontSize: '1.05rem' }}>3. Traditional Bajra Bhakri with Desi Makhan</div>
                <div style={{ fontSize: '0.82rem', color: '#16A34A', fontWeight: 700, margin: '2px 0 6px' }}>Best with: Fresh Stone-Milled Bajra Atta</div>
                <div style={{ fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.5 }}>
                  Knead BPS Bajra Atta with lukewarm water. Gently pat with palms on a flat surface to form thick flatbreads. Roast on clay or iron tawa and top with generous homemade white butter.
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                onClick={() => { setRecipesModalOpen(false); handleNav('shop'); }}
                style={{ padding: '0.65rem 1.25rem', backgroundColor: '#0B3B24', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Explore Flours for These Recipes →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-only"
          style={{
            position: 'fixed',
            inset: 0,
            top: '100px',
            backgroundColor: '#FFFFFF',
            zIndex: 999,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            overflowY: 'auto'
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { id: 'home', label: 'Home', route: 'home' },
              { id: 'shop', label: 'Shop', route: 'shop' },
              { id: 'about', label: 'About Us', route: 'about' },
              { id: 'our-process', label: 'Our Process', route: 'our-process' },
              { id: 'recipes', label: 'Recipes', route: 'recipes' },
              { id: 'offers', label: 'Offers', route: 'offers' },
              { id: 'contact', label: 'Contact', route: 'contact' },
              { id: 'tracking', label: 'Track Order', route: 'tracking' }
            ].map(link => (
              <button
                key={link.id}
                onClick={() => handleNav(link.route)}
                style={{
                  textAlign: 'left',
                  background: currentRoute === link.route ? '#DEF7EC' : 'none',
                  color: currentRoute === link.route ? '#0B3B24' : '#1F2937',
                  border: 'none',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: currentRoute === link.route ? 800 : 600,
                  cursor: 'pointer'
                }}
              >
                {link.label}
              </button>
            ))}
          </nav>
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
