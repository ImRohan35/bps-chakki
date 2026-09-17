import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin } from 'lucide-react';

export default function InteractiveDeliveryMap({
  orders = [],
  riderLocation = null,
  height = '240px',
  interactive = true,
  onStopClick = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Default store location: BPS Fresh Mills (Lakhanpur, Cholapur, Varanasi)
  const storeCoord = [25.4678, 83.0564];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Remove existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Map
    const map = L.map(mapContainerRef.current, {
      center: storeCoord,
      zoom: 13,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive ? 'center' : false,
      doubleClickZoom: interactive,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Marker bounds collector
    const allCoords = [storeCoord];

    // 1. Mill Marker (Chakki Origin)
    const millIcon = L.divIcon({
      className: 'bps-mill-pin',
      html: `
        <div style="background:#0D5C3A;color:#FFFFFF;border:2.5px solid #FFFFFF;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(13,92,58,0.4);font-size:18px;cursor:pointer;">
          🌾
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const millMarker = L.marker(storeCoord, { icon: millIcon }).addTo(map);
    millMarker.bindPopup(`
      <div style="font-family:inherit;padding:4px;">
        <strong style="color:#0D5C3A;font-size:14px;display:block;">BPS Fresh Mills (Chakki)</strong>
        <span style="font-size:12px;color:#4B5563;">Lakhanpur, Cholapur, Varanasi</span>
        <div style="margin-top:6px;font-size:11px;font-weight:700;color:#16A34A;">🌱 Fresh Milling Origin Hub</div>
      </div>
    `);

    // 2. Rider Live Marker
    const riderPos = (riderLocation && riderLocation.lat && riderLocation.lon)
      ? [riderLocation.lat, riderLocation.lon]
      : [25.4610, 83.0510];

    allCoords.push(riderPos);

    const riderIcon = L.divIcon({
      className: 'bps-rider-pin',
      html: `
        <div style="background:#C9A44C;color:#173D32;border:2.5px solid #FFFFFF;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(201,164,76,0.5);font-size:18px;cursor:pointer;">
          🛵
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const riderMarker = L.marker(riderPos, { icon: riderIcon }).addTo(map);
    riderMarker.bindPopup(`
      <div style="font-family:inherit;padding:4px;">
        <strong style="color:#173D32;font-size:13px;display:block;">🛵 Rider Live Location</strong>
        <span style="font-size:12px;color:#4B5563;">Active GPS tracking enabled</span>
      </div>
    `);

    // 3. Customer Destination Markers
    const activeStops = (orders || []).filter(o => o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Delivered');

    activeStops.forEach((order, idx) => {
      const lat = order.shippingAddress?.lat || (storeCoord[0] + (idx + 1) * 0.012);
      const lon = order.shippingAddress?.lon || (storeCoord[1] + (idx + 1) * 0.009);
      const coord = [lat, lon];
      allCoords.push(coord);

      const stopIcon = L.divIcon({
        className: 'bps-customer-pin',
        html: `
          <div style="background:#E11D48;color:#FFFFFF;border:2px solid #FFFFFF;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(225,29,72,0.4);font-size:12px;font-weight:900;cursor:pointer;">
            ${idx + 1}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const custMarker = L.marker(coord, { icon: stopIcon }).addTo(map);

      const itemsDesc = (order.items || []).map(i => `${i.name} (${i.weight || ''})`).join(', ');
      const addressText = `${order.shippingAddress?.houseFlat || ''}, ${order.shippingAddress?.streetArea || ''}, ${order.shippingAddress?.pincode || ''}`;

      custMarker.bindPopup(`
        <div style="font-family:inherit;padding:4px;min-width:180px;">
          <div style="font-size:11px;font-weight:800;color:#E11D48;text-transform:uppercase;">Stop #${idx + 1}</div>
          <strong style="color:#111827;font-size:13px;display:block;margin:2px 0;">${order.customerName || order.shippingAddress?.name || 'Customer'}</strong>
          <div style="font-size:11.5px;color:#4B5563;margin-bottom:4px;">${addressText}</div>
          <div style="font-size:11.5px;color:#0D5C3A;font-weight:700;margin-bottom:8px;">📦 ${itemsDesc}</div>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:4px 10px;background:#0D5C3A;color:#FFFFFF;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;">
            Turn-by-turn Navigation ↗
          </a>
        </div>
      `);

      if (onStopClick) {
        custMarker.on('click', () => onStopClick(order));
      }
    });

    // 4. Polyline connecting Chakki -> Rider -> Customer stops
    if (allCoords.length > 1) {
      L.polyline(allCoords, {
        color: '#0D5C3A',
        weight: 4,
        opacity: 0.8,
        dashArray: '6, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // Fit map to show all pins
      map.fitBounds(L.latLngBounds(allCoords), {
        padding: [30, 30],
        maxZoom: 15
      });
    }

    // Clean up on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [orders, riderLocation, interactive]);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: '12px', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Floating GPS Route Indicator Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          right: '8px',
          backgroundColor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(6px)',
          padding: '0.4rem 0.75rem',
          borderRadius: '8px',
          fontSize: '0.74rem',
          fontWeight: 700,
          color: '#1F2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 400,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={13} color="#0D5C3A" />
          Lakhanpur Chakki → Live Delivery Route
        </span>
        <span style={{ color: '#0D5C3A', fontWeight: 800 }}>
          {orders.filter(o => o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Delivered').length} Active Stops
        </span>
      </div>
    </div>
  );
}
