import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Star,
  Play,
  Heart,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Check,
  Copy,
  Zap
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { fetchApi } from '../utils/api';
import StoryVideoModal from '../components/StoryVideoModal';

export default function Home({ navigate, onSelectProduct }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoOpen, setVideoOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // 3D Mouse Parallax State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroCardRef = useRef(null);
  const productSliderRef = useRef(null);
  const canvasRef = useRef(null);

  // Load real products & reviews
  useEffect(() => {
    Promise.all([
      fetchApi('/products'),
      fetchApi('/reviews')
    ]).then(([prodRes, revRes]) => {
      if (prodRes.success && prodRes.products) {
        setProducts(prodRes.products);
      }
      if (revRes.success && revRes.reviews) {
        setReviews(revRes.reviews);
      }
    }).catch(err => {
      console.error('Error fetching home data:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  // Subtle 3D Floating Wheat Particles Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 650;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 18 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2.5 + 1.2,
      speedX: (Math.random() - 0.4) * 0.4,
      speedY: Math.random() * 0.4 + 0.15,
      alpha: Math.random() * 0.4 + 0.15,
      color: Math.random() > 0.4 ? '#C9A44C' : '#E8D29F'
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
        if (p.x > canvas.width) p.x = 0;
        if (p.x < 0) p.x = canvas.width;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const handleHeroMouseMove = (e) => {
    if (!heroCardRef.current) return;
    const rect = heroCardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x: x * 15, y: y * 15 });
  };

  const handleHeroMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleAddToCart = (product, e) => {
    if (e) e.stopPropagation();
    const weightObj = product.weights?.[0] || { weight: product.weight || '5 KG', price: product.price };
    addToCart(product, weightObj.weight, 1);
    showToast(`Added ${product.name} (${weightObj.weight}) to Cart!`);
  };

  const handleBuyNow = (product, e) => {
    if (e) e.stopPropagation();
    const weightObj = product.weights?.[0] || { weight: product.weight || '5 KG', price: product.price };
    const buyNowItem = {
      productId: product._id || product.id,
      name: product.name,
      weight: weightObj.weight,
      texture: 'Medium',
      price: weightObj.price,
      originalPrice: product.originalPrice,
      quantity: 1,
      image: product.image || (product.images && product.images[0]) || '',
      maxStock: product.stock !== undefined ? product.stock : 20
    };
    sessionStorage.setItem('bps_buy_now_item', JSON.stringify(buyNowItem));

    const token = localStorage.getItem('bps_token');
    if (!token) {
      navigate('login');
    } else {
      navigate('checkout');
    }
  };

  const scrollSlider = (direction) => {
    if (!productSliderRef.current) return;
    const scrollAmount = direction === 'left' ? -340 : 340;
    productSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText('BPS10').catch(() => {});
    setCopiedCode(true);
    showToast('Coupon code BPS10 copied! 10% OFF applied.');
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // 6 Curated Best Sellers matching the reference image cards
  const displayBestSellers = [
    {
      _id: 'bps_premium_chakki',
      name: 'Premium Chakki Atta',
      weight: '5 KG',
      price: 320,
      image: '/products/pack-premium-chakki.jpg'
    },
    {
      _id: 'bps_multigrain',
      name: 'Multigrain Atta',
      weight: '5 KG',
      price: 360,
      image: '/products/pack-multigrain.jpg'
    },
    {
      _id: 'bps_chana_besan',
      name: 'Desi Chana Besan',
      weight: '1 KG',
      price: 120,
      image: '/products/pack-chana-besan.jpg'
    },
    {
      _id: 'bps_diabetic_care',
      name: 'Diabetic Care Atta',
      weight: '5 KG',
      price: 340,
      image: '/products/pack-diabetic-care.jpg'
    },
    {
      _id: 'bps_jowar_atta',
      name: 'Jowar Atta',
      weight: '5 KG',
      price: 280,
      image: '/products/pack-jowar-atta.jpg'
    },
    {
      _id: 'bps_bajra_atta',
      name: 'Bajra Atta',
      weight: '5 KG',
      price: 300,
      image: '/products/pack-bajra-atta.jpg'
    }
  ];

  // 3 Verified Customer Testimonials matching the reference
  const displayReviews = [
    {
      name: 'Priya Sharma',
      location: 'Varanasi',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      comment: '“BPS Fresh Mills atta is so fresh and soft. My family loves it. The taste is just like homemade.”'
    },
    {
      name: 'Amit Verma',
      location: 'Mirzapur',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      comment: '“Best quality and timely delivery. Finally a brand that truly cares about health.”'
    },
    {
      name: 'Neha Singh',
      location: 'Prayagraj',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      rating: 5,
      comment: '“Pure, fresh and affordable. Highly recommend BPS Fresh Mills to every family.”'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F5F7F5' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', background: '#0B3B24', color: '#FFFFFF',
          padding: '0.85rem 1.5rem', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          zIndex: 9999, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #C9A44C'
        }}>
          <CheckCircle2 size={18} color="#C9A44C" /> {toastMsg}
        </div>
      )}

      {/* ── 3. HERO SECTION (Exact Reference Composition) ── */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#FAF7F2',
          padding: '3.5rem 0 2.5rem',
          borderBottom: '1px solid #E5EBE6'
        }}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
      >
        {/* Floating Wheat Particles Canvas */}
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 3 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            alignItems: 'center',
            gap: '3rem'
          }}>
            {/* Left Content Column */}
            <div>
              {/* Pill Tag */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.45rem 1rem',
                backgroundColor: '#0B3B24',
                color: '#D1E7DD',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
                boxShadow: '0 2px 8px rgba(11,59,36,0.15)'
              }}>
                <span>🌱</span> Goodness Ground Fresh
              </div>

              {/* Headline */}
              <h1 style={{
                fontSize: 'clamp(2.5rem, 4.5vw, 3.8rem)',
                fontWeight: 900,
                color: '#0B3B24',
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                marginBottom: '1rem',
                fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif"
              }}>
                Freshly Milled.<br />
                Naturally Good.
              </h1>

              {/* Subtext */}
              <p style={{
                fontSize: '1.05rem',
                color: '#4B5563',
                lineHeight: 1.55,
                maxWidth: '460px',
                marginBottom: '2rem',
                fontWeight: 500
              }}>
                Pure chakki atta, made from the finest grains for a healthier tomorrow.
              </p>

              {/* CTA Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                <button
                  onClick={() => navigate('shop')}
                  style={{
                    backgroundColor: '#0B3B24',
                    color: '#FFFFFF',
                    padding: '0.9rem 1.85rem',
                    borderRadius: '999px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.98rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 6px 16px rgba(11,59,36,0.25)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#16A34A'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0B3B24'}
                >
                  Shop Fresh Atta →
                </button>

                <button
                  onClick={() => setVideoOpen(true)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#0B3B24',
                    padding: '0.85rem 1.6rem',
                    borderRadius: '999px',
                    border: '1.5px solid #0B3B24',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F7F2'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#0B3B24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                    <Play size={10} style={{ marginLeft: 2 }} fill="#FFFFFF" />
                  </div>
                  Watch Our Story
                </button>
              </div>

              {/* 4 Feature Badges in 4-Grid Strip */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
                maxWidth: '560px'
              }}>
                {[
                  { icon: '🌿', title: '100% Natural', desc: 'No Chemicals' },
                  { icon: '🪨', title: 'Stone Ground', desc: 'Traditional Taste' },
                  { icon: '🌾', title: 'Rich in Nutrition', desc: 'Goodness in Every Bite' },
                  { icon: '🚚', title: 'Local Delivery', desc: 'within 15 KM' }
                ].map((f, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E5EBE6',
                      borderRadius: '12px',
                      padding: '0.75rem 0.65rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                    }}
                  >
                    <span style={{ fontSize: '1.3rem' }}>{f.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0B3B24', lineHeight: 1.2 }}>
                        {f.title}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#667085', marginTop: '2px' }}>
                        {f.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Hero Visual: 3D Parallax Composite with Chakki, Bag, and Flour Bowl */}
            <div
              ref={heroCardRef}
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                transform: `perspective(1000px) rotateY(${mousePos.x * 0.4}deg) rotateX(${-mousePos.y * 0.4}deg)`,
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {/* Script Calligraphic Badge on Top Right */}
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '20px',
                zIndex: 10,
                fontFamily: "'Caveat', cursive, var(--font-serif)",
                fontSize: '1.5rem',
                color: '#8B5E34',
                fontWeight: 700,
                textAlign: 'right',
                lineHeight: 1.1,
                transform: 'rotate(-4deg)',
                textShadow: '0 2px 8px rgba(255,255,255,0.8)'
              }}>
                From Our Chakki<br />to Your Home ♡
              </div>

              {/* Main Composite Image */}
              <div style={{
                width: '100%',
                maxWidth: '540px',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(11,59,36,0.18)',
                border: '4px solid #FFFFFF'
              }}>
                <img
                  src="/hero-composite-chakki.jpg"
                  alt="BPS Fresh Mills Premium Chakki Atta Bag with Traditional Stone Mill and Flour Bowl"
                  style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. TRUST & BENEFITS STRIP ── */}
      <section style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5EBE6', padding: '1.5rem 0' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem',
            alignItems: 'center'
          }}>
            {[
              { icon: '🌿', title: 'Better Nutrition', sub: 'for a Healthier You' },
              { icon: '🌾', title: 'Freshly Milled', sub: 'in Small Batches' },
              { icon: '🛡️', title: 'No Preservatives', sub: '100% Natural' },
              { icon: '🤝', title: 'Trusted by', sub: '10,000+ Families' }
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  backgroundColor: '#F0F7F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  flexShrink: 0
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0B3B24' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#667085' }}>
                    {item.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. OUR BEST SELLERS (Horizontal Scrollable Carousel) ── */}
      <section style={{ padding: '3.5rem 0', backgroundColor: '#F5F7F5' }}>
        <div className="container">
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0B3B24', margin: 0, letterSpacing: '-0.02em' }}>
                Our Best Sellers
              </h2>
              <p style={{ color: '#667085', fontSize: '0.92rem', margin: '4px 0 0' }}>
                Pure. Fresh. Nutritious. Loved by Families.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => navigate('shop')}
                style={{ background: 'none', border: 'none', color: '#0B3B24', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                View All Products →
              </button>

              {/* Slider Arrow Buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => scrollSlider('left')}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#FFFFFF', border: '1px solid #D1D5DB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#374151'
                  }}
                  title="Previous"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => scrollSlider('right')}
                  style={{
                    width: 36, height: 36, borderRadius: '50%', background: '#0B3B24', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#FFFFFF'
                  }}
                  title="Next"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Horizontal Product Cards Carousel */}
          <div
            ref={productSliderRef}
            style={{
              display: 'flex',
              gap: '1.25rem',
              overflowX: 'auto',
              paddingBottom: '1rem',
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none'
            }}
          >
            {displayBestSellers.map(p => {
              const matchedDbProduct = products.find(dp => dp.name.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])) || p;
              const inWish = isInWishlist(p._id);

              return (
                <div
                  key={p._id}
                  onClick={() => onSelectProduct ? onSelectProduct(matchedDbProduct) : navigate('shop')}
                  style={{
                    flex: '0 0 240px',
                    scrollSnapAlign: 'start',
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E5EBE6',
                    padding: '1.1rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(11,59,36,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                  }}
                >
                  {/* Wishlist Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(matchedDbProduct);
                    }}
                    style={{
                      position: 'absolute', top: 12, right: 12, width: 30, height: 30,
                      borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: inWish ? '#DC2626' : '#9CA3AF', cursor: 'pointer', zIndex: 5
                    }}
                    title="Add to Wishlist"
                  >
                    <Heart size={16} fill={inWish ? '#DC2626' : 'none'} />
                  </button>

                  {/* Product Pack Mockup Image */}
                  <div style={{ width: '100%', height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.85rem' }}>
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', transition: 'transform 0.2s' }}
                    />
                  </div>

                  {/* Product Details */}
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0B3B24', margin: '0 0 2px', lineHeight: 1.25 }}>
                      {p.name}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#667085', fontWeight: 600, marginBottom: '0.65rem' }}>
                      {p.weight}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0B3B24' }}>
                        ₹{p.price}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', width: '100%' }}>
                      <button
                        onClick={(e) => handleAddToCart(matchedDbProduct, e)}
                        style={{
                          padding: '0.45rem 0.4rem',
                          borderRadius: '8px',
                          border: '1.5px solid #16A34A',
                          background: '#FFFFFF',
                          color: '#16A34A',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#16A34A';
                          e.currentTarget.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#FFFFFF';
                          e.currentTarget.style.color = '#16A34A';
                        }}
                      >
                        <ShoppingBag size={13} /> Add to Cart
                      </button>

                      <button
                        onClick={(e) => handleBuyNow(matchedDbProduct, e)}
                        style={{
                          padding: '0.45rem 0.4rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#0B3B24',
                          color: '#FFFFFF',
                          fontWeight: 900,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 6px rgba(11, 59, 36, 0.25)',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#062315';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = '#0B3B24';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <Zap size={13} fill="#C9A44C" color="#C9A44C" /> Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. FROM FARM TO YOUR TABLE (Visual Storytelling Banner) ── */}
      <section id="farm-to-table" style={{ padding: '2rem 0', backgroundColor: '#F5F7F5' }}>
        <div className="container">
          <div style={{
            position: 'relative',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 12px 36px rgba(11,59,36,0.12)',
            border: '1px solid #D6E8DC',
            minHeight: '380px',
            display: 'flex',
            alignItems: 'center'
          }}>
            {/* Background Image */}
            <img
              src="/farm-to-table-banner.jpg"
              alt="Artisanal Chakki Milling"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center right',
                zIndex: 1
              }}
            />

            {/* Gradient Overlay for Crisp Text Readability on Left */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, rgba(250,247,242,0.96) 0%, rgba(250,247,242,0.9) 45%, rgba(250,247,242,0.2) 75%, transparent 100%)',
              zIndex: 2
            }} />

            {/* Content Container */}
            <div style={{ position: 'relative', zIndex: 3, padding: '2.5rem', width: '100%', maxWidth: '640px' }}>
              <h2 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', fontWeight: 900, color: '#0B3B24', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
                From Farm to Your Table
              </h2>
              <p style={{ color: '#4B5563', fontSize: '0.98rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Traditional chakki. Modern hygiene. Same authentic taste.
              </p>

              <button
                onClick={() => navigate('about')}
                style={{
                  padding: '0.75rem 1.6rem',
                  backgroundColor: '#0B3B24',
                  color: '#FFFFFF',
                  borderRadius: '999px',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '2rem',
                  boxShadow: '0 4px 12px rgba(11,59,36,0.25)'
                }}
              >
                Learn Our Process →
              </button>

              {/* 4 Connected Process Step Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { icon: '🌾', title: 'Carefully Sourced', sub: 'Grains' },
                  { icon: '✨', title: 'Cleaned & Tested', sub: 'for Purity' },
                  { icon: '🪨', title: 'Stone Ground', sub: 'in Small Batches' },
                  { icon: '📦', title: 'Packed Fresh', sub: 'with Care' }
                ].map((step, sIdx) => (
                  <React.Fragment key={sIdx}>
                    <div style={{
                      background: '#FFFFFF',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #E5EBE6',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>{step.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: '0.72rem', color: '#0B3B24', lineHeight: 1.2 }}>
                        {step.title}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#667085' }}>
                        {step.sub}
                      </div>
                    </div>
                    {sIdx < 3 && (
                      <span style={{ color: '#C9A44C', fontWeight: 900, fontSize: '1rem' }}>›</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Play Button Trigger Overlay on the Chakki */}
            <div style={{
              position: 'absolute',
              right: '25%',
              top: '50%',
              transform: 'translate(50%, -50%)',
              zIndex: 4
            }}>
              <button
                onClick={() => setVideoOpen(true)}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.92)',
                  border: '3px solid #C9A44C',
                  color: '#0B3B24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  transition: 'transform 0.15s, background-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                title="Watch Process Video"
              >
                <Play size={24} style={{ marginLeft: 3 }} fill="#0B3B24" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. OFFERS SECTION (Two Premium Promo Cards) ── */}
      <section id="offers-section" style={{ padding: '2rem 0', backgroundColor: '#F5F7F5' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.5rem'
          }}>
            {/* Offer Card 1: Flat 10% OFF on First Order */}
            <div style={{
              background: 'linear-gradient(135deg, #0B3B24 0%, #124D31 100%)',
              borderRadius: '20px',
              padding: '2rem',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 30px rgba(11,59,36,0.2)'
            }}>
              <div style={{ position: 'relative', zIndex: 2, maxWidth: '260px' }}>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 0.25rem', lineHeight: 1.15 }}>
                  Flat 10% OFF
                </h3>
                <div style={{ fontSize: '1rem', color: '#D1E7DD', fontWeight: 600, marginBottom: '1.25rem' }}>
                  on First Order
                </div>

                {/* Coupon Pill Button */}
                <button
                  onClick={handleCopyCode}
                  style={{
                    background: '#FFFFFF',
                    color: '#0B3B24',
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '1.25rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                  title="Click to copy coupon code"
                >
                  {copiedCode ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                  Use Code: BPS10
                </button>

                <div>
                  <button
                    onClick={() => navigate('shop')}
                    style={{
                      padding: '0.65rem 1.4rem',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.4)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      cursor: 'pointer'
                    }}
                  >
                    Shop Now →
                  </button>
                </div>
              </div>

              {/* Overflowing Flour Bowl Image on Right */}
              <div style={{ width: '180px', height: '180px', borderRadius: '14px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)' }}>
                <img
                  src="/hero-composite-chakki.jpg"
                  alt="Fresh Flour Bowl"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            {/* Offer Card 2: Healthy Families Happier Tomorrows */}
            <div style={{
              background: 'linear-gradient(135deg, #0B3B24 0%, #144630 100%)',
              borderRadius: '20px',
              padding: '2rem',
              color: '#FFFFFF',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 30px rgba(11,59,36,0.2)'
            }}>
              <div style={{ position: 'relative', zIndex: 2, maxWidth: '260px' }}>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#FFFFFF', margin: '0 0 0.25rem', lineHeight: 1.15 }}>
                  Healthy Families<br />Happier Tomorrows
                </h3>
                <div style={{ fontSize: '0.88rem', color: '#D1E7DD', margin: '0.5rem 0 1.5rem', lineHeight: 1.4 }}>
                  Good food today,<br />a better tomorrow.
                </div>

                <button
                  onClick={() => navigate('about')}
                  style={{
                    padding: '0.65rem 1.4rem',
                    borderRadius: '999px',
                    backgroundColor: '#FFFFFF',
                    border: 'none',
                    color: '#0B3B24',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  Read More →
                </button>
              </div>

              {/* Family Meal Image on Right */}
              <div style={{ width: '180px', height: '180px', borderRadius: '14px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)' }}>
                <img
                  src="/family-roti-meal.jpg"
                  alt="Indian Family Enjoying Healthy Rotis"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. CUSTOMER REVIEWS (WHAT OUR CUSTOMERS SAY) ── */}
      <section style={{ padding: '3.5rem 0 4.5rem', backgroundColor: '#F5F7F5' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0B3B24', margin: 0, letterSpacing: '-0.02em' }}>
                What Our Customers Say
              </h2>
              <p style={{ color: '#667085', fontSize: '0.92rem', margin: '4px 0 0' }}>
                Real customers. Real stories. Real goodness.
              </p>
            </div>

            <button
              onClick={() => navigate('about')}
              style={{ background: 'none', border: 'none', color: '#0B3B24', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              View All Reviews →
            </button>
          </div>

          {/* 3 Review Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {displayReviews.map((rev, rIdx) => (
              <div
                key={rIdx}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E5EBE6',
                  padding: '1.5rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Customer Info Row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.85rem' }}>
                    <img
                      src={rev.avatar}
                      alt={rev.name}
                      style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', border: '2px solid #16A34A' }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, color: '#0B3B24', fontSize: '0.98rem' }}>
                        {rev.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#667085' }}>
                        {rev.location}
                      </div>
                    </div>
                  </div>

                  {/* 5 Stars */}
                  <div style={{ display: 'flex', gap: '3px', color: '#F59E0B', marginBottom: '0.85rem' }}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} size={15} fill="#F59E0B" />
                    ))}
                  </div>

                  {/* Comment */}
                  <p style={{ color: '#374151', fontSize: '0.9rem', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
                    {rev.comment}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. PROMOTIONAL VIDEO MODAL ── */}
      <StoryVideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />
    </div>
  );
}
