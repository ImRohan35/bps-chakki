require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const offerRoutes = require('./routes/offerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const returnRoutes = require('./routes/returnRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const publicRoutes = require('./routes/publicRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const aiAssistantRoutes = require('./routes/aiAssistantRoutes');
const backupRoutes = require('./routes/backupRoutes');

const db = require('./config/db');
const storageService = require('./services/storageService');
const { seedDatabase } = require('./utils/seed');

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Auto-initialize clean database and administrator account securely from environment variables
seedDatabase().catch(err => console.error('Failed to initialize database:', err));

// 1. Production CORS Whitelist Configuration
const allowedOrigins = [
  'https://bpsfreshmills.in',
  'https://www.bpsfreshmills.in',
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
].filter(Boolean);

if (process.env.CORS_ORIGIN) {
  process.env.CORS_ORIGIN.split(',').forEach(orig => {
    const trimmed = orig.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, server-to-server, mobile app)
    if (!origin) return callback(null, true);
    if (!IS_PRODUCTION || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS Blocked] Unauthorized origin attempted access: ${origin}`);
    return callback(new Error('CORS access blocked by BPS Fresh Mills security policy.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 2. Production Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (IS_PRODUCTION) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(IS_PRODUCTION ? 'combined' : 'dev'));

// Static uploads with cache control
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: IS_PRODUCTION ? '7d' : 0
}));

// 3. API Routes
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', ticketRoutes);
app.use('/api/admin/ai-assistant', aiAssistantRoutes);
app.use('/api/admin/system', backupRoutes);

// 4. Enhanced Production Health Check
app.get('/api/health', (req, res) => {
  const uptime = Math.floor(process.uptime());
  const mem = process.memoryUsage();

  res.json({
    status: 'ok',
    brand: 'BPS Fresh Mills',
    tagline: 'Freshly Milled. Naturally Good.',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: uptime,
    memoryUsage: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024)
    },
    database: {
      status: 'CONNECTED',
      ordersCount: db.Orders.find().length,
      productsCount: db.Products.find().length,
      usersCount: db.Users.find().length
    },
    storage: storageService.checkHealth(),
    paymentGateway: 'Cash on Delivery (COD ONLY)',
    timestamp: new Date().toISOString()
  });
});

// 5. Serve Frontend Static Files in Production (if built)
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// 6. Production Global Error Handler
app.use((err, req, res, next) => {
  console.error('[BPS Server Error]:', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: IS_PRODUCTION && status === 500
      ? 'An unexpected error occurred. Please try again or contact BPS Fresh Mills support.'
      : (err.message || 'Internal server error'),
    error: !IS_PRODUCTION ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🌾 BPS Fresh Mills API Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`🌾 Production Domains: https://bpsfreshmills.in | https://bpsfreshmills.in/admin | https://bpsfreshmills.in/delivery`);
  console.log(`🌾 Health Check: http://localhost:${PORT}/api/health`);
});
