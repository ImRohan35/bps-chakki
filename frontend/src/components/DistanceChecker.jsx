import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchApi } from '../utils/api';

export default function DistanceChecker() {
  const [addressInput, setAddressInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  // Pre-configured popular nearby local landmarks for instant test
  const sampleAreas = [
    { name: 'Rohini Sector 15 (2.1 KM)', lat: 28.7100, lon: 77.1100 },
    { name: 'Pitampura (4.8 KM)', lat: 28.6989, lon: 77.1386 },
    { name: 'Shalimar Bagh (7.2 KM)', lat: 28.7165, lon: 77.1593 },
    { name: 'Model Town (9.5 KM)', lat: 28.7028, lon: 77.1932 },
    { name: 'Noida Sector 62 (28 KM - Outside Area)', lat: 28.6280, lon: 77.3649 }
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

  const handleCustomCheck = (e) => {
    e.preventDefault();
    if (!addressInput.trim()) return;

    // Simulate distance check based on input
    const isOutside = addressInput.toLowerCase().includes('noida') ||
      addressInput.toLowerCase().includes('gurugram') ||
      addressInput.toLowerCase().includes('faridabad') ||
      addressInput.toLowerCase().includes('ghaziabad');

    const simulatedLat = isOutside ? 28.4595 : 28.7120;
    const simulatedLon = isOutside ? 77.0266 : 77.1150;

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--nature-light)', color: 'var(--nature-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Navigation size={18} />
        </div>
        <div>
          <h4 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
            Check Delivery In Your Area
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            We deliver freshly milled chakki atta within a strict 15 KM radius
          </p>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleCustomCheck} style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
        <input
          type="text"
          placeholder="Enter your Sector, Area, or PIN code..."
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
