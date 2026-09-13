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
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';

export default function DeliveryPortal({ navigate }) {
  const { user, isDelivery, isAdmin } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [summary, setSummary] = useState({ totalAssigned: 0, pendingCodTotal: 0, collectedCodTotal: 0 });
  const [loading, setLoading] = useState(true);

  // OTP confirmation modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isDelivery && !isAdmin) {
    return (
      <div className="container" style={{ padding: '5rem 1.25rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--warning-amber)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚚</div>
        <h2>Delivery Personnel Access Only</h2>
        <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>
          Please login with a delivery personnel account (e.g. 9812345678 / Delivery@123).
        </p>
        <button onClick={() => navigate('login')} className="btn btn-primary">
          Login as Delivery Executive
        </button>
      </div>
    );
  }

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
    loadDeliveries();
  }, []);

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
        alert(res.message);
        setSelectedOrder(null);
        setOtpInput('');
        loadDeliveries();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem', maxWidth: '900px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.8rem' }}>🚚</span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Delivery Executive Portal
            </h1>
            <span className="badge badge-amber">Field Agent</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Welcome, <strong>{user?.name}</strong> • 15 KM Radius Local Dispatch
          </p>
        </div>

        <button onClick={() => navigate('home')} className="btn btn-sm btn-outline">
          Back to Store
        </button>
      </div>

      {/* Cash Collection Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Assigned Orders
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
            {summary.totalAssigned}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Orders on today's route</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--warning-amber)', textTransform: 'uppercase' }}>
            COD Cash to Collect
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning-amber)', marginTop: '0.3rem' }}>
            ₹{summary.pendingCodTotal}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pending doorstep collection</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--nature-green)', textTransform: 'uppercase' }}>
            Cash Collected in Hand
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--nature-green)', marginTop: '0.3rem' }}>
            ₹{summary.collectedCodTotal}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>To deposit at chakki counter</div>
        </div>
      </div>

      {/* Deliveries List */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
        Your Assigned Deliveries
      </h2>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading your delivery assignments...
        </div>
      )}

      {!loading && deliveries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-strong)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌾</div>
          <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.3rem' }}>No Active Deliveries</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            All orders for your route have been delivered or none are currently assigned.
          </p>
        </div>
      )}

      {!loading && deliveries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {deliveries.map(o => {
            const isDelivered = o.orderStatus === 'Delivered';
            const isOut = o.orderStatus === 'Out for Delivery';

            return (
              <div
                key={o._id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.75rem',
                  border: isDelivered ? '1px solid var(--border-subtle)' : isOut ? '2px solid var(--wheat-gold)' : '1px solid var(--border-strong)',
                  boxShadow: 'var(--shadow-sm)',
                  opacity: isDelivered ? 0.75 : 1
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
                    <div style={{ fontSize: '0.72rem', color: o.paymentStatus === 'COD Collected' ? 'var(--nature-green)' : 'var(--warning-amber)', fontWeight: 700 }}>
                      {o.paymentStatus}
                    </div>
                  </div>
                </div>

                {/* Customer Details & Address */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {o.shippingAddress?.name || o.customerName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
                      <Phone size={14} style={{ color: 'var(--nature-green)' }} />
                      <a href={`tel:${o.shippingAddress?.mobile || o.customerPhone}`} style={{ color: 'var(--nature-green)', fontWeight: 700, fontSize: '0.9rem' }}>
                        {o.shippingAddress?.mobile || o.customerPhone} (Call Customer)
                      </a>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={16} style={{ color: 'var(--wheat-gold)', flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <div>{o.shippingAddress?.houseFlat}, {o.shippingAddress?.streetArea}</div>
                        {o.shippingAddress?.landmark && <div style={{ fontWeight: 600 }}>Near: {o.shippingAddress?.landmark}</div>}
                        <div>{o.shippingAddress?.city} - {o.shippingAddress?.pincode}</div>
                        <div style={{ color: 'var(--nature-green)', fontWeight: 700, fontSize: '0.78rem', marginTop: '2px' }}>
                          Distance: ~{o.shippingAddress?.distanceKm || 3} KM from mill
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Ordered */}
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

                {/* Delivery Boy Action Buttons */}
                {!isDelivered && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {!isOut && (
                      <button
                        onClick={() => handleMarkOutForDelivery(o._id)}
                        className="btn btn-outline"
                        style={{ flex: 1 }}
                      >
                        <Truck size={16} /> Mark Out for Delivery
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedOrder(o);
                        setOtpInput('');
                        setErrorMsg('');
                      }}
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                    >
                      <CheckCircle2 size={16} /> Collect Cash & Verify OTP
                    </button>
                  </div>
                )}

                {isDelivered && (
                  <div style={{ color: 'var(--nature-green)', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={16} /> Successfully Delivered & COD Cash Collected
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
                Collect exact cash before handing over the flour bags
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
                  style={{ width: '100%', fontSize: '1.25rem', letterSpacing: '4px', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace' }}
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
                  {confirming ? 'Verifying...' : 'Confirm Cash & Deliver'}
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
