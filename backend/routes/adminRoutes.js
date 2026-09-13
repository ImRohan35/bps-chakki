const express = require('express');
const db = require('../config/db');
const { authenticate, adminOnly, logAdminAction } = require('../middleware/auth');
const {
  sendOrderConfirmationNotifications,
  sendOrderCancelledNotifications,
  sendOrderStatusUpdateNotifications
} = require('../services/notificationService');
const path = require('path');
const fs = require('fs');

const router = express.Router();
router.use(authenticate, adminOnly);

// ──────────────────────────────────────────────
// UPLOAD HELPER  (multer, optional – fallback to URL)
// ──────────────────────────────────────────────
let upload = null;
try {
  const multer = require('multer');
  const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `img_${Date.now()}${ext}`);
    }
  });
  upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
} catch (e) { /* multer not installed */ }

// POST /api/admin/upload
router.post('/upload', (req, res) => {
  if (!upload) return res.status(400).json({ success: false, message: 'File upload not configured' });
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ success: true, url });
  });
});

// ──────────────────────────────────────────────
// 1. DASHBOARD
// ──────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  try {
    const orders = db.Orders.find();
    const products = db.Products.find();
    const customers = db.Users.find(u => u.role === 'customer');
    const returnRequests = db.ReturnRequests.find();
    const offers = db.Offers.find();

    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = new Date().toISOString().slice(0, 7);

    let todayOrdersCount = 0, todaySales = 0, totalSales = 0, monthlySales = 0;
    const statusCounts = { 'Order Placed': 0, 'Confirmed': 0, 'Preparing': 0, 'Ready for Delivery': 0, 'Out for Delivery': 0, 'Delivered': 0, 'Cancelled': 0 };
    let codCollected = 0, codPending = 0;

    orders.forEach(order => {
      const d = (order.createdAt || '').slice(0, 10);
      const m = (order.createdAt || '').slice(0, 7);
      if (d === todayStr && order.orderStatus !== 'Cancelled') { todayOrdersCount++; todaySales += order.totalAmount || 0; }
      if (m === monthStr && order.orderStatus !== 'Cancelled') monthlySales += order.totalAmount || 0;
      if (order.orderStatus !== 'Cancelled') totalSales += order.totalAmount || 0;
      if (statusCounts[order.orderStatus] !== undefined) statusCounts[order.orderStatus]++;
      if (order.paymentMethod === 'Cash on Delivery') {
        if (order.paymentStatus === 'COD Collected' || order.orderStatus === 'Delivered') codCollected += order.totalAmount || 0;
        else if (order.orderStatus !== 'Cancelled') codPending += order.totalAmount || 0;
      }
    });

    const lowStockProducts = products.filter(p => { const t = p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5; return p.stock <= t && p.isActive !== false; });
    const outOfStockProducts = products.filter(p => p.stock <= 0 && p.isActive !== false);
    const activeOffers = offers.filter(o => o.isActive && (!o.endDate || new Date(o.endDate) >= new Date()));

    const productSalesMap = {};
    orders.forEach(order => {
      if (order.orderStatus !== 'Cancelled') {
        (order.items || []).forEach(item => {
          if (!productSalesMap[item.productId]) productSalesMap[item.productId] = { name: item.name, totalQuantity: 0, totalRevenue: 0 };
          productSalesMap[item.productId].totalQuantity += Number(item.quantity) || 1;
          productSalesMap[item.productId].totalRevenue += Number(item.subtotal) || 0;
        });
      }
    });
    const bestSellers = Object.values(productSalesMap).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 5);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOrders = orders.filter(o => (o.createdAt || '').slice(0, 10) === dateStr && o.orderStatus !== 'Cancelled');
      last7Days.push({ date: dateStr, day: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: dayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0), orders: dayOrders.length });
    }

    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOrders = orders.filter(o => (o.createdAt || '').slice(0, 10) === dateStr && o.orderStatus !== 'Cancelled');
      last30Days.push({ date: dateStr, revenue: dayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0), orders: dayOrders.length });
    }

    const recentOrders = [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10);

    res.json({
      success: true, stats: {
        todayOrdersCount, todaySales, totalSales, monthlySales,
        totalOrders: orders.length, totalCustomers: customers.length,
        pendingOrders: statusCounts['Order Placed'] + statusCounts['Confirmed'] + statusCounts['Preparing'],
        deliveredOrders: statusCounts['Delivered'], cancelledOrders: statusCounts['Cancelled'],
        outForDelivery: statusCounts['Out for Delivery'],
        statusCounts,
        lowStockCount: lowStockProducts.length, lowStockProducts,
        outOfStockCount: outOfStockProducts.length,
        activeOffersCount: activeOffers.length,
        cod: { codCollected, codPending },
        pendingReturns: returnRequests.filter(r => r.status === 'Pending').length,
        bestSellers, salesTrends: last7Days, last30Days, recentOrders
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Dashboard stats failed' });
  }
});

// ──────────────────────────────────────────────
// 2. ORDERS
// ──────────────────────────────────────────────
router.get('/orders', (req, res) => {
  try {
    let orders = db.Orders.find();
    const { status, dateRange, from, to, search } = req.query;
    if (status && status !== 'All') orders = orders.filter(o => o.orderStatus === status);
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      orders = orders.filter(o => (o.orderId && o.orderId.toLowerCase().includes(q)) || (o.customerName && o.customerName.toLowerCase().includes(q)) || (o.customerPhone && o.customerPhone.includes(q)));
    }
    if (dateRange) {
      const now = new Date();
      if (dateRange === 'today') { const t = now.toISOString().slice(0, 10); orders = orders.filter(o => (o.createdAt || '').slice(0, 10) === t); }
      else if (dateRange === 'yesterday') { const y = new Date(now); y.setDate(y.getDate() - 1); const ys = y.toISOString().slice(0, 10); orders = orders.filter(o => (o.createdAt || '').slice(0, 10) === ys); }
      else if (dateRange === 'week') { const wa = new Date(now); wa.setDate(wa.getDate() - 7); orders = orders.filter(o => new Date(o.createdAt || 0) >= wa); }
      else if (dateRange === 'month') { const ma = new Date(now); ma.setDate(ma.getDate() - 30); orders = orders.filter(o => new Date(o.createdAt || 0) >= ma); }
    }
    if (from) orders = orders.filter(o => (o.createdAt || '') >= from);
    if (to) orders = orders.filter(o => (o.createdAt || '') <= to + 'T23:59:59Z');
    orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ success: true, count: orders.length, orders });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch orders' }); }
});

router.get('/orders/:id', (req, res) => {
  const order = db.Orders.findOne(o => o._id === req.params.id || o.orderId === req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  res.json({ success: true, order });
});

router.put('/orders/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const order = db.Orders.findOne(o => o._id === id || o.orderId === id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const validStatuses = ['Pending Admin Confirmation','Order Placed','Confirmed','Processing','Preparing','Shipped','Ready for Delivery','Out for Delivery','Delivered','Cancelled','Return Requested','Returned'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
    if (status === 'Cancelled' && order.orderStatus !== 'Cancelled') {
      for (const item of order.items) {
        const product = db.Products.findById(item.productId);
        if (product) db.Products.updateById(product._id, { stock: product.stock + (Number(item.quantity) || 1) });
      }
    }
    const timeline = order.statusTimeline || [];
    timeline.push({ status, timestamp: new Date().toISOString(), note: note || `Status updated to ${status} by admin` });
    const updates = { orderStatus: status, statusTimeline: timeline };
    if (status === 'Delivered') { updates.paymentStatus = 'COD Collected'; updates.deliveredAt = new Date().toISOString(); }
    const updated = db.Orders.updateById(order._id, updates);
    logAdminAction(req.user, 'ORDER_STATUS_CHANGED', { orderId: order.orderId, from: order.orderStatus, to: status });

    // Send automated WhatsApp + Email notifications depending on action
    if (status === 'Confirmed') {
      try {
        await sendOrderConfirmationNotifications(updated);
      } catch (err) {
        console.error('[BPS Notification] Order confirmation notification error:', err);
      }
    } else if (status === 'Cancelled') {
      try {
        await sendOrderCancelledNotifications(updated, note);
      } catch (err) {
        console.error('[BPS Notification] Order cancellation notification error:', err);
      }
    } else {
      try {
        await sendOrderStatusUpdateNotifications(updated, status);
      } catch (err) {
        console.error('[BPS Notification] Order status notification error:', err);
      }
    }

    const finalOrder = db.Orders.findById(order._id) || updated;
    res.json({ success: true, message: `Order status updated to ${status}`, order: finalOrder });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update order status' }); }
});

// Direct Confirm Order Action
router.put('/orders/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const order = db.Orders.findOne(o => o._id === id || o.orderId === id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    
    const timeline = order.statusTimeline || [];
    timeline.push({ status: 'Confirmed', timestamp: new Date().toISOString(), note: 'Order reviewed and confirmed by BPS Store Admin.' });
    
    const updated = db.Orders.updateById(order._id, {
      orderStatus: 'Confirmed',
      statusTimeline: timeline
    });

    logAdminAction(req.user, 'ORDER_CONFIRMED', { orderId: order.orderId });

    // Automatically send customer confirmation notification now that admin approved
    try {
      await sendOrderConfirmationNotifications(updated);
    } catch (err) {
      console.error('[BPS Notification] Order confirmation notification error:', err);
    }

    const finalOrder = db.Orders.findById(order._id) || updated;
    res.json({ success: true, message: 'Order Confirmed! Customer has been notified.', order: finalOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to confirm order' });
  }
});

// Direct Cancel Order Action
router.put('/orders/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const order = db.Orders.findOne(o => o._id === id || o.orderId === id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.orderStatus !== 'Cancelled') {
      for (const item of order.items) {
        const product = db.Products.findById(item.productId);
        if (product) db.Products.updateById(product._id, { stock: product.stock + (Number(item.quantity) || 1) });
      }
    }

    const timeline = order.statusTimeline || [];
    timeline.push({ status: 'Cancelled', timestamp: new Date().toISOString(), note: reason || 'Cancelled by BPS Store Admin.' });

    const updated = db.Orders.updateById(order._id, {
      orderStatus: 'Cancelled',
      statusTimeline: timeline
    });

    logAdminAction(req.user, 'ORDER_CANCELLED', { orderId: order.orderId, reason });

    // Automatically send customer cancellation notification
    try {
      await sendOrderCancelledNotifications(updated, reason);
    } catch (err) {
      console.error('[BPS Notification] Order cancellation notification error:', err);
    }

    const finalOrder = db.Orders.findById(order._id) || updated;
    res.json({ success: true, message: 'Order Cancelled. Customer notified and stock restored.', order: finalOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
});

router.put('/orders/:id/tracking-details', (req, res) => {
  try {
    const { id } = req.params;
    const { trackingNumber, expectedDeliveryDate } = req.body;
    const order = db.Orders.findOne(o => o._id === id || o.orderId === id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const updates = {};
    if (trackingNumber !== undefined) updates.trackingNumber = (trackingNumber || '').trim();
    if (expectedDeliveryDate !== undefined) updates.expectedDeliveryDate = expectedDeliveryDate;
    const updated = db.Orders.updateById(order._id, updates);
    logAdminAction(req.user, 'ORDER_TRACKING_UPDATED', { orderId: order.orderId, trackingNumber, expectedDeliveryDate });
    res.json({ success: true, message: 'Order tracking details updated successfully', order: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update tracking details' }); }
});

router.put('/orders/:id/assign-delivery', (req, res) => {
  try {
    const { id } = req.params;
    const { agentId, agentName, agentPhone } = req.body;
    const order = db.Orders.findOne(o => o._id === id || o.orderId === id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const timeline = order.statusTimeline || [];
    timeline.push({ status: order.orderStatus, timestamp: new Date().toISOString(), note: `Assigned to: ${agentName} (${agentPhone})` });
    const updated = db.Orders.updateById(order._id, { assignedDeliveryBoy: { agentId, name: agentName, phone: agentPhone }, statusTimeline: timeline });
    logAdminAction(req.user, 'ORDER_ASSIGNED', { orderId: order.orderId, agent: agentName });
    res.json({ success: true, message: `Assigned to ${agentName}`, order: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to assign agent' }); }
});

// ──────────────────────────────────────────────
// 3. CATEGORIES
// ──────────────────────────────────────────────
router.get('/categories', (req, res) => {
  const cats = db.Categories.find();
  res.json({ success: true, categories: cats });
});

router.post('/categories', (req, res) => {
  try {
    const { name, description, image, isActive, sortOrder } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Category name is required' });
    const existing = db.Categories.findOne(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return res.status(400).json({ success: false, message: 'Category already exists' });
    const cat = db.Categories.insertOne({ name: name.trim(), description: description || '', image: image || '', isActive: isActive !== false, sortOrder: sortOrder || 0 });
    logAdminAction(req.user, 'CATEGORY_CREATED', { name });
    res.status(201).json({ success: true, message: 'Category created', category: cat });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to create category' }); }
});

router.put('/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.Categories.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Category not found' });
    const updated = db.Categories.updateById(id, req.body);
    logAdminAction(req.user, 'CATEGORY_UPDATED', { id, name: req.body.name });
    res.json({ success: true, message: 'Category updated', category: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update category' }); }
});

router.delete('/categories/:id', (req, res) => {
  try {
    const { id } = req.params;
    const cat = db.Categories.findById(id);
    if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
    db.Categories.deleteById(id);
    logAdminAction(req.user, 'CATEGORY_DELETED', { id, name: cat.name });
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to delete category' }); }
});

// ──────────────────────────────────────────────
// 4. PRODUCTS
// ──────────────────────────────────────────────
router.get('/products', (req, res) => {
  try {
    let products = db.Products.find();
    const { category, status, search } = req.query;
    if (category && category !== 'All') products = products.filter(p => p.category === category);
    if (status === 'active') products = products.filter(p => p.isActive !== false);
    if (status === 'inactive') products = products.filter(p => p.isActive === false);
    if (status === 'lowstock') products = products.filter(p => { const t = p.lowStockThreshold || 5; return p.stock <= t && p.stock > 0; });
    if (status === 'outofstock') products = products.filter(p => p.stock <= 0);
    if (search) { const q = search.toLowerCase(); products = products.filter(p => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)); }
    res.json({ success: true, count: products.length, products });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch products' }); }
});

router.post('/products', (req, res) => {
  try {
    const { name, category, shortDescription, description, ingredients, price, originalPrice, weight, weights, stock, lowStockThreshold, isFeatured, isActive, isBestSeller, isNew, image, tags } = req.body;
    if (!name || !price || !category) return res.status(400).json({ success: false, message: 'Name, price, and category are required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const numPrice = Number(price); const numOriginal = originalPrice ? Number(originalPrice) : numPrice;
    const newProduct = db.Products.insertOne({
      name, slug, category, shortDescription: shortDescription || '', description: description || '', ingredients: ingredients || '',
      price: numPrice, originalPrice: numOriginal,
      discountPercent: numOriginal > numPrice ? Math.round(((numOriginal - numPrice) / numOriginal) * 100) : 0,
      weight: weight || '5 KG',
      weights: weights || [{ weight: weight || '5 KG', price: numPrice, originalPrice: numOriginal, inStock: true, stockCount: Number(stock) || 20 }],
      stock: Number(stock) || 0, lowStockThreshold: Number(lowStockThreshold) || 5,
      rating: 0, reviewCount: 0, isFeatured: Boolean(isFeatured), isBestSeller: Boolean(isBestSeller), isNew: Boolean(isNew),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      image: image || '', images: image ? [image] : [], tags: tags || []
    });
    logAdminAction(req.user, 'PRODUCT_CREATED', { name, price, category });
    res.status(201).json({ success: true, message: 'Product created successfully', product: newProduct });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to create product' }); }
});

router.put('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.Products.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    const updates = { ...req.body };
    if (updates.price) updates.price = Number(updates.price);
    if (updates.originalPrice) updates.originalPrice = Number(updates.originalPrice);
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);
    if (updates.lowStockThreshold !== undefined) updates.lowStockThreshold = Number(updates.lowStockThreshold);
    if (updates.price && updates.originalPrice && updates.originalPrice > updates.price) {
      updates.discountPercent = Math.round(((updates.originalPrice - updates.price) / updates.originalPrice) * 100);
    }
    const updated = db.Products.updateById(id, updates);
    logAdminAction(req.user, 'PRODUCT_UPDATED', { id, name: existing.name });
    res.json({ success: true, message: 'Product updated successfully', product: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update product' }); }
});

router.delete('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const product = db.Products.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    db.Products.deleteById(id);
    logAdminAction(req.user, 'PRODUCT_DELETED', { id, name: product.name });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to delete product' }); }
});

router.put('/products/:id/stock', (req, res) => {
  try {
    const { id } = req.params;
    const { stock, adjustment, reason, lowStockThreshold } = req.body;
    const product = db.Products.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const updates = {};
    let newStock = product.stock;
    if (stock !== undefined) { newStock = Math.max(0, Number(stock)); updates.stock = newStock; }
    else if (adjustment !== undefined) { newStock = Math.max(0, product.stock + Number(adjustment)); updates.stock = newStock; }
    if (lowStockThreshold !== undefined) updates.lowStockThreshold = Math.max(0, Number(lowStockThreshold));
    const updated = db.Products.updateById(id, updates);
    db.StockHistory.insertOne({ productId: id, productName: product.name, previousStock: product.stock, newStock, change: newStock - product.stock, reason: reason || 'Manual adjustment', adminId: req.user._id, adminName: req.user.name, timestamp: new Date().toISOString() });
    logAdminAction(req.user, 'STOCK_UPDATED', { productId: id, name: product.name, from: product.stock, to: newStock });
    res.json({ success: true, message: `Stock updated to ${newStock}`, product: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update stock' }); }
});

router.get('/products/:id/stock-history', (req, res) => {
  try {
    const { id } = req.params;
    const history = db.StockHistory.find(h => h.productId === id);
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ success: true, history });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch stock history' }); }
});

// ──────────────────────────────────────────────
// 5. CUSTOMERS
// ──────────────────────────────────────────────
router.get('/customers', (req, res) => {
  try {
    let customers = db.Users.find(u => u.role === 'customer');
    const orders = db.Orders.find();
    const { search } = req.query;
    if (search) { const q = search.toLowerCase(); customers = customers.filter(c => c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q) || (c.email || '').toLowerCase().includes(q)); }
    const result = customers.map(c => {
      const custOrders = orders.filter(o => o.customerId === c._id || o.customerPhone === c.mobile);
      const totalSpent = custOrders.filter(o => o.orderStatus !== 'Cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0);
      const { password: _, ...cSafe } = c;
      return { ...cSafe, totalOrders: custOrders.length, totalSpent, lastOrderDate: custOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.createdAt || null };
    });
    res.json({ success: true, customers: result });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch customers' }); }
});

router.get('/customers/:id', (req, res) => {
  try {
    const user = db.Users.findById(req.params.id);
    if (!user || user.role !== 'customer') return res.status(404).json({ success: false, message: 'Customer not found' });
    const orders = db.Orders.find(o => o.customerId === user._id || o.customerPhone === user.mobile);
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const { password: _, ...userSafe } = user;
    res.json({ success: true, customer: userSafe, orders });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch customer' }); }
});

router.put('/customers/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = db.Users.findById(id);
    if (!user || user.role !== 'customer') return res.status(404).json({ success: false, message: 'Customer not found' });
    db.Users.updateById(id, { isActive: Boolean(isActive) });
    logAdminAction(req.user, isActive ? 'CUSTOMER_ACTIVATED' : 'CUSTOMER_DEACTIVATED', { customerId: id, name: user.name });
    res.json({ success: true, message: `Customer ${isActive ? 'activated' : 'deactivated'} successfully` });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update customer status' }); }
});

// ──────────────────────────────────────────────
// 6. OFFERS & COUPONS
// ──────────────────────────────────────────────
router.get('/offers', (req, res) => res.json({ success: true, offers: db.Offers.find() }));

router.post('/offers', (req, res) => {
  try {
    const { name, code, discountPercent, flatDiscount, minOrderValue, maxDiscount, description, bannerText, startDate, endDate, isActive } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code required' });
    const cleanCode = code.trim().toUpperCase();
    if (db.Offers.findOne({ code: cleanCode })) return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    const offer = db.Offers.insertOne({ name, code: cleanCode, discountPercent: Number(discountPercent) || 0, flatDiscount: Number(flatDiscount) || 0, minOrderValue: Number(minOrderValue) || 0, maxDiscount: Number(maxDiscount) || 0, description: description || '', bannerText: bannerText || '', startDate: startDate || new Date().toISOString(), endDate: endDate || new Date(Date.now() + 90 * 86400000).toISOString(), isActive: isActive !== false });
    logAdminAction(req.user, 'OFFER_CREATED', { name, code: cleanCode });
    res.status(201).json({ success: true, message: 'Offer created', offer });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to create offer' }); }
});

router.put('/offers/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (!db.Offers.findById(id)) return res.status(404).json({ success: false, message: 'Offer not found' });
    const updates = { ...req.body };
    if (updates.code) updates.code = updates.code.trim().toUpperCase();
    const updated = db.Offers.updateById(id, updates);
    logAdminAction(req.user, 'OFFER_UPDATED', { id });
    res.json({ success: true, message: 'Offer updated', offer: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update offer' }); }
});

router.delete('/offers/:id', (req, res) => {
  try {
    const offer = db.Offers.findById(req.params.id);
    if (!offer) return res.status(404).json({ success: false, message: 'Offer not found' });
    db.Offers.deleteById(req.params.id);
    logAdminAction(req.user, 'OFFER_DELETED', { id: req.params.id, name: offer.name });
    res.json({ success: true, message: 'Offer deleted' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to delete offer' }); }
});

// ──────────────────────────────────────────────
// 7. RETURNS
// ──────────────────────────────────────────────
router.get('/returns', (req, res) => {
  try {
    const returns = db.ReturnRequests.find();
    returns.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ success: true, returns });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch returns' }); }
});

router.put('/returns/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, resolutionType } = req.body;
    const report = db.ReturnRequests.findById(id);
    if (!report) return res.status(404).json({ success: false, message: 'Return not found' });
    const updated = db.ReturnRequests.updateById(id, { status: status || report.status, adminNotes: adminNotes !== undefined ? adminNotes : report.adminNotes, resolutionType: resolutionType !== undefined ? resolutionType : report.resolutionType });
    logAdminAction(req.user, 'RETURN_UPDATED', { id, status });
    res.json({ success: true, message: 'Return updated', returnRequest: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update return' }); }
});

// ──────────────────────────────────────────────
// 8. REVIEWS
// ──────────────────────────────────────────────
router.get('/reviews', (req, res) => {
  try {
    let reviews = db.Reviews.find();
    const { productId, status } = req.query;
    if (productId) reviews = reviews.filter(r => r.productId === productId);
    if (status === 'visible') reviews = reviews.filter(r => r.isVisible !== false);
    if (status === 'hidden') reviews = reviews.filter(r => r.isVisible === false);
    reviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const products = db.Products.find();
    const enriched = reviews.map(r => {
      const product = products.find(p => p._id === r.productId);
      return { ...r, productName: product ? product.name : 'Unknown Product' };
    });
    res.json({ success: true, reviews: enriched });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch reviews' }); }
});

router.put('/reviews/:id', (req, res) => {
  try {
    const { id } = req.params;
    const review = db.Reviews.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    const updated = db.Reviews.updateById(id, { isVisible: req.body.isVisible !== undefined ? Boolean(req.body.isVisible) : review.isVisible });
    // Update product rating
    const productReviews = db.Reviews.find(r => r.productId === review.productId && r.isVisible !== false);
    if (productReviews.length > 0) {
      const avgRating = productReviews.reduce((s, r) => s + (r.rating || 0), 0) / productReviews.length;
      db.Products.updateById(review.productId, { rating: Math.round(avgRating * 10) / 10, reviewCount: productReviews.length });
    }
    logAdminAction(req.user, 'REVIEW_UPDATED', { id, visible: req.body.isVisible });
    res.json({ success: true, message: 'Review updated', review: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update review' }); }
});

router.delete('/reviews/:id', (req, res) => {
  try {
    const { id } = req.params;
    const review = db.Reviews.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    db.Reviews.deleteById(id);
    logAdminAction(req.user, 'REVIEW_DELETED', { id });
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to delete review' }); }
});

// ──────────────────────────────────────────────
// 9. DELIVERY AGENTS & COD
// ──────────────────────────────────────────────
router.get('/delivery-agents', (req, res) => {
  try {
    const agents = db.DeliveryAgents.find();
    const orders = db.Orders.find();
    const results = agents.map(agent => {
      const agentOrders = orders.filter(o => o.assignedDeliveryBoy && (o.assignedDeliveryBoy.phone === agent.mobile || o.assignedDeliveryBoy.agentId === agent.userId));
      let totalCollected = 0, totalAssigned = 0;
      agentOrders.forEach(o => {
        if (o.paymentMethod === 'Cash on Delivery') {
          totalAssigned += o.totalAmount;
          if (o.paymentStatus === 'COD Collected' || o.orderStatus === 'Delivered') totalCollected += o.totalAmount;
        }
      });
      const deposited = agent.totalCashDeposited || 0;
      return { ...agent, totalAssigned, totalCashCollected: totalCollected, totalCashDeposited: deposited, cashDifference: totalCollected - deposited, hasDiscrepancy: totalCollected !== deposited };
    });
    res.json({ success: true, agents: results });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch agents' }); }
});

router.post('/delivery-agents', async (req, res) => {
  try {
    const { name, mobile, password } = req.body;
    if (!name || !mobile || !password) return res.status(400).json({ success: false, message: 'Name, mobile and password are required' });
    const cleanMobile = mobile.trim().replace(/\D/g, '').slice(-10);
    const existing = db.Users.findOne({ mobile: cleanMobile });
    if (existing) return res.status(400).json({ success: false, message: 'Mobile number already registered' });
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(password, 10);
    const user = db.Users.insertOne({ name, mobile: cleanMobile, email: req.body.email || '', password: hashed, role: 'delivery', status: 'active', addresses: [] });
    const agent = db.DeliveryAgents.insertOne({ userId: user._id, name, mobile: cleanMobile, status: 'active', totalCashCollected: 0, totalCashDeposited: 0, cashDifference: 0 });
    logAdminAction(req.user, 'DELIVERY_AGENT_ADDED', { name, mobile: cleanMobile });
    res.status(201).json({ success: true, message: 'Delivery agent added', agent });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to add agent' }); }
});

router.put('/delivery-agents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const agent = db.DeliveryAgents.findById(id);
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.status) updates.status = req.body.status;
    if (req.body.mobile) updates.mobile = req.body.mobile;
    const updated = db.DeliveryAgents.updateById(id, updates);
    if (agent.userId) db.Users.updateById(agent.userId, { name: updates.name || agent.name, status: updates.status || agent.status });
    logAdminAction(req.user, 'DELIVERY_AGENT_UPDATED', { id });
    res.json({ success: true, message: 'Agent updated', agent: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update agent' }); }
});

router.post('/cash-settlement', (req, res) => {
  try {
    const { agentId, amountDeposited, notes } = req.body;
    const agent = db.DeliveryAgents.findById(agentId) || db.DeliveryAgents.findOne({ userId: agentId });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
    const depositAmount = Number(amountDeposited) || 0;
    const newTotal = (agent.totalCashDeposited || 0) + depositAmount;
    db.DeliveryAgents.updateById(agent._id, { totalCashDeposited: newTotal, cashDifference: (agent.totalCashCollected || 0) - newTotal });
    const record = db.CashSettlements.insertOne({ agentId: agent._id, agentName: agent.name, amountDeposited: depositAmount, notes: notes || '', date: new Date().toISOString() });
    logAdminAction(req.user, 'CASH_SETTLED', { agentName: agent.name, amount: depositAmount });
    res.json({ success: true, message: `₹${depositAmount} recorded for ${agent.name}`, settlementRecord: record });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to record settlement' }); }
});

router.get('/cash-settlements', (req, res) => {
  const records = db.CashSettlements.find();
  records.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ success: true, settlements: records });
});

// ──────────────────────────────────────────────
// 10. REPORTS
// ──────────────────────────────────────────────
router.get('/reports', (req, res) => {
  try {
    const { type = 'daily', from, to } = req.query;
    const orders = db.Orders.find();
    const products = db.Products.find();
    let filtered = orders;

    if (from) filtered = filtered.filter(o => (o.createdAt || '') >= from);
    if (to) filtered = filtered.filter(o => (o.createdAt || '') <= to + 'T23:59:59Z');

    if (!from && !to) {
      const now = new Date();
      if (type === 'daily') { const t = now.toISOString().slice(0, 10); filtered = filtered.filter(o => (o.createdAt || '').slice(0, 10) === t); }
      else if (type === 'yesterday') { const y = new Date(now); y.setDate(y.getDate() - 1); const ys = y.toISOString().slice(0, 10); filtered = filtered.filter(o => (o.createdAt || '').slice(0, 10) === ys); }
      else if (type === 'weekly') { const wa = new Date(now); wa.setDate(wa.getDate() - 7); filtered = filtered.filter(o => new Date(o.createdAt || 0) >= wa); }
      else if (type === 'monthly') { const ma = new Date(now); ma.setDate(ma.getDate() - 30); filtered = filtered.filter(o => new Date(o.createdAt || 0) >= ma); }
    }

    const delivered = filtered.filter(o => o.orderStatus === 'Delivered');
    const cancelled = filtered.filter(o => o.orderStatus === 'Cancelled');
    const active = filtered.filter(o => !['Delivered','Cancelled'].includes(o.orderStatus));
    const totalRevenue = filtered.filter(o => o.orderStatus !== 'Cancelled').reduce((s, o) => s + (o.totalAmount || 0), 0);
    const codCollected = delivered.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const codPending = active.reduce((s, o) => s + (o.totalAmount || 0), 0);

    // Product sales breakdown
    const prodMap = {};
    filtered.filter(o => o.orderStatus !== 'Cancelled').forEach(o => {
      (o.items || []).forEach(item => {
        if (!prodMap[item.productId]) prodMap[item.productId] = { name: item.name, qty: 0, revenue: 0 };
        prodMap[item.productId].qty += Number(item.quantity) || 1;
        prodMap[item.productId].revenue += Number(item.subtotal) || 0;
      });
    });
    const productSales = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue);

    // Low stock
    const lowStock = products.filter(p => { const t = p.lowStockThreshold || 5; return p.stock <= t; }).map(p => ({ name: p.name, stock: p.stock, threshold: p.lowStockThreshold || 5, category: p.category }));

    res.json({
      success: true, report: {
        period: type, from, to,
        totalOrders: filtered.length, deliveredOrders: delivered.length, cancelledOrders: cancelled.length,
        totalRevenue, codCollected, codPending,
        productSales, lowStock,
        ordersByDate: filtered.reduce((acc, o) => {
          const d = (o.createdAt || '').slice(0, 10);
          if (!acc[d]) acc[d] = { orders: 0, revenue: 0 };
          if (o.orderStatus !== 'Cancelled') { acc[d].orders++; acc[d].revenue += o.totalAmount || 0; }
          return acc;
        }, {})
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to generate report' }); }
});

// ──────────────────────────────────────────────
// 11. AUDIT LOGS
// ──────────────────────────────────────────────
router.get('/audit-logs', (req, res) => {
  try {
    let logs = db.AuditLogs.find();
    const { action, from, to } = req.query;
    if (action) logs = logs.filter(l => l.action === action || l.action.includes(action));
    if (from) logs = logs.filter(l => (l.timestamp || '') >= from);
    if (to) logs = logs.filter(l => (l.timestamp || '') <= to + 'T23:59:59Z');
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ success: true, count: logs.length, logs: logs.slice(0, 200) });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch audit logs' }); }
});

// ──────────────────────────────────────────────
// 11b. CUSTOMER INQUIRIES & CONTACT MESSAGES
// ──────────────────────────────────────────────
router.get('/inquiries', (req, res) => {
  try {
    const list = db.Inquiries.find();
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, count: list.length, inquiries: list });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch customer inquiries' }); }
});

router.delete('/inquiries/:id', (req, res) => {
  try {
    const success = db.Inquiries.deleteById(req.params.id);
    if (!success) return res.status(404).json({ success: false, message: 'Inquiry not found' });
    res.json({ success: true, message: 'Inquiry deleted' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to delete inquiry' }); }
});

// ──────────────────────────────────────────────
// 12. SETTINGS (store + customer care + website)
// ──────────────────────────────────────────────
router.get('/settings', (req, res) => {
  const settings = db.Settings.find()[0] || {};
  res.json({ success: true, settings });
});

router.put('/settings', (req, res) => {
  try {
    const settings = db.Settings.find()[0];
    let updated;
    if (settings) updated = db.Settings.updateById(settings._id, req.body);
    else updated = db.Settings.insertOne(req.body);
    logAdminAction(req.user, 'SETTINGS_UPDATED', { keys: Object.keys(req.body) });
    res.json({ success: true, message: 'Settings updated', settings: updated });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update settings' }); }
});

// ──────────────────────────────────────────────
// 13. ADMIN PROFILE
// ──────────────────────────────────────────────
router.get('/profile', (req, res) => {
  const { password: _, ...safe } = req.user;
  const recentLogs = db.AuditLogs.find(l => l.adminId === req.user._id);
  recentLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ success: true, admin: safe, recentActivity: recentLogs.slice(0, 20) });
});

router.put('/profile', async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      updates.email = cleanEmail;
      const { updateEnv } = require('../utils/envHelper');
      updateEnv({ ADMIN_EMAIL: cleanEmail });
    }
    const updated = db.Users.updateById(req.user._id, updates);
    const { password: _, ...safe } = updated;
    logAdminAction(req.user, 'ADMIN_PROFILE_UPDATED', {});
    res.json({ success: true, message: 'Profile updated successfully', admin: safe });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update profile' }); }
});

router.put('/profile/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    const bcrypt = require('bcryptjs');
    const match = await bcrypt.compare(currentPassword, req.user.password);
    if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 10);
    db.Users.updateById(req.user._id, { password: hashed });
    const { updateEnv } = require('../utils/envHelper');
    updateEnv({ ADMIN_INITIAL_PASSWORD: newPassword });
    logAdminAction(req.user, 'ADMIN_PASSWORD_CHANGED', {});
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to change password' }); }
});

module.exports = router;
