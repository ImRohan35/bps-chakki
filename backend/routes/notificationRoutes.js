const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { addClient } = require('../services/notificationStream');

const router = express.Router();

/**
 * 1. SSE STREAM ENDPOINT: /api/notifications/stream
 * Accepts token via Authorization header OR ?token= query parameter (for browser EventSource)
 */
router.get('/stream', (req, res) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  let user = { role: 'customer', id: 'anonymous' };
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      user = decoded;
    } catch {
      // Invalid token, treat as anonymous visitor
    }
  }

  // Set SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.flushHeaders?.();

  const clientId = 'sse_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  addClient({
    id: clientId,
    role: user.role || 'customer',
    userId: user.id || user._id,
    res
  });
});

/**
 * 2. GET IN-APP NOTIFICATIONS
 */
router.get('/', authenticate, (req, res) => {
  try {
    const user = req.user;
    let list = [];

    if (user.role === 'admin' || user.role === 'super_admin') {
      // Admin receives notifications addressed to admin or all
      list = db.Notifications.find(n => n.recipientRole === 'admin' || n.recipientRole === 'all' || !n.recipientRole);
    } else if (user.role === 'delivery') {
      // Delivery executive receives deliveries assigned to them or broadcast to delivery
      list = db.Notifications.find(n => 
        n.recipientRole === 'delivery' && 
        (!n.recipientUserId || n.recipientUserId === user._id)
      );
    } else {
      // Customer receives notifications for their customerId or phone
      list = db.Notifications.find(n => 
        n.recipientRole === 'customer' && 
        (n.recipientUserId === user._id || n.customerId === user._id || n.customerPhone === user.mobile)
      );
    }

    // Sort latest first
    list.sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));

    // Limit to latest 50 notifications
    const recent = list.slice(0, 50);
    const unreadCount = recent.filter(n => !n.isRead).length;

    res.json({
      success: true,
      notifications: recent,
      unreadCount
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

/**
 * 3. GET UNREAD COUNT
 */
router.get('/unread-count', authenticate, (req, res) => {
  try {
    const user = req.user;
    let list = [];

    if (user.role === 'admin' || user.role === 'super_admin') {
      list = db.Notifications.find(n => (n.recipientRole === 'admin' || n.recipientRole === 'all' || !n.recipientRole) && !n.isRead);
    } else if (user.role === 'delivery') {
      list = db.Notifications.find(n => 
        n.recipientRole === 'delivery' && 
        (!n.recipientUserId || n.recipientUserId === user._id) && 
        !n.isRead
      );
    } else {
      list = db.Notifications.find(n => 
        n.recipientRole === 'customer' && 
        (n.recipientUserId === user._id || n.customerId === user._id || n.customerPhone === user.mobile) && 
        !n.isRead
      );
    }

    res.json({ success: true, unreadCount: list.length });
  } catch (err) {
    res.status(500).json({ success: false, unreadCount: 0 });
  }
});

/**
 * 4. MARK SINGLE NOTIFICATION AS READ
 */
router.put('/:id/read', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const notification = db.Notifications.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const updated = db.Notifications.updateById(notification._id, { isRead: true });
    res.json({ success: true, notification: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

/**
 * 5. MARK ALL AS READ
 */
router.put('/mark-all-read', authenticate, (req, res) => {
  try {
    const user = req.user;
    const all = db.Notifications.read();

    const updated = all.map(n => {
      let isRecipient = false;
      if (user.role === 'admin' || user.role === 'super_admin') {
        isRecipient = n.recipientRole === 'admin' || n.recipientRole === 'all' || !n.recipientRole;
      } else if (user.role === 'delivery') {
        isRecipient = n.recipientRole === 'delivery' && (!n.recipientUserId || n.recipientUserId === user._id);
      } else {
        isRecipient = n.recipientRole === 'customer' && (n.recipientUserId === user._id || n.customerId === user._id);
      }

      if (isRecipient && !n.isRead) {
        return { ...n, isRead: true };
      }
      return n;
    });

    db.Notifications.write(updated);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications read' });
  }
});

module.exports = router;
