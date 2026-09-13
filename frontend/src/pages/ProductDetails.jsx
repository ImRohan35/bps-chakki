import React, { useState, useEffect } from 'react';
import {
  Star,
  ShoppingBag,
  Zap,
  Heart,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  Bell,
  Check,
  ChevronLeft,
  AlertCircle,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';

export default function ProductDetails({ productId, navigate, onNotifyMe }) {
  const activeProductId = productId || (typeof window !== 'undefined' ? localStorage.getItem('bps_selected_product_id') : null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeight, setSelectedWeight] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  // Review submission state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState(null);

  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!activeProductId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchApi(`/products/${activeProductId}`)
      .then(res => {
        if (res.success && res.product) {
          setProduct(res.product);
          setSelectedWeight(res.product.weight || (res.product.weights && res.product.weights[0]?.weight) || '5 KG');
          setSelectedImage(res.product.image || (res.product.images && res.product.images[0]) || '');
        }
      })
      .catch(err => console.error('Error loading product details:', err))
      .finally(() => setLoading(false));
  }, [activeProductId]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '5rem 1.25rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading fresh product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '5rem 1.25rem', textAlign: 'center' }}>
        <h2>Product Not Found</h2>
        <button onClick={() => navigate('shop')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Shop
        </button>
      </div>
    );
  }

  // Determine current price and variant
  let currentPrice = product.price;
  let originalPrice = product.originalPrice;

  if (product.weights && product.weights.length > 0) {
    const variant = product.weights.find(w => w.weight === selectedWeight);
    if (variant) {
      currentPrice = variant.price;
      if (variant.originalPrice) originalPrice = variant.originalPrice;
    }
  }

  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= (product.lowStockThreshold || 5);
  const inWishlist = isInWishlist(product._id);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const res = addToCart(product, selectedWeight, quantity);
    if (res.success) {
      setAddedNotice(true);
      setTimeout(() => setAddedNotice(false), 2000);
    } else {
      alert(res.message);
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, selectedWeight, quantity);
    navigate('checkout');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('login');
      return;
    }

    setSubmittingReview(true);
    setReviewMessage(null);

    try {
      const res = await fetchApi(`/products/${product._id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: Number(reviewRating),
          comment: reviewComment
        })
      });

      if (res.success) {
        setReviewMessage({ type: 'success', text: res.message });
        setReviewComment('');
        // Reload reviews
        const updated = await fetchApi(`/products/${product._id}`);
        if (updated.success) setProduct(updated.product);
      }
    } catch (err) {
      setReviewMessage({ type: 'error', text: err.message || 'Could not submit review' });
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      {/* Breadcrumb / Back Button */}
      <button
        onClick={() => navigate('shop')}
        className="btn btn-sm btn-outline"
        style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      >
        <ChevronLeft size={16} /> Back to Shop
      </button>

      {/* Main Product Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'start' }}>
        {/* Left: Product Media Gallery */}
        <div>
          <div
            style={{
              width: '100%',
              height: '420px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border-subtle)',
              position: 'relative'
            }}
          >
            <img
              src={selectedImage}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            {/* Wishlist toggle */}
            <button
              onClick={() => toggleWishlist(product)}
              className={`wishlist-heart-btn ${inWishlist ? 'active' : ''}`}
              style={{ position: 'absolute', top: '16px', right: '16px' }}
              title={inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
            >
              <Heart size={20} fill={inWishlist ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Thumbnails if multiple images */}
          {product.images && product.images.length > 1 && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              {product.images.map((imgUrl, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedImage(imgUrl)}
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: selectedImage === imgUrl ? '2px solid var(--wheat-gold)' : '1px solid var(--border-subtle)'
                  }}
                >
                  <img src={imgUrl} alt={`Thumbnail ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info & Actions (Screen 3 Design) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#173D32', lineHeight: 1.2, marginBottom: '0.5rem' }}>
              {product.name}
            </h1>
          </div>

          {/* Rating Summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#C9A44C' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <Star
                  key={n}
                  size={18}
                  fill={n <= Math.round(product.rating || 5) ? '#C9A44C' : 'none'}
                  color="#C9A44C"
                />
              ))}
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              ({(product.reviews && product.reviews.length) || product.reviewCount || 120} reviews)
            </span>
          </div>

          {/* Pricing Row */}
          <div>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#173D32' }}>
              ₹{currentPrice}
            </span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, margin: '0.5rem 0 1rem 0' }}>
             {product.shortDescription || 'Freshly milled wheat atta made from premium quality grains. No preservatives. 100% natural.'}
          </p>

          {/* Weight Selection */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.6rem', color: 'var(--text-secondary)' }}>
              Select Weight:
            </label>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {(product.weights && product.weights.length > 0 ? product.weights : [{ weight: product.weight || '5 KG', price: product.price }, { weight: '10 KG', price: (product.price * 2 - 40) }]).map(w => {
                const isSelected = selectedWeight === w.weight;
                return (
                  <button
                    key={w.weight}
                    onClick={() => setSelectedWeight(w.weight)}
                    style={{
                      padding: '0.8rem 1.5rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      border: isSelected ? '2px solid #173D32' : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? '#173D32' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#1F2933',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{w.weight}</span>
                    <span style={{ fontWeight: isSelected ? 700 : 500, marginTop: '2px', opacity: isSelected ? 0.9 : 0.8 }}>₹{w.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Controls & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', height: '48px', backgroundColor: '#FFFFFF' }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{ padding: '0 1rem', height: '100%', backgroundColor: 'transparent', fontWeight: 700, border: 'none', cursor: 'pointer', color: '#1F2933' }}
              >
                -
              </button>
              <span style={{ padding: '0 0.5rem', fontWeight: 600, minWidth: '30px', textAlign: 'center', color: '#1F2933' }}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                style={{ padding: '0 1rem', height: '100%', backgroundColor: 'transparent', fontWeight: 700, border: 'none', cursor: 'pointer', color: '#1F2933' }}
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              style={{ flex: 1, padding: '0', height: '48px', backgroundColor: addedNotice ? '#1E6B3F' : '#2E8B57', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(46, 139, 87, 0.25)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              onMouseEnter={e => { if (!addedNotice) e.currentTarget.style.backgroundColor='#247346'; }}
              onMouseLeave={e => { if (!addedNotice) e.currentTarget.style.backgroundColor='#2E8B57'; }}
            >
              {addedNotice ? <><Check size={18} /> Added!</> : <><ShoppingBag size={18} /> Add to Cart</>}
            </button>

            <button
              onClick={handleBuyNow}
              style={{ flex: 1.2, padding: '0', height: '48px', backgroundColor: '#C9A44C', color: '#173D32', border: 'none', borderRadius: '8px', fontWeight: 900, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(201, 164, 76, 0.35)', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor='#B8913B'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor='#C9A44C'; }}
            >
              <Zap size={18} fill="#173D32" /> Order Now
            </button>
            
            <button
              onClick={() => toggleWishlist(product)}
              style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-subtle)', borderRadius: '8px', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
            >
               <Heart size={20} fill={inWishlist ? '#C0392B' : 'none'} color={inWishlist ? '#C0392B' : '#1F2933'} />
            </button>
          </div>

          {/* Bottom Features Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} color="var(--wheat-gold)" />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>100% Natural</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RotateCcw size={18} color="var(--wheat-gold)" />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Freshly Milled</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} color="var(--wheat-gold)" />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Preservatives</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Ingredients Tabs */}
      <div style={{ marginTop: '4rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* About this flour */}
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            About This Fresh Flour
          </h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.98rem' }}>
            {product.description}
          </p>

          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Ingredients & Grain Breakdown:
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {product.ingredients || '100% whole grains, stone-milled with zero artificial additives.'}
          </p>
        </div>

        {/* Customer Reviews & Form Section */}
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Verified Customer Reviews
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Only confirmed buyers can leave reviews to guarantee authenticity.
              </p>
            </div>
          </div>

          {/* Review Submission Form */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={16} /> Write a Review
            </h4>

            {reviewMessage && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.88rem', backgroundColor: reviewMessage.type === 'success' ? 'var(--nature-light)' : 'var(--danger-light)', color: reviewMessage.type === 'success' ? 'var(--nature-green)' : 'var(--danger-rust)' }}>
                {reviewMessage.text}
              </div>
            )}

            <form onSubmit={handleReviewSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                  Your Star Rating:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      style={{ color: star <= reviewRating ? 'var(--warning-amber)' : 'var(--border-strong)', padding: '2px' }}
                    >
                      <Star size={22} fill={star <= reviewRating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <textarea
                  rows="3"
                  placeholder="Share your cooking experience, aroma, roti softness..."
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-sm btn-primary"
                disabled={submittingReview}
              >
                {submittingReview ? 'Submitting...' : 'Submit Verified Review'}
              </button>
            </form>
          </div>

          {/* List of Existing Reviews */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {product.reviews && product.reviews.length > 0 ? (
              product.reviews.map((rev, i) => (
                <div
                  key={rev._id || i}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{rev.customerName}</span>
                      {rev.verifiedPurchase && (
                        <span className="badge badge-green" style={{ fontSize: '0.68rem' }}>
                          ✔ Verified Purchase
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '2px', color: 'var(--warning-amber)' }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star key={n} size={14} fill={n <= rev.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {rev.comment}
                  </p>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No reviews yet. Be the first verified customer to review this flour!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
