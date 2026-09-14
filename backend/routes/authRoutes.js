const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { calculateDistanceKm } = require('../utils/distance');

const router = express.Router();

// Helper to generate token
function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, mobile: user.mobile, email: user.email },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// 1. SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, mobile, email, password, houseFlat, streetArea, city, state, pincode, landmark, lat, lon } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ success: false, message: 'Name, mobile number and password are required.' });
    }

    const cleanMobile = mobile.trim().replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const existing = db.Users.findOne({ mobile: cleanMobile });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this mobile number already exists. Please login.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const initialAddresses = [];
    if (houseFlat || streetArea || pincode) {
      const settings = db.Settings.find()[0] || {};
      const shopLat = settings.shopLat || 28.7041;
      const shopLon = settings.shopLon || 77.1025;
      const distanceKm = (lat && lon) ? calculateDistanceKm(shopLat, shopLon, lat, lon) : 3.5;

      initialAddresses.push({
        id: 'addr_' + Date.now(),
        name,
        mobile: cleanMobile,
        houseFlat: houseFlat || '',
        streetArea: streetArea || '',
        city: city || 'Delhi',
        state: state || 'Delhi',
        pincode: pincode || '',
        landmark: landmark || '',
        isDefault: true,
        lat: lat || shopLat,
        lon: lon || shopLon,
        distanceKm
      });
    }

    const newUser = db.Users.insertOne({
      name,
      mobile: cleanMobile,
      email: email ? email.trim().toLowerCase() : '',
      password: hashedPassword,
      role: 'customer',
      addresses: initialAddresses,
      wishlist: []
    });

    const token = generateToken(newUser);
    const { password: _, ...userSafe } = newUser;

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: userSafe
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, message: 'Server error during signup.' });
  }
});

// 2. LOGIN
router.post('/login', async (req, res) => {
  try {
    const rawId = req.body.identifier || req.body.emailOrPhone || req.body.email || req.body.mobile;
    const { password } = req.body;
    const identifier = rawId;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please enter your mobile/email and password.' });
    }

    const clean = identifier.trim().toLowerCase();
    const cleanMobile = clean.replace(/\D/g, '').slice(-10);

    const user = db.Users.findOne(item => {
      if (item.email && item.email.toLowerCase() === clean) return true;
      if (item.mobile && cleanMobile && item.mobile === cleanMobile) return true;
      return false;
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email/mobile or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email/mobile or password.' });
    }

    const token = generateToken(user);
    const { password: _, ...userSafe } = user;

    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: userSafe
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// 2b. SEPARATE DEDICATED ADMIN LOGIN
router.post('/admin-login', async (req, res) => {
  try {
    const rawId = req.body.email || req.body.identifier || req.body.mobile;
    const { password } = req.body;
    if (!rawId || !password) {
      return res.status(400).json({ success: false, message: 'Please enter both admin email/mobile and password.' });
    }
    const clean = rawId.trim().toLowerCase();
    const cleanMobile = clean.replace(/\D/g, '').slice(-10);

    const user = db.Users.findOne(u => {
      // Must be admin or super_admin
      if (u.role !== 'admin' && u.role !== 'super_admin') return false;
      if (u.email && (
        u.email.toLowerCase() === clean ||
        (clean.startsWith('bpsfreshmill') && u.email.toLowerCase().startsWith('bpsfreshmill'))
      )) return true;
      if (cleanMobile && u.mobile && u.mobile.slice(-10) === cleanMobile) return true;
      return false;
    }) || db.Users.findOne(u => {
      // Fallback: check all users if credentials match but role check needs explicit message
      if (u.email && (
        u.email.toLowerCase() === clean ||
        (clean.startsWith('bpsfreshmill') && u.email.toLowerCase().startsWith('bpsfreshmill'))
      )) return true;
      if (cleanMobile && u.mobile && u.mobile.slice(-10) === cleanMobile) return true;
      return false;
    });

    if (!user) return res.status(401).json({ success: false, message: 'Invalid administrator credentials.' });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Access denied. You do not have administrator permissions.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid administrator credentials.' });
    const token = generateToken(user);
    const { password: _, ...userSafe } = user;
    // Log admin login
    const { logAdminAction } = require('../middleware/auth');
    logAdminAction(user, 'ADMIN_LOGIN', { identifier: clean, role: user.role });
    return res.json({ success: true, message: 'Admin authenticated successfully.', token, user: userSafe });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during admin authentication.' });
  }
});

// 2c. SEPARATE DEDICATED DELIVERY BOY LOGIN
router.post('/delivery-login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please enter your mobile/email and password.' });
    }

    const clean = identifier.trim().toLowerCase();
    const cleanMobile = clean.replace(/\D/g, '').slice(-10);

    const user = db.Users.findOne(item => {
      if (item.email && item.email.toLowerCase() === clean) return true;
      if (item.mobile && cleanMobile && item.mobile === cleanMobile) return true;
      return false;
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid delivery credentials.' });
    }

    if (user.role !== 'delivery' && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Only authorized delivery personnel can login here.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid delivery credentials.' });
    }

    const token = generateToken(user);
    const { password: _, ...userSafe } = user;

    return res.json({
      success: true,
      message: 'Logged in to Delivery Portal!',
      token,
      user: userSafe
    });
  } catch (err) {
    console.error('Delivery login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during delivery login.' });
  }
});

// 3. GET CURRENT PROFILE
router.get('/me', authenticate, (req, res) => {
  const { password: _, ...userSafe } = req.user;
  res.json({ success: true, user: userSafe });
});

// 4. UPDATE PROFILE
router.put('/profile', authenticate, (req, res) => {
  try {
    const { name, email, mobile } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (email) updates.email = email.trim().toLowerCase();
    if (mobile) {
      const cleanMobile = mobile.trim().replace(/\D/g, '').slice(-10);
      if (cleanMobile.length === 10) updates.mobile = cleanMobile;
    }

    const updatedUser = db.Users.updateById(req.user._id, updates);
    const { password: _, ...userSafe } = updatedUser;
    return res.json({ success: true, message: 'Profile updated successfully', user: userSafe });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

// 5. CHANGE PASSWORD
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const isMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.Users.updateById(req.user._id, { password: hashedPassword });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update password' });
  }
});

// 6. FORGOT PASSWORD (OTP simulation)
router.post('/forgot-password', (req, res) => {
  const { mobile } = req.body;
  if (!mobile) {
    return res.status(400).json({ success: false, message: 'Mobile number is required' });
  }
  const cleanMobile = mobile.trim().replace(/\D/g, '').slice(-10);
  const user = db.Users.findOne({ mobile: cleanMobile });
  if (!user) {
    return res.status(404).json({ success: false, message: 'No registered account found with this mobile number.' });
  }
  // Simulated OTP for verification
  return res.json({
    success: true,
    message: `Password reset instructions sent to ${cleanMobile}. Use demo OTP: 543210 to reset.`,
    demoOtp: '543210'
  });
});

// 7. SAVED ADDRESSES CRUD
router.get('/addresses', authenticate, (req, res) => {
  const user = db.Users.findById(req.user._id);
  res.json({ success: true, addresses: user.addresses || [] });
});

router.post('/addresses', authenticate, (req, res) => {
  try {
    const { name, mobile, houseFlat, streetArea, city, state, pincode, landmark, lat, lon } = req.body;

    if (!houseFlat || !streetArea || !pincode) {
      return res.status(400).json({ success: false, message: 'House/Flat, Street/Area, and PIN code are required.' });
    }

    const settings = db.Settings.find()[0] || {};
    const shopLat = settings.shopLat || 28.7041;
    const shopLon = settings.shopLon || 77.1025;
    const distanceKm = (lat && lon) ? calculateDistanceKm(shopLat, shopLon, lat, lon) : 3.8;

    const user = db.Users.findById(req.user._id);
    const addresses = user.addresses || [];

    const newAddress = {
      id: 'addr_' + Date.now(),
      name: name || user.name,
      mobile: mobile || user.mobile,
      houseFlat,
      streetArea,
      city: city || 'Delhi',
      state: state || 'Delhi',
      pincode,
      landmark: landmark || '',
      isDefault: addresses.length === 0,
      lat: lat || shopLat,
      lon: lon || shopLon,
      distanceKm
    };

    addresses.push(newAddress);
    db.Users.updateById(user._id, { addresses });

    res.status(201).json({ success: true, message: 'Address added successfully', addresses, newAddress });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add address' });
  }
});

router.put('/addresses/:id', authenticate, (req, res) => {
  try {
    const addressId = req.params.id;
    const user = db.Users.findById(req.user._id);
    let addresses = user.addresses || [];

    const idx = addresses.findIndex(a => a.id === addressId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const current = addresses[idx];
    const updated = {
      ...current,
      ...req.body,
      id: current.id
    };

    addresses[idx] = updated;
    db.Users.updateById(user._id, { addresses });
    res.json({ success: true, message: 'Address updated successfully', addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update address' });
  }
});

router.delete('/addresses/:id', authenticate, (req, res) => {
  try {
    const addressId = req.params.id;
    const user = db.Users.findById(req.user._id);
    let addresses = user.addresses || [];

    addresses = addresses.filter(a => a.id !== addressId);
    if (addresses.length > 0 && !addresses.some(a => a.isDefault)) {
      addresses[0].isDefault = true;
    }

    db.Users.updateById(user._id, { addresses });
    res.json({ success: true, message: 'Address deleted successfully', addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete address' });
  }
});

router.put('/addresses/:id/default', authenticate, (req, res) => {
  try {
    const addressId = req.params.id;
    const user = db.Users.findById(req.user._id);
    let addresses = user.addresses || [];

    addresses = addresses.map(a => ({
      ...a,
      isDefault: a.id === addressId
    }));

    db.Users.updateById(user._id, { addresses });
    res.json({ success: true, message: 'Default address updated', addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update default address' });
  }
});

// Helper to generate customer referral code
function getOrCreateReferralCode(user) {
  if (user.referralCode) return user.referralCode;
  const namePart = (user.name || 'BPS').replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'BPS';
  const phonePart = (user.mobile || '1234').slice(-4);
  const code = `BPS-${namePart}${phonePart}`;
  db.Users.updateById(user._id, { referralCode: code });
  return code;
}

// 8. CUSTOMER LOYALTY POINTS & LEDGER (Features 85-86)
router.get('/loyalty', authenticate, (req, res) => {
  try {
    const user = db.Users.findById(req.user._id);
    const settings = db.Settings.find()[0] || {};
    const points = Number(user.loyaltyPoints) || 0;
    const earningRate = Number(settings.loyaltyEarningRate) || 100;
    const redemptionValue = Number(settings.loyaltyRedemptionValue) || 1;

    const ledger = db.LoyaltyLedger.find(l => l.customerId === user._id);
    ledger.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));

    res.json({
      success: true,
      points,
      earningRate,
      redemptionValue,
      ledger
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch loyalty details' });
  }
});

// 9. CUSTOMER WALLET / STORE CREDIT (Feature 88)
router.get('/wallet', authenticate, (req, res) => {
  try {
    const user = db.Users.findById(req.user._id);
    const balance = Number(user.walletBalance) || 0;

    const ledger = db.WalletLedger.find(w => w.customerId === user._id);
    ledger.sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0));

    res.json({
      success: true,
      balance,
      ledger
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch wallet details' });
  }
});

// 10. CUSTOMER REFERRAL SYSTEM (Feature 87)
router.get('/referral', authenticate, (req, res) => {
  try {
    const user = db.Users.findById(req.user._id);
    const referralCode = getOrCreateReferralCode(user);

    // Count customers who joined using this referral code
    const referredUsers = db.Users.find(u => u.referredBy === referralCode);
    const qualifyingOrders = db.Orders.find(o =>
      referredUsers.some(ru => ru._id === o.customerId || ru.mobile === o.customerPhone) &&
      o.orderStatus === 'Delivered'
    );

    res.json({
      success: true,
      referralCode,
      shareUrl: `/?ref=${referralCode}`,
      totalReferred: referredUsers.length,
      qualifyingOrdersCount: qualifyingOrders.length,
      rewardPerOrder: 50 // 50 loyalty points per qualifying referred order
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch referral details' });
  }
});

// 11. NOTIFICATION PREFERENCES (Feature 75)
router.get('/preferences', authenticate, (req, res) => {
  try {
    const user = db.Users.findById(req.user._id);
    const defaultPrefs = {
      orderUpdates: true,
      deliveryAlerts: true,
      supportUpdates: true,
      promotionalOffers: false,
      reorderReminders: true
    };
    res.json({
      success: true,
      preferences: user.notificationPreferences || defaultPrefs
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch preferences' });
  }
});

router.put('/preferences', authenticate, (req, res) => {
  try {
    const user = db.Users.findById(req.user._id);
    const current = user.notificationPreferences || {};
    const updatedPrefs = {
      ...current,
      ...req.body
    };

    db.Users.updateById(user._id, { notificationPreferences: updatedPrefs });
    res.json({ success: true, message: 'Preferences updated', preferences: updatedPrefs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update preferences' });
  }
});

// 12. RECENTLY VIEWED PRODUCTS (Feature 89)
router.get('/recently-viewed', authenticate, (req, res) => {
  try {
    const user = db.Users.findById(req.user._id);
    const productIds = user.recentlyViewed || [];

    const products = [];
    for (const pid of productIds) {
      const p = db.Products.findById(pid);
      if (p && p.isActive !== false) products.push(p);
    }

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch recently viewed products' });
  }
});

router.post('/recently-viewed', authenticate, (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'Product ID required' });

    const user = db.Users.findById(req.user._id);
    let list = user.recentlyViewed || [];
    // Remove if already present and prepend (limit to 10)
    list = list.filter(id => id !== productId);
    list.unshift(productId);
    if (list.length > 10) list = list.slice(0, 10);

    db.Users.updateById(user._id, { recentlyViewed: list });
    res.json({ success: true, recentlyViewed: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update recently viewed' });
  }
});

module.exports = router;
