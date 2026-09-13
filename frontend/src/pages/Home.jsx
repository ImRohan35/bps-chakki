import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Star,
  Flame,
  Award,
  HeartHandshake,
  Check
} from 'lucide-react';
import FestivalBanner from '../components/FestivalBanner';
import ProductCard from '../components/ProductCard';
import DistanceChecker from '../components/DistanceChecker';
import { fetchApi } from '../utils/api';

export default function Home({ navigate, onSelectProduct, onNotifyMe }) {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/products/featured')
      .then(res => {
        if (res.success) {
          setFeaturedProducts(res.products || []);
        }
      })
      .catch(err => console.error('Error fetching featured:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', paddingBottom: '3rem' }}>
      {/* 1. HERO SECTION (BPS Fresh Mills Design - Full Image) */}
      <section className="hero-section" style={{ 
        position: 'relative', 
        overflow: 'hidden', 
        minHeight: '65vh', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '5rem 0 3.5rem' 
      }}>
        {/* Full-width Background Image */}
        <img 
          src="/hero-artisan-flour.jpg" 
          alt="Freshly stone milled whole wheat chakki atta and wheat stalks" 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            objectPosition: 'right center', 
            zIndex: 1 
          }}
        />

        {/* Soft light gradient overlay so text is crisp and readable on left, full image shines on right */}
        <div 
          className="hero-gradient-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(254, 252, 248, 0.95) 0%, rgba(254, 252, 248, 0.82) 42%, rgba(254, 252, 248, 0.15) 75%, rgba(254, 252, 248, 0) 100%)',
            zIndex: 2
          }} 
        />

        <div className="container" style={{ position: 'relative', zIndex: 3, width: '100%' }}>
          <div style={{ maxWidth: '580px' }}>
            <h1 className="hero-heading" style={{ 
              fontSize: 'clamp(2.8rem, 5vw, 4.2rem)', 
              fontWeight: 800, 
              color: '#2A1810', 
              lineHeight: 1.1,
              fontFamily: 'var(--font-serif)',
              marginBottom: '1rem'
            }}>
              Pure Grains<br />Healthier Lives
            </h1>
            <p className="hero-subheading" style={{ fontSize: '1.25rem', color: '#5C3A21', marginBottom: '2rem', fontWeight: 600 }}>
              Freshly Milled. Naturally Good.
            </p>
            <button
              onClick={() => navigate('shop')}
              style={{
                backgroundColor: '#5C3A21',
                color: '#FFFFFF',
                padding: '1.1rem 2.75rem',
                fontSize: '1.1rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(92, 58, 33, 0.3)'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor='#432815'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor='#5C3A21'}
            >
              Shop Now
            </button>
          </div>
        </div>
      </section>

      {/* Value Proposition Feature Bar */}
      <div style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', padding: '1.5rem 0' }}>
        <div className="container">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '2rem'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#E8F5EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={26} color="#2E8B57" />
              </div>
              <strong style={{ color: '#173D32', fontSize: '1.05rem' }}>100% Natural</strong>
              <span style={{ color: '#667085', fontSize: '0.88rem' }}>No Preservatives</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#E8F5EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCcw size={26} color="#2E8B57" />
              </div>
              <strong style={{ color: '#173D32', fontSize: '1.05rem' }}>Freshly Milled</strong>
              <span style={{ color: '#667085', fontSize: '0.88rem' }}>on Order</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#E8F5EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={26} color="#2E8B57" />
              </div>
              <strong style={{ color: '#173D32', fontSize: '1.05rem' }}>Local Delivery</strong>
              <span style={{ color: '#667085', fontSize: '0.88rem' }}>Within 15 KM</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#E8F5EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={26} color="#2E8B57" />
              </div>
              <strong style={{ color: '#173D32', fontSize: '1.05rem' }}>Trusted by</strong>
              <span style={{ color: '#667085', fontSize: '0.88rem' }}>Families</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC FESTIVAL BANNER */}
      <div className="container">
        <FestivalBanner onShopOffer={() => navigate('shop')} />
      </div>

      {/* 3. PRODUCT SECTION: OUR PRODUCTS */}
      <section className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <span className="badge badge-green" style={{ marginBottom: '0.5rem' }}>Direct from our Chakki</span>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#173D32' }}>Fresh Picks From Our Chakki</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Freshly stone-ground daily flours prepared on order for unmatched aroma and tenderness.
            </p>
          </div>
          <button
            onClick={() => navigate('shop')}
            className="btn btn-outline"
            id="view-all-products-btn"
          >
            Explore Fresh Grains <ArrowRight size={16} />
          </button>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading fresh chakki flours...
          </div>
        ) : (
          <div className="product-grid">
            {featuredProducts.slice(0, 8).map(prod => (
              <ProductCard
                key={prod._id}
                product={prod}
                onSelectProduct={onSelectProduct}
                onBuyNow={() => navigate('checkout')}
                onNotifyMe={onNotifyMe}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. 15 KM DELIVERY RADIUS SECTION */}
      <section className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>
          <div>
            <span className="badge badge-green" style={{ marginBottom: '0.5rem' }}>Direct Local Service</span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#173D32', marginBottom: '0.75rem' }}>
              Why We Limit Delivery to 15 KM
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1rem', fontSize: '0.95rem' }}>
              Unlike industrial packaged atta that sits on distributor trucks and warehouse shelves for months, <strong>BPS Fresh Mills</strong> delivers fresh flour directly from the chakki stones to your home within hours of grinding.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-primary)', fontSize: '0.92rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Check size={18} style={{ color: 'var(--nature-green)' }} /> <strong>Milled Same Day:</strong> Fresh aroma and high moisture content preserved.
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Check size={18} style={{ color: 'var(--nature-green)' }} /> <strong>Zero Shelf Preservatives:</strong> Completely natural, wholesome nutrition.
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Check size={18} style={{ color: 'var(--nature-green)' }} /> <strong>Local Delivery Team:</strong> Fast, safe doorstep handoff with Cash on Delivery.
              </li>
            </ul>
          </div>

          <div>
            <DistanceChecker />
          </div>
        </div>
      </section>

      {/* 5. COMPARISON: PACKAGED ATTA VS BPS FRESH CHAKKI ATTA */}
      <section style={{ backgroundColor: 'var(--bg-secondary)', padding: '3.5rem 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 2.5rem' }}>
            <span className="badge badge-green" style={{ marginBottom: '0.5rem' }}>The Freshness Difference</span>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#173D32' }}>
              Traditional Chakki vs Factory Packaged Atta
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              See why hundreds of local families have switched to BPS Fresh Mills for their everyday meals.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Ordinary Packaged Atta */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                border: '1px solid var(--border-subtle)',
                opacity: 0.85
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--danger-rust)', marginBottom: '0.5rem' }}>
                Factory Packaged Atta
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Mass produced in commercial high-speed roller mills
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--danger-rust)', fontWeight: 700 }}>✕</span>
                  <span>High RPM roller milling overheats flour, stripping essential vitamins</span>
                </li>
                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--danger-rust)', fontWeight: 700 }}>✕</span>
                  <span>Wheat germ & bran often extracted and sold separately</span>
                </li>
                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--danger-rust)', fontWeight: 700 }}>✕</span>
                  <span>Preservatives & anti-caking agents added for 6-month shelf life</span>
                </li>
                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--danger-rust)', fontWeight: 700 }}>✕</span>
                  <span>Sits in warehouses and retailer trucks for months before eating</span>
                </li>
              </ul>
            </div>

            {/* BPS Fresh Mills Stone Chakki */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                border: '2px solid #2E8B57',
                boxShadow: '0 4px 18px rgba(46, 139, 87, 0.15)',
                position: 'relative'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '24px',
                  backgroundColor: '#2E8B57',
                  color: '#FFFFFF',
                  padding: '0.2rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                RECOMMENDED CHOICE
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#173D32', marginBottom: '0.5rem' }}>
                BPS Fresh Mills Chakki Atta
              </div>
              <div style={{ fontSize: '0.85rem', color: '#2E8B57', fontWeight: 600, marginBottom: '1.5rem' }}>
                Slow cold-stone milled fresh daily on order
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#2E8B57', fontWeight: 700 }}>✔</span>
                  <span>Low RPM stone chakki prevents heat build-up and preserves natural nutrients</span>
                </li>
                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#2E8B57', fontWeight: 700 }}>✔</span>
                  <span>100% whole grain with 100% natural wheat bran and germ intact</span>
                </li>
                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#2E8B57', fontWeight: 700 }}>✔</span>
                  <span>Zero preservatives, zero chemicals, zero maida mixing</span>
                </li>
                <li style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#2E8B57', fontWeight: 700 }}>✔</span>
                  <span>Delivered directly within 15 KM for the freshest rotis of your life</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section className="container">
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
          <span className="badge badge-green" style={{ marginBottom: '0.5rem' }}>Effortless Convenience</span>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#173D32' }}>How It Works</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            From selected grains to your kitchen table in 4 simple steps
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#E8F5EC', color: '#173D32', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.4rem', fontWeight: 800 }}>
              1
            </div>
            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem', color: '#173D32' }}>Select Your Flour</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Choose your favorite grain — Sharbati wheat, multigrain, bajra, jowar, or besan.
            </p>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#E8F5EC', color: '#173D32', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.4rem', fontWeight: 800 }}>
              2
            </div>
            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem', color: '#173D32' }}>Slow Stone Milling</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              We mill your order fresh on traditional cold chakki stones without bleaching or additives.
            </p>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#E8F5EC', color: '#173D32', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.4rem', fontWeight: 800 }}>
              3
            </div>
            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem', color: '#173D32' }}>Doorstep Delivery</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Our dedicated delivery executive brings freshly packed flour to your doorstep within 15 KM.
            </p>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: '#E8F5EC', color: '#173D32', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.4rem', fontWeight: 800 }}>
              4
            </div>
            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem', color: '#173D32' }}>Cash on Delivery</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Inspect your fresh delivery and pay cash right at your door with total peace of mind.
            </p>
          </div>
        </div>
      </section>

      {/* 7. CUSTOMER REVIEWS */}
      <section className="container">
        <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
          <span className="badge badge-green" style={{ marginBottom: '0.5rem' }}>Verified Customer Feedback</span>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#173D32' }}>
            What Our Customers Say
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Real reviews from neighborhood customers who switched to fresh chakki milling
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', gap: '2px', color: '#C9A44C', marginBottom: '0.75rem' }}>
              {[1, 2, 3, 4, 5].map(n => <Star key={n} size={16} fill="currentColor" />)}
            </div>
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              “The Sharbati Atta is exceptional. You can literally smell the sweet aroma of pure wheat when you knead the dough. The rotis puff up like balloons and stay remarkably soft till night!”
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E8F5EC', color: '#173D32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                PS
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#173D32' }}>Pooja Sharma</div>
                <div style={{ fontSize: '0.78rem', color: '#2E8B57', fontWeight: 600 }}>✔ Verified Buyer (Rohini)</div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', gap: '2px', color: '#C9A44C', marginBottom: '0.75rem' }}>
              {[1, 2, 3, 4, 5].map(n => <Star key={n} size={16} fill="currentColor" />)}
            </div>
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              “The Diabetic Care Multigrain Atta made a tangible difference in our family routine. It has roasted chana, methi, oats, and ragi in honest proportions. Highly recommend BPS Fresh Mills!”
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E8F5EC', color: '#173D32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                VM
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#173D32' }}>Vikram Mehta</div>
                <div style={{ fontSize: '0.78rem', color: '#2E8B57', fontWeight: 600 }}>✔ Verified Buyer (Pitampura)</div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', padding: '1.75rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', gap: '2px', color: '#C9A44C', marginBottom: '0.75rem' }}>
              {[1, 2, 3, 4, 5].map(n => <Star key={n} size={16} fill="currentColor" />)}
            </div>
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              “Pure Desi Chana Besan here has zero adulteration. When we made pakoras and besan laddoos, the fragrance filled the entire kitchen. Doorstep delivery is super punctual!”
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#E8F5EC', color: '#173D32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                AK
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#173D32' }}>Anita Kapoor</div>
                <div style={{ fontSize: '0.78rem', color: '#2E8B57', fontWeight: 600 }}>✔ Verified Buyer (Sector 14)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. BOTTOM CTA BANNER */}
      <section className="container">
        <div
          style={{
            backgroundColor: '#173D32',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-lg)',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}
        >
          <span style={{ fontSize: '2rem' }}>🌾</span>
          <h3 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 800, margin: '0.75rem 0', color: '#FFFFFF' }}>
            Ready to Taste Real Chakki Freshness?
          </h3>
          <p style={{ color: '#D1E7DD', maxWidth: '580px', margin: '0 auto 1.75rem', fontSize: '1rem', lineHeight: 1.6 }}>
            Order freshly milled whole wheat, multigrain, or seasonal millet flours today. Delivered to your doorstep within 15 KM with convenient Cash on Delivery.
          </p>
          <button
            onClick={() => navigate('shop')}
            className="btn btn-lg"
            style={{
              backgroundColor: '#2E8B57',
              color: '#FFFFFF',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#247346'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#2E8B57'}
          >
            Bring Home Freshness <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
