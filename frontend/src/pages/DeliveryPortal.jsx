import React, { useState, useEffect } from 'react';
import {
  Truck,
  Phone,
  MapPin,
  CheckCircle2,
  Key,
  DollarSign,
  Package,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Navigation,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';

export default function DeliveryPortal({ navigate, initialMode = 'dashboard' }) {
  const { user, isDelivery, isAdmin, login, logout } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [summary, setSummary] = useState({ totalAssigned: 0, pendingCodTotal: 0, collectedCodTotal: 0 });
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'pending' | 'out' | 'delivered'

  // Dedicated Delivery Login State
  const [loginPhone, setLoginPhone] = useState('9812345678');
  const [loginPassword, setLoginPassword] = useState('Delivery@123');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // OTP confirmation modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadDeliveries = () => {
    setLoading(true);
    fetchApi('/delivery/my-deliveries')
      .then(res => {
        if (res.success) {
          setDeliveries(res.orders || []);
          if (res.summary) setSummary(res.summary);
        }
      })
      .catch(err => console.error('Error fetching deliveries:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isDelivery || isAdmin) {
      loadDeliveries();
    }
  }, [isDelivery, isAdmin]);

  const handleDeliveryLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await login(loginPhone.trim(), loginPassword);
      if (res.success) {
        if (res.user.role !== 'delivery' && res.user.role !== 'admin') {
          setLoginError('Access denied: This account does not have delivery executive permissions.');
          logout();
          return;
        }
        loadDeliveries();
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleMarkOutForDelivery = async (orderId) => {
    try {
      const res = await fetchApi(`/delivery/out-for-delivery/${orderId}`, { method: 'POST' });
      if (res.success) {
        loadDeliveries();
      }
    } catch (err) {
      alert(err.message || 'Failed to update order');
    }
  };

  const handleCompleteDelivery = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!otpInput.trim()) {
      setErrorMsg('Please enter the customer 4-digit OTP.');
      return;
    }
    setErrorMsg('');
    setConfirming(true);

    try {
      const res = await fetchApi(`/delivery/complete-delivery/${selectedOrder._id}`, {
        method: 'POST',
        body: JSON.stringify({
          otp: otpInput.trim(),
          cashCollected: true
        })
      });

      if (res.success) {
        alert(`Order #${selectedOrder.orderId} successfully delivered!`);
        setSelectedOrder(null);
        setOtpInput('');
        loadDeliveries();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed. Incorrect OTP.');
    } finally {
      setConfirming(false);
    }
  };

  // If not logged in as delivery boy or admin, show the separate dedicated delivery login page
  if (!isDelivery && !isAdmin) {
    return (
      <div className="container" style={{ padding: '4rem 1.25rem', maxWidth: '460px', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem 2rem',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-md)',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#E8F5EC',
              color: '#2E8B57',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}
          >
            <Truck size={32} />
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
            Delivery Boy Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.75rem' }}>
            Log in with your registered delivery credentials to access today's assigned dispatch orders.
          </p>

          {loginError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#FDE8E8',
                color: '#9B1C1C',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                textAlign: 'left'
              }}
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleDeliveryLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Mobile Number or Email
              </label>
              <input
                type="text"
                placeholder="e.g. 9812345678"
                value={loginPhone}
                onChange={e => setLoginPhone(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-subtle)',
                  outline: 'none',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Password
              </label>
              <input
                type="password"
                placeholder="Enter password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-subtle)',
                  outline: 'none',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem', fontWeight: 800, fontSize: '0.95rem' }}
            >
              {loggingIn ? 'Signing In…' : '🚚 Login to Delivery Dashboard'}
            </button>
          </form>

          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>BPS Chakki Fresh Mills</span>
            <button onClick={() => navigate('home')} style={{ background: 'none', border: 'none', color: '#2E8B57', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
              Back to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtered deliveries for tabs
  const filteredDeliveries = deliveries.filter(o => {
    if (filterTab === 'pending') return ['Pending Admin Confirmation', 'Confirmed', 'Processing', 'Preparing', 'Ready for Delivery'].includes(o.orderStatus);
    if (filterTab === 'out') return o.orderStatus === 'Out for Delivery';
    if (filterTab === 'delivered') return o.orderStatus === 'Delivered';
    return true;
  });

  const pendingCount = deliveries.filter(o => ['Pending Admin Confirmation', 'Confirmed', 'Processing', 'Preparing', 'Ready for Delivery'].includes(o.orderStatus)).length;
  const outCount = deliveries.filter(o => o.orderStatus === 'Out for Delivery').length;
  const deliveredCount = deliveries.filter(o => o.orderStatus === 'Delivered').length;

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem', maxWidth: '960px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🚚</span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Delivery Boy Dashboard
            </h1>
            <span className="badge badge-amber">Active Partner</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Executive: <strong>{user?.name}</strong> • Phone: {user?.mobile}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button onClick={() => { logout(); navigate('delivery/login'); }} className="btn btn-sm btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <LogOut size={14} /> Logout
          </button>
          <button onClick={() => navigate('home')} className="btn btn-sm btn-outline">
            Store Home
          </button>
        </div>
      </div>

      {/* Cash Collection Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Assigned Orders
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
            {summary.totalAssigned}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Assigned to your route</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--warning-amber)', textTransform: 'uppercase' }}>
            COD Cash to Collect
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning-amber)', marginTop: '0.3rem' }}>
            ₹{summary.pendingCodTotal}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pending doorstep collection</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
            Cash Collected in Hand
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.3rem' }}>
            ₹{summary.collectedCodTotal}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>To deposit at BPS counter</div>
        </div>
      </div>

      {/* Tabs Filter (Assigned, Out for Delivery, Delivered) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setFilterTab('all')}
          className={`btn btn-sm ${filterTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
        >
          All Orders ({deliveries.length})
        </button>
        <button
          onClick={() => setFilterTab('pending')}
          className={`btn btn-sm ${filterTab === 'pending' ? 'btn-primary' : 'btn-outline'}`}
        >
          Pending Deliveries ({pendingCount})
        </button>
        <button
          onClick={() => setFilterTab('out')}
          className={`btn btn-sm ${filterTab === 'out' ? 'btn-primary' : 'btn-outline'}`}
        >
          🚚 Out for Delivery ({outCount})
        </button>
        <button
          onClick={() => setFilterTab('delivered')}
          className={`btn btn-sm ${filterTab === 'delivered' ? 'btn-primary' : 'btn-outline'}`}
        >
          ✅ Delivered ({deliveredCount})
        </button>
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading your delivery assignments...
        </div>
      )}

      {!loading && filteredDeliveries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-strong)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌾</div>
          <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.3rem' }}>No Deliveries in this View</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            There are currently no orders under this filter category.
          </p>
        </div>
      )}

      {!loading && filteredDeliveries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredDeliveries.map(o => {
            const isDelivered = o.orderStatus === 'Delivered';
            const isOut = o.orderStatus === 'Out for Delivery';
            const customerPhone = o.shippingAddress?.mobile || o.customerPhone;
            const addressString = [
              o.shippingAddress?.houseFlat,
              o.shippingAddress?.streetArea,
              o.shippingAddress?.landmark,
              o.shippingAddress?.city,
              o.shippingAddress?.pincode
            ].filter(Boolean).join(', ');
            const mapNavigateUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`;

            return (
              <div
                key={o._id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.75rem',
                  border: isDelivered ? '1px solid var(--border-subtle)' : isOut ? '2px solid #ea580c' : '1px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-sm)',
                  opacity: isDelivered ? 0.8 : 1
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                        Order #{o.orderId}
                      </span>
                      <span className={`badge ${isDelivered ? 'badge-green' : isOut ? 'badge-amber' : 'badge-gold'}`}>
                        {o.orderStatus}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Placed: {new Date(o.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', backgroundColor: 'var(--wheat-light)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--earth-brown)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Amount to Collect
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--earth-dark)' }}>
                      ₹{o.totalAmount}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: o.paymentStatus === 'COD Collected' ? '#16a34a' : 'var(--warning-amber)', fontWeight: 700 }}>
                      {o.paymentStatus}
                    </div>
                  </div>
                </div>

                {/* Customer Details & Quick Actions: Call + Navigate */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {o.shippingAddress?.name || o.customerName}
                    </div>
                    
                    {/* Customer Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                      {customerPhone && (
                        <a
                          href={`tel:${customerPhone}`}
                          className="btn btn-sm btn-outline"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#16a34a', borderColor: '#86efac' }}
                        >
                          <Phone size={14} /> 📞 Call Customer
                        </a>
                      )}
                      {addressString && (
                        <a
                          href={mapNavigateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#0369a1', borderColor: '#bae6fd' }}
                        >
                          <MapPin size={14} /> 🗺️ Navigate (Maps)
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={16} style={{ color: 'var(--wheat-gold)', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div>{o.shippingAddress?.houseFlat}, {o.shippingAddress?.streetArea}</div>
                        {o.shippingAddress?.landmark && <div style={{ fontWeight: 600 }}>Near: {o.shippingAddress?.landmark}</div>}
                        <div>{o.shippingAddress?.city} - {o.shippingAddress?.pincode}</div>
                        <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.78rem', marginTop: '2px' }}>
                          Distance: ~{o.shippingAddress?.distanceKm || 3.5} KM from BPS Chakki
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items to Hand Over */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Items to Hand Over
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {o.items?.map((it, i) => (
                      <span key={i} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: 600 }}>
                        {it.name} ({it.weight}) × {it.quantity}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Delivery Boy Action Workflow Buttons */}
                {!isDelivered && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {!isOut && (
                      <button
                        onClick={() => handleMarkOutForDelivery(o._id)}
                        className="btn btn-outline"
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <Truck size={16} /> 🚚 Start Delivery (Out for Delivery)
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedOrder(o);
                        setOtpInput('');
                        setErrorMsg('');
                      }}
                      className="btn btn-primary"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Key size={16} /> 🔐 Verify Customer OTP & Complete
                    </button>
                  </div>
                )}

                {isDelivered && (
                  <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#F0FDF4', padding: '0.65rem 1rem', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                    <CheckCircle2 size={16} /> Successfully Delivered & Cash Collected • OTP Verified ✅
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* OTP Verification & Cash Collection Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(23,17,15,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '460px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.3rem' }}>
              Confirm Delivery & Payment
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Order #{selectedOrder.orderId} • Customer: {selectedOrder.customerName}
            </p>

            <div style={{ padding: '1rem', backgroundColor: 'var(--wheat-light)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--earth-brown)', textTransform: 'uppercase' }}>
                Cash to Collect from Customer
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--earth-dark)', margin: '0.2rem 0' }}>
                ₹{selectedOrder.totalAmount}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--earth-brown)' }}>
                Collect cash before handing over the flour bags
              </div>
            </div>

            {errorMsg && (
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger-rust)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCompleteDelivery} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Ask Customer for 4-Digit Delivery OTP:
                </label>
                <input
                  type="text"
                  placeholder="Enter 4-digit OTP"
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value)}
                  maxLength={4}
                  required
                  style={{ width: '100%', fontSize: '1.4rem', letterSpacing: '6px', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  (Customer can see this OTP on their Order Confirmation / Tracking screen)
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={confirming}
                  className="btn btn-green"
                  style={{ flex: 1 }}
                >
                  {confirming ? 'Verifying OTP…' : '✅ Verify OTP & Deliver'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
