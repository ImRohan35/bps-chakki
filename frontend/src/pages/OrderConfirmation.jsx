import React, { useEffect } from 'react';
import { CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck, Truck, Key, Share2, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function OrderConfirmation({ order, navigate, onTrackOrder }) {
  useEffect(() => {
    // Launch festive confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2E8B57', '#173D32', '#C9A44C', '#E8F5EC']
      });
    } catch {}
  }, []);

  if (!order) {
    return (
      <div className="container" style={{ padding: '5rem 1.25rem', textAlign: 'center' }}>
        <h2 style={{ color: '#173D32', fontWeight: 800 }}>Order Received</h2>
        <button onClick={() => navigate('orders')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          View My Orders
        </button>
      </div>
    );
  }

  const handleShareWhatsApp = () => {
    const orderId = order.orderId || 'BPS-ORDER';
    const total = order.totalAmount || '0';
    const batch = order.millingSlot || 'Morning Batch (8:00 AM - 11:30 AM)';
    const text = `🌾 *BPS Fresh Mills - Order Confirmed* 🌾\n\n` +
      `✅ *Order ID:* #${orderId}\n` +
      `💰 *Total:* ₹${total} (${order.paymentMethod || 'COD'})\n` +
      `🕒 *Milling Batch:* ${batch}\n` +
      `📍 *Delivery Area:* ${order.shippingAddress ? `${order.shippingAddress.name}, ${order.shippingAddress.houseFlat}, ${order.shippingAddress.city} (${order.shippingAddress.pincode})` : 'Lakhanpur, Cholapur, Varanasi'}\n\n` +
      `Pure Stone-Ground Fresh Chakki Flour from Lakhanpur, Cholapur, Varanasi 221101.`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="container" style={{ padding: '4rem 1.25rem 5rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#2E8B57', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 4px 14px rgba(46, 139, 87, 0.25)' }}>
          <CheckCircle2 size={40} strokeWidth={3} />
        </div>
        
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Your Fresh Order Is On Its Way
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
          Thank you! Your freshly milled flour is being prepared at our stone chakki in Lakhanpur, Cholapur.
        </p>
      </div>

      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid var(--border-subtle)',
          textAlign: 'left',
          marginBottom: '2.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px dashed var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Order Number</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>#{order.orderId || 'BPS12345'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Date</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px dashed var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Total Amount</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary-fresh-green, #2E8B57)' }}>₹{order.totalAmount || '460'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Payment Method</div>
             <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{order.paymentMethod || 'Cash on Delivery'}</div>
          </div>
        </div>

        {order.millingSlot && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px dashed var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Milling Batch</div>
              <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="var(--primary-fresh-green, #2E8B57)" />
                {order.millingSlot}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px dashed var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Expected Delivery</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#B45309' }}>
              📅 {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Tomorrow'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
             <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Order Status</div>
             <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#2E8B57' }}>{order.orderStatus || 'Confirmed'}</div>
          </div>
        </div>

        {/* WhatsApp & Email Confirmation Notice */}
        <div style={{ backgroundColor: '#E8F5EC', border: '1px solid rgba(46,139,87,0.3)', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
          <span style={{ fontSize: '1.3rem' }}>📱</span>
          <div style={{ fontSize: '0.86rem', color: '#173D32', lineHeight: 1.4 }}>
            <strong>WhatsApp & Email Confirmation:</strong> A confirmation message with your live <strong>Track Your Order</strong> link has been dispatched by <strong>BPS</strong>.
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Delivery to:</div>
          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {order.shippingAddress ? (
              <>
                {order.shippingAddress.name}<br />
                {order.shippingAddress.houseFlat}, {order.shippingAddress.streetArea}<br />
                {order.shippingAddress.city}, {order.shippingAddress.pincode}
              </>
            ) : (
              "John Doe\nFlat 302, Palm Heights\nSector 15, Rohini, Delhi 110085"
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => onTrackOrder && onTrackOrder(order)}
          style={{
            flex: '1 1 200px',
            padding: '1.1rem',
            backgroundColor: '#2E8B57',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(46, 139, 87, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Truck size={18} /> Track & Manage Order
        </button>

        <button
          onClick={handleShareWhatsApp}
          style={{
            flex: '1 1 200px',
            padding: '1.1rem',
            backgroundColor: '#25D366',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37, 211, 102, 0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <Share2 size={18} /> Share on WhatsApp
        </button>

        <button
          onClick={() => navigate('home')}
          style={{
            flex: '1 1 180px',
            padding: '1.1rem',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
