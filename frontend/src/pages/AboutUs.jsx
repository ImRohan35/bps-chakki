import React from 'react';
import { Sparkles, ShieldCheck, HeartHandshake, Award, Truck, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AboutUs({ navigate }) {
  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(244, 223, 178, 0.4) 0%, rgba(250, 246, 240, 0.9) 100%)',
          padding: '4rem 1.25rem 3rem',
          borderBottom: '1px solid var(--border-subtle)',
          textAlign: 'center'
        }}
      >
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--wheat-light)', color: 'var(--earth-brown)', padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.82rem', marginBottom: '1rem' }}>
            <Sparkles size={14} /> The BPS Fresh Mills Story
          </div>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem', lineHeight: 1.2 }}>
            Freshly Milled. Naturally Good.
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Reviving the authentic taste, natural aroma, and wholesome nutrition of traditional chakki grinding for modern Indian households.
          </p>
        </div>
      </div>

      <div className="container" style={{ padding: '3.5rem 1.25rem 2rem', maxWidth: '960px' }}>
        {/* Core Mission Statement */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem',
            border: '2px solid var(--wheat-gold)',
            boxShadow: 'var(--shadow-md)',
            marginBottom: '3.5rem'
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--earth-brown)', marginBottom: '1rem' }}>
            About BPS Fresh Mills
          </h2>
          <blockquote
            style={{
              fontSize: '1.12rem',
              color: 'var(--text-primary)',
              lineHeight: 1.8,
              borderLeft: '4px solid var(--wheat-gold)',
              paddingLeft: '1.25rem',
              margin: '1rem 0 1.5rem',
              fontStyle: 'normal'
            }}
          >
            “BPS Fresh Mills is committed to bringing fresh, quality flour made from carefully selected grains. Our traditional chakki grinding process helps deliver fresh and wholesome atta for everyday meals. With a focus on quality, freshness, and customer trust, we aim to bring the goodness of freshly milled flour directly to your home.”
          </blockquote>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
            We believe that every family deserves flour ground from pure, unadulterated grains. That is why our chakki never compromises on grain quality, never mixes cheap fillers or maida, and operates on order to guarantee maximum nutritional vitality.
          </p>
        </div>

        {/* 4 Brand Pillars */}
        <div style={{ marginBottom: '3.5rem' }}>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, textAlign: 'center', marginBottom: '2rem', color: 'var(--text-primary)' }}>
            Our Four Guiding Commitments
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--wheat-light)', color: 'var(--earth-brown)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontSize: '1.4rem' }}>
                🌾
              </div>
              <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Slow Cold-Stone Milling</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Our natural stone mills rotate at gentle speeds, preventing heat build-up and keeping vital heat-sensitive vitamins and minerals intact.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--nature-light)', color: 'var(--nature-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontSize: '1.4rem' }}>
                🛡️
              </div>
              <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>100% Whole Grain Goodness</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                We preserve all three layers of the grain: the fiber-rich bran, the nutrient-dense germ, and the starchy endosperm for wholesome digestion.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--wheat-light)', color: 'var(--earth-brown)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontSize: '1.4rem' }}>
                🚚
              </div>
              <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>15 KM Micro Delivery Area</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                By maintaining a strict 15 KM local service boundary, our deliveries arrive same-day or within hours of fresh grinding with zero chemical preservatives.
              </p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--nature-light)', color: 'var(--nature-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontSize: '1.4rem' }}>
                🤝
              </div>
              <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Neighborhood Trust</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Transparent pricing, Cash on Delivery peace-of-mind, and friendly local service from neighbors who truly understand wholesome Indian meals.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', backgroundColor: 'var(--earth-brown)', color: '#FAF6F0', padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Experience Freshness You Can Taste
          </h3>
          <p style={{ color: '#D4C5B3', maxWidth: '520px', margin: '0 auto 1.5rem', fontSize: '0.95rem' }}>
            Order your first pack of freshly stone-ground chakki flour today and enjoy doorstep delivery within 15 KM.
          </p>
          <button onClick={() => navigate('shop')} className="btn btn-primary btn-lg">
            Explore All Flours <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
