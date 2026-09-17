import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Truck,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Plus,
  Radio,
  Clock,
  Navigation
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';

export default function Checkout({ navigate, onOrderPlaced }) {
  const { cartItems, subtotal, discount, deliveryCharge, finalTotal, coupon, clearCart, storeSettings } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [buyNowItem, setBuyNowItem] = useState(() => {
    try {
      const saved = sessionStorage.getItem('bps_buy_now_item');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const isBuyNow = !!buyNowItem;
  const activeItems = isBuyNow ? [buyNowItem] : (cartItems || []);

  const orderSubtotal = isBuyNow
    ? (buyNowItem.price * (buyNowItem.quantity || 1))
    : subtotal;

  const orderDiscount = coupon ? Math.min(orderSubtotal, coupon.discount) : 0;
  const orderDeliveryCharge =
    orderSubtotal === 0 || orderSubtotal >= (storeSettings?.freeDeliveryThreshold || 500)
      ? 0
      : (storeSettings?.deliveryCharge !== undefined ? storeSettings.deliveryCharge : 40);

  const orderFinalTotal = Math.max(0, orderSubtotal - orderDiscount + orderDeliveryCharge);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // New Address Form State
  const [newAddr, setNewAddr] = useState({
    name: user?.name || '',
    mobile: user?.mobile || '',
    houseFlat: '',
    streetArea: '',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    pincode: '221101',
    landmark: '',
    lat: 25.4678,
    lon: 83.0564
  });

  const [distanceInfo, setDistanceInfo] = useState({ isDeliverable: null, distanceKm: null });
  const [checkingDistance, setCheckingDistance] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [millingSlot, setMillingSlot] = useState('Morning Batch (8:00 AM - 11:30 AM)');
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsStatus('Fetching real-time GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectedLat = Number(pos.coords.latitude.toFixed(6));
        const detectedLon = Number(pos.coords.longitude.toFixed(6));
        setNewAddr(prev => ({
          ...prev,
          lat: detectedLat,
          lon: detectedLon
        }));
        setGpsLoading(false);
        setGpsStatus(`📍 GPS Detected: (${detectedLat}, ${detectedLon})`);
        checkAddressDistance({ lat: detectedLat, lon: detectedLon });
      },
      (err) => {
        setGpsLoading(false);
        setGpsStatus(`GPS error: ${err.message}. Using store default (Cholapur, Varanasi).`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Redirect if cart is empty AND no buy-now item
  useEffect(() => {
    if (!buyNowItem && (!cartItems || cartItems.length === 0)) {
      navigate('cart');
    }
  }, [buyNowItem, cartItems, navigate]);

  // Load user saved addresses
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchApi('/auth/addresses')
      .then(res => {
        if (res.success && res.addresses && res.addresses.length > 0) {
          setAddresses(res.addresses);
          const defaultAddr = res.addresses.find(a => a.isDefault) || res.addresses[0];
          setSelectedAddressId(defaultAddr.id);
          checkAddressDistance(defaultAddr);
        } else {
          setShowNewAddressForm(true);
        }
      })
      .catch(() => {
        setShowNewAddressForm(true);
      });
  }, [isAuthenticated]);

  const checkAddressDistance = (addr) => {
    setCheckingDistance(true);
    fetchApi('/orders/check-delivery-distance', {
      method: 'POST',
      body: JSON.stringify({ lat: addr.lat, lon: addr.lon })
    })
      .then(res => {
        setDistanceInfo({
          isDeliverable: res.isDeliverable,
          distanceKm: res.distanceKm,
          message: res.message
        });
      })
      .catch(() => {
        setDistanceInfo({ isDeliverable: null, distanceKm: null });
      })
      .finally(() => setCheckingDistance(false));
  };

  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr.id);
    checkAddressDistance(addr);
  };

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    if (!newAddr.houseFlat || !newAddr.streetArea || !newAddr.pincode) {
      alert('Please fill out all required address fields.');
      return;
    }

    try {
      const res = await fetchApi('/auth/addresses', {
        method: 'POST',
        body: JSON.stringify(newAddr)
      });
      if (res.success && res.newAddress) {
        setAddresses(res.addresses);
        setSelectedAddressId(res.newAddress.id);
        checkAddressDistance(res.newAddress);
        setShowNewAddressForm(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to add address');
    }
  };

  const handleCheckNewAddressDistance = () => {
    // Use pincode-based rough check for new address being filled
    // lat/lon will use the stored defaults until saved
    checkAddressDistance(newAddr);
  };

  const handlePlaceOrder = async () => {
    setErrorMessage('');

    if (!isAuthenticated) {
      navigate('login');
      return;
    }

    const currentAddr = addresses.find(a => a.id === selectedAddressId) || (showNewAddressForm ? newAddr : null);
    if (!currentAddr || !currentAddr.houseFlat) {
      setErrorMessage('Please provide a complete delivery address.');
      return;
    }

    // Place order (delivery condition check removed)
    setSubmittingOrder(true);

    try {
      const orderPayload = {
        items: activeItems.map(item => ({
          productId: item.productId,
          name: item.name,
          weight: item.weight,
          texture: item.texture || 'Medium',
          quantity: item.quantity,
          price: item.price
        })),
        shippingAddress: currentAddr,
        millingSlot: millingSlot,
        couponCode: coupon ? coupon.code : null,
        notes: orderNotes
      };

      const res = await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });

      if (res.success && res.order) {
        if (isBuyNow) {
          sessionStorage.removeItem('bps_buy_now_item');
          setBuyNowItem(null);
        } else {
          clearCart();
        }
        if (onOrderPlaced) {
          onOrderPlaced(res.order);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const selectedAddr = addresses.find(a => a.id === selectedAddressId);

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2rem', textAlign: 'center' }}>
        Checkout - Address & Delivery Check
      </h1>

      {/* 3-Step Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--primary-fresh-green, #2E8B57)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>1</div>
          <span style={{ fontWeight: 800, color: 'var(--primary-fresh-green, #2E8B57)', fontSize: '0.9rem' }}>Address</span>
        </div>
        <div style={{ width: '60px', height: '1.5px', backgroundColor: 'var(--border-subtle)', margin: '0 1rem' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>2</div>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Review</span>
        </div>
        <div style={{ width: '60px', height: '1.5px', backgroundColor: 'var(--border-subtle)', margin: '0 1rem' }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>3</div>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Place Order</span>
        </div>
      </div>

      {errorMessage && (
        <div style={{ padding: '1rem', backgroundColor: 'var(--danger-light, #FDE8E6)', color: 'var(--danger-rust, #C0392B)', borderRadius: '8px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid rgba(192,57,43,0.3)' }}>
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700 }}>Order could not be placed</div>
            <div style={{ fontSize: '0.9rem' }}>{errorMessage}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '3rem', alignItems: 'start' }}>
        {/* Left Column: Address Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.75rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Delivery Address</h2>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.15rem' }}>
                <MapPin size={20} style={{ color: 'var(--wheat-gold)' }} />
                <span>1. Delivery Address</span>
              </div>
              {addresses.length > 0 && (
                <button
                  onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                  className="btn btn-sm btn-outline"
                >
                  <Plus size={14} /> Add New
                </button>
              )}
            </div>

            {/* Existing Saved Addresses */}
            {addresses.length > 0 && !showNewAddressForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {addresses.map(addr => (
                  <div
                    key={addr.id}
                    onClick={() => handleSelectAddress(addr)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: selectedAddressId === addr.id ? '2px solid var(--wheat-gold)' : '1px solid var(--border-subtle)',
                      backgroundColor: selectedAddressId === addr.id ? 'var(--wheat-light)' : 'var(--bg-surface)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="deliveryAddress"
                      checked={selectedAddressId === addr.id}
                      onChange={() => handleSelectAddress(addr)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {addr.name} • {addr.mobile}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {addr.houseFlat}, {addr.streetArea}, {addr.landmark ? `Near ${addr.landmark}, ` : ''}{addr.city} {addr.pincode}
                      </div>
                      {addr.distanceKm && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--nature-green)', fontWeight: 700, marginTop: '4px' }}>
                          Distance: ~{addr.distanceKm} KM from mill
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Address Form */}
            {(showNewAddressForm || addresses.length === 0) && (
              <form onSubmit={handleAddNewAddress} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newAddr.name}
                  onChange={e => setNewAddr({ ...newAddr, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Phone Number *</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={newAddr.mobile}
                  onChange={e => setNewAddr({ ...newAddr, mobile: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>House / Flat / Street *</label>
                <input
                  type="text"
                  placeholder="e.g. Flat 302, Palm Heights"
                  value={newAddr.houseFlat}
                  onChange={e => setNewAddr({ ...newAddr, houseFlat: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>City / Area *</label>
                  <input
                    type="text"
                    value={newAddr.city}
                    onChange={e => setNewAddr({ ...newAddr, city: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>PIN Code *</label>
                  <input
                    type="text"
                    value={newAddr.pincode}
                    onChange={e => setNewAddr({ ...newAddr, pincode: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={gpsLoading}
                  style={{
                    flex: 1,
                    padding: '0.9rem',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--wheat-gold, #B8860B)',
                    border: '1.5px solid var(--wheat-gold, #B8860B)',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: gpsLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Navigation size={16} />
                  {gpsLoading ? 'Detecting GPS...' : '📍 Auto-Detect Live GPS'}
                </button>

                <button
                  type="button"
                  onClick={handleCheckNewAddressDistance}
                  style={{
                    flex: 1,
                    padding: '0.9rem',
                    backgroundColor: 'var(--primary-fresh-green, #2E8B57)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor='var(--nature-emerald, #247346)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor='var(--primary-fresh-green, #2E8B57)'}
                >
                  Check Availability
                </button>
              </div>

              {gpsStatus && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  {gpsStatus}
                </div>
              )}
            </form>
          )}

            {/* Delivery Distance Status Banner */}
            {distanceInfo.isDeliverable !== null && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: distanceInfo.isDeliverable ? 'var(--soft-green-bg, #E8F5EC)' : 'var(--danger-light, #FDE8E6)',
                  color: distanceInfo.isDeliverable ? 'var(--light-green, #173D32)' : 'var(--danger-rust, #C0392B)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  border: `1.5px solid ${distanceInfo.isDeliverable ? 'var(--primary-fresh-green, #2E8B57)' : 'var(--danger-rust, #C0392B)'}`
                }}
              >
                {distanceInfo.isDeliverable ? (
                  <>
                    <CheckCircle2 size={22} color="var(--primary-fresh-green, #2E8B57)" />
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Good News — We Deliver Here!</span>
                      {distanceInfo.distanceKm && (
                        <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                          Distance: ~{distanceInfo.distanceKm} KM from Lakhanpur Mill
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={22} color="var(--primary-fresh-green, #2E8B57)" />
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Good News — We Deliver Here!</span>
                      <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                        {distanceInfo.message || 'Fresh doorstep delivery available.'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Fresh Milling & Delivery Batch Selection */}
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <Clock size={20} style={{ color: 'var(--primary-fresh-green, #2E8B57)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Select Fresh Milling & Delivery Batch
              </h3>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
              At BPS Fresh Mills (Lakhanpur, Cholapur), grains are milled fresh strictly before dispatch. Choose your preferred batch:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {[
                {
                  id: 'Morning Batch (8:00 AM - 11:30 AM)',
                  title: 'Morning Batch 🌅',
                  time: '8:00 AM – 11:30 AM',
                  desc: 'Milled early morning, warm & fresh at breakfast'
                },
                {
                  id: 'Evening Batch (4:00 PM - 7:30 PM)',
                  title: 'Evening Batch 🌆',
                  time: '4:00 PM – 7:30 PM',
                  desc: 'Milled fresh in the afternoon, ready for dinner'
                }
              ].map(slot => (
                <div
                  key={slot.id}
                  onClick={() => setMillingSlot(slot.id)}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    border: millingSlot === slot.id ? '2px solid var(--primary-fresh-green, #2E8B57)' : '1px solid var(--border-subtle)',
                    backgroundColor: millingSlot === slot.id ? 'rgba(46, 139, 87, 0.08)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: millingSlot === slot.id ? 'var(--primary-fresh-green, #2E8B57)' : 'var(--text-primary)' }}>
                      {slot.title}
                    </span>
                    <input
                      type="radio"
                      name="millingSlot"
                      checked={millingSlot === slot.id}
                      onChange={() => setMillingSlot(slot.id)}
                    />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--wheat-gold, #B8860B)', marginBottom: '0.25rem' }}>
                    ⏱ {slot.time}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {slot.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Order Items Summary & Place Order Button */}
        <div>
          <div
            style={{
              padding: '2rem',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-card)',
              marginBottom: '2rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Order Summary
              </h3>
              {isBuyNow && (
                <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#173D32', color: '#C9A44C', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ⚡ Instant Buy Now
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {activeItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden' }}>
                       <img src={item.image || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {item.weight} {item.texture ? `(${item.texture === 'Fine' ? 'बारीक' : item.texture === 'Coarse' ? 'मोटा' : 'रेगुलर'})` : ''} × {item.quantity}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{item.price * item.quantity}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal</span>
                <span>₹{orderSubtotal}</span>
              </div>
              {orderDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A', fontWeight: 700 }}>
                  <span>Coupon Discount</span>
                  <span>-₹{orderDiscount}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Delivery Charge</span>
                <span style={{ color: orderDeliveryCharge === 0 ? 'var(--nature-green)' : 'inherit', fontWeight: 600 }}>
                  {orderDeliveryCharge === 0 ? 'FREE' : `₹${orderDeliveryCharge}`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
              <span>Total</span>
              <span>₹{orderFinalTotal}</span>
            </div>
          </div>

          <div
            style={{
              padding: '2rem',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
              Payment Method
            </h3>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', cursor: 'pointer', marginBottom: '2rem' }}>
              <input type="radio" name="payment" defaultChecked style={{ marginTop: '0.25rem', accentColor: 'var(--wheat-gold)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                  Cash on Delivery (COD)
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Pay when you receive your order
                </div>
              </div>
            </label>

            <button
              onClick={handlePlaceOrder}
              disabled={submittingOrder || distanceInfo.isDeliverable === false}
              style={{
                width: '100%',
                padding: '1.15rem',
                backgroundColor: '#2E8B57',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '1.1rem',
                cursor: (submittingOrder || distanceInfo.isDeliverable === false || distanceInfo.isDeliverable === null) ? 'not-allowed' : 'pointer',
                opacity: (submittingOrder || distanceInfo.isDeliverable === false || distanceInfo.isDeliverable === null) ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(46, 139, 87, 0.25)',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={e => { if (!submittingOrder && distanceInfo.isDeliverable) e.currentTarget.style.backgroundColor='#247346'; }}
              onMouseLeave={e => { if (!submittingOrder && distanceInfo.isDeliverable) e.currentTarget.style.backgroundColor='#2E8B57'; }}
            >
              {submittingOrder ? 'Placing Order...' : 'Place COD Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
