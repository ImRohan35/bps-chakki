import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, MessageCircle, Clock, Navigation, CheckCircle2, Send } from 'lucide-react';
import DistanceChecker from '../components/DistanceChecker';
import { fetchApi } from '../utils/api';

export default function ContactUs() {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [storeSettings, setStoreSettings] = useState({
    phone: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    email: 'contact@bpsfreshmills.com',
    shopAddress: 'Shop No. 4, Market Complex, Main Road, Sector 14, Delhi NCR 110085',
    businessHours: 'Mon - Sat: 8:00 AM - 8:30 PM'
  });

  useEffect(() => {
    fetchApi('/public/settings')
      .then(res => {
        if (res.success && res.settings) {
          setStoreSettings(prev => ({ ...prev, ...res.settings }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetchApi('/public/contact', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setFormData({ name: '', phone: '', email: '', message: '' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to send message' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 4rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 3rem' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Contact BPS Fresh Mills
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
          Have questions about grain varieties, custom grind coarseness, or doorstep delivery? Reach out to our chakki team directly.
        </p>
      </div>

      {/* Main Grid: Info + Contact Form */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
        {/* Left: Contact Info & Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
              Chakki Store Details
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'var(--wheat-light)', color: 'var(--earth-brown)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Chakki Store & Milling Unit</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.5 }}>
                    {storeSettings.shopAddress || 'Shop No. 4, Market Complex, Main Road, Near Gandhi Chowk, Sector 14, Delhi NCR 110085'}
                  </div>
                  <a
                    href="https://maps.google.com/?q=Sector+14+Delhi+NCR+110085"
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-outline"
                    style={{ marginTop: '0.6rem', fontSize: '0.78rem' }}
                    id="contact-get-directions-btn"
                  >
                    <Navigation size={13} /> Get Directions
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'var(--nature-light)', color: 'var(--nature-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Phone & Support</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {storeSettings.phone} (Direct Counter)
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                    <a
                      href={`tel:${storeSettings.phone.replace(/\s+/g, '')}`}
                      className="btn btn-sm btn-outline"
                      style={{ fontSize: '0.78rem' }}
                      id="contact-call-btn"
                    >
                      <Phone size={13} /> Call Now
                    </a>
                    <a
                      href={`https://wa.me/${(storeSettings.whatsapp || storeSettings.phone).replace(/\D/g, '')}?text=Hello%20BPS%20Fresh%20Mills,%20I%20have%20an%20inquiry%20regarding%20fresh%20flour.`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-green"
                      style={{ fontSize: '0.78rem' }}
                      id="contact-whatsapp-btn"
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'var(--wheat-light)', color: 'var(--earth-brown)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Email Address</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {storeSettings.email}
                  </div>
                  <a
                    href={`mailto:${storeSettings.email}?subject=Customer%20Inquiry%20-%20BPS%20Fresh%20Mills`}
                    className="btn btn-sm btn-outline"
                    style={{ marginTop: '0.6rem', fontSize: '0.78rem' }}
                    id="contact-email-btn"
                  >
                    <Mail size={13} /> Email Us
                  </a>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'var(--nature-light)', color: 'var(--nature-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Chakki Operating Hours</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {storeSettings.businessHours || 'Mon - Sat: 8:00 AM - 8:30 PM | Sunday: 9:00 AM - 2:00 PM'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Delivery Radius Checker */}
          <DistanceChecker />
        </div>

        {/* Right: Contact Form */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            Send Us a Message
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.75rem' }}>
            We typically reply within 2-4 hours during normal business hours.
          </p>

          {feedback && (
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                backgroundColor: feedback.type === 'success' ? 'var(--nature-light)' : 'var(--danger-light)',
                color: feedback.type === 'success' ? 'var(--nature-green)' : 'var(--danger-rust)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem'
              }}
            >
              <CheckCircle2 size={18} />
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                Your Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                Mobile Number *
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="e.g. rahul@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
                Your Message / Custom Requirement *
              </label>
              <textarea
                rows="4"
                placeholder="Tell us about your requirement (e.g. coarseness preference, bulk family pack, delivery area confirmation)..."
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                required
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-lg"
              style={{ marginTop: '0.5rem' }}
              id="contact-submit-btn"
            >
              {submitting ? 'Sending Message...' : (
                <>
                  <Send size={18} /> Send Message
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
