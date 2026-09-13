import React from 'react';
import { ShieldCheck, Truck, RotateCcw, FileText, ChevronLeft } from 'lucide-react';

export default function PolicyPages({ policyType = 'return-policy', navigate }) {
  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 5rem', maxWidth: '800px' }}>
      <button
        onClick={() => navigate('home')}
        className="btn btn-sm btn-outline"
        style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      >
        <ChevronLeft size={16} /> Back to Home
      </button>

      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {policyType === 'return-policy' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <RotateCcw size={24} style={{ color: 'var(--wheat-gold)' }} />
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Return & Food Safety Policy</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Effective for all orders placed with BPS Fresh Mills
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              <p>
                At <strong>BPS Fresh Mills</strong>, our flours are stone-milled fresh on order with zero preservatives, chemicals, or anti-caking agents. Because flour is a perishable staple food product subject to strict hygiene and safety standards, our return policy is crafted to ensure consumer safety:
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>1. 48-Hour Reporting Window</h3>
              <p>
                Customers can report any issue directly from the <strong>My Orders</strong> section within 48 hours of delivery for the following valid reasons:
              </p>
              <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li>Damaged or torn outer packaging during transit</li>
                <li>Incorrect product variety or weight delivered</li>
                <li>Verified quality defect or unexpected grind texture</li>
              </ul>

              <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>2. Replacements & Refunds</h3>
              <p>
                Once reported with supporting photographs, our team will review the issue within 24 hours. For approved claims, we provide either an immediate fresh replacement batch milled that day or a full refund.
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>3. Food Safety Exception</h3>
              <p>
                To maintain the highest sanitation standards for all patrons, opened or partially used bags cannot be returned unless an inherent grain defect is confirmed by our milling team.
              </p>
            </div>
          </div>
        )}

        {policyType === 'delivery-info' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <Truck size={24} style={{ color: 'var(--nature-green)' }} />
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>15 KM Local Delivery Coverage</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Why we strictly operate within a 15 KM radius
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              <p>
                Unlike industrial grocery brands that pack wheat flour with chemical preservatives for months-long shelf life, <strong>BPS Fresh Mills</strong> delivers fresh flour directly from our chakki stones to your kitchen.
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>Why 15 KM?</h3>
              <p>
                By limiting our radius to approximately 15 KM from our milling facility (Sector 14, Delhi NCR), our dedicated delivery executives can guarantee doorstep drop-off within hours of milling. This preserves natural wheat moisture, rich bran fiber, and delicate micronutrients that are normally lost during long transport.
              </p>

              <h3 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.1rem' }}>Delivery Charges & Free Delivery</h3>
              <p>
                Standard delivery charge is ₹40. All orders with flour items totaling <strong>₹500 or more qualify for 100% FREE DELIVERY</strong>.
              </p>
            </div>
          </div>
        )}

        {policyType === 'terms' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <FileText size={24} style={{ color: 'var(--wheat-gold)' }} />
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Terms & Conditions</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              All flour products sold through BPS Fresh Mills are whole-grain products milled in clean, food-grade stone mills. By placing an order, customers agree to inspect the delivery upon arrival and pay the agreed Cash on Delivery amount.
            </p>
          </div>
        )}

        {policyType === 'privacy' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <ShieldCheck size={24} style={{ color: 'var(--nature-green)' }} />
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Privacy Policy</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              We respect your privacy. Customer phone numbers, addresses, and order histories are stored securely and used solely for fulfilling fresh flour deliveries and order status updates. We never share customer data with third-party advertisers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
