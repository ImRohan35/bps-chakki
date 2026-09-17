import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Heart, Send } from 'lucide-react';

export default function Footer({ navigate }) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleNav = (route) => {
    if (route === 'recipes') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (route === 'our-process') {
      const el = document.getElementById('farm-to-table');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      navigate('about');
      return;
    }
    if (route === 'offers') {
      const el = document.getElementById('offers-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
      navigate('shop');
      return;
    }

    navigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    setNewsletterEmail('');
    setTimeout(() => setSubscribed(false), 5000);
  };

  return (
    <footer style={{ backgroundColor: '#0B3B24', color: '#FFFFFF', marginTop: 'auto', borderTop: '3px solid #C9A44C' }}>
      <div className="container" style={{ padding: '3.5rem 1.25rem 2rem' }}>
        {/* 5-Column Grid Matching Reference */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '2.5rem',
          marginBottom: '3rem'
        }}>
          {/* Column 1: Brand & Social */}
          <div>
            <div
              onClick={() => handleNav('home')}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}
            >
              <img
                src="/logo.png"
                alt="BPS Fresh Mills Logo"
                style={{ width: 44, height: 44, objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 900, fontSize: '1.25rem', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  BPS Fresh Mills
                </span>
                <span style={{ fontSize: '0.72rem', color: '#C9A44C', fontWeight: 600, marginTop: '2px' }}>
                  Pure Atta. Healthier Tomorrow.
                </span>
              </div>
            </div>

            <p style={{ color: '#D1E7DD', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              Bringing you the goodness of pure, freshly milled grains for a healthier and happier tomorrow.
            </p>

            {/* Social Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {[
                { name: 'Facebook', url: 'https://facebook.com', icon: 'f' },
                { name: 'Instagram', url: 'https://instagram.com', icon: '📸' },
                { name: 'YouTube', url: 'https://youtube.com', icon: '▶' },
                { name: 'WhatsApp', url: 'https://wa.me/919876543210', icon: '💬' }
              ].map(s => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  title={s.name}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#16A34A'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '1rem', letterSpacing: '0.02em' }}>
              Quick Links
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { label: 'Home', route: 'home' },
                { label: 'Shop', route: 'shop' },
                { label: 'About Us', route: 'about' },
                { label: 'Our Process', route: 'our-process' },
                { label: 'Recipes', route: 'recipes' },
                { label: 'Offers', route: 'offers' },
                { label: 'Contact', route: 'contact' },
              ].map(link => (
                <li key={link.label}>
                  <button
                    onClick={() => handleNav(link.route)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D1E7DD',
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 500,
                      transition: 'color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
                    onMouseLeave={e => e.currentTarget.style.color = '#D1E7DD'}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Customer Care */}
          <div>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '1rem', letterSpacing: '0.02em' }}>
              Customer Care
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {[
                { label: 'Track Order', route: 'tracking' },
                { label: 'Returns & Refunds', route: 'return-policy' },
                { label: 'FAQ', route: 'about' },
                { label: 'Shipping Policy', route: 'delivery-info' },
                { label: 'Privacy Policy', route: 'privacy' },
                { label: 'Terms & Conditions', route: 'terms' }
              ].map(link => (
                <li key={link.label}>
                  <button
                    onClick={() => handleNav(link.route)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#D1E7DD',
                      fontSize: '0.86rem',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 500,
                      transition: 'color 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
                    onMouseLeave={e => e.currentTarget.style.color = '#D1E7DD'}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Us */}
          <div>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '1rem', letterSpacing: '0.02em' }}>
              Contact Us
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', color: '#D1E7DD', fontSize: '0.86rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Phone size={16} color="#C9A44C" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>+91 98765 43210</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Mail size={16} color="#C9A44C" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>support@bpsfreshmills.in</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={16} color="#C9A44C" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Varanasi, Uttar Pradesh, India</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Clock size={16} color="#C9A44C" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Mon - Sat: 9:00 AM - 7:00 PM</span>
              </div>
            </div>
          </div>

          {/* Column 5: Subscribe to Our Newsletter */}
          <div>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
              Subscribe to Our Newsletter
            </h4>
            <p style={{ color: '#D1E7DD', fontSize: '0.82rem', marginBottom: '1rem', lineHeight: 1.4 }}>
              Get latest offers, healthy recipes and more.
            </p>

            <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={e => setNewsletterEmail(e.target.value)}
                  required
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.85rem',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '6px',
                    fontSize: '0.84rem',
                    background: '#FFFFFF',
                    color: '#1F2937',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '0.6rem 1rem',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                >
                  Subscribe
                </button>
              </div>
              {subscribed && (
                <div style={{ fontSize: '0.78rem', color: '#A7F3D0', fontWeight: 600 }}>
                  ✔ Thank you for subscribing!
                </div>
              )}
            </form>

            {/* Handwritten script signature matching reference */}
            <div style={{
              marginTop: '1.75rem',
              textAlign: 'right',
              fontFamily: "'Caveat', cursive, var(--font-serif)",
              fontSize: '1.35rem',
              color: '#C9A44C',
              lineHeight: 1.2
            }}>
              "Pure Food<br />Brighter Tomorrows" ♡
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div style={{
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.8rem',
          color: '#A3B8B0'
        }}>
          <div>
            © 2026 BPS Fresh Mills. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Made with <Heart size={14} color="#EF4444" fill="#EF4444" /> for healthier families
          </div>
        </div>
      </div>
    </footer>
  );
}
