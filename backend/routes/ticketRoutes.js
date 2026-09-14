const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');
const eventBus = require('../services/eventBus');

const router = express.Router();

// Optional multer setup for attachments
let upload = null;
try {
  const multer = require('multer');
  const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `ticket_${Date.now()}${ext}`);
    }
  });
  upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = /jpeg|jpg|png|webp|pdf/;
      const extname = allowed.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowed.test(file.mimetype);
      if (extname && mimetype) return cb(null, true);
      cb(new Error('Only image files (JPG, PNG, WebP) and PDF documents are allowed.'));
    }
  });
} catch (e) {
  // multer fallback
}

function generateTicketId() {
  const base = 5000;
  const count = db.Tickets.count();
  return `TKT-${base + count + 1}`;
}

// ──────────────────────────────────────────────
// CUSTOMER ENDPOINTS
// ──────────────────────────────────────────────

// 1. CREATE SUPPORT TICKET (Feature 67)
router.post('/tickets', authenticate, (req, res) => {
  try {
    const user = req.user;
    const { orderId, subject, category, message, priority, attachmentUrl } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a ticket subject.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide your inquiry or message.' });
    }

    let verifiedOrderId = null;
    if (orderId && orderId.trim()) {
      const cleanOrder = orderId.trim().toLowerCase();
      const order = db.Orders.findOne(o =>
        (o.orderId && o.orderId.toLowerCase() === cleanOrder) ||
        (o._id && o._id.toLowerCase() === cleanOrder)
      );
      if (order) {
        verifiedOrderId = order.orderId;
      } else {
        verifiedOrderId = orderId.trim();
      }
    }

    const ticketId = generateTicketId();

    const ticket = db.Tickets.insertOne({
      ticketId,
      customerId: user._id,
      customerName: user.name,
      customerMobile: user.mobile,
      customerEmail: user.email || '',
      orderId: verifiedOrderId,
      subject: subject.trim(),
      category: category || 'General Inquiry', // 'Delivery', 'Quality', 'Billing', 'Return', 'General Inquiry'
      priority: priority || 'MEDIUM', // 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
      status: 'OPEN', // 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'
      message: message.trim(),
      attachments: attachmentUrl ? [attachmentUrl] : [],
      assignedAdmin: null,
      replies: [
        {
          id: 'rep_' + Date.now(),
          senderRole: 'customer',
          senderName: user.name,
          senderId: user._id,
          message: message.trim(),
          timestamp: new Date().toISOString(),
          isInternal: false
        }
      ],
      internalNotes: []
    });

    eventBus.emit('TICKET_CREATED', { ticket });

    res.status(201).json({
      success: true,
      message: `Support ticket #${ticketId} created successfully. Our team will review it shortly.`,
      ticket
    });
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ success: false, message: 'Failed to create support ticket' });
  }
});

// 2. GET CURRENT USER'S TICKETS
router.get('/tickets/my-tickets', authenticate, (req, res) => {
  try {
    const user = req.user;
    const tickets = db.Tickets.find(t => t.customerId === user._id || t.customerMobile === user.mobile);
    tickets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Strip out internal notes for customer security
    const safeTickets = tickets.map(t => {
      const { internalNotes, replies, ...rest } = t;
      const safeReplies = (replies || []).filter(r => !r.isInternal);
      return { ...rest, replies: safeReplies };
    });

    res.json({ success: true, count: safeTickets.length, tickets: safeTickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
});

// 3. GET SINGLE TICKET DETAILS (Strict isolation: customer can only view their own)
router.get('/tickets/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const clean = id.trim().toLowerCase();
    const ticket = db.Tickets.findOne(t =>
      (t.ticketId && t.ticketId.toLowerCase() === clean) ||
      (t._id && t._id.toLowerCase() === clean)
    );

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const isAdminUser = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdminUser && ticket.customerId !== user._id && ticket.customerMobile !== user.mobile) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this ticket' });
    }

    if (!isAdminUser) {
      const { internalNotes, replies, ...rest } = ticket;
      const safeReplies = (replies || []).filter(r => !r.isInternal);
      return res.json({ success: true, ticket: { ...rest, replies: safeReplies } });
    }

    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
});

// 4. CUSTOMER REPLIES TO TICKET
router.post('/tickets/:id/reply', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachmentUrl } = req.body;
    const user = req.user;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter a reply message.' });
    }

    const clean = id.trim().toLowerCase();
    const ticket = db.Tickets.findOne(t =>
      (t.ticketId && t.ticketId.toLowerCase() === clean) ||
      (t._id && t._id.toLowerCase() === clean)
    );

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const isAdminUser = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdminUser && ticket.customerId !== user._id && ticket.customerMobile !== user.mobile) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this ticket' });
    }

    const replies = ticket.replies || [];
    const newReply = {
      id: 'rep_' + Date.now(),
      senderRole: isAdminUser ? 'admin' : 'customer',
      senderName: user.name,
      senderId: user._id,
      message: message.trim(),
      attachmentUrl: attachmentUrl || '',
      timestamp: new Date().toISOString(),
      isInternal: false
    };
    replies.push(newReply);

    const updateFields = {
      replies,
      status: isAdminUser ? 'WAITING_FOR_CUSTOMER' : 'IN_PROGRESS'
    };

    const updated = db.Tickets.updateById(ticket._id, updateFields);

    eventBus.emit('TICKET_REPLIED', {
      ticket: updated,
      senderRole: isAdminUser ? 'admin' : 'customer',
      senderName: user.name
    });

    res.json({ success: true, message: 'Reply sent successfully', reply: newReply });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to post reply' });
  }
});

// ──────────────────────────────────────────────
// ADMIN TICKET MANAGEMENT ENDPOINTS
// ──────────────────────────────────────────────

// 5. ADMIN LIST ALL TICKETS
router.get('/admin/all', authenticate, adminOnly, (req, res) => {
  try {
    const tickets = db.Tickets.find();
    tickets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ success: true, count: tickets.length, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
});

// 6. ADMIN UPDATE STATUS OR PRIORITY
router.put('/admin/:id/status', authenticate, adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedAdmin } = req.body;

    const ticket = db.Tickets.findOne(t => t._id === id || t.ticketId === id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const updates = {};
    if (status) updates.status = status.toUpperCase();
    if (priority) updates.priority = priority.toUpperCase();
    if (assignedAdmin !== undefined) updates.assignedAdmin = assignedAdmin;

    const updated = db.Tickets.updateById(ticket._id, updates);
    res.json({ success: true, message: 'Ticket updated successfully', ticket: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
});

// 7. ADMIN ADD INTERNAL NOTE (Strictly hidden from customer)
router.post('/admin/:id/internal-note', authenticate, adminOnly, (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const user = req.user;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: 'Internal note cannot be empty.' });
    }

    const ticket = db.Tickets.findOne(t => t._id === id || t.ticketId === id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const internalNotes = ticket.internalNotes || [];
    internalNotes.push({
      id: 'note_' + Date.now(),
      adminName: user.name,
      adminEmail: user.email,
      note: note.trim(),
      timestamp: new Date().toISOString()
    });

    const updated = db.Tickets.updateById(ticket._id, { internalNotes });
    res.json({ success: true, message: 'Internal note saved (not visible to customer)', internalNotes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save internal note' });
  }
});

module.exports = router;
