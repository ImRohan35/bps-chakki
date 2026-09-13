const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'bps_fresh_mills_super_secret_jwt_key_2026';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.Users.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or session expired.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.Users.findById(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch (err) {
      // ignore for optional
    }
  }
  next();
}

// Accepts both 'admin' and 'super_admin'
function adminOnly(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
  }
  next();
}

// Only 'super_admin' can use certain destructive operations
function superAdminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Super Admin privileges required.' });
  }
  next();
}

function deliveryOrAdminOnly(req, res, next) {
  if (!req.user || (req.user.role !== 'delivery' && req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return res.status(403).json({ success: false, message: 'Access denied. Delivery or Admin privileges required.' });
  }
  next();
}

// Helper: log an admin action to AuditLogs
function logAdminAction(adminUser, action, details = {}) {
  try {
    db.AuditLogs.insertOne({
      adminId: adminUser._id,
      adminName: adminUser.name,
      adminEmail: adminUser.email,
      action,
      details,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    // Non-blocking: don't fail on audit log errors
    console.error('Audit log error:', e);
  }
}

module.exports = {
  JWT_SECRET,
  authenticate,
  optionalAuthenticate,
  adminOnly,
  superAdminOnly,
  deliveryOrAdminOnly,
  logAdminAction
};
