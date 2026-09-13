import React, { useState, useEffect } from 'react';
import { Search, X, ShoppingBag, ArrowRight } from 'lucide-react';
import { fetchApi } from '../utils/api';

export default function SearchModal({ isOpen, onClose, onSelectProduct, onNavigateShop }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      fetchApi(`/products?search=${encodeURIComponent(searchTerm.trim())}`)
        .then(res => {
          if (res.success) {
            setResults(res.products || []);
          }
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(23, 17, 15, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '5rem 1rem 1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '650px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid var(--border-subtle)', gap: '0.75rem' }}>
          <Search size={22} style={{ color: 'var(--wheat-gold)' }} />
          <input
            type="text"
            placeholder="Search chakki atta, multigrain, bajra, besan, sattu..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              border: 'none',
              fontSize: '1.1rem',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              padding: 0,
              boxShadow: 'none'
            }}
          />
          <button
            onClick={onClose}
            style={{ color: 'var(--text-muted)', padding: '0.25rem' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Results Body */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '1rem' }}>
          {loading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Searching fresh flours...
            </div>
          )}

          {!loading && searchTerm.trim() && results.length === 0 && (
            <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌾</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>No products found</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                We couldn't find any flour matching "{searchTerm}". Try searching for 'Atta', 'Besan', 'Bajra' or browse our full collection.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onNavigateShop();
                }}
                className="btn btn-sm btn-primary"
                style={{ marginTop: '1.25rem' }}
              >
                Browse All Products <ArrowRight size={14} />
              </button>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 0.5rem' }}>
                Found {results.length} Products
              </div>
              {results.map(prod => (
                <div
                  key={prod._id}
                  onClick={() => {
                    onSelectProduct(prod);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
                >
                  <img
                    src={prod.image || (prod.images && prod.images[0])}
                    alt={prod.name}
                    style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{prod.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{prod.category} • {prod.weight}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--earth-brown)', fontSize: '1.05rem' }}>₹{prod.price}</div>
                    {prod.stock <= 0 ? (
                      <span className="badge badge-red" style={{ fontSize: '0.68rem' }}>Out of Stock</span>
                    ) : (
                      <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>In Stock</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!searchTerm.trim() && (
            <div style={{ padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                Popular Searches
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {['Sharbati Atta', 'Chakki Atta', 'Multigrain Atta', 'Bajra Atta', 'Desi Chana Besan', 'Jowar Flour', 'Sattu'].map(kw => (
                  <button
                    key={kw}
                    onClick={() => setSearchTerm(kw)}
                    className="btn btn-sm btn-outline"
                    style={{ borderRadius: 'var(--radius-full)', fontSize: '0.8rem' }}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
