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
    const { identifier, password } = req.body; // identifier can be mobile or email

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
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Please enter both admin email and password.' });
    const cleanEmail = email.trim().toLowerCase();
    const user = db.Users.findOne(u => u.email && u.email.toLowerCase() === cleanEmail);
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
    logAdminAction(user, 'ADMIN_LOGIN', { email: cleanEmail, role: user.role });
    return res.json({ success: true, message: 'Admin authenticated successfully.', token, user: userSafe });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during admin authentication.' });
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

module.exports = router;
