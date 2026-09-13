import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Sparkles, ShieldCheck, Flame, Truck, CheckCircle2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { fetchApi } from '../utils/api';

export default function Shop({ navigate, onSelectProduct, onNotifyMe }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedWeight, setSelectedWeight] = useState('All');
  const [maxPrice, setMaxPrice] = useState(800);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [hasOfferOnly, setHasOfferOnly] = useState(false);
  const [minRating, setMinRating] = useState('');
  const [sortBy, setSortBy] = useState('recommended');

  // Load categories
  useEffect(() => {
    fetchApi('/products/categories')
      .then(res => {
        if (res.success && res.categories) {
          setCategories(res.categories);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch filtered products
  const fetchProducts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
    if (selectedWeight && selectedWeight !== 'All') params.append('weight', selectedWeight);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (inStockOnly) params.append('inStock', 'true');
    if (hasOfferOnly) params.append('hasOffer', 'true');
    if (minRating) params.append('rating', minRating);
    if (sortBy) params.append('sort', sortBy);

    fetchApi(`/products?${params.toString()}`)
      .then(res => {
        if (res.success) {
          setProducts(res.products || []);
        }
      })
      .catch(err => console.error('Error fetching products:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, selectedWeight, maxPrice, inStockOnly, hasOfferOnly, minRating, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setSelectedWeight('All');
    setMaxPrice(800);
    setInStockOnly(false);
    setHasOfferOnly(false);
    setMinRating('');
    setSortBy('recommended');
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 5rem' }}>
      {/* ── Attractive Shop Banner ── */}
      <div
        className="shop-hero-banner"
        style={{
          background: 'var(--bg-card, #F8FAFC)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          padding: '2.25rem 2rem',
          marginBottom: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ maxWidth: '750px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--soft-green-bg, #E8F5EC)', border: '1px solid var(--nature-green)', padding: '4px 12px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--nature-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
            <Sparkles size={13} /> 100% Stone-Ground Freshness
          </div>
          <h1 className="shop-banner-heading" style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: '0.6rem' }}>
            Fresh Chakki Milling, Direct To Your Kitchen
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Every grain is stone-ground cold on order to retain natural vitamins, germ, and bran. Never stored, never stale, zero chemical polish.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--nature-green)' }}>
              <CheckCircle2 size={16} /> Preservative-Free
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--nature-green)' }}>
              <Truck size={16} /> Delivery Within 15 KM
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--nature-green)' }}>
              <ShieldCheck size={16} /> Cash on Delivery Available
            </span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls Bar ── */}
      <div
        className="shop-filter-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
          padding: '1rem 1.25rem',
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ flex: '1', minWidth: '220px', maxWidth: '380px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search stone-ground atta, besan, grains..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem 0.75rem 2.5rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-secondary)',
                fontSize: '0.92rem',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            <Search size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </form>

        {/* Quick toggle chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setHasOfferOnly(!hasOfferOnly)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '999px',
              border: hasOfferOnly ? '1px solid var(--warning-amber)' : '1px solid var(--border-subtle)',
              background: hasOfferOnly ? 'var(--warning-light)' : 'var(--bg-secondary)',
              color: hasOfferOnly ? 'var(--warning-amber)' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Flame size={13} /> On Sale Only
          </button>

          <button
            type="button"
            onClick={() => setInStockOnly(!inStockOnly)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '999px',
              border: inStockOnly ? '1px solid var(--nature-green)' : '1px solid var(--border-subtle)',
              background: inStockOnly ? 'var(--nature-light)' : 'var(--bg-secondary)',
              color: inStockOnly ? 'var(--nature-green)' : 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            In Stock Only
          </button>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Sort:</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{
                padding: '0.5rem 0.8rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none',
                fontSize: '0.85rem'
              }}
            >
              <option value="recommended">Featured / Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Customer Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Sidebar Categories + Products Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2.5rem', alignItems: 'start' }}>
        
        {/* CATEGORIES SIDEBAR */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Categories</h3>
            {(selectedCategory !== 'All' || search || hasOfferOnly || inStockOnly) && (
              <button
                onClick={handleResetFilters}
                style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning-amber)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => setSelectedCategory('All')}
              style={{
                textAlign: 'left',
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.92rem',
                fontWeight: selectedCategory === 'All' || selectedCategory === 'All Products' ? 800 : 500,
                backgroundColor: selectedCategory === 'All' || selectedCategory === 'All Products' ? '#E8F5EC' : 'transparent',
                color: selectedCategory === 'All' || selectedCategory === 'All Products' ? '#173D32' : '#667085',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              🌾 All Products
            </button>
            {categories.filter(c => c !== 'All' && c !== 'All Products').map(cat => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    textAlign: 'left',
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.92rem',
                    fontWeight: active ? 800 : 500,
                    backgroundColor: active ? '#E8F5EC' : 'transparent',
                    color: active ? '#173D32' : '#667085',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Quick Promise Banner */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.82rem', color: '#173D32', marginBottom: '0.35rem' }}>
              🌱 Stone Ground Daily
            </div>
            <p style={{ fontSize: '0.75rem', color: '#667085', lineHeight: 1.4, margin: 0 }}>
              Grown by trusted regional farmers & stone-ground fresh without additives or preservatives.
            </p>
          </div>
        </div>

        {/* PRODUCTS LISTING AREA */}
        <div>
          {/* Header count info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Showing <strong style={{ color: '#173D32' }}>{products.length}</strong> fresh products
            </span>
          </div>

          {/* Loading State */}
          {loading && (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🌾</div>
              Loading fresh products...
            </div>
          )}

          {/* Empty State */}
          {!loading && products.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 2rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px dashed var(--border-subtle)'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌾</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#173D32', marginBottom: '0.5rem' }}>
                Nothing Fresh Here Yet
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                Try clearing your search or switching to another category.
              </p>
              <button
                onClick={handleResetFilters}
                className="btn btn-primary"
              >
                <RotateCcw size={16} /> Reset Filters
              </button>
            </div>
          )}

          {/* Products Grid */}
          {!loading && products.length > 0 && (
            <div className="product-grid" style={{ marginTop: 0 }}>
              {products.map(prod => (
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
        </div>
      </div>
    </div>
  );
}
