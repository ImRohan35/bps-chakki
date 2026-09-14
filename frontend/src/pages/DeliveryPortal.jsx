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
  X,
  AlertTriangle,
  FileText,
  Send,
  Eye,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import NotificationBell from '../components/NotificationBell';
import InstallPwaButton from '../components/InstallPwaButton';

export default function DeliveryPortal({ navigate, initialMode = 'dashboard' }) {
  const { user, isDelivery, isAdmin, logout, updateUser } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [summary, setSummary] = useState({ totalAssigned: 0, pendingCodTotal: 0, collectedCodTotal: 0, exceptionCodTotal: 0 });
  const [loading, setLoading] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('deliveries'); // 'deliveries' | 'ledger'
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'pending' | 'out' | 'arrived' | 'delivered' | 'failed'

  // Availability status (Feature 58: AVAILABLE | BUSY | OFFLINE)
  const [availability, setAvailability] = useState('AVAILABLE');
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  // Dedicated Delivery Login State
  const [loginPhone, setLoginPhone] = useState('9812345678');
  const [loginPassword, setLoginPassword] = useState('Delivery@123');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // OTP confirmation modal state (Features 48, 49, 52, 53)
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [collectedAmountInput, setCollectedAmountInput] = useState('');
  const [exceptionReasonInput, setExceptionReasonInput] = useState('');
  const [deliveryNotesInput, setDeliveryNotesInput] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Failed Delivery modal state (Features 50 & 51)
  const [failedModalOrder, setFailedModalOrder] = useState(null);
  const [failedReason, setFailedReason] = useState('Customer unavailable');
  const [failedNote, setFailedNote] = useState('');
  const [submittingFailed, setSubmittingFailed] = useState(false);

  // Order Details Modal (Feature 43)
  const [detailModalOrder, setDetailModalOrder] = useState(null);

  // COD Ledger & Settlement Modal (Features 54, 55, 56)
  const [codLedger, setCodLedger] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [submittingSettlement, setSubmittingSettlement] = useState(false);

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

    fetchApi('/delivery/availability')
      .then(res => {
        if (res.success && res.availability) setAvailability(res.availability);
      })
      .catch(() => {});
  };

  const loadCodLedger = () => {
    fetchApi('/delivery/cod-ledger')
      .then(res => {
        if (res.success) {
          setCodLedger(res.ledger);
          setSettlements(res.settlements || []);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isDelivery || isAdmin) {
      loadDeliveries();
      loadCodLedger();
    }
  }, [isDelivery, isAdmin]);

  // Live SSE stream for real-time delivery assignment updates
  useEffect(() => {
    if (!isDelivery && !isAdmin) return;
    const token = localStorage.getItem('bps_token');
    const apiBase = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
    const streamUrl = `${apiBase}/notifications/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    let eventSource;
    try {
      eventSource = new EventSource(streamUrl);
      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'NOTIFICATION' || payload.event === 'DELIVERY_ASSIGNED') {
            loadDeliveries();
            loadCodLedger();
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [isDelivery, isAdmin]);

  const handleDeliveryLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetchApi('/auth/delivery-login', {
        method: 'POST',
        body: JSON.stringify({ identifier: loginPhone.trim(), password: loginPassword })
      });
      if (res.success && res.token) {
        localStorage.setItem('bps_token', res.token);
        if (updateUser) updateUser(res.user);
        loadDeliveries();
        loadCodLedger();
      } else {
        setLoginError(res.message || 'Login failed. Please check your delivery credentials.');
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleToggleAvailability = async (newStatus) => {
    setUpdatingAvailability(true);
    try {
      const res = await fetchApi('/delivery/availability', {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        setAvailability(res.availability);
      }
    } catch (err) {
      alert(err.message || 'Failed to update availability status');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const handleStartDelivery = async (orderId) => {
    try {
      const res = await fetchApi(`/delivery/start-delivery/${orderId}`, { method: 'POST' });
      if (res.success) {
        loadDeliveries();
      }
    } catch (err) {
      alert(err.message || 'Failed to start delivery');
    }
  };

  const handleMarkArrived = async (orderId) => {
    try {
      const res = await fetchApi(`/delivery/arrived/${orderId}`, { method: 'POST' });
      if (res.success) {
        alert('Customer alerted: You have arrived at the doorstep!');
        loadDeliveries();
      }
    } catch (err) {
      alert(err.message || 'Failed to update arrival status');
    }
  };

  const handleOpenOtpModal = (order) => {
    setSelectedOrder(order);
    setOtpInput('');
    setCollectedAmountInput(String(order.totalAmount || 0));
    setExceptionReasonInput('');
    setDeliveryNotesInput('');
    setErrorMsg('');
  };

  const handleCompleteDelivery = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!otpInput.trim()) {
      setErrorMsg('Please enter the customer 4-digit OTP.');
      return;
    }

    const expected = Number(selectedOrder.totalAmount) || 0;
    const collected = Number(collectedAmountInput);

    if (isNaN(collected) || collected < 0) {
      setErrorMsg('Please enter a valid cash amount collected.');
      return;
    }

    if (collected !== expected && (!exceptionReasonInput || !exceptionReasonInput.trim())) {
      setErrorMsg(`Cash mismatch (Expected: ₹${expected}, Entered: ₹${collected}). Please provide an explanation reason.`);
      return;
    }

    setErrorMsg('');
    setConfirming(true);

    try {
      const res = await fetchApi(`/delivery/complete-delivery/${selectedOrder._id}`, {
        method: 'POST',
        body: JSON.stringify({
          otp: otpInput.trim(),
          amountCollected: collected,
          exceptionReason: exceptionReasonInput.trim(),
          deliveryNotes: deliveryNotesInput.trim()
        })
      });

      if (res.success) {
        alert(`Order #${selectedOrder.orderId} delivered! COD collection of ₹${collected} recorded.`);
        setSelectedOrder(null);
        setOtpInput('');
        loadDeliveries();
        loadCodLedger();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Verification failed. Please check OTP.');
    } finally {
      setConfirming(false);
    }
  };

  const handleReportFailed = async (e) => {
    e.preventDefault();
    if (!failedModalOrder) return;
    if (failedReason === 'Other' && !failedNote.trim()) {
      alert('Please enter a note explaining the failure reason.');
      return;
    }

    setSubmittingFailed(true);
    try {
      const res = await fetchApi(`/delivery/failed-delivery/${failedModalOrder._id}`, {
        method: 'POST',
        body: JSON.stringify({
          reason: failedReason,
          note: failedNote.trim()
        })
      });

      if (res.success) {
        alert(`Failed delivery attempt logged for Order #${failedModalOrder.orderId}. Store Admin has been notified.`);
        setFailedModalOrder(null);
        setFailedNote('');
        loadDeliveries();
      }
    } catch (err) {
      alert(err.message || 'Failed to record failed delivery');
    } finally {
      setSubmittingFailed(false);
    }
  };

  const handleSubmitSettlement = async (e) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      alert('Please enter a valid deposit amount.');
      return;
    }

    setSubmittingSettlement(true);
    try {
      const res = await fetchApi('/delivery/submit-settlement', {
        method: 'POST',
        body: JSON.stringify({
          depositedAmount: amount,
          notes: settlementNotes.trim()
        })
      });

      if (res.success) {
        alert(res.message || 'Settlement submitted. Please hand over physical cash to the store administrator for verification.');
        setShowSettlementModal(false);
        setDepositAmount('');
        setSettlementNotes('');
        loadCodLedger();
      }
    } catch (err) {
      alert(err.message || 'Failed to submit settlement');
    } finally {
      setSubmittingSettlement(false);
    }
  };

  // If not logged in as delivery boy or admin, show dedicated delivery login
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
            <img
              src="/logo.png"
              alt="BPS Fresh Mills"
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                objectFit: 'contain',
                border: '2px solid #C9A44C',
                boxShadow: '0 4px 14px rgba(23,61,50,0.25)',
                marginBottom: '0.75rem',
                backgroundColor: '#FFFFFF',
                padding: '2px'
              }}
            />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#173D32', margin: '0.2rem 0' }}>
              🛵 BPS Delivery Partner
            </h2>
            <div style={{ fontSize: '0.84rem', color: '#C9A44C', fontWeight: 700, fontStyle: 'italic', marginBottom: '0.6rem' }}>
              “Freshly Milled. Naturally Good.”
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#DEF7EC',
              color: '#047857',
              padding: '0.3rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.76rem',
              fontWeight: 800
            }}>
              Rider Dispatch & COD Collection Portal
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderLeft: '4px solid #16A34A',
              padding: '0.8rem 1rem',
              borderRadius: '6px',
              fontSize: '0.82rem',
              color: '#166534',
              lineHeight: 1.5,
              marginBottom: '1.25rem',
              textAlign: 'left'
            }}
          >
            <strong>Ye BPS Delivery Boy Portal hai:</strong> Apna registered mobile number daalkar login karein taaki aaj ke assigned orders, GPS maps aur customer OTP verify kar sakein.
          </div>

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
                Delivery Boy Mobile Number
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
              style={{ width: '100%', padding: '0.85rem', marginTop: '0.3rem', fontWeight: 800, fontSize: '0.95rem' }}
            >
              {loggingIn ? 'Signing In…' : '🚚 Login to Delivery Dashboard'}
            </button>

            {/* Quick Demo Fill Button */}
            <button
              type="button"
              onClick={() => {
                setLoginPhone('9812345678');
                setLoginPassword('Delivery@123');
              }}
              style={{
                background: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                padding: '0.5rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: '#64748B',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              ⚡ Click here to auto-fill Delivery Boy Demo (9812345678)
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <InstallPwaButton portalType="delivery" style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }} />
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
    if (filterTab === 'pending') return ['Pending Admin Confirmation', 'Confirmed', 'Processing', 'Preparing', 'Ready for Delivery', 'Delivery Assigned'].includes(o.orderStatus);
    if (filterTab === 'out') return o.orderStatus === 'Out for Delivery';
    if (filterTab === 'arrived') return o.orderStatus === 'Arrived';
    if (filterTab === 'delivered') return o.orderStatus === 'Delivered';
    if (filterTab === 'failed') return o.orderStatus === 'Delivery Attempt Failed';
    return true;
  });

  const pendingCount = deliveries.filter(o => ['Pending Admin Confirmation', 'Confirmed', 'Processing', 'Preparing', 'Ready for Delivery', 'Delivery Assigned'].includes(o.orderStatus)).length;
  const outCount = deliveries.filter(o => o.orderStatus === 'Out for Delivery').length;
  const arrivedCount = deliveries.filter(o => o.orderStatus === 'Arrived').length;
  const deliveredCount = deliveries.filter(o => o.orderStatus === 'Delivered').length;
  const failedCount = deliveries.filter(o => o.orderStatus === 'Delivery Attempt Failed').length;

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem', maxWidth: '1020px', margin: '0 auto' }}>
      {/* Header with Availability Switcher & Logout */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.8rem' }}>🚚</span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Delivery Partner Portal
            </h1>
            <span className={`badge ${availability === 'AVAILABLE' ? 'badge-green' : availability === 'BUSY' ? 'badge-amber' : 'badge-gold'}`}>
              ● {availability}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Partner: <strong>{user?.name}</strong> • Mobile: {user?.mobile}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Availability Status Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--bg-card)', padding: '0.3rem 0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <Activity size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              value={availability}
              disabled={updatingAvailability}
              onChange={e => handleToggleAvailability(e.target.value)}
              style={{ background: 'transparent', border: 'none', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="BUSY">BUSY</option>
              <option value="OFFLINE">OFFLINE</option>
            </select>
          </div>

          <NotificationBell navigate={navigate} role="delivery" />

          <InstallPwaButton portalType="delivery" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }} />

          <button onClick={() => { logout(); navigate('delivery/login'); }} className="btn btn-sm btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <LogOut size={14} /> Logout
          </button>
          <button onClick={() => navigate('home')} className="btn btn-sm btn-outline">
            Store Home
          </button>
        </div>
      </div>

      {/* Main Mode Navigation: Assigned Orders vs COD Settlement Ledger */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveMainTab('deliveries')}
          className={`btn btn-sm ${activeMainTab === 'deliveries' ? 'btn-primary' : 'btn-outline'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <Truck size={15} /> Assigned Deliveries ({deliveries.length})
        </button>
        <button
          onClick={() => { setActiveMainTab('ledger'); loadCodLedger(); }}
          className={`btn btn-sm ${activeMainTab === 'ledger' ? 'btn-primary' : 'btn-outline'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
        >
          <DollarSign size={15} /> COD Cash Ledger & Settlement
        </button>
      </div>

      {/* Cash Collection Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Today's Assigned
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
            {summary.totalAssigned}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Assigned to your route</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--warning-amber)', textTransform: 'uppercase' }}>
            COD to Collect
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning-amber)', marginTop: '0.3rem' }}>
            ₹{summary.pendingCodTotal}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Pending doorstep collection</div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
            Cash in Hand
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', marginTop: '0.3rem' }}>
            ₹{summary.collectedCodTotal}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Ready for evening counter deposit</div>
        </div>

        {summary.exceptionCodTotal > 0 && (
          <div style={{ backgroundColor: '#FFFBEB', padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid #FDE68A', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>
              ⚠ COD Exceptions
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#B45309', marginTop: '0.3rem' }}>
              ₹{summary.exceptionCodTotal}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#92400E' }}>Mismatched collections flagged</div>
          </div>
        )}
      </div>

      {/* TAB 1: ASSIGNED DELIVERIES */}
      {activeMainTab === 'deliveries' && (
        <>
          {/* Sub Tabs Filter */}
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
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setFilterTab('out')}
              className={`btn btn-sm ${filterTab === 'out' ? 'btn-primary' : 'btn-outline'}`}
            >
              🚚 Out for Delivery ({outCount})
            </button>
            <button
              onClick={() => setFilterTab('arrived')}
              className={`btn btn-sm ${filterTab === 'arrived' ? 'btn-primary' : 'btn-outline'}`}
            >
              📍 Arrived ({arrivedCount})
            </button>
            <button
              onClick={() => setFilterTab('delivered')}
              className={`btn btn-sm ${filterTab === 'delivered' ? 'btn-primary' : 'btn-outline'}`}
            >
              ✅ Delivered ({deliveredCount})
            </button>
            <button
              onClick={() => setFilterTab('failed')}
              className={`btn btn-sm ${filterTab === 'failed' ? 'btn-primary' : 'btn-outline'}`}
            >
              ⚠️ Failed Attempts ({failedCount})
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
                const isArrived = o.orderStatus === 'Arrived';
                const isFailed = o.orderStatus === 'Delivery Attempt Failed';
                const customerPhone = o.shippingAddress?.mobile || o.customerPhone;

                const addressString = [
                  o.shippingAddress?.houseFlat,
                  o.shippingAddress?.streetArea,
                  o.shippingAddress?.landmark,
                  o.shippingAddress?.city,
                  o.shippingAddress?.pincode
                ].filter(Boolean).join(', ');

                const coordsAvailable = o.shippingAddress?.lat && o.shippingAddress?.lon;
                const mapNavigateUrl = coordsAvailable
                  ? `https://www.google.com/maps/search/?api=1&query=${o.shippingAddress.lat},${o.shippingAddress.lon}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`;

                return (
                  <div
                    key={o._id}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.75rem',
                      border: isDelivered ? '1px solid var(--border-subtle)' : isArrived ? '2px solid #2E8B57' : isOut ? '2px solid #ea580c' : isFailed ? '2px solid #dc2626' : '1px solid var(--border-strong)',
                      boxShadow: 'var(--shadow-sm)',
                      opacity: isDelivered ? 0.85 : 1
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                            Order #{o.orderId}
                          </span>
                          <span className={`badge ${isDelivered ? 'badge-green' : isArrived ? 'badge-green' : isOut ? 'badge-amber' : isFailed ? 'badge-danger' : 'badge-gold'}`}>
                            {o.orderStatus}
                          </span>
                          {o.paymentStatus === 'COD Exception' && (
                            <span className="badge badge-amber">⚠ COD Mismatch</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Placed: {new Date(o.createdAt).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          onClick={() => setDetailModalOrder(o)}
                          className="btn btn-sm btn-outline"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={14} /> Full Details
                        </button>
                        <div style={{ textAlign: 'right', backgroundColor: 'var(--wheat-light)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--earth-brown)', fontWeight: 700, textTransform: 'uppercase' }}>
                            Amount to Collect
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--earth-dark)' }}>
                            ₹{o.totalAmount}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: o.paymentStatus === 'COD Collected' ? '#16a34a' : 'var(--warning-amber)', fontWeight: 700 }}>
                            {o.paymentStatus}
                          </div>
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
                              <Navigation size={14} /> 🗺️ Open Navigation
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                          <MapPin size={16} style={{ color: 'var(--wheat-gold)', flexShrink: 0, marginTop: '2px' }} />
                          <div>
                            <div>{o.shippingAddress?.houseFlat}, {o.shippingAddress?.streetArea}</div>
                            {o.shippingAddress?.landmark && <div style={{ fontWeight: 600 }}>Landmark: {o.shippingAddress?.landmark}</div>}
                            <div>{o.shippingAddress?.city} - {o.shippingAddress?.pincode}</div>
                            <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.78rem', marginTop: '2px' }}>
                              Distance: ~{o.shippingAddress?.distanceKm || 3.5} KM from Chakki
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Items to Hand Over */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Bags to Deliver
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {o.items?.map((it, i) => (
                          <span key={i} style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontWeight: 600 }}>
                            {it.name} ({it.weight}) × {it.quantity}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Workflow Buttons for Delivery Partner */}
                    {!isDelivered && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {!isOut && !isArrived && (
                          <button
                            onClick={() => handleStartDelivery(o._id)}
                            className="btn btn-outline"
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <Truck size={16} /> 🚚 Start Delivery
                          </button>
                        )}

                        {isOut && (
                          <button
                            onClick={() => handleMarkArrived(o._id)}
                            className="btn btn-primary"
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <MapPin size={16} /> 📍 Mark Arrived at Location
                          </button>
                        )}

                        {(isOut || isArrived) && (
                          <button
                            onClick={() => handleOpenOtpModal(o)}
                            className="btn btn-green"
                            style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <Key size={16} /> 🔐 Enter Customer OTP & Collect Cash
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setFailedModalOrder(o);
                            setFailedReason('Customer unavailable');
                            setFailedNote('');
                          }}
                          className="btn btn-outline"
                          style={{ color: '#dc2626', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <AlertTriangle size={15} /> Report Issue
                        </button>
                      </div>
                    )}

                    {isDelivered && (
                      <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem', backgroundColor: '#F0FDF4', padding: '0.65rem 1rem', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                        <CheckCircle2 size={16} /> Delivered & Cash Collected • Customer OTP Verified ✅
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: COD CASH LEDGER & SETTLEMENT (Features 54, 55, 56) */}
      {activeMainTab === 'ledger' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                Cash on Delivery Ledger & Counter Deposit
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                Track total cash collected and submit your daily handover to the store administrator.
              </p>
            </div>

            <button
              onClick={() => {
                setDepositAmount(String(codLedger?.pendingToDeposit || ''));
                setSettlementNotes('');
                setShowSettlementModal(true);
              }}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}
            >
              <Send size={15} /> 💼 Hand Over Cash to Admin
            </button>
          </div>

          {/* Detailed Ledger Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL ASSIGNED COD</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.3rem' }}>₹{codLedger?.totalAssignedCod || 0}</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>TOTAL CASH COLLECTED</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.3rem', color: '#16a34a' }}>₹{codLedger?.totalCollectedCod || 0}</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--earth-brown)', fontWeight: 700 }}>TOTAL DEPOSITED WITH ADMIN</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.3rem', color: 'var(--earth-dark)' }}>₹{codLedger?.totalDeposited || 0}</div>
            </div>
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--warning-amber)', fontWeight: 700 }}>PENDING TO DEPOSIT</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.3rem', color: 'var(--warning-amber)' }}>₹{codLedger?.pendingToDeposit || 0}</div>
            </div>
          </div>

          {/* Past Settlements History Table */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>
              Past Cash Settlement Handover Records
            </h3>

            {settlements.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No cash settlement records found. Submit your first deposit above.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Date</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Expected</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Deposited</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Difference</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Verified By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map(s => {
                      const isVerified = s.status === 'VERIFIED' || s.status === 'Received';
                      const isMismatch = s.difference !== 0;
                      return (
                        <tr key={s._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            {new Date(s.submittedAt || s.date || s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>₹{s.expectedAmount || s.amountDeposited}</td>
                          <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: '#16a34a' }}>₹{s.depositedAmount || s.amountDeposited}</td>
                          <td style={{ padding: '0.75rem 0.5rem', color: isMismatch ? '#dc2626' : 'var(--text-muted)', fontWeight: isMismatch ? 700 : 400 }}>
                            {s.difference !== undefined ? `₹${s.difference}` : '₹0'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem' }}>
                            <span className={`badge ${isVerified ? 'badge-green' : s.status === 'SUBMITTED' ? 'badge-amber' : 'badge-danger'}`}>
                              {s.status || 'SUBMITTED'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                            {s.verifiedBy || s.recordedBy || 'Pending Admin Review'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: OTP VERIFICATION & CASH AMOUNT VALIDATION (Features 48, 49, 52, 53) */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(23,17,15,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '480px', width: '100%', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.3rem' }}>
              Confirm Delivery & COD Collection
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Order #{selectedOrder.orderId} • Customer: {selectedOrder.customerName}
            </p>

            <div style={{ padding: '1rem', backgroundColor: 'var(--wheat-light)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--earth-brown)', textTransform: 'uppercase' }}>
                Expected Order Amount
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--earth-dark)', margin: '0.2rem 0' }}>
                ₹{selectedOrder.totalAmount}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--earth-brown)' }}>
                Verify physical cash before entering customer OTP
              </div>
            </div>

            {errorMsg && (
              <div style={{ padding: '0.75rem', backgroundColor: '#FDE8E8', color: '#9B1C1C', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCompleteDelivery} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Customer 4-Digit Delivery OTP:
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

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Actual Cash Amount Collected (₹):
                </label>
                <input
                  type="number"
                  value={collectedAmountInput}
                  onChange={e => setCollectedAmountInput(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700 }}
                />
              </div>

              {Number(collectedAmountInput) !== Number(selectedOrder.totalAmount) && (
                <div style={{ backgroundColor: '#FEF3C7', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #FCD34D' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#92400E', marginBottom: '0.3rem' }}>
                    ⚠ Cash Mismatch Reason (Mandatory):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Customer short on cash / agreed with store"
                    value={exceptionReasonInput}
                    onChange={e => setExceptionReasonInput(e.target.value)}
                    required
                    style={{ width: '100%', fontSize: '0.88rem' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Delivery Note (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Handed to family member"
                  value={deliveryNotesInput}
                  onChange={e => setDeliveryNotesInput(e.target.value)}
                  style={{ width: '100%', fontSize: '0.88rem' }}
                />
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

      {/* MODAL 2: REPORT FAILED DELIVERY (Features 50 & 51) */}
      {failedModalOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(23,17,15,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '480px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.3rem', color: '#dc2626' }}>
              Report Failed Delivery Attempt
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Order #{failedModalOrder.orderId} • Customer: {failedModalOrder.customerName}
            </p>

            <form onSubmit={handleReportFailed} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Select Failure Reason:
                </label>
                <select
                  value={failedReason}
                  onChange={e => setFailedReason(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="Customer unavailable">Customer unavailable at address</option>
                  <option value="Phone unreachable">Phone switched off / unreachable</option>
                  <option value="Wrong address">Incorrect / incomplete delivery address</option>
                  <option value="Customer refused">Customer refused package</option>
                  <option value="Delivery area issue">Delivery area inaccessible / flooded / blocked</option>
                  <option value="Other">Other reason (Note required)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Additional Notes {failedReason === 'Other' && <span style={{ color: '#dc2626' }}>*</span>}:
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide context regarding the failed delivery attempt..."
                  value={failedNote}
                  onChange={e => setFailedNote(e.target.value)}
                  required={failedReason === 'Other'}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={submittingFailed}
                  className="btn btn-primary"
                  style={{ flex: 1, backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                >
                  {submittingFailed ? 'Logging Attempt…' : 'Log Failed Attempt'}
                </button>
                <button
                  type="button"
                  onClick={() => setFailedModalOrder(null)}
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

      {/* MODAL 3: FULL ORDER DETAILS (Feature 43) */}
      {detailModalOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(23,17,15,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '560px', width: '100%', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>
                Order #{detailModalOrder.orderId} Details
              </h3>
              <button onClick={() => setDetailModalOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <div><strong>Customer:</strong> {detailModalOrder.customerName}</div>
                <div><strong>Phone:</strong> {detailModalOrder.customerPhone}</div>
                <div><strong>Delivery Address:</strong> {detailModalOrder.shippingAddress?.houseFlat}, {detailModalOrder.shippingAddress?.streetArea}</div>
                {detailModalOrder.shippingAddress?.landmark && <div><strong>Landmark:</strong> {detailModalOrder.shippingAddress.landmark}</div>}
                <div><strong>PIN Code:</strong> {detailModalOrder.shippingAddress?.pincode}</div>
                {detailModalOrder.notes && <div><strong>Customer Instructions:</strong> {detailModalOrder.notes}</div>}
              </div>

              <div>
                <h4 style={{ fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.95rem' }}>Items to Hand Over:</h4>
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {detailModalOrder.items?.map((it, idx) => (
                    <div key={idx} style={{ padding: '0.65rem 1rem', borderBottom: idx !== detailModalOrder.items.length - 1 ? '1px solid var(--border-subtle)' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>{it.name}</strong> ({it.weight}) × {it.quantity}</span>
                      <span>₹{it.subtotal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {detailModalOrder.deliveryAttempts && detailModalOrder.deliveryAttempts.length > 0 && (
                <div>
                  <h4 style={{ fontWeight: 800, marginBottom: '0.4rem', fontSize: '0.95rem' }}>Delivery Attempt History:</h4>
                  <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                    {detailModalOrder.deliveryAttempts.map((att, i) => (
                      <div key={i} style={{ fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                        <strong>Attempt #{att.attemptNumber}</strong>: {att.status} ({att.reason || att.note}) • {new Date(att.timestamp).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button onClick={() => setDetailModalOrder(null)} className="btn btn-outline">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SUBMIT SETTLEMENT TO ADMIN (Features 54, 55, 56) */}
      {showSettlementModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(23,17,15,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '480px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: '0.3rem' }}>
              Submit Daily Cash Settlement
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Enter the exact amount of physical cash being handed over to the store administrator.
            </p>

            <form onSubmit={handleSubmitSettlement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Cash Amount Handed Over (₹):
                </label>
                <input
                  type="number"
                  placeholder="Enter deposited cash amount"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '1.2rem', fontWeight: 800 }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Pending according to ledger: ₹{codLedger?.pendingToDeposit || 0}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Notes / Explanation:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Evening counter deposit for today's orders"
                  value={settlementNotes}
                  onChange={e => setSettlementNotes(e.target.value)}
                  style={{ width: '100%', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="submit"
                  disabled={submittingSettlement}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {submittingSettlement ? 'Submitting…' : 'Submit Handover'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(false)}
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

      {/* Role Identity Footer for Delivery Partner App */}
      <footer style={{
        marginTop: '2.5rem',
        padding: '1.25rem 1.5rem',
        backgroundColor: '#122D24',
        borderRadius: '12px',
        border: '1px solid rgba(201,164,76,0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        color: '#FFFFFF'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img src="/logo.png" alt="BPS Fresh Mills" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'contain', background: '#FFFFFF', padding: '2px' }} />
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#C9A44C', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🛵 BPS Delivery Partner App
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', background: '#2E8B57', color: '#FFFFFF', fontWeight: 700 }}>Rider Dispatch & COD Portal</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#D1E7DD', marginTop: '2px' }}>
              Ye BPS Delivery Boy Portal hai — Doorstep OTP Verification, Turn-by-Turn GPS Navigation & Cash On Delivery (COD) Settlement
            </div>
          </div>
        </div>
        <InstallPwaButton portalType="delivery" />
      </footer>
    </div>
  );
}
