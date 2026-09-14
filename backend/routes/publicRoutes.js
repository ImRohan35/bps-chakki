const express = require('express');
const db = require('../config/db');

const router = express.Router();

// GET PUBLIC STORE INFO & SETTINGS
router.get('/settings', (req, res) => {
  const settings = db.Settings.find()[0] || {};
  res.json({
    success: true,
    settings: {
      shopName: settings.shopName || 'BPS Fresh Mills',
      tagline: settings.tagline || 'Freshly Milled. Naturally Good.',
      phone: settings.supportPhone || settings.phone || '+91 98765 43210',
      whatsapp: settings.supportWhatsapp || settings.whatsapp || settings.phone || '+91 98765 43210',
      email: settings.supportEmail || settings.email || 'contact@bpsfreshmills.com',
      shopAddress: settings.shopAddress || 'Shop No. 4, Market Complex, Main Road, Sector 14, Delhi NCR 110085',
      shopLat: settings.shopLat || 28.7041,
      shopLon: settings.shopLon || 77.1025,
      maxDeliveryRadiusKm: settings.maxDeliveryRadiusKm || 15,
      deliveryCharge: settings.deliveryCharge !== undefined ? settings.deliveryCharge : 40,
      freeDeliveryThreshold: settings.freeDeliveryThreshold !== undefined ? settings.freeDeliveryThreshold : 500,
      businessHours: settings.businessHours || 'Mon - Sat: 8:00 AM - 8:30 PM | Sunday: 9:00 AM - 2:00 PM',
      returnPolicy: settings.returnPolicy || '',
      privacyPolicy: settings.privacyPolicy || '',
      terms: settings.terms || '',
      callEnabled: settings.callEnabled !== false,
      whatsappEnabled: settings.whatsappEnabled !== false
    }
  });
});

// SUBMIT CONTACT MESSAGE / CUSTOMER SUPPORT TICKET
router.post('/contact', (req, res) => {
  const { name, email, phone, message, orderId } = req.body;
  if (!name || !phone || !message) {
    return res.status(400).json({ success: false, message: 'Name, phone number and message are required.' });
  }

  // Save customer inquiry / ticket
  const ticket = db.Inquiries.insertOne({
    name: name.trim(),
    phone: phone.trim(),
    email: (email || '').trim().toLowerCase(),
    message: message.trim(),
    orderId: orderId ? orderId.trim() : null,
    status: 'new',
    createdAt: new Date().toISOString()
  });

  // Trigger in-app notification for Store Admin
  try {
    const { createInAppNotification } = require('../services/notificationService');
    createInAppNotification({
      recipientRole: 'admin',
      title: orderId ? `Support Ticket: Order #${orderId}` : 'New Customer Inquiry',
      message: `${name}: ${message.slice(0, 90)}${message.length > 90 ? '…' : ''}`,
      type: 'support',
      orderId: orderId || null,
      link: '/admin'
    });
  } catch (err) {
    console.error('[Inquiry Notification Error]:', err);
  }

  // Acknowledge received message
  res.json({
    success: true,
    message: `Thank you, ${name}! Your ${orderId ? 'support request' : 'inquiry'} has been received. Our team will contact you shortly on ${phone}.`,
    ticket
  });
});

module.exports = router;
