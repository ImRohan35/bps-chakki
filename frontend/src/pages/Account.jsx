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
  XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { fetchApi } from '../utils/api';

export default function Account({ navigate, onTrackOrder, activeTab: initialTab = 'orders' }) {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

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
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnMsg, setReturnMsg] = useState('');

  // Load orders and addresses when tab active
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

  // Return / Report Issue Submission
  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    setSubmittingReturn(true);
    try {
      const res = await fetchApi('/returns', {
        method: 'POST',
        body: JSON.stringify({
          orderId: returnModalOrder._id || returnModalOrder.orderId,
          reason: returnReason,
          description: returnDesc,
          imageUrl: returnImg
        })
      });

      if (res.success) {
        alert('Your report has been submitted! Our support team will review it within 24 hours.');
        setReturnModalOrder(null);
        setReturnDesc('');
        setReturnImg('');
      }
    } catch (err) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setSubmittingReturn(false);
    }
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
                            <span>{it.name} ({it.weight}) × {it.quantity}</span>
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
                          onClick={() => onTrackOrder && onTrackOrder(o)}
                          className="btn btn-sm btn-outline"
                        >
                          View Details
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
                  No saved addresses. Add one for quick 15 KM deliveries.
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>Supporting Image URL (Optional)</label>
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
    </div>
  );
}
