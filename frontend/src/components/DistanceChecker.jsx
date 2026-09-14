import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchApi } from '../utils/api';

export default function DistanceChecker() {
  const [addressInput, setAddressInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  // Pre-configured popular nearby local landmarks for instant test around Lakhanpur, Cholapur, Varanasi
  const sampleAreas = [
    { name: 'Cholapur Bazar (1.5 KM)', lat: 25.4720, lon: 83.0500 },
    { name: 'Chaubeypur (6.8 KM)', lat: 25.4300, lon: 83.1000 },
    { name: 'Babatpur Airport (11.2 KM)', lat: 25.4500, lon: 82.8600 },
    { name: 'Sarnath (13.5 KM)', lat: 25.3715, lon: 83.0252 },
    { name: 'Mughalsarai (28 KM - Outside)', lat: 25.2800, lon: 83.1200 }
  ];

  const handleCheckCoordinate = async (lat, lon, label) => {
    setChecking(true);
    try {
      const res = await fetchApi('/orders/check-delivery-distance', {
        method: 'POST',
        body: JSON.stringify({ lat, lon })
      });
      setResult({
        isDeliverable: res.isDeliverable,
        distanceKm: res.distanceKm,
        message: res.message,
        locationName: label || addressInput
      });
    } catch (err) {
      setResult({
        isDeliverable: false,
        message: 'Could not calculate distance. Please verify address.'
      });
    } finally {
      setChecking(false);
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setChecking(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleCheckCoordinate(
          position.coords.latitude,
          position.coords.longitude,
          'Your Current GPS Location'
        );
      },
      (error) => {
        setChecking(false);
        alert('Could not access live location. Please enter your PIN code or area name.');
      },
      { timeout: 10000 }
    );
  };

  const handleCustomCheck = (e) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    const clean = addressInput.trim().toLowerCase();
    const isNearby = clean.includes('221101') || clean.includes('cholapur') || clean.includes('lakhanpur') || clean.includes('chaubeypur') || clean.includes('sarnath') || clean.includes('varanasi') || clean.includes('babatpur') || clean.includes('221007') || clean.includes('221002');
    const simulatedLat = isNearby ? 25.4600 : 28.6139;
    const simulatedLon = isNearby ? 83.0600 : 77.2090;

    handleCheckCoordinate(simulatedLat, simulatedLon, addressInput);
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--nature-light)', color: 'var(--nature-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={18} />
          </div>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              Check Delivery In Your Area (15 KM Radius)
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Milled at Lakhanpur, Cholapur, Varanasi 221101 • Delivered fresh within 15 KM
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDetectGPS}
          disabled={checking}
          className="btn btn-sm btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: 'var(--nature-green)', color: 'var(--nature-green)', fontWeight: 700 }}
        >
          <MapPin size={15} /> {checking ? 'Detecting…' : 'Detect My Location'}
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={handleCustomCheck} style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        <input
          type="text"
          placeholder="Enter your PIN code (e.g. 221101) or Area name..."
          value={addressInput}
          onChange={e => setAddressInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={checking}>
          {checking ? 'Checking...' : 'Check Radius'}
        </button>
      </form>

      {/* Quick Landmark Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Quick test:</span>
        {sampleAreas.map(area => (
          <button
            key={area.name}
            type="button"
            onClick={() => handleCheckCoordinate(area.lat, area.lon, area.name)}
            className="btn btn-sm btn-outline"
            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-full)' }}
          >
            {area.name}
          </button>
        ))}
      </div>

      {/* Result feedback */}
      {result && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: result.isDeliverable ? 'var(--nature-light)' : 'var(--danger-light)',
            color: result.isDeliverable ? 'var(--nature-green)' : 'var(--danger-rust)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            border: `1px solid ${result.isDeliverable ? 'rgba(46,111,64,0.3)' : 'rgba(192,57,43,0.3)'}`
          }}
        >
          {result.isDeliverable ? (
            <CheckCircle2 size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
          ) : (
            <AlertCircle size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
              {result.isDeliverable
                ? `Good News — We Deliver Here (${result.distanceKm} KM from our mill)`
                : 'Sorry, This Area Is Outside Our Delivery Range'}
            </div>
            <div style={{ fontSize: '0.84rem', marginTop: '2px' }}>
              {result.isDeliverable
                ? `Your location is within our fresh delivery radius. Order today for doorstep delivery!`
                : result.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
