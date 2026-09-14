const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');
const eventBus = require('../services/eventBus');

const router = express.Router();

// Multer photo upload for returns
let upload = null;
try {
  const multer = require('multer');
  const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `return_${Date.now()}${ext}`);
    }
  });
  upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
      const allowed = /jpeg|jpg|png|webp/;
      const ext = allowed.test(path.extname(file.originalname).toLowerCase());
      const mime = allowed.test(file.mimetype);
      if (ext && mime) return cb(null, true);
      cb(new Error('Only JPG, JPEG, PNG, and WebP images are allowed for returns.'));
    }
  });
} catch (e) {}

// POST /api/returns/upload-photo (Feature 62)
router.post('/upload-photo', authenticate, (req, res) => {
  if (!upload) return res.status(400).json({ success: false, message: 'Upload service not configured' });
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No photo uploaded' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url });
  });
});

// 1. CUSTOMER CREATES RETURN / REPORT ISSUE (Features 61, 63, 64)
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

    // Food product return window validation (Feature 64: Configurable, default 48h)
    const settings = db.Settings.find()[0] || {};
    const returnWindowHours = Number(settings.returnWindowHours) || 48;
    const deliveredAtTime = order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.updatedAt || 0).getTime();
    const now = Date.now();
    const hoursElapsed = (now - deliveredAtTime) / (1000 * 60 * 60);

    if (hoursElapsed > returnWindowHours) {
      return res.status(400).json({
        success: false,
        message: `Policy Notice: Our fresh chakki flours contain zero preservatives. Issues must be reported within ${returnWindowHours} hours of doorstep delivery. Please contact customer care for assistance.`
      });
    }

    const validReasons = [
      'Damaged package',
      'Wrong product',
      'Missing quantity',
      'Quality issue',
      'Packaging issue',
      'Other'
    ];

    if (!validReasons.includes(reason)) {
      return res.status(400).json({ success: false, message: 'Please select a valid reason.' });
    }

    const history = [
      {
        status: 'REQUESTED',
        timestamp: new Date().toISOString(),
        actor: user.name,
        actorRole: 'customer',
        note: 'Issue reported by customer.'
      }
    ];

    const returnDoc = db.ReturnRequests.insertOne({
      orderId: order.orderId,
      orderDbId: order._id,
      customerId: user._id,
      customerName: user.name,
      customerPhone: user.mobile,
      customerEmail: user.email || '',
      productId: productId || null,
      reason,
      description: description.trim(),
      imageUrl: imageUrl || '',
      status: 'REQUESTED', // REQUESTED -> UNDER_REVIEW -> APPROVED -> REPLACEMENT / REFUND -> COMPLETED, or REJECTED
      adminNotes: '',
      resolutionType: null, // 'replacement' | 'refund' | 'store_credit' | 'none'
      replacementOrderId: null,
      history
    });

    eventBus.emit('RETURN_REQUESTED', {
      returnRequest: returnDoc,
      order
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

// 3. GET SINGLE RETURN REQUEST
router.get('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const report = db.ReturnRequests.findById(id) || db.ReturnRequests.findOne(r => r._id === id || r.id === id);
    if (!report) return res.status(404).json({ success: false, message: 'Return report not found' });

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin && report.customerId !== user._id && report.customerPhone !== user.mobile) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    res.json({ success: true, returnRequest: report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
});

module.exports = router;

