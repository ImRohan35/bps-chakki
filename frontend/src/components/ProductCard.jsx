import React, { useState } from 'react';
import { Heart, ShoppingBag, Star, Zap, Bell, Check, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function ProductCard({ product, onSelectProduct, onBuyNow, onNotifyMe }) {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [selectedWeight, setSelectedWeight] = useState(
    product.weight || (product.weights && product.weights[0]?.weight) || '5 KG'
  );
  const [addedNotice, setAddedNotice] = useState(false);

  // Variant price lookup
  let currentPrice = product.price;
  let originalPrice = product.originalPrice;

  if (product.weights && product.weights.length > 0) {
    const variant = product.weights.find(w => w.weight === selectedWeight);
    if (variant) {
      currentPrice = variant.price;
      if (variant.originalPrice) originalPrice = variant.originalPrice;
    }
  }

  // Calculate discount percentage
  const discountPercent = (originalPrice && originalPrice > currentPrice)
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  const savings = (originalPrice && originalPrice > currentPrice)
    ? originalPrice - currentPrice
    : 0;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= (product.lowStockThreshold || 5);
  const inWishlist = isInWishlist(product._id);

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    const res = addToCart(product, selectedWeight, 1);
    if (res.success) {
      setAddedNotice(true);
      setTimeout(() => setAddedNotice(false), 1800);
    } else {
      alert(res.message);
    }
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <div
      className="product-card-premium"
      onClick={() => onSelectProduct && onSelectProduct(product)}
      id={`product-card-${product._id || product.id}`}
    >
      {/* Media & Badges */}
      <div className="media-container">
        <img
          src={product.image || (product.images && product.images[0]) || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'}
          alt={product.name}
          loading="lazy"
        />

        {/* Top-Left Dynamic Badges */}
        {isOutOfStock ? (
          <span className="badge-stock-out" style={{ backgroundColor: '#667085', color: '#FFF' }}>Fresh Batch Coming Soon</span>
        ) : discountPercent > 0 ? (
          <span className="badge-discount-chip">
            <Zap size={11} fill="#FFF" /> {discountPercent}% OFF
          </span>
        ) : (
          <span className="badge-fresh-chip" style={{ background: '#2E8B57' }}>
            <Sparkles size={11} /> Fresh Chakki
          </span>
        )}

        {/* Top-Right Wishlist Button */}
        <button
          type="button"
          className={`btn-wishlist-circle ${inWishlist ? 'active' : ''}`}
          onClick={handleWishlist}
          title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart size={16} fill={inWishlist ? '#C0392B' : 'none'} />
        </button>
      </div>

      {/* Category / Subtitle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2E8B57' }}>
          {product.category || 'Pure Atta'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.76rem', fontWeight: 700, color: 'var(--wheat-gold)' }}>
          <Star size={13} fill="var(--wheat-gold)" color="var(--wheat-gold)" />
          <span style={{ color: 'var(--text-primary)' }}>{product.rating || '4.9'}</span>
          <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.7rem' }}>({product.reviewsCount || 38})</span>
        </div>
      </div>

      {/* Product Title */}
      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.3, minHeight: '2.6rem' }}>
        {product.name}
      </h3>

      {/* Weight Selector Pills */}
      {product.weights && product.weights.length > 1 ? (
        <div
          style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '0.85rem' }}
          onClick={e => e.stopPropagation()}
        >
          {product.weights.map(w => (
            <button
              key={w.weight}
              type="button"
              className={`weight-pill-btn ${selectedWeight === w.weight ? 'active' : ''}`}
              onClick={() => setSelectedWeight(w.weight)}
            >
              {w.weight}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.85rem' }}>
          Pack Size: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{selectedWeight}</span>
        </div>
      )}

      {/* Pricing Row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)' }}>
          ₹{currentPrice}
        </span>
        {originalPrice && originalPrice > currentPrice && (
          <span style={{ fontSize: '0.88rem', textDecoration: 'line-through', color: 'var(--text-muted)', fontWeight: 600 }}>
            ₹{originalPrice}
          </span>
        )}
        {savings > 0 && (
          <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--primary-fresh-green)', background: 'var(--soft-green-bg, #E8F5EC)', padding: '2px 6px', borderRadius: '4px' }}>
            Save ₹{savings}
          </span>
        )}
      </div>

      {/* Low Stock Indicator */}
      {isLowStock && (
        <div style={{ fontSize: '0.72rem', color: 'var(--warning-amber)', fontWeight: 700, marginBottom: '0.6rem' }}>
          ⚡ Only {product.stock} units freshly milled!
        </div>
      )}

      {/* Action Button */}
      <div style={{ marginTop: 'auto', width: '100%' }}>
        {isOutOfStock ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onNotifyMe) onNotifyMe(product);
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--warning-amber)',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <Bell size={15} /> Notify When Fresh Batch Ready
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className={`btn-add-cart-premium ${addedNotice ? 'added' : ''}`}
            id={`add-to-cart-${product._id || product.id}`}
          >
            {addedNotice ? (
              <>
                <Check size={16} /> Added to Cart!
              </>
            ) : (
              <>
                <ShoppingBag size={16} /> Add to Cart
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
