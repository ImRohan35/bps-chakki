const express = require('express');
const db = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

const router = express.Router();

// 1. CUSTOMER CREATES RETURN / REPORT ISSUE
router.post('/', authenticate, (req, res) => {
  try {
    const user = req.user;
    const { orderId, productId, reason, description, imageUrl } = req.body;

    if (!orderId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, reason and issue description are required.'
      });
    }

    const order = db.Orders.findOne(o => o._id === orderId || o.orderId === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.customerId !== user._id && order.customerPhone !== user.mobile) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this order.' });
    }

    if (order.orderStatus !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Issue reports / returns can only be requested for delivered orders.'
      });
    }

    const validReasons = [
      'Damaged package',
      'Wrong product',
      'Wrong quantity',
      'Packaging issue',
      'Quality issue',
      'Other'
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Please select a valid reason.' });
    }

    const returnDoc = db.ReturnRequests.insertOne({
      orderId: order.orderId,
      orderDbId: order._id,
      customerId: user._id,
      customerName: user.name,
      customerPhone: user.mobile,
      productId: productId || null,
      reason,
      description: description.trim(),
      imageUrl: imageUrl || '',
      status: 'Pending', // Pending, Approved, Rejected, Replacement Initiated, Refund Initiated, Resolved
      adminNotes: '',
      resolutionType: null // 'replacement' | 'refund' | 'none'
    });

    res.status(201).json({
      success: true,
      message: 'Your report has been submitted. Our support team will review it within 24 hours.',
      returnRequest: returnDoc
    });
  } catch (err) {
    console.error('Error creating return request:', err);
    res.status(500).json({ success: false, message: 'Failed to submit report.' });
  }
});

// 2. GET USER'S RETURN REQUESTS
router.get('/my-reports', authenticate, (req, res) => {
  try {
    const user = req.user;
    const reports = db.ReturnRequests.find(r => r.customerId === user._id || r.customerPhone === user.mobile);
    reports.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ success: true, count: reports.length, reports });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
});

module.exports = router;
