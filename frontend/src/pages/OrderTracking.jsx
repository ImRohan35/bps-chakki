import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ShoppingBag,
  RotateCcw,
  XCircle,
  AlertCircle,
  Truck,
  Phone,
  CheckCircle2,
  Key,
  HelpCircle,
  MessageSquare,
  Send,
  X,
  Printer,
  Share2,
  Clock
} from 'lucide-react';
import OrderTimeline from '../components/OrderTimeline';
import InvoiceModal from '../components/InvoiceModal';
import { useCart } from '../context/CartContext';
import { fetchApi } from '../utils/api';

export default function OrderTracking({ orderId, navigate, onReportIssue }) {
  const getParamId = () => {
    if (orderId) return orderId;
    const search = new URLSearchParams(window.location.search);
    return search.get('id') || search.get('orderId') || '';
  };

  const [activeOrderId, setActiveOrderId] = useState(getParamId);
  const [searchInput, setSearchInput] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMsg, setSupportMsg] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const { addToCart } = useCart();

  const handleSendSupport = async (e) => {
    e.preventDefault();
    if (!supportMsg.trim() || !order) return;
    setSendingSupport(true);
    try {
      const res = await fetchApi('/public/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: order.customerName || order.shippingAddress?.name || 'Customer',
          phone: order.customerPhone || order.shippingAddress?.mobile || '',
          email: order.customerEmail || '',
          orderId: order.orderId || order._id,
          message: supportMsg.trim()
        })
      });
      if (res.success) {
        setSupportSuccess('Support inquiry submitted! Our team will contact you shortly.');
        setTimeout(() => {
          setShowSupportModal(false);
          setSupportSuccess('');
          setSupportMsg('');
        }, 2200);
      }
    } catch (err) {
      alert(err.message || 'Failed to submit support inquiry');
    } finally {
      setSendingSupport(false);
    }
  };

  useEffect(() => {
    const id = orderId || getParamId();
    if (id) {
      setActiveOrderId(id);
    }
  }, [orderId]);

  const loadOrder = (targetId) => {
    const idToFetch = targetId || activeOrderId;
    if (!idToFetch) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchApi(`/orders/track/${idToFetch}`)
      .then(res => {
        if (res.success && res.order) {
          setOrder(res.order);
        } else {
          // Fallback to /orders/:id
          return fetchApi(`/orders/${idToFetch}`);
        }
      })
      .then(fallbackRes => {
        if (fallbackRes && fallbackRes.success && fallbackRes.order) {
          setOrder(fallbackRes.order);
        }
      })
      .catch(err => console.error('Error fetching order:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (activeOrderId) {
      loadOrder(activeOrderId);
    } else {
      setLoading(false);
    }
  }, [activeOrderId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const clean = searchInput.trim();
    setActiveOrderId(clean);
    loadOrder(clean);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '5rem 1.25rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading live order tracking...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#E8F5EC', color: '#2E8B57', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <Truck size={28} />
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Track Your Order
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
          Enter your Order ID (from WhatsApp or Email confirmation) to check real-time status.
        </p>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="e.g. BPS1025"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ flex: 1, padding: '0.75rem 1rem', border: '1.5px solid var(--border-subtle)', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.25rem', fontWeight: 700 }}>
            Track
          </button>
        </form>

        <button onClick={() => navigate('orders')} className="btn btn-outline" style={{ fontSize: '0.9rem' }}>
          Back to My Orders
        </button>
      </div>
    );
  }

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await fetchApi(`/orders/${order._id || order.orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Customer requested cancellation' })
      });
      if (res.success) {
        alert('Order has been cancelled successfully.');
        loadOrder();
      }
    } catch (err) {
      alert(err.message || 'Could not cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = () => {
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        addToCart({ _id: item.productId, name: item.name, price: item.price, stock: 20 }, item.weight, item.quantity);
      });
      navigate('cart');
    }
  };

  const canCancel = ['Order Placed', 'Pending Admin Confirmation', 'Confirmed'].includes(order.orderStatus);
  const isDelivered = order.orderStatus === 'Delivered';

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem', maxWidth: '850px' }}>
      <button
        onClick={() => navigate('orders')}
        className="btn btn-sm btn-outline"
        style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      >
        <ChevronLeft size={16} /> Back to My Orders
      </button>

      {/* Header Info */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Order #{order.orderId}
            </h1>
            <span className={`badge ${isDelivered ? 'badge-green' : order.orderStatus === 'Cancelled' ? 'badge-red' : 'badge-gold'}`}>
              {order.orderStatus}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem', alignItems: 'center', fontSize: '0.86rem' }}>
            <span style={{ color: '#B45309', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              📅 Expected Delivery: {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Tomorrow'}
            </span>
            {order.trackingNumber && (
              <span style={{ backgroundColor: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-primary)', fontWeight: 700, border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Truck size={13} /> Tracking #: {order.trackingNumber}
              </span>
            )}
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
              Payment: {order.paymentStatus || 'COD Pending'}
            </span>
            {order.millingSlot && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--primary-fresh-green, #2E8B57)', fontWeight: 700, backgroundColor: 'rgba(46,139,87,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                <Clock size={13} /> {order.millingSlot}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowInvoice(true)}
            className="btn btn-sm btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Printer size={14} /> Print Bill / Invoice
          </button>

          <button
            onClick={() => {
              if (!order) return;
              const text = `🌾 *BPS Fresh Mills - Order #${order.orderId}* 🌾\nStatus: ${order.orderStatus}\nTotal: ₹${order.totalAmount} (${order.paymentMethod || 'COD'})\nBatch: ${order.millingSlot || 'Fresh Milling'}\nLakhanpur, Cholapur, Varanasi 221101.\nLive tracking: ${window.location.origin}/track?id=${order.orderId}`;
              window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
            }}
            className="btn btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#25D366', color: '#fff' }}
          >
            <Share2 size={14} /> WhatsApp Share
          </button>

          {canCancel && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="btn btn-sm"
              style={{ color: 'var(--danger-rust)', backgroundColor: 'var(--danger-light)' }}
            >
              <XCircle size={14} /> Cancel Order
            </button>
          )}

          {isDelivered && (
            <button
              onClick={() => onReportIssue && onReportIssue(order)}
              className="btn btn-sm btn-outline"
              style={{ borderColor: 'var(--warning-amber)', color: 'var(--warning-amber)' }}
            >
              <RotateCcw size={14} /> Report Issue / Return
            </button>
          )}

          <button onClick={handleReorder} className="btn btn-sm btn-primary">
            <ShoppingBag size={14} /> Reorder
          </button>
        </div>
      </div>

      {/* Timeline Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '2rem'
        }}
      >
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
          Order Progress Timeline
        </h3>
        <OrderTimeline currentStatus={order.orderStatus} timeline={order.statusTimeline} />
      </div>

      {/* Order Details & Address Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Items */}
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Items Ordered
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {order.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {item.weight} {item.texture ? `• ${item.texture === 'Fine' ? 'बारीक' : item.texture === 'Coarse' ? 'मोटा' : 'रेगुलर'}` : ''} × {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>₹{item.subtotal || item.price * item.quantity}</div>
              </div>
            ))}
          </div>

          <hr style={{ borderColor: 'var(--border-subtle)', margin: '1rem 0' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            {order.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--nature-green)' }}>
                <span>Discount ({order.couponCode})</span>
                <span>-₹{order.discount}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Delivery Fee</span>
              <span>{order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.15rem', color: 'var(--earth-brown)', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span>Total Payable</span>
              <span>₹{order.totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address & Assigned Boy */}
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Delivery Address
            </h4>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{order.shippingAddress?.name || order.customerName}</div>
              <div>{order.shippingAddress?.houseFlat}, {order.shippingAddress?.streetArea}</div>
              {order.shippingAddress?.landmark && <div>Landmark: {order.shippingAddress?.landmark}</div>}
              <div>{order.shippingAddress?.city} - {order.shippingAddress?.pincode}</div>
              <div>Phone: {order.shippingAddress?.mobile || order.customerPhone}</div>
            </div>
          </div>

          {order.deliveryOtp && (
            <div style={{ backgroundColor: 'var(--wheat-light)', padding: '0.85rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--earth-brown)', fontWeight: 700, fontSize: '0.85rem' }}>
                <Key size={16} /> Delivery OTP:
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '2px', fontFamily: 'monospace' }}>
                {order.deliveryOtp}
              </span>
            </div>
          )}

          {order.assignedDeliveryBoy && (
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Assigned Delivery Executive
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {order.assignedDeliveryBoy.name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Contact: <a href={`tel:${order.assignedDeliveryBoy.phone}`} style={{ color: 'var(--nature-green)', fontWeight: 600 }}>{order.assignedDeliveryBoy.phone}</a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Need Help with this Order? Card */}
      <div
        style={{
          marginTop: '2rem',
          backgroundColor: 'var(--bg-card)',
          padding: '1.5rem 2rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
            <HelpCircle size={20} color="var(--nature-green)" />
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Need Help with this Order?
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Have questions about preparation time, delivery address change, or freshly milled grains?
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href="tel:+919876543210"
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Phone size={15} /> Call Store
          </a>
          <a
            href={`https://wa.me/919876543210?text=${encodeURIComponent(`Hi BPS Fresh Mills, I need help with my Order #${order.orderId || order._id}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: '#25D366', color: '#25D366' }}
          >
            <MessageSquare size={15} /> WhatsApp
          </a>
          <button
            onClick={() => setShowSupportModal(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Send size={15} /> Submit Support Inquiry
          </button>
        </div>
      </div>

      {/* Direct Order Support Modal */}
      {showSupportModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(23,17,15,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '520px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 800, margin: 0 }}>Order Support Inquiry</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Order #{order.orderId || order._id}</div>
              </div>
              <button onClick={() => setShowSupportModal(false)}><X size={20} /></button>
            </div>

            {supportSuccess ? (
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--nature-light)', color: 'var(--nature-green)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontWeight: 600 }}>
                {supportSuccess}
              </div>
            ) : (
              <form onSubmit={handleSendSupport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Enter your question or issue below. Your message will directly notify our store manager and live staff.
                </p>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>Your Message *</label>
                  <textarea
                    rows="4"
                    placeholder="Type your question or delivery concern..."
                    value={supportMsg}
                    onChange={e => setSupportMsg(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={sendingSupport} style={{ flex: 1 }}>
                    {sendingSupport ? 'Submitting...' : 'Send Inquiry'}
                  </button>
                  <button type="button" onClick={() => setShowSupportModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {showInvoice && <InvoiceModal order={order} onClose={() => setShowInvoice(false)} />}
    </div>
  );
}
