import React, { useState, useEffect } from 'react';
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Lock,
  LogOut,
  Trash2,
  Edit2,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  X,
  XCircle,
  HelpCircle,
  RotateCw,
  Truck,
  ShieldCheck,
  FileText,
  MessageSquare,
  Share2,
  Award,
  Wallet,
  Bell,
  Upload,
  Send,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import InvoiceModal from '../components/InvoiceModal';
import { fetchApi } from '../utils/api';

export default function Account({ navigate, onTrackOrder, activeTab: initialTab = 'orders' }) {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart, reorderItems } = useCart();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const handleCancelOrder = async (orderToCancel) => {
    const reason = window.prompt('Please enter the reason for cancellation (Optional):', 'Ordered by mistake');
    if (reason === null) return;

    setCancellingOrderId(orderToCancel._id);
    try {
      const res = await fetchApi(`/orders/${orderToCancel._id || orderToCancel.orderId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() || 'Customer requested cancellation' })
      });
      if (res.success) {
        alert('Your order has been cancelled successfully.');
        const refreshed = await fetchApi('/orders/my-orders');
        if (refreshed.success) setOrders(refreshed.orders || []);
      }
    } catch (err) {
      alert(err.message || 'Could not cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileMobile, setProfileMobile] = useState(user?.mobile || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addrForm, setAddrForm] = useState({
    houseFlat: '',
    streetArea: '',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110085',
    landmark: ''
  });

  // Return / Report Issue Modal State
  const [returnModalOrder, setReturnModalOrder] = useState(null);
  const [returnReason, setReturnReason] = useState('Damaged package');
  const [returnDesc, setReturnDesc] = useState('');
  const [returnImg, setReturnImg] = useState('');
  const [returnPhotoFile, setReturnPhotoFile] = useState(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnMsg, setReturnMsg] = useState('');

  // Invoice Modal State
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // Tickets State (Feature 67-68)
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketReplyMsg, setTicketReplyMsg] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    orderId: '',
    subject: '',
    category: 'General Inquiry',
    priority: 'MEDIUM',
    message: ''
  });
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Returns List State (Feature 63)
  const [returnsList, setReturnsList] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(false);

  // Wallet & Store Credit State (Feature 88)
  const [walletData, setWalletData] = useState({ balance: 0, ledger: [] });
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Loyalty Points State (Features 85-86)
  const [loyaltyData, setLoyaltyData] = useState({ points: 0, earningRate: 100, redemptionValue: 1, ledger: [] });
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);

  // Referral System State (Feature 87)
  const [referralData, setReferralData] = useState({
    referralCode: '',
    shareUrl: '',
    totalReferred: 0,
    qualifyingOrdersCount: 0,
    rewardPerOrder: 50
  });
  const [loadingReferral, setLoadingReferral] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Notification Preferences State (Feature 75)
  const [preferences, setPreferences] = useState({
    orderUpdates: true,
    deliveryAlerts: true,
    supportUpdates: true,
    promotionalOffers: false,
    reorderReminders: true
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [prefMsg, setPrefMsg] = useState('');

  // Order Support / "Need Help?" Modal State
  const [helpModalOrder, setHelpModalOrder] = useState(null);
  const [helpMessage, setHelpMessage] = useState('');
  const [submittingHelp, setSubmittingHelp] = useState(false);
  const [helpSuccessMsg, setHelpSuccessMsg] = useState('');

  const handleOpenHelpModal = (order) => {
    setHelpModalOrder(order);
    setHelpMessage('');
    setHelpSuccessMsg('');
  };

  const handleSubmitHelp = async (e) => {
    e.preventDefault();
    if (!helpMessage.trim() || !helpModalOrder) return;
    setSubmittingHelp(true);
    try {
      const res = await fetchApi('/public/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: user?.name || helpModalOrder.customerName || 'Customer',
          phone: user?.mobile || helpModalOrder.customerPhone || '9876543210',
          email: user?.email || helpModalOrder.customerEmail || '',
          orderId: helpModalOrder.orderId || helpModalOrder._id,
          message: helpMessage.trim()
        })
      });
      if (res.success) {
        setHelpSuccessMsg(res.message || 'Support request submitted successfully.');
        setTimeout(() => {
          setHelpModalOrder(null);
          setHelpSuccessMsg('');
        }, 2200);
      }
    } catch (err) {
      alert(err.message || 'Failed to submit request');
    } finally {
      setSubmittingHelp(false);
    }
  };

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return;
    const res = reorderItems(order.items);
    if (res.success && navigate) {
      navigate('cart');
    }
  };

  // Load active tab data
  useEffect(() => {
    if (!isAuthenticated) return;

    if (activeTab === 'orders') {
      setLoadingOrders(true);
      fetchApi('/orders/my-orders')
        .then(res => {
          if (res.success) setOrders(res.orders || []);
        })
        .catch(() => {})
        .finally(() => setLoadingOrders(false));
    }

    if (activeTab === 'addresses') {
      fetchApi('/auth/addresses')
        .then(res => {
          if (res.success) setAddresses(res.addresses || []);
        })
        .catch(() => {});
    }

    if (activeTab === 'tickets') {
      setLoadingTickets(true);
      fetchApi('/support/tickets/my-tickets')
        .then(res => {
          if (res.success) setTickets(res.tickets || []);
        })
        .catch(() => {})
        .finally(() => setLoadingTickets(false));
    }

    if (activeTab === 'returns') {
      setLoadingReturns(true);
      fetchApi('/returns/my-reports')
        .then(res => {
          if (res.success) setReturnsList(res.reports || []);
        })
        .catch(() => {})
        .finally(() => setLoadingReturns(false));
    }

    if (activeTab === 'wallet') {
      setLoadingWallet(true);
      fetchApi('/auth/wallet')
        .then(res => {
          if (res.success) setWalletData({ balance: res.balance || 0, ledger: res.ledger || [] });
        })
        .catch(() => {})
        .finally(() => setLoadingWallet(false));
    }

    if (activeTab === 'loyalty') {
      setLoadingLoyalty(true);
      fetchApi('/auth/loyalty')
        .then(res => {
          if (res.success) {
            setLoyaltyData({
              points: res.points || 0,
              earningRate: res.earningRate || 100,
              redemptionValue: res.redemptionValue || 1,
              ledger: res.ledger || []
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoadingLoyalty(false));
    }

    if (activeTab === 'referral') {
      setLoadingReferral(true);
      fetchApi('/auth/referral')
        .then(res => {
          if (res.success) {
            setReferralData({
              referralCode: res.referralCode || '',
              shareUrl: res.shareUrl || '',
              totalReferred: res.totalReferred || 0,
              qualifyingOrdersCount: res.qualifyingOrdersCount || 0,
              rewardPerOrder: res.rewardPerOrder || 50
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoadingReferral(false));
    }

    if (activeTab === 'preferences') {
      fetchApi('/auth/preferences')
        .then(res => {
          if (res.success && res.preferences) setPreferences(res.preferences);
        })
        .catch(() => {});
    }
  }, [activeTab, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="container" style={{ padding: '5rem 1.25rem', textAlign: 'center' }}>
        <h2>Please Login</h2>
        <p style={{ color: 'var(--text-muted)', margin: '1rem 0' }}>
          You must be logged in to view your account details and orders.
        </p>
        <button onClick={() => navigate('login')} className="btn btn-primary">
          Go to Login
        </button>
      </div>
    );
  }

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const res = await fetchApi('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          mobile: profileMobile
        })
      });
      if (res.success && res.user) {
        updateUser(res.user);
        setProfileMsg('Profile updated successfully!');
        setTimeout(() => setProfileMsg(''), 3000);
      }
    } catch (err) {
      setProfileMsg('Failed to update profile: ' + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg('New passwords do not match');
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg('');
    try {
      const res = await fetchApi('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (res.success) {
        setPasswordMsg('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordMsg(''), 3000);
      }
    } catch (err) {
      setPasswordMsg(err.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Address Handlers
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        const res = await fetchApi(`/auth/addresses/${editingAddress.id}`, {
          method: 'PUT',
          body: JSON.stringify(addrForm)
        });
        if (res.success) setAddresses(res.addresses);
      } else {
        const res = await fetchApi('/auth/addresses', {
          method: 'POST',
          body: JSON.stringify(addrForm)
        });
        if (res.success) setAddresses(res.addresses);
      }
      setShowAddressModal(false);
      setEditingAddress(null);
    } catch (err) {
      alert(err.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      const res = await fetchApi(`/auth/addresses/${id}`, { method: 'DELETE' });
      if (res.success) setAddresses(res.addresses);
    } catch (err) {
      alert(err.message || 'Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      const res = await fetchApi(`/auth/addresses/${id}/default`, { method: 'PUT' });
      if (res.success) setAddresses(res.addresses);
    } catch (err) {
      alert(err.message || 'Failed to set default address');
    }
  };

  // Return / Report Issue Submission with Multer Photo Upload support
  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    setSubmittingReturn(true);
    try {
      let finalImg = returnImg;
      if (returnPhotoFile) {
        const formData = new FormData();
        formData.append('image', returnPhotoFile);
        const token = localStorage.getItem('bps_token');
        const apiBase = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
        const uploadRes = await fetch(`${apiBase}/returns/upload-photo`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.url) {
          finalImg = uploadData.url;
        }
      }

      const res = await fetchApi('/returns', {
        method: 'POST',
        body: JSON.stringify({
          orderId: returnModalOrder._id || returnModalOrder.orderId,
          reason: returnReason,
          description: returnDesc,
          imageUrl: finalImg
        })
      });

      if (res.success) {
        alert('Your report has been submitted! Our support team will review it within 24 hours.');
        setReturnModalOrder(null);
        setReturnDesc('');
        setReturnImg('');
        setReturnPhotoFile(null);
        // Refresh returns if in returns tab
        fetchApi('/returns/my-reports').then(r => {
          if (r.success) setReturnsList(r.reports || []);
        }).catch(() => {});
      }
    } catch (err) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Support Ticket Handlers (Features 67-68)
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicketForm.subject.trim() || !newTicketForm.message.trim()) return;
    setCreatingTicket(true);
    try {
      const res = await fetchApi('/support/tickets', {
        method: 'POST',
        body: JSON.stringify(newTicketForm)
      });
      if (res.success) {
        alert(res.message || 'Support ticket created successfully!');
        setShowNewTicketModal(false);
        setNewTicketForm({ orderId: '', subject: '', category: 'General Inquiry', priority: 'MEDIUM', message: '' });
        const refreshed = await fetchApi('/support/tickets/my-tickets');
        if (refreshed.success) setTickets(refreshed.tickets || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to create ticket');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleSendTicketReply = async (ticketId) => {
    if (!ticketReplyMsg.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetchApi(`/support/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: ticketReplyMsg.trim() })
      });
      if (res.success) {
        setTicketReplyMsg('');
        const refreshed = await fetchApi(`/support/tickets/${ticketId}`);
        if (refreshed.success && refreshed.ticket) {
          setSelectedTicket(refreshed.ticket);
          // Also update list
          setTickets(prev => prev.map(t => (t._id === ticketId || t.ticketId === ticketId) ? refreshed.ticket : t));
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // Notification Preferences Handler (Feature 75)
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSavingPreferences(true);
    setPrefMsg('');
    try {
      const res = await fetchApi('/auth/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences)
      });
      if (res.success) {
        setPrefMsg('Notification settings saved successfully!');
        setTimeout(() => setPrefMsg(''), 3000);
      }
    } catch (err) {
      setPrefMsg('Failed to save settings: ' + err.message);
    } finally {
      setSavingPreferences(false);
    }
  };

  // Referral Code Copy Handler (Feature 87)
  const handleCopyReferral = () => {
    if (!referralData.referralCode) return;
    navigator.clipboard.writeText(referralData.referralCode);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2500);
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem', color: 'var(--text-primary)' }}>
        My Account
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Navigation Sidebar */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{user.name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.mobile}</div>
            {user.email && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <button
              onClick={() => setActiveTab('orders')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: activeTab === 'orders' ? 'var(--wheat-light)' : 'transparent',
                color: activeTab === 'orders' ? 'var(--earth-brown)' : 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              <ShoppingBag size={18} /> My Orders
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: activeTab === 'profile' ? 'var(--wheat-light)' : 'transparent',
                color: activeTab === 'profile' ? 'var(--earth-brown)' : 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              <User size={18} /> Profile Details
            </button>

            <button
              onClick={() => setActiveTab('addresses')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: activeTab === 'addresses' ? 'var(--wheat-light)' : 'transparent',
                color: activeTab === 'addresses' ? 'var(--earth-brown)' : 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              <MapPin size={18} /> Saved Addresses
            </button>

            <button
              onClick={() => setActiveTab('wishlist')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: activeTab === 'wishlist' ? 'var(--wheat-light)' : 'transparent',
                color: activeTab === 'wishlist' ? 'var(--earth-brown)' : 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              <Heart size={18} /> Wishlist ({wishlistItems.length})
            </button>

            <button
              onClick={() => setActiveTab('password')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: activeTab === 'password' ? 'var(--wheat-light)' : 'transparent',
                color: activeTab === 'password' ? 'var(--earth-brown)' : 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              <Lock size={18} /> Change Password
            </button>

            <button
              onClick={() => setActiveTab('tickets')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: activeTab === 'tickets' ? 'var(--wheat-light)' : 'transparent',
                color: activeTab === 'tickets' ? 'var(--earth-brown)' : 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              <MessageSquare size={18} /> Support Tickets
            </button>

            <button
              onClick={() => setActiveTab('returns')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: activeTab === 'returns' ? 'var(--wheat-light)' : 'transparent',
                color: activeTab === 'returns' ? 'var(--earth-brown)' : 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              <RotateCcw size={18} /> Returns & Issues
            </button>

            <button
              onClick={() => setActiveTab('wallet')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: activeTab === 'wallet' ? 'var(--wheat-light)' : 'transparent',
                color: activeTab === 'wallet' ? 'var(--earth-brown)' : 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              <Wallet size={18} /> Wallet Balance
            </button>

            <button
              onClick={() => setActiveTab('loyalty')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: activeTab === 'loyalty' ? 'var(--wheat-light)' : 'transparent',
                color: activeTab === 'loyalty' ? 'var(--earth-brown)' : 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              <Award size={18} /> Loyalty Points
            </button>

            <button
              onClick={() => setActiveTab('referral')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: activeTab === 'referral' ? 'var(--wheat-light)' : 'transparent',
                color: activeTab === 'referral' ? 'var(--earth-brown)' : 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              <Share2 size={18} /> Refer & Earn
            </button>

            <button
              onClick={() => setActiveTab('preferences')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                backgroundColor: activeTab === 'preferences' ? 'var(--wheat-light)' : 'transparent',
                color: activeTab === 'preferences' ? 'var(--earth-brown)' : 'var(--text-primary)',
                textAlign: 'left'
              }}
            >
              <Bell size={18} /> Notifications
            </button>

            {(user?.role === 'delivery' || user?.role === 'admin' || user?.role === 'super_admin') && (
              <button
                onClick={() => navigate('delivery')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  backgroundColor: 'rgba(46, 139, 87, 0.12)',
                  color: 'var(--primary-fresh-green, #2E8B57)',
                  textAlign: 'left',
                  border: '1.5px solid var(--primary-fresh-green, #2E8B57)',
                  marginTop: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                <Truck size={18} /> 🛵 My Deliveries Portal
              </button>
            )}

            {(user?.role === 'admin' || user?.role === 'super_admin') && (
              <button
                onClick={() => navigate('admin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  backgroundColor: 'rgba(23, 61, 50, 0.08)',
                  color: 'var(--earth-brown)',
                  textAlign: 'left',
                  border: '1.5px solid var(--earth-brown)',
                  marginTop: '0.35rem',
                  cursor: 'pointer'
                }}
              >
                <ShieldCheck size={18} /> 🛡️ Admin Dashboard
              </button>
            )}

            <div style={{ padding: '0.75rem 0.25rem 0.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Theme Appearance
              </div>
              <ThemeSwitcher variant="pills" />
            </div>

            <hr style={{ borderColor: 'var(--border-subtle)', margin: '0.5rem 0' }} />

            <button
              onClick={() => {
                logout();
                navigate('home');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.92rem',
                color: 'var(--danger-rust)',
                textAlign: 'left'
              }}
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div style={{ gridColumn: 'span 2' }}>
          {/* 1. MY ORDERS TAB */}
          {activeTab === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Order History</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{orders.length} orders</span>
              </div>

              {loadingOrders && (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading your orders...
                </div>
              )}

              {!loadingOrders && orders.length === 0 && (
                <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-strong)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>No orders placed yet</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                    Your freshly ground chakki orders will appear here for easy tracking.
                  </p>
                  <button onClick={() => navigate('shop')} className="btn btn-primary">
                    Shop Flours Now
                  </button>
                </div>
              )}

              {!loadingOrders && orders.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {orders.map(o => (
                    <div
                      key={o._id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.5rem',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                              #{o.orderId}
                            </span>
                            <span className={`badge ${o.orderStatus === 'Delivered' ? 'badge-green' : o.orderStatus === 'Cancelled' ? 'badge-red' : 'badge-gold'}`}>
                              {o.orderStatus}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--earth-brown)' }}>
                            ₹{o.totalAmount}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {o.paymentMethod}
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem', backgroundColor: 'var(--bg-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                        {o.items.map((it, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span>
                              {it.name} ({it.weight}{it.texture ? ` • ${it.texture === 'Fine' ? 'बारीक' : it.texture === 'Coarse' ? 'मोटा' : 'रेगुलर'}` : ''}) × {it.quantity}
                            </span>
                            <span style={{ fontWeight: 600 }}>₹{it.subtotal || it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => onTrackOrder && onTrackOrder(o)}
                          className="btn btn-sm btn-primary"
                        >
                          Track Order
                        </button>
                        <button
                          onClick={() => handleReorder(o)}
                          className="btn btn-sm btn-outline"
                          style={{ borderColor: 'var(--nature-green)', color: 'var(--nature-green)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Reorder same items"
                        >
                          <RotateCw size={14} /> Reorder
                        </button>
                        <button
                          onClick={() => onTrackOrder && onTrackOrder(o)}
                          className="btn btn-sm btn-outline"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => setSelectedInvoiceOrder(o)}
                          className="btn btn-sm btn-outline"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="View tax invoice & delivery receipt"
                        >
                          <FileText size={14} /> View Invoice
                        </button>
                        <button
                          onClick={() => handleOpenHelpModal(o)}
                          className="btn btn-sm btn-outline"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <HelpCircle size={14} /> Need Help?
                        </button>
                        {o.orderStatus === 'Delivered' && (
                          <button
                            onClick={() => setReturnModalOrder(o)}
                            className="btn btn-sm btn-outline"
                            style={{ borderColor: 'var(--warning-amber)', color: 'var(--warning-amber)' }}
                          >
                            <RotateCcw size={14} /> Report Issue
                          </button>
                        )}
                        {['Order Placed', 'Confirmed'].includes(o.orderStatus) && (
                          <button
                            onClick={() => handleCancelOrder(o)}
                            disabled={cancellingOrderId === o._id}
                            className="btn btn-sm"
                            style={{
                              color: 'var(--danger-rust, #C53030)',
                              backgroundColor: 'var(--danger-light, #FFF5F5)',
                              border: '1px solid rgba(197, 48, 48, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <XCircle size={14} /> {cancellingOrderId === o._id ? 'Cancelling...' : 'Cancel Order'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. PROFILE TAB */}
          {activeTab === 'profile' && (
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem' }}>Personal Profile</h2>

              {profileMsg && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', backgroundColor: 'var(--nature-light)', color: 'var(--nature-green)', fontSize: '0.9rem' }}>
                  {profileMsg}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Mobile Number (10 Digits)</label>
                  <input
                    type="tel"
                    value={profileMobile}
                    onChange={e => setProfileMobile(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Email Address (Optional)</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={profileSaving} style={{ width: 'fit-content' }}>
                  {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>
          )}

          {/* 3. SAVED ADDRESSES TAB */}
          {activeTab === 'addresses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Saved Delivery Addresses</h2>
                <button
                  onClick={() => {
                    setEditingAddress(null);
                    setAddrForm({ houseFlat: '', streetArea: '', city: 'Delhi', state: 'Delhi', pincode: '110085', landmark: '' });
                    setShowAddressModal(true);
                  }}
                  className="btn btn-sm btn-primary"
                >
                  <Plus size={14} /> Add New Address
                </button>
              </div>

              {addresses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-strong)' }}>
                  No saved addresses. Add one for quick doorstep deliveries.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {addresses.map(a => (
                    <div
                      key={a.id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.25rem',
                        border: a.isDefault ? '2px solid var(--wheat-gold)' : '1px solid var(--border-subtle)',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{a.name || user.name}</span>
                        {a.isDefault && <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>Default</span>}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>
                        <div>{a.houseFlat}, {a.streetArea}</div>
                        {a.landmark && <div>Landmark: {a.landmark}</div>}
                        <div>{a.city}, {a.state} - {a.pincode}</div>
                        <div>Phone: {a.mobile || user.mobile}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                        {!a.isDefault && (
                          <button
                            onClick={() => handleSetDefaultAddress(a.id)}
                            className="btn btn-sm btn-outline"
                            style={{ fontSize: '0.75rem' }}
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingAddress(a);
                            setAddrForm({ ...a });
                            setShowAddressModal(true);
                          }}
                          className="btn btn-sm btn-outline"
                          style={{ fontSize: '0.75rem' }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(a.id)}
                          className="btn btn-sm"
                          style={{ fontSize: '0.75rem', color: 'var(--danger-rust)', backgroundColor: 'var(--danger-light)' }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. WISHLIST TAB */}
          {activeTab === 'wishlist' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Saved Wishlist</h2>
              {wishlistItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-strong)' }}>
                  Your wishlist is empty. Save flours here for later!
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {wishlistItems.map(item => (
                    <div
                      key={item._id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                      />
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</div>
                      <div style={{ fontWeight: 800, color: 'var(--earth-brown)' }}>₹{item.price}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                        <button
                          onClick={() => {
                            addToCart(item, item.weight, 1);
                            removeFromWishlist(item._id);
                            navigate('cart');
                          }}
                          className="btn btn-sm btn-primary"
                          style={{ flex: 1 }}
                        >
                          Move to Cart
                        </button>
                        <button
                          onClick={() => removeFromWishlist(item._id)}
                          className="btn btn-sm btn-outline"
                          style={{ color: 'var(--danger-rust)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. CHANGE PASSWORD TAB */}
          {activeTab === 'password' && (
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem' }}>Change Security Password</h2>

              {passwordMsg && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', backgroundColor: passwordMsg.includes('success') ? 'var(--nature-light)' : 'var(--danger-light)', color: passwordMsg.includes('success') ? 'var(--nature-green)' : 'var(--danger-rust)', fontSize: '0.9rem' }}>
                  {passwordMsg}
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '450px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>New Password (Min. 6 chars)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.4rem' }}>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={passwordSaving} style={{ width: 'fit-content' }}>
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}

          {/* 6. SUPPORT TICKETS TAB (Features 67-68) */}
          {activeTab === 'tickets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Support & Help Tickets</h2>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Direct communication with the BPS Fresh Mills customer care team.
                  </div>
                </div>
                <button
                  onClick={() => setShowNewTicketModal(true)}
                  className="btn btn-sm btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={15} /> Open New Ticket
                </button>
              </div>

              {loadingTickets && (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading your tickets...
                </div>
              )}

              {!loadingTickets && tickets.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3.5rem 2rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-strong)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💬</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>No support tickets filed</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                    Have questions about your stone-ground flour, order delivery, or refund?
                  </p>
                  <button onClick={() => setShowNewTicketModal(true)} className="btn btn-primary">
                    Raise a Support Ticket
                  </button>
                </div>
              )}

              {!loadingTickets && tickets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {tickets.map(t => (
                    <div
                      key={t._id || t.ticketId}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.5rem',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--earth-brown)' }}>
                              #{t.ticketId}
                            </span>
                            <span className={`badge ${t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'badge-green' : t.status === 'WAITING_FOR_CUSTOMER' ? 'badge-gold' : 'badge-primary'}`}>
                              {t.status.replace(/_/g, ' ')}
                            </span>
                            <span className="badge" style={{ backgroundColor: '#E8F5EC', color: '#173D32', fontSize: '0.75rem' }}>
                              {t.category}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.35rem', color: 'var(--text-primary)' }}>
                            {t.subject}
                          </div>
                          {t.orderId && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Linked Order: #{t.orderId}
                            </div>
                          )}
                        </div>

                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                          {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Ticket Replies / Conversation */}
                      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                        {t.replies && t.replies.map((r, rIdx) => (
                          <div
                            key={rIdx}
                            style={{
                              padding: '0.75rem 1rem',
                              borderRadius: '8px',
                              backgroundColor: r.senderRole === 'admin' ? '#E8F5EC' : '#FFFFFF',
                              border: r.senderRole === 'admin' ? '1px solid #C4E1CF' : '1px solid var(--border-subtle)',
                              alignSelf: r.senderRole === 'admin' ? 'flex-start' : 'flex-end',
                              maxWidth: '85%'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.25rem', color: r.senderRole === 'admin' ? '#173D32' : 'var(--earth-brown)' }}>
                              <span>{r.senderRole === 'admin' ? '🛡️ BPS Fresh Mills Support' : '👤 You'}</span>
                              <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                                {new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                              {r.message}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Reply Input */}
                      {t.status !== 'CLOSED' ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input
                            type="text"
                            placeholder="Type your reply to customer support..."
                            value={selectedTicket?._id === t._id ? ticketReplyMsg : ''}
                            onFocus={() => setSelectedTicket(t)}
                            onChange={e => {
                              setSelectedTicket(t);
                              setTicketReplyMsg(e.target.value);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSendTicketReply(t._id || t.ticketId);
                            }}
                            style={{ flex: 1 }}
                          />
                          <button
                            onClick={() => handleSendTicketReply(t._id || t.ticketId)}
                            disabled={sendingReply || !ticketReplyMsg.trim()}
                            className="btn btn-sm btn-primary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Send size={14} /> Send
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          This ticket has been marked as closed.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. RETURNS & ISSUES TAB (Features 61-64) */}
          {activeTab === 'returns' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Returns & Quality Issues</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  View the status of reported delivery or quality issues.
                </div>
              </div>

              {/* 48h Food Policy Notice */}
              <div style={{ backgroundColor: '#E8F5EC', border: '1px solid #2E8B57', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <Clock size={20} color="#173D32" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.85rem', color: '#173D32', lineHeight: 1.5 }}>
                  <strong>Freshness & Food Safety Assurance:</strong> Our flour is 100% stone-ground with zero chemical preservatives. If you experience packaging damage or freshness concerns, issues must be submitted within <strong>48 hours of doorstep delivery</strong>. Our support team reviews all requests within 24 hours.
                </div>
              </div>

              {loadingReturns && (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading your reported issues...
                </div>
              )}

              {!loadingReturns && returnsList.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3.5rem 2rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-strong)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.3rem' }}>No return requests reported</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                    All your delivered orders are in good standing. You can report an issue directly from the My Orders tab.
                  </p>
                  <button onClick={() => setActiveTab('orders')} className="btn btn-outline">
                    View My Orders
                  </button>
                </div>
              )}

              {!loadingReturns && returnsList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {returnsList.map(r => (
                    <div
                      key={r._id}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '1.5rem',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                              Order #{r.orderId}
                            </span>
                            <span className={`badge ${r.status === 'APPROVED' || r.status === 'COMPLETED' ? 'badge-green' : r.status === 'REJECTED' ? 'badge-red' : 'badge-gold'}`}>
                              {r.status.replace(/_/g, ' ')}
                            </span>
                            <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>
                              {r.reason}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                            Reported on: {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>

                        {r.resolutionType && (
                          <div style={{ textAlign: 'right' }}>
                            <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
                              Resolution: {r.resolutionType.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1rem' }}>
                        <strong>Issue Description:</strong> {r.description}
                      </p>

                      {r.imageUrl && (
                        <div style={{ marginBottom: '1rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Attached Photo:
                          </span>
                          <a href={r.imageUrl} target="_blank" rel="noreferrer">
                            <img
                              src={r.imageUrl}
                              alt="Issue proof"
                              style={{ width: '100px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                            />
                          </a>
                        </div>
                      )}

                      {r.adminNotes && (
                        <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '6px', borderLeft: '3px solid var(--earth-brown)', fontSize: '0.85rem' }}>
                          <strong>Support Team Note:</strong> {r.adminNotes}
                        </div>
                      )}

                      {r.replacementOrderId && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#2E8B57', fontWeight: 700 }}>
                          ✓ Replacement Order Created: #{r.replacementOrderId}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 8. WALLET & STORE CREDIT TAB (Feature 88) */}
          {activeTab === 'wallet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Wallet & Store Credit</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Your store balance from refunds, returns, or promotional credits.
                </div>
              </div>

              {/* Balance Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #173D32 0%, #2E8B57 100%)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem',
                  color: '#FFFFFF',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E8F5EC', fontWeight: 700 }}>
                    Available Store Credit
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.25rem' }}>
                    ₹{walletData.balance}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#E8F5EC', marginTop: '0.25rem' }}>
                    Automatically applied at checkout on your next fresh chakki order.
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '1rem 1.25rem', borderRadius: '10px', backdropFilter: 'blur(4px)', maxWidth: '240px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '4px' }}>🛡️ COD & Credit Safe</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                    Store credits never expire and apply instantly to deduct payable cash on delivery.
                  </div>
                </div>
              </div>

              {/* Ledger */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Transaction History</h3>
                {loadingWallet && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading ledger...</div>}
                {!loadingWallet && (!walletData.ledger || walletData.ledger.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-strong)', color: 'var(--text-muted)' }}>
                    No wallet transactions recorded yet.
                  </div>
                )}
                {!loadingWallet && walletData.ledger && walletData.ledger.length > 0 && (
                  <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-surface)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Description</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walletData.ledger.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span className={`badge ${item.type === 'CREDIT' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.72rem' }}>
                                {item.type}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                              {item.reason || item.description || 'Store credit update'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                              {new Date(item.timestamp || item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: item.type === 'CREDIT' ? '#2E8B57' : 'var(--danger-rust)' }}>
                              {item.type === 'CREDIT' ? `+₹${item.amount}` : `-₹${item.amount}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 9. LOYALTY POINTS TAB (Features 85-86) */}
          {activeTab === 'loyalty' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Chakki Loyalty Rewards</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Earn points on every fresh flour purchase and save on future orders.
                </div>
              </div>

              {/* Loyalty Header Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #2E8B57 0%, #173D32 100%)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem',
                  color: '#FFFFFF',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1.5rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={20} color="#F7F9F8" />
                    <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E8F5EC', fontWeight: 700 }}>
                      Loyalty Points Balance
                    </span>
                  </div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.25rem' }}>
                    {loyaltyData.points} <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Pts</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#E8F5EC', marginTop: '0.25rem' }}>
                    Equivalent to <strong>₹{loyaltyData.points * loyaltyData.redemptionValue}</strong> discount value
                  </div>
                </div>

                <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '1rem 1.25rem', borderRadius: '10px', backdropFilter: 'blur(4px)', maxWidth: '280px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '4px' }}>🌾 Earning Rule</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                    Earn 1 Point for every ₹{loyaltyData.earningRate} spent on delivered orders. 1 Point = ₹{loyaltyData.redemptionValue} discount on future checkouts!
                  </div>
                </div>
              </div>

              {/* Points Ledger */}
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.75rem' }}>Points Activity Ledger</h3>
                {loadingLoyalty && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading loyalty ledger...</div>}
                {!loadingLoyalty && (!loyaltyData.ledger || loyaltyData.ledger.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-strong)', color: 'var(--text-muted)' }}>
                    No points transactions yet. Complete your first order to start earning!
                  </div>
                )}
                {!loadingLoyalty && loyaltyData.ledger && loyaltyData.ledger.length > 0 && (
                  <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-surface)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '0.75rem 1rem' }}>Activity</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Details</th>
                          <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loyaltyData.ledger.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span className={`badge ${item.points > 0 ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: '0.72rem' }}>
                                {item.points > 0 ? 'EARNED' : 'REDEEMED'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                              {item.reason || `Order #${item.orderId || ''}`}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                              {new Date(item.timestamp || item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: item.points > 0 ? '#2E8B57' : 'var(--danger-rust)' }}>
                              {item.points > 0 ? `+${item.points}` : `${item.points}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. REFER & EARN TAB (Feature 87) */}
          {activeTab === 'referral' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Refer Friends & Family</h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Give fresh grains, earn 50 loyalty points on each friend's first delivered order.
                </div>
              </div>

              {/* Referral Code Card */}
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem',
                  border: '1.5px dashed var(--earth-brown)',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  YOUR UNIQUE REFERRAL CODE
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '3px', color: '#173D32', margin: '0.5rem 0 1.25rem', fontFamily: 'monospace' }}>
                  {referralData.referralCode || 'BPS-FRESH'}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCopyReferral}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Copy size={16} /> {copiedReferral ? 'Copied to Clipboard!' : 'Copy Code'}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`🌾 Get freshly milled stone-ground atta from BPS Fresh Mills! Naturally good, zero preservatives. Use my referral code: ${referralData.referralCode} when signing up!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: '#2E8B57', color: '#2E8B57' }}
                  >
                    <Share2 size={16} /> Share on WhatsApp
                  </a>
                </div>
              </div>

              {/* Referral Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--earth-brown)' }}>{referralData.totalReferred}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>Friends Joined</div>
                </div>
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#2E8B57' }}>{referralData.qualifyingOrdersCount}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>Delivered Orders</div>
                </div>
                <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#C9A44C' }}>{referralData.qualifyingOrdersCount * referralData.rewardPerOrder}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>Points Earned</div>
                </div>
              </div>
            </div>
          )}

          {/* 11. NOTIFICATION PREFERENCES TAB (Feature 75) */}
          {activeTab === 'preferences' && (
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Notification Preferences</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Manage how BPS Fresh Mills sends you order, milling, and delivery updates.
              </p>

              {prefMsg && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', backgroundColor: 'var(--nature-light)', color: 'var(--nature-green)', fontSize: '0.9rem' }}>
                  {prefMsg}
                </div>
              )}

              <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '550px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Order Confirmation & Timeline SMS</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Receive dispatch, milling, and transit alerts.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.orderUpdates !== false}
                    onChange={e => setPreferences({ ...preferences, orderUpdates: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#2E8B57' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Delivery Boy Arrived & OTP Alerts</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Get notified immediately when rider reaches your doorstep.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.deliveryAlerts !== false}
                    onChange={e => setPreferences({ ...preferences, deliveryAlerts: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#2E8B57' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Customer Care & Ticket Replies</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Receive email/SMS updates when support staff replies.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.supportUpdates !== false}
                    onChange={e => setPreferences({ ...preferences, supportUpdates: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#2E8B57' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Fresh Milling Reminders & Buy Again</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Gentle reminder when your household flour cycle approaches 15 days.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.reorderReminders !== false}
                    onChange={e => setPreferences({ ...preferences, reorderReminders: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#2E8B57' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Promotional Discounts & Festival Offers</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Exclusive coupon codes and seasonal grain releases.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.promotionalOffers === true}
                    onChange={e => setPreferences({ ...preferences, promotionalOffers: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#2E8B57' }}
                  />
                </label>

                <button type="submit" className="btn btn-primary" disabled={savingPreferences} style={{ width: 'fit-content' }}>
                  {savingPreferences ? 'Saving...' : 'Save Notification Preferences'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Address Edit/Add Modal */}
      {showAddressModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(23,17,15,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '500px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontWeight: 800 }}>{editingAddress ? 'Edit Address' : 'Add Delivery Address'}</h3>
              <button onClick={() => setShowAddressModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>House / Flat *</label>
                <input
                  type="text"
                  value={addrForm.houseFlat}
                  onChange={e => setAddrForm({ ...addrForm, houseFlat: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>Street / Area *</label>
                <input
                  type="text"
                  value={addrForm.streetArea}
                  onChange={e => setAddrForm({ ...addrForm, streetArea: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>City *</label>
                  <input
                    type="text"
                    value={addrForm.city}
                    onChange={e => setAddrForm({ ...addrForm, city: e.target.value })}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>PIN Code *</label>
                  <input
                    type="text"
                    value={addrForm.pincode}
                    onChange={e => setAddrForm({ ...addrForm, pincode: e.target.value })}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>Landmark (Optional)</label>
                <input
                  type="text"
                  value={addrForm.landmark}
                  onChange={e => setAddrForm({ ...addrForm, landmark: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Address
                </button>
                <button type="button" onClick={() => setShowAddressModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return / Report Issue Modal */}
      {returnModalOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(23,17,15,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '520px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 800 }}>Report Issue / Return Request</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Order #{returnModalOrder.orderId}</div>
              </div>
              <button onClick={() => setReturnModalOrder(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmitReturn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>Select Reason *</label>
                <select
                  value={returnReason}
                  onChange={e => setReturnReason(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="Damaged package">Damaged package</option>
                  <option value="Wrong product">Wrong product</option>
                  <option value="Wrong quantity">Wrong quantity</option>
                  <option value="Packaging issue">Packaging issue</option>
                  <option value="Quality issue">Quality issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>Description of Issue *</label>
                <textarea
                  rows="3"
                  placeholder="Please describe the issue in detail..."
                  value={returnDesc}
                  onChange={e => setReturnDesc(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                  Upload Photo Proof (Packaging / Damage / Quality)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={e => setReturnPhotoFile(e.target.files[0])}
                  style={{ width: '100%', marginBottom: '0.35rem' }}
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                  Or enter direct image URL:
                </div>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={returnImg}
                  onChange={e => setReturnImg(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                ℹ Under our food safety policy, returns are approved within 48 hours for verified quality or packaging concerns.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={submittingReturn} style={{ flex: 1 }}>
                  {submittingReturn ? 'Submitting...' : 'Submit Report'}
                </button>
                <button type="button" onClick={() => setReturnModalOrder(null)} className="btn btn-outline" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help / Support Modal */}
      {helpModalOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(23,17,15,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '520px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 800 }}>Need Help with Order?</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Order #{helpModalOrder.orderId || helpModalOrder._id}</div>
              </div>
              <button onClick={() => setHelpModalOrder(null)}><X size={20} /></button>
            </div>

            {helpSuccessMsg ? (
              <div style={{ padding: '1.25rem', backgroundColor: 'var(--nature-light)', color: 'var(--nature-green)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontWeight: 600 }}>
                {helpSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleSubmitHelp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Have questions regarding your order status, milling freshness, or delivery? Send us a direct message and our support team will reach out immediately.
                </p>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>Your Message / Question *</label>
                  <textarea
                    rows="4"
                    placeholder="Describe how we can assist you with this order..."
                    value={helpMessage}
                    onChange={e => setHelpMessage(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={submittingHelp} style={{ flex: 1 }}>
                    {submittingHelp ? 'Sending...' : 'Submit Support Request'}
                  </button>
                  <button type="button" onClick={() => setHelpModalOrder(null)} className="btn btn-outline" style={{ flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* New Support Ticket Modal (Feature 67) */}
      {showNewTicketModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(23,17,15,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '520px', width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontWeight: 800 }}>Open Support Ticket</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>We typically reply within 2 to 4 hours.</div>
              </div>
              <button onClick={() => setShowNewTicketModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>Related Order (Optional)</label>
                <select
                  value={newTicketForm.orderId}
                  onChange={e => setNewTicketForm({ ...newTicketForm, orderId: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="">-- No specific order / General inquiry --</option>
                  {orders.map(o => (
                    <option key={o._id} value={o.orderId}>
                      #{o.orderId} - ₹{o.totalAmount} ({o.orderStatus})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>Category *</label>
                  <select
                    value={newTicketForm.category}
                    onChange={e => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Delivery Delay">Delivery Delay</option>
                    <option value="Milling Freshness">Milling Freshness</option>
                    <option value="Packaging Issue">Packaging Issue</option>
                    <option value="Billing & COD">Billing & COD</option>
                    <option value="Return / Refund">Return / Refund</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>Priority</label>
                  <select
                    value={newTicketForm.priority}
                    onChange={e => setNewTicketForm({ ...newTicketForm, priority: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>Ticket Subject *</label>
                <input
                  type="text"
                  placeholder="Brief summary of your inquiry..."
                  value={newTicketForm.subject}
                  onChange={e => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.2rem' }}>Detailed Message *</label>
                <textarea
                  rows="4"
                  placeholder="Describe your inquiry, question, or request..."
                  value={newTicketForm.message}
                  onChange={e => setNewTicketForm({ ...newTicketForm, message: e.target.value })}
                  required
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" disabled={creatingTicket} style={{ flex: 1 }}>
                  {creatingTicket ? 'Submitting Ticket...' : 'Create Ticket'}
                </button>
                <button type="button" onClick={() => setShowNewTicketModal(false)} className="btn btn-outline" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice & Delivery Receipt Modal (Features 78-80) */}
      {selectedInvoiceOrder && (
        <InvoiceModal
          order={selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(null)}
        />
      )}
    </div>
  );
}
