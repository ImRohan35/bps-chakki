import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, MessageCircle, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { fetchApi } from '../utils/api';
import InstallPwaButton from './InstallPwaButton';

export default function Footer({ navigate }) {
  const [settings, setSettings] = useState({
    phone: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    email: 'contact@bpsfreshmills.com'
  });

  useEffect(() => {
    fetchApi('/public/settings')
      .then(res => {
        if (res.success && res.settings) {
          setSettings(prev => ({ ...prev, ...res.settings }));
        }
      })
      .catch(() => {});
  }, []);

  const handleNav = (route) => {
    navigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer style={{ backgroundColor: '#173D32', color: '#FFFFFF', marginTop: 'auto', borderTop: '3px solid #C9A44C' }}>
      {/* Highlights Band */}
      <div style={{ backgroundColor: '#123329', padding: '2rem 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(201,164,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A44C', fontSize: '1.4rem' }}>
                🌾
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#FFFFFF' }}>100% Freshly Milled</div>
                <div style={{ fontSize: '0.82rem', color: '#D1E7DD' }}>Slow stone chakki grinding retains pure nutrients</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(201,164,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A44C', fontSize: '1.4rem' }}>
                🚚
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#FFFFFF' }}>Delivery Within 15 KM</div>
                <div style={{ fontSize: '0.82rem', color: '#D1E7DD' }}>Direct doorstep delivery from our chakki unit</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(201,164,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A44C', fontSize: '1.4rem' }}>
                💵
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#FFFFFF' }}>Cash on Delivery</div>
                <div style={{ fontSize: '0.82rem', color: '#D1E7DD' }}>Pay at your doorstep after checking freshness</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(201,164,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A44C', fontSize: '1.4rem' }}>
                🌱
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#FFFFFF' }}>Zero Preservatives</div>
                <div style={{ fontSize: '0.82rem', color: '#D1E7DD' }}>No maida mixing, no bleaching, 100% natural</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container" style={{ padding: '3.5rem 1.25rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem' }}>
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
              <img
                src="/logo.png"
                alt="BPS Fresh Mills Logo"
                style={{
                  width: '56px',
                  height: '56px',
                  objectFit: 'contain',
                  borderRadius: '50%',
                  border: '2px solid #C9A44C',
                  backgroundColor: '#FAF7F0'
                }}
              />
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                BPS FRESH MILLS
              </span>
            </div>
            <p style={{ fontStyle: 'italic', color: '#C9A44C', fontSize: '0.92rem', marginBottom: '1rem', fontWeight: 600 }}>
              “Freshly Milled. Naturally Good.”
            </p>
            <p style={{ color: '#D1E7DD', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              We are a local chakki flour business dedicated to grinding whole grains slowly and naturally on cold-stone mills, ensuring you and your family enjoy healthy, chemical-free, aromatic rotis every single day.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a
                href={`https://wa.me/${(settings.whatsapp || settings.phone).replace(/\D/g, '')}?text=Hello%20BPS%20Fresh%20Mills,%20I%20would%20like%20to%20inquire%20about%20fresh%20chakki%20flour.`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm"
                style={{ fontSize: '0.78rem', backgroundColor: '#2E8B57', color: '#FFFFFF' }}
              >
                <MessageCircle size={14} /> WhatsApp Us
              </a>
              <a
                href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                className="btn btn-sm btn-outline"
                style={{ fontSize: '0.78rem', borderColor: 'rgba(255,255,255,0.3)', color: '#FFFFFF' }}
              >
                <Phone size={14} /> Call Now
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: '#C9A44C', fontWeight: 700, fontSize: '1.05rem', marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Explore
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li>
                <button onClick={() => handleNav('home')} style={{ color: '#D1E7DD', textAlign: 'left', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#2E8B57'} onMouseLeave={e => e.currentTarget.style.color='#D1E7DD'}>
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('shop')} style={{ color: '#D1E7DD', textAlign: 'left', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#2E8B57'} onMouseLeave={e => e.currentTarget.style.color='#D1E7DD'}>
                  Explore Fresh Grains
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('about')} style={{ color: '#D1E7DD', textAlign: 'left', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#2E8B57'} onMouseLeave={e => e.currentTarget.style.color='#D1E7DD'}>
                  Our Chakki Story
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('contact')} style={{ color: '#D1E7DD', textAlign: 'left', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#2E8B57'} onMouseLeave={e => e.currentTarget.style.color='#D1E7DD'}>
                  We're Here to Help
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('wishlist')} style={{ color: '#D1E7DD', textAlign: 'left', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color='#2E8B57'} onMouseLeave={e => e.currentTarget.style.color='#D1E7DD'}>
                  My Wishlist
                </button>
              </li>
            </ul>
          </div>

          {/* Flour Categories */}
          <div>
            <h4 style={{ color: 'var(--wheat-gold)', fontWeight: 700, fontSize: '1.05rem', marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Fresh Flours
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li>
                <button onClick={() => handleNav('shop')} style={{ color: '#B8C4BE', textAlign: 'left' }}>
                  Chakki Sharbati Atta (MP)
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('shop')} style={{ color: '#B8C4BE', textAlign: 'left' }}>
                  Diabetic Multigrain Atta
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('shop')} style={{ color: '#B8C4BE', textAlign: 'left' }}>
                  Winter Bajra & Jowar Flours
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('shop')} style={{ color: '#B8C4BE', textAlign: 'left' }}>
                  Desi Chana Pure Besan
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('shop')} style={{ color: '#B8C4BE', textAlign: 'left' }}>
                  Roasted Gram Sattu
                </button>
              </li>
            </ul>
          </div>

          {/* Store Location & Hours */}
          <div>
            <h4 style={{ color: 'var(--wheat-gold)', fontWeight: 700, fontSize: '1.05rem', marginBottom: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Store & Delivery Info
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', color: '#B8C4BE', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                <MapPin size={18} style={{ color: 'var(--wheat-gold)', flexShrink: 0, marginTop: '2px' }} />
                <span>{settings.shopAddress || 'Shop No. 4, Market Complex, Main Road, Sector 14, Delhi NCR 110085'}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <Clock size={16} style={{ color: 'var(--wheat-gold)', flexShrink: 0 }} />
                <span>{settings.businessHours || 'Mon - Sat: 8:00 AM - 8:30 PM'}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <Phone size={16} style={{ color: 'var(--wheat-gold)', flexShrink: 0 }} />
                <a href={`tel:${(settings.phone || '').replace(/\s+/g, '')}`} style={{ color: '#B8C4BE', textDecoration: 'none' }}>
                  {settings.phone || '+91 98765 43210'}
                </a>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <Mail size={16} style={{ color: 'var(--wheat-gold)', flexShrink: 0 }} />
                <a href={`mailto:${settings.email || ''}`} style={{ color: '#B8C4BE', textDecoration: 'none' }}>
                  {settings.email || 'contact@bpsfreshmills.com'}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Policy Links */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '2.5rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: '#8E9E96' }}>
          <div>
            © {new Date().getFullYear()} BPS Fresh Mills. All rights reserved. “Freshly Milled. Naturally Good.”
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <button onClick={() => handleNav('return-policy')} style={{ color: '#8E9E96' }}>
              Return & Food Policy
            </button>
            <button onClick={() => handleNav('terms')} style={{ color: '#8E9E96' }}>
              Terms & Conditions
            </button>
            <button onClick={() => handleNav('privacy')} style={{ color: '#8E9E96' }}>
              Privacy Policy
            </button>
            <button onClick={() => handleNav('delivery-info')} style={{ color: '#8E9E96' }}>
              15 KM Delivery Coverage
            </button>
          </div>
        </div>

        {/* Role Identity Badge & Install App Bar for Customer App */}
        <div style={{
          marginTop: '1.75rem',
          padding: '0.9rem 1.25rem',
          backgroundColor: '#0F261F',
          borderRadius: '12px',
          border: '1px solid rgba(201,164,76,0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <img src="/logo.png" alt="BPS Fresh Mills" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#C9A44C', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🌾 BPS Customer App
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', background: '#2E8B57', color: '#FFFFFF', fontWeight: 700 }}>Official Customer Portal</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#B8C4BE', marginTop: '2px' }}>
                Ye BPS Customer Portal hai — Freshly Milled Pure Stone Chakki Atta, Orders & Live Tracking
              </div>
            </div>
          </div>
          <InstallPwaButton portalType="customer" />
        </div>
      </div>
    </footer>
  );
}
