import React, { useState } from 'react';
import { ShoppingBag, Trash2, ArrowRight, Tag, ShieldCheck, Truck, Check, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Cart({ navigate }) {
  const {
    cartItems,
    subtotal,
    discount,
    deliveryCharge,
    finalTotal,
    coupon,
    storeSettings,
    updateQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon
  } = useCart();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [applying, setApplying] = useState(false);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setApplying(true);
    setCouponError('');
    setCouponSuccess('');

    const res = await applyCoupon(couponInput.trim());
    if (res.success) {
      setCouponSuccess(res.message);
      setCouponInput('');
    } else {
      setCouponError(res.message);
    }
    setApplying(false);
  };

  if (cartItems.length === 0) {
    return (
      <div className="container" style={{ padding: '5rem 1.25rem', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--wheat-light)', color: 'var(--earth-brown)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2.5rem' }}>
          🛒
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Your cart is empty.
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '420px', margin: '0 auto 1.75rem' }}>
          Looks like you haven't added any freshly stone-ground flour to your cart yet.
        </p>
        <button
          onClick={() => navigate('shop')}
          className="btn btn-primary btn-lg"
          id="empty-cart-shop-now-btn"
        >
          Shop Fresh Flours Now <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  const freeDeliveryShortfall = (storeSettings.freeDeliveryThreshold || 500) - subtotal;

  return (
    <div className="container" style={{ padding: '3rem 1.25rem 5rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2.5rem' }}>
        Your Cart
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Cart Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          {cartItems.map((item, index) => (
            <div
              key={`${item.productId}-${item.weight}-${index}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: index === cartItems.length - 1 ? '0' : '1.5rem',
                borderBottom: index === cartItems.length - 1 ? 'none' : '1px solid var(--border-subtle)'
              }}
            >
              {/* Image and Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'}
                  alt={item.name}
                  style={{ width: '80px', height: '80px', objectFit: 'contain', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}
                />
                
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    {item.name}
                  </h3>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>{item.weight}</span>
                    {item.texture && (
                      <span style={{ marginLeft: '6px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--nature-light)', color: 'var(--nature-green)', fontSize: '0.75rem', fontWeight: 700 }}>
                        {item.texture === 'Fine' ? 'बारीक / Fine' : item.texture === 'Coarse' ? 'मोटा / Coarse' : 'रेगुलर / Medium'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-fresh-green)' }}>
                    ₹{item.price}
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', height: '40px', backgroundColor: 'var(--bg-card)', marginRight: '2rem' }}>
                <button
                  onClick={() => updateQuantity(item.productId, item.weight, item.quantity - 1, item.texture)}
                  style={{ padding: '0 0.8rem', height: '100%', backgroundColor: 'transparent', fontWeight: 700, border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  -
                </button>
                <span style={{ padding: '0 0.5rem', fontWeight: 600, minWidth: '30px', textAlign: 'center', color: 'var(--text-primary)' }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.productId, item.weight, item.quantity + 1, item.texture)}
                  style={{ padding: '0 0.8rem', height: '100%', backgroundColor: 'transparent', fontWeight: 700, border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  +
                </button>
              </div>

              {/* Total and Remove */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '120px', justifyContent: 'flex-end' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  ₹{item.price * item.quantity}
                </div>
                <button
                  onClick={() => removeFromCart(item.productId, item.weight, item.texture)}
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Remove item"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Footer */}
        <div style={{ marginTop: '0.5rem', backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>Subtotal</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{subtotal}</span>
          </div>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            You can place order with Cash on Delivery
          </p>

          <button
            onClick={() => navigate('checkout')}
            style={{
              width: '100%',
              padding: '1.1rem',
              backgroundColor: '#2E8B57',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '1.1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(46, 139, 87, 0.25)',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor='#247346'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor='#2E8B57'}
          >
            Continue to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
