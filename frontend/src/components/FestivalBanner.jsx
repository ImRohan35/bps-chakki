import React, { useState, useEffect } from 'react';
import { Tag, Copy, Check, ArrowRight, Sparkles } from 'lucide-react';
import { fetchApi } from '../utils/api';

export default function FestivalBanner({ onShopOffer }) {
  const [offers, setOffers] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    fetchApi('/offers')
      .then(res => {
        if (res.success && res.offers && res.offers.length > 0) {
          setOffers(res.offers);
        }
      })
      .catch(() => {});
  }, []);

  if (offers.length === 0) return null;

  const currentOffer = offers[0];

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  return (
    <div className="festival-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        <span className="offer-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={13} /> {currentOffer.name || 'FESTIVE SPECIAL'}
        </span>
        <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>
          {currentOffer.bannerText || currentOffer.description || `Get ${currentOffer.discountPercent}% OFF on orders above ₹${currentOffer.minOrderValue}`}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          className="coupon-pill"
          onClick={() => handleCopy(currentOffer.code)}
          title="Click to copy coupon code"
        >
          <Tag size={13} />
          <span>{currentOffer.code}</span>
          {copiedCode === currentOffer.code ? (
            <span style={{ color: 'var(--nature-green)', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.72rem' }}>
              <Check size={12} /> Copied!
            </span>
          ) : (
            <Copy size={12} style={{ opacity: 0.7 }} />
          )}
        </div>

        <button
          onClick={onShopOffer}
          className="btn btn-sm btn-primary"
          style={{ padding: '0.35rem 0.85rem', fontSize: '0.82rem' }}
        >
          SHOP OFFER <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
