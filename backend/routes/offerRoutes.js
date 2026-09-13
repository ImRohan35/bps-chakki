const express = require('express');
const db = require('../config/db');

const router = express.Router();

// 1. GET ALL ACTIVE OFFERS
router.get('/', (req, res) => {
  const now = new Date();
  const offers = db.Offers.find(o => {
    if (!o.isActive) return false;
    if (o.startDate && new Date(o.startDate) > now) return false;
    if (o.endDate && new Date(o.endDate) < now) return false;
    return true;
  });
  res.json({ success: true, offers });
});

// 2. VALIDATE & APPLY COUPON
router.post('/apply-coupon', (req, res) => {
  const { code, cartTotal } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, message: 'Please enter a promo code' });
  }

  const cleanCode = code.trim().toUpperCase();
  const offer = db.Offers.findOne(o => o.code && o.code.toUpperCase() === cleanCode);

  if (!offer) {
    return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
  }

  if (!offer.isActive) {
    return res.status(400).json({ success: false, message: 'This coupon is currently inactive.' });
  }

  const now = new Date();
  if (offer.endDate && new Date(offer.endDate) < now) {
    // Automatically mark expired offer inactive
    db.Offers.updateById(offer._id, { isActive: false });
    return res.status(400).json({ success: false, message: 'This coupon has expired.' });
  }

  if (offer.startDate && new Date(offer.startDate) > now) {
    return res.status(400).json({ success: false, message: 'This coupon is not active yet.' });
  }

  const subtotal = Number(cartTotal) || 0;
  if (offer.minOrderValue && subtotal < offer.minOrderValue) {
    return res.status(400).json({
      success: false,
      message: `Minimum order value for code ${cleanCode} is ₹${offer.minOrderValue}. Add items worth ₹${offer.minOrderValue - subtotal} more.`
    });
  }

  let discount = 0;
  if (offer.discountPercent && offer.discountPercent > 0) {
    discount = Math.round((subtotal * offer.discountPercent) / 100);
    if (offer.maxDiscount && discount > offer.maxDiscount) {
      discount = offer.maxDiscount;
    }
  } else if (offer.flatDiscount && offer.flatDiscount > 0) {
    discount = offer.flatDiscount;
  }

  // Discount cannot exceed subtotal
  if (discount > subtotal) {
    discount = subtotal;
  }

  return res.json({
    success: true,
    message: `Coupon '${cleanCode}' applied successfully! You saved ₹${discount}`,
    coupon: {
      code: cleanCode,
      name: offer.name,
      discount,
      minOrderValue: offer.minOrderValue
    }
  });
});

module.exports = router;
