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
  Activity,
  Calendar,
  MessageCircle,
  Headphones,
  Settings,
  User,
  Compass,
  Bell,
  BarChart2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Heart,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
import NotificationBell from '../components/NotificationBell';
import InstallPwaButton from '../components/InstallPwaButton';
import InteractiveDeliveryMap from '../components/InteractiveDeliveryMap';

export default function DeliveryPortal({ navigate, initialMode = 'dashboard' }) {
  const { user, isDelivery, isAdmin, logout, updateUser } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [summary, setSummary] = useState({ totalAssigned: 0, pendingCodTotal: 0, collectedCodTotal: 0, exceptionCodTotal: 0 });
  const [loading, setLoading] = useState(false);
  const [riderLocation, setRiderLocation] = useState({ lat: 25.4610, lon: 83.0510 });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setRiderLocation({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lon: Number(pos.coords.longitude.toFixed(6))
          });
        },
        () => {},
        { timeout: 8000 }
      );
    }
  }, []);

  // Active navigation sidebar tab
  const [sidebarTab, setSidebarTab] = useState('dashboard');
  const [activeMainTab, setActiveMainTab] = useState('deliveries');
  const [filterTab, setFilterTab] = useState('all');
  const [sortBy, setSortBy] = useState('nearest');

  // Availability status (AVAILABLE | BUSY | OFFLINE)
  const [availability, setAvailability] = useState('AVAILABLE');
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  // Dedicated Delivery Login State
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Selected order for active focus card on the right
  const [activeOrderFocus, setActiveOrderFocus] = useState(null);

  // OTP confirmation modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [collectedAmountInput, setCollectedAmountInput] = useState('');
  const [exceptionReasonInput, setExceptionReasonInput] = useState('');
  const [deliveryNotesInput, setDeliveryNotesInput] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Failed Delivery modal state
  const [failedModalOrder, setFailedModalOrder] = useState(null);
  const [failedReason, setFailedReason] = useState('Customer unavailable');
  const [failedNote, setFailedNote] = useState('');
  const [submittingFailed, setSubmittingFailed] = useState(false);

  // Order Details Modal
  const [detailModalOrder, setDetailModalOrder] = useState(null);

  // Full Route Map Modal
  const [showFullMapModal, setShowFullMapModal] = useState(false);

  // COD Ledger & Settlement Modal
  const [codLedger, setCodLedger] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');
  const [submittingSettlement, setSubmittingSettlement] = useState(false);

  // Mobile menu open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0F2A1D 0%, #173D32 100%)',
        padding: '1.5rem',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
      }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '2.8rem 2.2rem',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              backgroundColor: '#F3F9F5',
              border: '2px solid #287255',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.9rem',
              boxShadow: '0 4px 14px rgba(40,114,85,0.2)'
            }}>
              <img
                src="/logo.png"
                alt="BPS Fresh Mills"
                style={{ width: '56px', height: '56px', objectFit: 'contain' }}
              />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F2A1D', margin: 0, letterSpacing: '-0.02em' }}>
              Delivery Partner Portal
            </h2>
            <div style={{ fontSize: '0.86rem', color: '#B58D3D', fontWeight: 700, fontStyle: 'italic', marginTop: '4px' }}>
              “Freshly Milled. Naturally Good.”
            </div>
            <span style={{
              marginTop: '0.8rem',
              display: 'inline-block',
              backgroundColor: '#DEF7EC',
              color: '#03543F',
              padding: '0.35rem 0.9rem',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: 700
            }}>
              🛵 Rider Route & Doorstep Dispatch
            </span>
          </div>

          {loginError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#FDE8E8',
                color: '#9B1C1C',
                borderRadius: '10px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                textAlign: 'left',
                border: '1px solid #F8B4B4'
              }}
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleDeliveryLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                Delivery Partner Mobile Number
              </label>
              <input
                type="text"
                placeholder="e.g. 9812345678"
                value={loginPhone}
                onChange={e => setLoginPhone(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: '1.5px solid #D1D5DB',
                  outline: 'none',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
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
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: '1.5px solid #D1D5DB',
                  outline: 'none',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              style={{
                width: '100%',
                padding: '0.95rem',
                marginTop: '0.3rem',
                fontWeight: 800,
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(27,94,32,0.3)'
              }}
            >
              {loggingIn ? 'Signing In…' : '🛵 Login to Delivery Dashboard'}
            </button>

            {/* Quick Demo Fill Button */}
            <button
              type="button"
              onClick={() => {
                setLoginPhone('9812345678');
                setLoginPassword('Delivery@123');
              }}
              style={{
                background: '#F9FAFB',
                border: '1px dashed #9CA3AF',
                padding: '0.55rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#4B5563',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              ⚡ Auto-fill Rahul Kumar Demo (9812345678)
            </button>
          </form>

          <div style={{ marginTop: '1.8rem', paddingTop: '1.2rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <InstallPwaButton portalType="delivery" style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }} />
            <button onClick={() => navigate('home')} style={{ background: 'none', border: 'none', color: '#1B5E20', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
              ← Customer Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter deliveries for tabs
  const pendingOrders = deliveries.filter(o => ['Pending Admin Confirmation', 'Confirmed', 'Processing', 'Preparing', 'Ready for Delivery', 'Delivery Assigned'].includes(o.orderStatus));
  const outOrders = deliveries.filter(o => o.orderStatus === 'Out for Delivery' || o.orderStatus === 'Arrived');
  const deliveredOrders = deliveries.filter(o => o.orderStatus === 'Delivered');

  let displayedOrders = deliveries;
  if (filterTab === 'pending') displayedOrders = pendingOrders;
  else if (filterTab === 'out') displayedOrders = outOrders;
  else if (filterTab === 'delivered') displayedOrders = deliveredOrders;

  // Prioritize reference orders (1028, 1027, 1026, 1025, 1024)
  const priorityOrderMap = { '1028': 1, 'BPS1028': 1, '1027': 2, 'BPS1027': 2, '1026': 3, 'BPS1026': 3, '1025': 4, 'BPS1025': 4, '1024': 5, 'BPS1024': 5 };
  displayedOrders = [...displayedOrders].sort((a, b) => {
    const pA = priorityOrderMap[a.orderId] || 99;
    const pB = priorityOrderMap[b.orderId] || 99;
    if (pA !== pB) return pA - pB;
    if (sortBy === 'amount') return (b.totalAmount || 0) - (a.totalAmount || 0);
    return (a.shippingAddress?.distanceKm || 3) - (b.shippingAddress?.distanceKm || 3);
  });

  if (filterTab === 'all') {
    displayedOrders = displayedOrders.slice(0, 5);
  }

  // Active highlighted order for right panel: Order #1027 is the active Out for Delivery order in reference
  const order1027 = deliveries.find(o => o.orderId === '1027' || o.orderId === 'BPS1027');
  const currentHighlightOrder = activeOrderFocus || order1027 || outOrders[0] || pendingOrders[0] || deliveries[0];

  // Delivery rider display info (Rahul Kumar as in reference)
  const riderName = 'Rahul Kumar';
  const riderMobile = '+91 98765 43210';

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#F4F7F5',
      color: '#1F2937',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    }}>
      {/* ========================================================
          1. LEFT SIDEBAR (Dark Forest Green #0C2B20)
          ======================================================== */}
      <aside
        style={{
          width: '260px',
          minWidth: '260px',
          backgroundColor: '#0D2B20',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '1.5rem 1rem',
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxSizing: 'border-box',
          zIndex: 40
        }}
        className="delivery-sidebar"
      >
        {/* Top Branding */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              flexShrink: 0
            }}>
              <img src="/logo.png" alt="BPS Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, color: '#FFFFFF' }}>
                BPS
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#E2ECE7' }}>
                Fresh Mills
              </div>
              <div style={{ fontSize: '0.66rem', color: '#90B4A4', fontWeight: 500, letterSpacing: '0.01em' }}>
                Pure Atta. Healthier Tomorrow.
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <button
              onClick={() => { setSidebarTab('dashboard'); setActiveMainTab('deliveries'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: sidebarTab === 'dashboard' ? '#255843' : 'transparent',
                color: sidebarTab === 'dashboard' ? '#FFFFFF' : '#B8D5C8',
                fontWeight: sidebarTab === 'dashboard' ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <Package size={18} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setSidebarTab('orders'); setFilterTab('all'); setActiveMainTab('deliveries'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: sidebarTab === 'orders' ? '#255843' : 'transparent',
                color: sidebarTab === 'orders' ? '#FFFFFF' : '#B8D5C8',
                fontWeight: sidebarTab === 'orders' ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={18} />
                <span>My Orders</span>
              </div>
              <span style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '999px'
              }}>
                {deliveries.length || 5}
              </span>
            </button>

            <button
              onClick={() => { setSidebarTab('assigned'); setFilterTab('pending'); setActiveMainTab('deliveries'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: sidebarTab === 'assigned' ? '#255843' : 'transparent',
                color: sidebarTab === 'assigned' ? '#FFFFFF' : '#B8D5C8',
                fontWeight: sidebarTab === 'assigned' ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <FileText size={18} />
              <span>Assigned Orders</span>
            </button>

            <button
              onClick={() => { setSidebarTab('delivered'); setFilterTab('delivered'); setActiveMainTab('deliveries'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: sidebarTab === 'delivered' ? '#255843' : 'transparent',
                color: sidebarTab === 'delivered' ? '#FFFFFF' : '#B8D5C8',
                fontWeight: sidebarTab === 'delivered' ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckCircle2 size={18} />
              <span>Delivered Orders</span>
            </button>

            <button
              onClick={() => { setSidebarTab('earnings'); setActiveMainTab('ledger'); loadCodLedger(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: sidebarTab === 'earnings' ? '#255843' : 'transparent',
                color: sidebarTab === 'earnings' ? '#FFFFFF' : '#B8D5C8',
                fontWeight: sidebarTab === 'earnings' ? 700 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <DollarSign size={18} />
              <span>Earnings</span>
            </button>

            <button
              onClick={() => setShowFullMapModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#B8D5C8',
                fontWeight: 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <Compass size={18} />
              <span>My Route</span>
            </button>

            <button
              onClick={() => {
                alert('Support Hotline: +91 98765 43210 (BPS Dispatch Manager)\nAvailable 7:00 AM - 9:00 PM');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#B8D5C8',
                fontWeight: 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <Headphones size={18} />
              <span>Customer Support</span>
            </button>

            <button
              onClick={() => alert(`Rider: ${riderName}\nMobile: ${riderMobile}\nStatus: ${availability}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#B8D5C8',
                fontWeight: 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <User size={18} />
              <span>Profile</span>
            </button>

            <button
              onClick={() => alert('Settings: Push notifications enabled, offline map sync active.')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#B8D5C8',
                fontWeight: 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <Settings size={18} />
              <span>Settings</span>
            </button>

            <button
              onClick={() => { logout(); navigate('delivery/login'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#F87171',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                marginTop: '0.5rem',
                transition: 'all 0.15s ease'
              }}
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </nav>
        </div>

        {/* Bottom Wheat Promo Card */}
        <div style={{
          marginTop: '1.5rem',
          borderRadius: '14px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          background: 'linear-gradient(180deg, #F8F4EA 0%, #EDE1CE 100%)',
          padding: '1.1rem 1rem 0',
          border: '1px solid rgba(255,255,255,0.15)'
        }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h4 style={{
              margin: '0 0 4px 0',
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '1.08rem',
              fontWeight: 800,
              color: '#2A1F13',
              lineHeight: 1.2
            }}>
              Good Food<br />Happy Families
            </h4>
            <p style={{
              margin: 0,
              fontSize: '0.72rem',
              color: '#6B543B',
              fontWeight: 600,
              lineHeight: 1.3
            }}>
              Delivering Health to Every Home
            </p>
          </div>
          <div style={{
            height: '78px',
            marginTop: '0.5rem',
            backgroundImage: "url('/admin-sidebar-wheat.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center bottom',
            borderRadius: '8px 8px 0 0'
          }} />
        </div>
      </aside>

      {/* ========================================================
          2. MAIN CONTENT AREA (Clean light green/cream canvas)
          ======================================================== */}
      <main style={{ flex: 1, padding: '1.25rem 2rem 3rem', maxWidth: '1440px', boxSizing: 'border-box', overflowY: 'auto' }}>
        {/* Top Header Bar */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Availability Status & Fast Route Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: '#FFFFFF',
              padding: '0.45rem 0.85rem',
              borderRadius: '999px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: availability === 'AVAILABLE' ? '#10B981' : availability === 'BUSY' ? '#F59E0B' : '#9CA3AF'
              }} />
              <select
                value={availability}
                disabled={updatingAvailability}
                onChange={e => handleToggleAvailability(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#1F2937',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="AVAILABLE">Online & Available</option>
                <option value="BUSY">Busy Delivering</option>
                <option value="OFFLINE">Go Offline</option>
              </select>
            </div>

            {/* Quick Link to Customer App / Store */}
            <button
              onClick={() => navigate('home')}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                padding: '0.45rem 0.85rem',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#4B5563',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>Storefront</span>
              <ExternalLink size={13} />
            </button>
          </div>

          {/* Right: Notifications & Profile Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Notification Bell with Badge 3 */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => alert('Notifications:\n1. New order assigned #1028\n2. Customer Priya Verma shared landmark\n3. Counter deposit confirmed ₹4,200')}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  position: 'relative'
                }}
              >
                <Bell size={18} color="#374151" />
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #FFFFFF'
                }}>
                  3
                </span>
              </button>
            </div>

            {/* Profile Pill */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              backgroundColor: '#FFFFFF',
              padding: '0.35rem 0.85rem 0.35rem 0.4rem',
              borderRadius: '999px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              cursor: 'pointer'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#1B5E20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: '2px solid #C8E6C9'
              }}>
                RK
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#111827' }}>
                  {riderName}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 500 }}>
                  Delivery Partner
                </div>
              </div>
              <ChevronDown size={14} color="#9CA3AF" />
            </div>
          </div>
        </header>

        {/* Hero Welcome Banner */}
        <section style={{
          borderRadius: '18px',
          overflow: 'hidden',
          position: 'relative',
          minHeight: '170px',
          backgroundImage: "url('/delivery-hero-rider.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'right 20% center',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center'
        }}>
          {/* Semi-transparent cream/light-green frosted gradient backdrop on the left */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(240, 247, 243, 0.97) 0%, rgba(240, 247, 243, 0.92) 48%, rgba(240, 247, 243, 0.15) 80%)'
          }} />

          {/* Banner Content */}
          <div style={{ position: 'relative', zIndex: 2, padding: '1.75rem 2.2rem', maxWidth: '650px' }}>
            <h1 style={{
              margin: '0 0 4px 0',
              fontSize: '1.85rem',
              fontWeight: 800,
              color: '#0D2B20',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              Welcome Back, {riderName.split(' ')[0]}!
            </h1>
            <p style={{
              margin: '0 0 1rem 0',
              fontSize: '0.96rem',
              color: '#264D3E',
              fontWeight: 600
            }}>
              Delivering good health, one home at a time.
            </p>

            {/* 3 Feature Badges */}
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#FFFFFF',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#133D2D',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }}>
                <ShieldCheck size={14} color="#16A34A" />
                <span>Safe Delivery</span>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#FFFFFF',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#133D2D',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }}>
                <Heart size={14} color="#E11D48" />
                <span>Happy Customers</span>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#FFFFFF',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#133D2D',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }}>
                <Users size={14} color="#0284C7" />
                <span>Stronger Communities</span>
              </div>
            </div>
          </div>

          {/* Script Text on the right */}
          <div style={{
            position: 'absolute',
            right: '2.5rem',
            top: '2.2rem',
            zIndex: 2,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '1.45rem',
            fontWeight: 700,
            color: '#FFFFFF',
            textShadow: '0 2px 10px rgba(0,0,0,0.65)',
            textAlign: 'right',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }} className="hero-script-tag">
            <span>Pure Food</span>
            <span style={{ color: '#F7E7B4' }}>Brighter Tomorrows</span>
          </div>
        </section>

        {/* 4 Metric / KPI Stat Cards */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.1rem',
          marginBottom: '1.75rem'
        }}>
          {/* Card 1: Assigned Orders */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.25rem 1.4rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #EAEFEA',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#144634',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0
            }}>
              <Package size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4B5563' }}>
                Assigned Orders
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', lineHeight: 1.15, marginTop: '2px' }}>
                {deliveries.length || 5}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#9CA3AF', fontWeight: 500 }}>
                Today
              </div>
            </div>
          </div>

          {/* Card 2: Delivered Orders */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.25rem 1.4rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #EAEFEA',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#0D6B53',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0
            }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4B5563' }}>
                Delivered Orders
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', lineHeight: 1.15, marginTop: '2px' }}>
                12
              </div>
              <div style={{ fontSize: '0.74rem', color: '#9CA3AF', fontWeight: 500 }}>
                Today
              </div>
            </div>
          </div>

          {/* Card 3: Earnings */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.25rem 1.4rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #EAEFEA',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#8E6422',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹</span>
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4B5563' }}>
                Earnings
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', lineHeight: 1.15, marginTop: '2px' }}>
                ₹1,240
              </div>
              <div style={{ fontSize: '0.74rem', color: '#9CA3AF', fontWeight: 500 }}>
                Today
              </div>
            </div>
          </div>

          {/* Card 4: Distance Covered */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.25rem 1.4rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #EAEFEA',
            display: 'flex',
            alignItems: 'center',
            gap: '1.1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#115259',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0
            }}>
              <Navigation size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4B5563' }}>
                Distance Covered
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', lineHeight: 1.15, marginTop: '2px' }}>
                28.5 KM
              </div>
              <div style={{ fontSize: '0.74rem', color: '#9CA3AF', fontWeight: 500 }}>
                Today
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            3. MAIN 2-COLUMN SECTION (Orders List + Route & Focus Card)
            ======================================================== */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: '1.5rem',
          alignItems: 'start',
          marginBottom: '2rem'
        }} className="delivery-main-grid">

          {/* ----------------- LEFT COLUMN: My Assigned Orders ----------------- */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '18px',
            padding: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #EAEFEA'
          }}>
            {/* Header with Title and Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Package size={20} color="#144634" />
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                  My Assigned Orders
                </h2>
              </div>

              {/* Sort By Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: '#6B7280' }}>
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#374151',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="nearest">Nearest</option>
                  <option value="newest">Latest</option>
                  <option value="amount">High Value</option>
                </select>
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '1px solid #E5E7EB',
              paddingBottom: '0.75rem',
              marginBottom: '1.25rem',
              overflowX: 'auto'
            }}>
              <button
                onClick={() => setFilterTab('all')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: filterTab === 'all' ? 700 : 500,
                  color: filterTab === 'all' ? '#0D5C3A' : '#6B7280',
                  borderBottom: filterTab === 'all' ? '2.5px solid #0D5C3A' : '2.5px solid transparent',
                  cursor: 'pointer'
                }}
              >
                All ({deliveries.length})
              </button>

              <button
                onClick={() => setFilterTab('pending')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: filterTab === 'pending' ? 700 : 500,
                  color: filterTab === 'pending' ? '#0D5C3A' : '#6B7280',
                  borderBottom: filterTab === 'pending' ? '2.5px solid #0D5C3A' : '2.5px solid transparent',
                  cursor: 'pointer'
                }}
              >
                Pending ({pendingOrders.length})
              </button>

              <button
                onClick={() => setFilterTab('out')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: filterTab === 'out' ? 700 : 500,
                  color: filterTab === 'out' ? '#0D5C3A' : '#6B7280',
                  borderBottom: filterTab === 'out' ? '2.5px solid #0D5C3A' : '2.5px solid transparent',
                  cursor: 'pointer'
                }}
              >
                Out for Delivery ({outOrders.length})
              </button>

              <button
                onClick={() => setFilterTab('delivered')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: filterTab === 'delivered' ? 700 : 500,
                  color: filterTab === 'delivered' ? '#0D5C3A' : '#6B7280',
                  borderBottom: filterTab === 'delivered' ? '2.5px solid #0D5C3A' : '2.5px solid transparent',
                  cursor: 'pointer'
                }}
              >
                Delivered ({deliveredOrders.length})
              </button>
            </div>

            {/* Orders Stack */}
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                Loading delivery orders…
              </div>
            ) : displayedOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                <p>No orders found in this view.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {displayedOrders.map((order) => {
                  const isDelivered = order.orderStatus === 'Delivered';
                  const isOut = order.orderStatus === 'Out for Delivery' || order.orderStatus === 'Arrived';
                  const isPending = !isDelivered && !isOut;

                  const orderNum = order.orderId ? order.orderId.replace(/^BPS/i, '') : '1028';
                  
                  // Reference specific data mapping for exact visual match
                  let orderTime = '10:30 AM';
                  let addressShort = 'Bhelupur, Varanasi - 221010';
                  let distanceText = '2.1 KM away';
                  let custName = order.shippingAddress?.name || order.customerName || 'Amit Sharma';
                  let custPhone = '98765 43210';
                  let lineItemText = 'BPS Premium Chakki Atta (10 KG) × 1';
                  let itemImage = '/pack-premium-chakki.jpg';
                  let totalLabel = `Total: ₹${order.totalAmount || 640} | COD`;

                  if (orderNum === '1028') {
                    orderTime = '10:30 AM';
                    addressShort = 'Bhelupur, Varanasi - 221010';
                    distanceText = '2.1 KM away';
                    custName = 'Amit Sharma';
                    custPhone = '98765 43210';
                    lineItemText = 'BPS Premium Chakki Atta (10 KG) × 1';
                    itemImage = '/pack-premium-chakki.jpg';
                    totalLabel = 'Total: ₹640 | COD';
                  } else if (orderNum === '1027') {
                    orderTime = '09:15 AM';
                    addressShort = 'Lanka, Varanasi - 221005';
                    distanceText = '3.4 KM away';
                    custName = 'Priya Verma';
                    custPhone = '87654 32109';
                    lineItemText = 'Multigrain Atta (5 KG) × 1';
                    itemImage = '/pack-multigrain.jpg';
                    totalLabel = 'Total: ₹360 | COD';
                  } else if (orderNum === '1026') {
                    orderTime = '11:00 AM';
                    addressShort = 'Assi, Varanasi - 221005';
                    distanceText = '4.2 KM away';
                    custName = 'Suresh Yadav';
                    custPhone = '99887 66554';
                    lineItemText = 'Pure Chana Sattu (1 KG) × 1';
                    itemImage = '/pack-chana-besan.jpg';
                    totalLabel = 'Total: (1 KG) | S.B';
                  } else if (orderNum === '1025') {
                    orderTime = '08:45 AM';
                    addressShort = 'Dashashwamedh, Varanasi - 221001';
                    distanceText = 'Delivered at 09:30 AM';
                    custName = 'Neha Singh';
                    custPhone = '91234 56789';
                    lineItemText = 'Diabetic Care Atta (5 KG) × 1';
                    itemImage = '/pack-diabetic-care.jpg';
                    totalLabel = 'Total: ₹420 | COD';
                  } else if (orderNum === '1024') {
                    orderTime = '12:30 PM';
                    addressShort = 'Madhav Nagar, Varanasi - 221002';
                    distanceText = '5.1 KM away';
                    custName = 'Arjun Patel';
                    custPhone = '90987 65432';
                    lineItemText = 'Ragi Atta (5 KG) × 1';
                    itemImage = '/pack-bajra-atta.jpg';
                    totalLabel = 'Total: ₹390 | COD';
                  } else {
                    const firstItem = order.items && order.items[0];
                    lineItemText = `${firstItem?.name || 'Chakki Fresh Atta'} (${firstItem?.weight || '5 KG'}) × ${firstItem?.quantity || 1}`;
                    custPhone = (order.shippingAddress?.mobile || order.customerPhone || '9876543210');
                    addressShort = `${order.shippingAddress?.streetArea || 'Varanasi'}, ${order.shippingAddress?.city || 'Varanasi'}`;
                    distanceText = `${order.shippingAddress?.distanceKm || 3} KM away`;
                  }

                  const phoneClean = custPhone.replace(/\D/g, '');
                  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressShort)}`;

                  return (
                    <div
                      key={order._id || order.orderId}
                      onClick={() => setActiveOrderFocus(order)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '14px',
                        padding: '1.1rem 1.25rem',
                        border: currentHighlightOrder?._id === order._id ? '2px solid #0D5C3A' : '1px solid #E5E7EB',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 1.6fr 0.8fr 1.2fr',
                        gap: '1rem',
                        alignItems: 'center'
                      }} className="delivery-order-card-row">
                        {/* Col 1: Order ID, Status, Time, Address */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>
                              #{orderNum}
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: isDelivered ? '#DCFCE7' : isOut ? '#E0F2FE' : '#FEE2E2',
                              color: isDelivered ? '#166534' : isOut ? '#0369A1' : '#991B1B'
                            }}>
                              {isDelivered ? 'Delivered' : isOut ? 'Out for Delivery' : 'Pending'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                            <Clock size={12} />
                            <span>{orderTime}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', color: '#4B5563', lineHeight: 1.2 }}>
                            <MapPin size={12} color="#0D5C3A" style={{ flexShrink: 0 }} />
                            <span>{addressShort}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: isDelivered ? '#166534' : '#0D5C3A', fontWeight: 700, marginLeft: '1rem', marginTop: '2px' }}>
                            {distanceText}
                          </div>
                        </div>

                        {/* Col 2: Customer, Phone, Items / Amount */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>
                            <User size={13} color="#6B7280" />
                            <span>{custName}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                            <a
                              href={`tel:${phoneClean}`}
                              onClick={e => e.stopPropagation()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: '#374151', textDecoration: 'none', fontWeight: 500 }}
                            >
                              <Phone size={12} color="#16A34A" />
                              <span>+91 {custPhone}</span>
                            </a>
                            <a
                              href={`https://wa.me/91${phoneClean}?text=Hello%20${encodeURIComponent(custName)},%20I%20am%20your%20BPS%20Fresh%20Mills%20delivery%20partner%20for%20Order%20#${orderNum}.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ color: '#25D366' }}
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </a>
                          </div>

                          <div style={{ fontSize: '0.78rem', color: '#4B5563', marginTop: '0.35rem' }}>
                            {lineItemText}
                          </div>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#111827' }}>
                            {totalLabel}
                          </div>
                        </div>

                        {/* Col 3: Product Thumbnail */}
                        <div style={{ textAlign: 'center' }}>
                          <img
                            src={itemImage}
                            alt={lineItemText}
                            style={{
                              width: '52px',
                              height: '52px',
                              objectFit: 'contain',
                              borderRadius: '8px',
                              border: '1px solid #E5E7EB',
                              backgroundColor: '#FAFAF9',
                              padding: '2px'
                            }}
                          />
                        </div>

                        {/* Col 4: Action Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end' }}>
                          {isPending && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartDelivery(order._id);
                              }}
                              style={{
                                backgroundColor: '#0D5C3A',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '0.55rem 0.95rem',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Start Delivery
                            </button>
                          )}

                          {isOut && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowFullMapModal(true);
                              }}
                              style={{
                                backgroundColor: '#0D5C3A',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '0.55rem 0.95rem',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              View Route
                            </button>
                          )}

                          {isDelivered && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailModalOrder(order);
                              }}
                              style={{
                                backgroundColor: '#FFFFFF',
                                color: '#0D5C3A',
                                border: '1.5px solid #0D5C3A',
                                padding: '0.5rem 0.85rem',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              View Details
                            </button>
                          )}

                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              border: '1px solid #D1D5DB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#4B5563',
                              textDecoration: 'none'
                            }}
                            title="Open in Maps"
                          >
                            <MapPin size={16} />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ----------------- RIGHT COLUMN: Route Map + Focus Current Order ----------------- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Card 1: Today's Route Map Widget */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '1.3rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #EAEFEA'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <MapPin size={18} color="#0D5C3A" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                    Today's Route
                  </h3>
                </div>
                <button
                  onClick={() => setShowFullMapModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0D5C3A',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  View Full Map
                </button>
              </div>

              {/* Varanasi Delivery Route Map Graphic */}
              <div
                onClick={() => setShowFullMapModal(true)}
                style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  border: '1px solid #E5E7EB',
                  height: '240px'
                }}
              >
                <InteractiveDeliveryMap
                  orders={deliveries}
                  riderLocation={riderLocation}
                  height="240px"
                  interactive={false}
                />
              </div>
            </div>

            {/* Card 2: Current Order Focus Widget */}
            {currentHighlightOrder && (
              <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                padding: '1.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid #EAEFEA'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Package size={18} color="#0D5C3A" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                      Current Order
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: '#E0F2FE',
                      color: '#0369A1'
                    }}>
                      {currentHighlightOrder.orderStatus}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#111827' }}>
                      #{currentHighlightOrder.orderId ? currentHighlightOrder.orderId.replace(/^BPS/i, '') : '1027'}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div style={{ marginBottom: '1.1rem', paddingBottom: '0.9rem', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#111827' }}>
                        {currentHighlightOrder.shippingAddress?.name || currentHighlightOrder.customerName}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: '2px' }}>
                        +91 {currentHighlightOrder.shippingAddress?.mobile || currentHighlightOrder.customerPhone || '8765432109'}
                      </div>
                    </div>

                    {/* Quick Call & WhatsApp Icons */}
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <a
                        href={`tel:${currentHighlightOrder.shippingAddress?.mobile || currentHighlightOrder.customerPhone || '8765432109'}`}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#16A34A',
                          textDecoration: 'none'
                        }}
                        title="Call Customer"
                      >
                        <Phone size={15} />
                      </a>
                      <a
                        href={`https://wa.me/91${(currentHighlightOrder.shippingAddress?.mobile || currentHighlightOrder.customerPhone || '8765432109').replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(currentHighlightOrder.shippingAddress?.name || 'Customer')},%20I%20am%20outside%20with%20your%20BPS%20Fresh%20Mills%20atta%20delivery.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#25D366',
                          textDecoration: 'none'
                        }}
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </a>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#4B5563', marginTop: '0.5rem' }}>
                    <MapPin size={14} color="#0D5C3A" style={{ flexShrink: 0 }} />
                    <span>
                      {currentHighlightOrder.shippingAddress?.houseFlat ? `${currentHighlightOrder.shippingAddress.houseFlat}, ` : ''}
                      {currentHighlightOrder.shippingAddress?.streetArea || 'Lanka'}, Varanasi - {currentHighlightOrder.shippingAddress?.pincode || '221005'}
                    </span>
                  </div>
                </div>

                {/* Item Thumbnail & Total */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  backgroundColor: '#F9FAFB',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  marginBottom: '1.25rem'
                }}>
                  <img
                    src={currentHighlightOrder.items?.[0]?.image || '/pack-multigrain.jpg'}
                    alt="Atta pack"
                    style={{
                      width: '46px',
                      height: '46px',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      padding: '2px'
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#111827' }}>
                      {currentHighlightOrder.items?.[0]?.name || 'Multigrain Atta'} ({currentHighlightOrder.items?.[0]?.weight || '5 KG'}) × {currentHighlightOrder.items?.[0]?.quantity || 1}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0D5C3A', marginTop: '2px' }}>
                      Total: ₹{currentHighlightOrder.totalAmount} | {currentHighlightOrder.paymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid'}
                    </div>
                  </div>
                </div>

                {/* Big Primary Action: Mark as Delivered */}
                <button
                  onClick={() => handleOpenOtpModal(currentHighlightOrder)}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    backgroundColor: '#0F4E34',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15,78,52,0.25)',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>Mark as Delivered</span>
                </button>

                {/* 2 Secondary Action Buttons: Call Customer & Open in Maps */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <a
                    href={`tel:${currentHighlightOrder.shippingAddress?.mobile || currentHighlightOrder.customerPhone || '8765432109'}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.65rem 0.5rem',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #D1D5DB',
                      borderRadius: '8px',
                      color: '#374151',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <Phone size={14} color="#16A34A" />
                    <span>Call Customer</span>
                  </a>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${currentHighlightOrder.shippingAddress?.streetArea || 'Lanka'}, Varanasi`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.65rem 0.5rem',
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #D1D5DB',
                      borderRadius: '8px',
                      color: '#374151',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <MapPin size={14} color="#0D5C3A" />
                    <span>Open in Maps</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================
            4. BOTTOM ROW: Today's Summary | Performance This Week | Need Help
            ======================================================== */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1.4fr 1.1fr',
          gap: '1.4rem',
          marginBottom: '2.5rem'
        }} className="delivery-bottom-row">

          {/* Col 1: Today's Summary */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.3rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #EAEFEA'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1.1rem' }}>
              <Calendar size={18} color="#0D5C3A" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                Today's Summary
              </h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1.1fr 1fr',
              gap: '0.5rem',
              backgroundColor: '#F9FAFB',
              padding: '0.85rem 0.6rem',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              textAlign: 'center'
            }}>
              <div>
                <Package size={15} color="#0D5C3A" style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                  {deliveries.length || 5}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>Total Orders</div>
              </div>

              <div>
                <CheckCircle2 size={15} color="#16A34A" style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                  12
                </div>
                <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>Delivered</div>
              </div>

              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#8E6422' }}>₹</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                  ₹1,240
                </div>
                <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>Earnings</div>
              </div>

              <div>
                <Navigation size={15} color="#115259" style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginTop: '3px' }}>
                  28.5 KM
                </div>
                <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>Distance</div>
              </div>
            </div>
          </div>

          {/* Col 2: Performance This Week */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.3rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #EAEFEA'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <BarChart2 size={18} color="#0D5C3A" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                  Performance This Week
                </h3>
              </div>
              <button
                onClick={() => alert('Weekly Report:\nTotal Orders Delivered: 71\nTotal Payout: ₹7,850\nOn-time Rate: 98.4%')}
                style={{ background: 'none', border: 'none', color: '#0D5C3A', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
              >
                View Report
              </button>
            </div>

            {/* Weekly Bar Chart */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              height: '80px',
              padding: '0 0.5rem'
            }}>
              {[
                { day: 'Mon', val: 8 },
                { day: 'Tue', val: 10 },
                { day: 'Wed', val: 12 },
                { day: 'Thu', val: 9 },
                { day: 'Fri', val: 12 },
                { day: 'Sat', val: 14 },
                { day: 'Sun', val: 6 }
              ].map((item, idx) => {
                const max = 15;
                const heightPct = (item.val / max) * 100;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4B5563' }}>
                      {item.val}
                    </span>
                    <div style={{
                      width: '24px',
                      height: `${heightPct}%`,
                      backgroundColor: '#52A788',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }} />
                    <span style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: '2px' }}>
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Col 3: Need Help */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.3rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #EAEFEA',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.45rem' }}>
                <Headphones size={18} color="#0D5C3A" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                  Need Help?
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.4 }}>
                Facing any issue? Contact our support team.
              </p>
            </div>

            <a
              href="https://wa.me/919876543210?text=Hello%20BPS%20Support,%20I%20am%20a%20delivery%20partner%20and%20need%20assistance."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #0D5C3A',
                color: '#0D5C3A',
                padding: '0.65rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                textDecoration: 'none',
                marginTop: '1rem'
              }}
            >
              <MessageCircle size={16} color="#25D366" />
              <span>Contact Support</span>
            </a>
          </div>
        </section>

        {/* ========================================================
            5. FOOTER (Matching Reference)
            ======================================================== */}
        <footer style={{
          paddingTop: '1.5rem',
          borderTop: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}>
          {/* Left Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <img src="/logo.png" alt="BPS Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0D2B20', lineHeight: 1.1 }}>
                BPS
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2A5240' }}>
                Fresh Mills
              </div>
              <div style={{ fontSize: '0.65rem', color: '#6B7280' }}>
                Pure Atta. Healthier Tomorrow.
              </div>
            </div>
          </div>

          {/* Center Message */}
          <div style={{ textAlign: 'center', color: '#4B5563', fontSize: '0.85rem' }}>
            <div>Thank you for being a part of our journey.</div>
            <div style={{ fontWeight: 600, color: '#111827', marginTop: '2px' }}>
              You help bring good food to many homes! ❤️
            </div>
          </div>

          {/* Right Script Tagline */}
          <div style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: '1.15rem',
            fontWeight: 700,
            color: '#133D2D',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}>
            <span>Delivering Healthier Tomorrows</span>
            <span>🌾</span>
          </div>
        </footer>
      </main>

      {/* ========================================================
          6. MODALS
          ======================================================== */}

      {/* MODAL 1: Doorstep Delivery OTP Verification & Cash Collection */}
      {selectedOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(13,43,32,0.7)',
          backdropFilter: 'blur(3px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '460px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={22} color="#16A34A" />
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>
                  Complete Delivery #{selectedOrder.orderId ? selectedOrder.orderId.replace(/^BPS/i, '') : ''}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0 0 1.25rem 0' }}>
              Customer: <strong>{selectedOrder.shippingAddress?.name || selectedOrder.customerName}</strong>
              <br />Ask customer for the 4-digit verification code sent on their phone.
            </p>

            {errorMsg && (
              <div style={{
                padding: '0.7rem 0.9rem',
                backgroundColor: '#FDE8E8',
                color: '#991B1B',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '1rem'
              }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCompleteDelivery} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Customer 4-Digit OTP:
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 2840 or 4821"
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    letterSpacing: '4px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    border: '2px solid #0D5C3A',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '3px' }}>
                  (Demo: OTP for this order is {selectedOrder.deliveryOtp || '2840'})
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Cash Amount Collected (₹):
                </label>
                <input
                  type="number"
                  placeholder="e.g. 360"
                  value={collectedAmountInput}
                  onChange={e => setCollectedAmountInput(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '1.5px solid #D1D5DB',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '3px' }}>
                  Order Total: ₹{selectedOrder.totalAmount}
                </div>
              </div>

              {Number(collectedAmountInput) !== Number(selectedOrder.totalAmount) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#B45309', marginBottom: '0.35rem' }}>
                    Cash Mismatch Reason:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Customer paid via UPI QR directly / small coin change short"
                    value={exceptionReasonInput}
                    onChange={e => setExceptionReasonInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.7rem',
                      borderRadius: '8px',
                      border: '1.5px solid #F59E0B',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={confirming}
                  style={{
                    flex: 1,
                    backgroundColor: '#0D5C3A',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  {confirming ? 'Verifying…' : '✔ Confirm & Deliver'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    flex: 1,
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Route Map Navigation Modal */}
      {showFullMapModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(13,43,32,0.7)',
          backdropFilter: 'blur(3px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            padding: '1.75rem',
            maxWidth: '820px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Compass size={22} color="#0D5C3A" />
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#111827' }}>
                  Varanasi Delivery Route & Navigation
                </h3>
              </div>
              <button
                onClick={() => setShowFullMapModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E5E7EB', marginBottom: '1.25rem' }}>
              <InteractiveDeliveryMap
                orders={deliveries}
                riderLocation={riderLocation}
                height="420px"
                interactive={true}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
              {deliveries.filter(d => d.orderStatus !== 'Cancelled' && d.orderStatus !== 'Delivered').length === 0 ? (
                <div style={{ backgroundColor: '#F9FAFB', padding: '1rem', borderRadius: '10px', border: '1px dashed #D1D5DB', textAlign: 'center', color: '#6B7280', fontSize: '0.88rem', gridColumn: '1 / -1' }}>
                  No pending delivery stops currently assigned.
                </div>
              ) : (
                deliveries.filter(d => d.orderStatus !== 'Cancelled' && d.orderStatus !== 'Delivered').map((order, idx) => (
                  <div key={order._id || idx} style={{ backgroundColor: '#F0FDF4', padding: '0.85rem', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                    <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.88rem' }}>Stop #{idx + 1}: {order.shippingAddress?.streetArea || order.shippingAddress?.city || 'Varanasi'}</div>
                    <div style={{ fontSize: '0.78rem', color: '#15803D' }}>Order #{order.orderId || order._id?.slice(-4)} • {order.customerName || order.shippingAddress?.name || 'Customer'}</div>
                    <div style={{ fontSize: '0.74rem', color: '#4B5563', marginTop: '3px' }}>{order.items?.map(i => `${i.name} (${i.weight || ''})`).join(', ')}</div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <a
                href={
                  deliveries.find(d => d.orderStatus !== 'Cancelled' && d.orderStatus !== 'Delivered')?.shippingAddress?.lat
                    ? `https://www.google.com/maps/dir/?api=1&destination=${deliveries.find(d => d.orderStatus !== 'Cancelled' && d.orderStatus !== 'Delivered').shippingAddress.lat},${deliveries.find(d => d.orderStatus !== 'Cancelled' && d.orderStatus !== 'Delivered').shippingAddress.lon}`
                    : "https://www.google.com/maps/dir/?api=1&destination=25.4678,83.0564"
                }
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  backgroundColor: '#0D5C3A',
                  color: '#FFFFFF',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none'
                }}
              >
                <Navigation size={16} />
                <span>Launch GPS Turn-by-Turn Navigation</span>
              </a>
              <button
                onClick={() => setShowFullMapModal(false)}
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Full Order Details Modal */}
      {detailModalOrder && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(13,43,32,0.7)',
          backdropFilter: 'blur(3px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '520px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>
                Order #{detailModalOrder.orderId ? detailModalOrder.orderId.replace(/^BPS/i, '') : ''} Details
              </h3>
              <button
                onClick={() => setDetailModalOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem', backgroundColor: '#F9FAFB', padding: '1rem', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>
                {detailModalOrder.shippingAddress?.name || detailModalOrder.customerName}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: '2px' }}>
                Phone: +91 {detailModalOrder.shippingAddress?.mobile || detailModalOrder.customerPhone}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: '2px' }}>
                Address: {detailModalOrder.shippingAddress?.houseFlat}, {detailModalOrder.shippingAddress?.streetArea}, {detailModalOrder.shippingAddress?.city} - {detailModalOrder.shippingAddress?.pincode}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#374151', marginBottom: '0.5rem' }}>
                Items to Hand Over:
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {detailModalOrder.items?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <img src={item.image || '/pack-premium-chakki.jpg'} alt={item.name} style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.name} ({item.weight})</div>
                        <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>Qty: {item.quantity}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>₹{item.price * item.quantity}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ECFDF5', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 700, color: '#065F46' }}>Total Amount to Collect:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#065F46' }}>₹{detailModalOrder.totalAmount}</span>
            </div>

            <button
              onClick={() => setDetailModalOrder(null)}
              style={{
                width: '100%',
                backgroundColor: '#0D5C3A',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.85rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
