const express = require('express');
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { authenticate, adminOnly, logAdminAction } = require('../middleware/auth');
const {
  sendOrderConfirmationNotifications,
  sendOrderCancelledNotifications,
  sendOrderStatusUpdateNotifications,
  createInAppNotification
} = require('../services/notificationService');
const eventBus = require('../services/eventBus');
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
    const deliveryAgents = db.DeliveryAgents.find();
    const activeDeliveryBoys = deliveryAgents.filter(a => a.status === 'active').length;
    const inactiveDeliveryBoys = deliveryAgents.filter(a => a.status !== 'active').length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = new Date().toISOString().slice(0, 7);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let todayOrdersCount = 0, todaySales = 0, thisWeekSales = 0, monthlySales = 0, totalSales = 0;
    const statusCounts = { 'Order Placed': 0, 'Confirmed': 0, 'Preparing': 0, 'Ready for Delivery': 0, 'Out for Delivery': 0, 'Delivered': 0, 'Cancelled': 0 };
    let codCollected = 0, codPending = 0;

    let hasMissingCostData = false;
    let totalGrossProfit = 0;
    let soldItemCount = 0;

    orders.forEach(order => {
      const d = (order.createdAt || '').slice(0, 10);
      const m = (order.createdAt || '').slice(0, 7);
      const orderDate = new Date(order.createdAt || 0);
      const isNonCancelled = order.orderStatus !== 'Cancelled';

      if (isNonCancelled) {
        totalSales += order.totalAmount || 0;
        if (d === todayStr) {
          todayOrdersCount++;
          todaySales += order.totalAmount || 0;
        }
        if (orderDate >= sevenDaysAgo) {
          thisWeekSales += order.totalAmount || 0;
        }
        if (m === monthStr) {
          monthlySales += order.totalAmount || 0;
        }

        // Real profit calculation: (sellingPrice - costPrice) * quantity
        if (Array.isArray(order.items) && order.items.length > 0) {
          order.items.forEach(item => {
            soldItemCount++;
            let cost = item.costPrice;
            if (cost === undefined || cost === null || cost === '') {
              const prod = db.Products.findById(item.productId);
              if (prod && prod.costPrice !== undefined && prod.costPrice !== null && prod.costPrice !== '' && !isNaN(Number(prod.costPrice))) {
                cost = Number(prod.costPrice);
              }
            }
            if (cost === undefined || cost === null || cost === '' || isNaN(Number(cost))) {
              hasMissingCostData = true;
            } else {
              const sellingPrice = Number(item.price) || 0;
              const qty = Number(item.quantity) || 1;
              totalGrossProfit += (sellingPrice - Number(cost)) * qty;
            }
          });
        }
      }

      if (statusCounts[order.orderStatus] !== undefined) statusCounts[order.orderStatus]++;
      if (order.paymentMethod === 'Cash on Delivery') {
        if (order.paymentStatus === 'COD Collected' || order.orderStatus === 'Delivered') codCollected += order.totalAmount || 0;
        else if (isNonCancelled) codPending += order.totalAmount || 0;
      }
    });

    // Real profit output
    const realProfit = (soldItemCount > 0 && hasMissingCostData) ? null : Math.round(totalGrossProfit * 100) / 100;
    const profitMarginPercent = (realProfit !== null && totalSales > 0) ? Number(((realProfit / totalSales) * 100).toFixed(1)) : null;
    const profitStatusMessage = (soldItemCount > 0 && hasMissingCostData)
      ? 'Cost data required to calculate profit'
      : null;

    const lowStockProducts = products.filter(p => {
      const t = p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5;
      return p.stock <= t && p.stock > 0 && p.isActive !== false;
    });
    const outOfStockProducts = products.filter(p => p.stock <= 0 && p.isActive !== false);
    const activeOffers = offers.filter(o => o.isActive && (!o.endDate || new Date(o.endDate) >= new Date()));

    // ──────────────────────────────────────────────
    // ACTION REQUIRED CENTER (Management by Exception)
    // ──────────────────────────────────────────────
    const actionRequired = [];

    // 1. Out of stock products
    outOfStockProducts.forEach(p => {
      actionRequired.push({
        id: `oos_${p._id}`,
        type: 'OUT_OF_STOCK',
        severity: 'critical',
        badge: 'Out of Stock',
        title: p.name,
        description: `Current inventory is 0. Immediate replenishment needed.`,
        actionLabel: 'Update Stock',
        targetTab: 'products',
        targetId: p._id
      });
    });

    // 2. Low stock products
    lowStockProducts.forEach(p => {
      actionRequired.push({
        id: `low_${p._id}`,
        type: 'LOW_STOCK',
        severity: 'warning',
        badge: 'Low Stock',
        title: p.name,
        description: `Only ${p.stock} units left (Threshold: ${p.lowStockThreshold || 5}).`,
        actionLabel: 'Restock',
        targetTab: 'products',
        targetId: p._id
      });
    });

    // 3. Unsettled COD Cash with delivery agents
    deliveryAgents.forEach(a => {
      const cashDiff = a.cashDifference || 0;
      if (cashDiff > 0) {
        actionRequired.push({
          id: `cash_${a._id}`,
          type: 'UNSETTLED_CASH',
          severity: 'warning',
          badge: 'Unsettled Cash',
          title: `Cash pending: ${a.name}`,
          description: `₹${cashDiff} cash collected by agent pending deposit with admin.`,
          actionLabel: 'Settle Cash',
          targetTab: 'delivery-boys',
          targetId: a._id
        });
      }
    });

    // 4. Pending Return Requests & Issues (Features 61-64)
    returnRequests.filter(r => r.status === 'Pending' || r.status === 'REQUESTED' || r.status === 'UNDER_REVIEW').forEach(r => {
      actionRequired.push({
        id: `return_${r._id}`,
        type: 'PENDING_RETURN',
        severity: 'info',
        badge: 'Return Request',
        title: `Return / Issue: Order #${r.orderId}`,
        description: `Reason: ${r.reason || 'Issue reported'}. Requires admin review.`,
        actionLabel: 'Review Request',
        targetTab: 'returns',
        targetId: r._id
      });
    });

    // 5. Failed Deliveries (Feature 50)
    orders.filter(o => o.orderStatus === 'Delivery Attempt Failed').forEach(o => {
      const lastAttempt = (o.deliveryAttempts && o.deliveryAttempts.length > 0)
        ? o.deliveryAttempts[o.deliveryAttempts.length - 1]
        : null;
      actionRequired.push({
        id: `failed_del_${o._id}`,
        type: 'FAILED_DELIVERY',
        severity: 'warning',
        badge: 'Failed Delivery',
        title: `Delivery Failed: Order #${o.orderId}`,
        description: `Attempt failed: ${lastAttempt?.reason || 'Customer unavailable'}. Review order status.`,
        actionLabel: 'View Order',
        targetTab: 'orders',
        targetId: o._id
      });
    });

    // 6. COD Settlements Mismatches & Pending Verifications (Features 55 & 56)
    const settlements = db.CashSettlements.find();
    settlements.filter(s => s.status === 'SUBMITTED').forEach(s => {
      const isMismatch = s.difference !== 0;
      actionRequired.push({
        id: `settle_${s._id}`,
        type: isMismatch ? 'COD_MISMATCH' : 'PENDING_SETTLEMENT',
        severity: isMismatch ? 'error' : 'warning',
        badge: isMismatch ? '⚠ COD SETTLEMENT MISMATCH' : 'Pending Settlement',
        title: `Settlement from ${s.deliveryBoyName || 'Delivery Partner'}`,
        description: isMismatch
          ? `Mismatch: Deposited ₹${s.depositedAmount}, Expected ₹${s.expectedAmount} (Diff: ₹${s.difference})`
          : `Cash deposit of ₹${s.depositedAmount} submitted. Awaiting admin counter verification.`,
        actionLabel: 'Verify Cash',
        targetTab: 'delivery-boys',
        targetId: s._id
      });
    });

    // 7. Open Support Tickets (Features 67 & 68)
    const tickets = db.Tickets ? db.Tickets.find() : [];
    tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').forEach(t => {
      actionRequired.push({
        id: `ticket_${t._id}`,
        type: 'SUPPORT_TICKET',
        severity: t.priority === 'URGENT' || t.priority === 'HIGH' ? 'error' : 'info',
        badge: `Ticket #${t.ticketId}`,
        title: `Support: ${t.subject}`,
        description: `From ${t.customerName} (${t.category}). Status: ${t.status}.`,
        actionLabel: 'Reply Ticket',
        targetTab: 'support',
        targetId: t._id
      });
    });

    // 8. Unassigned active orders that need delivery boy
    orders.filter(o => !o.assignedDeliveryBoy && o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Delivered' && o.orderStatus !== 'Returned').forEach(o => {
      actionRequired.push({
        id: `unassigned_${o._id}`,
        type: 'UNASSIGNED_ORDER',
        severity: 'warning',
        badge: 'Unassigned Order',
        title: `Order #${o.orderId}`,
        description: `Status: ${o.orderStatus} (₹${o.totalAmount}). Needs delivery assignment.`,
        actionLabel: 'Assign Delivery',
        targetTab: 'orders',
        targetId: o._id
      });
    });

    const productSalesMap = {};
    orders.forEach(order => {
      if (order.orderStatus !== 'Cancelled') {
        (order.items || []).forEach(item => {
          if (!productSalesMap[item.productId || item.name]) {
            productSalesMap[item.productId || item.name] = { name: item.name, totalQuantity: 0, totalRevenue: 0 };
          }
          productSalesMap[item.productId || item.name].totalQuantity += Number(item.quantity) || 1;
          productSalesMap[item.productId || item.name].totalRevenue += Number(item.subtotal || (Number(item.price || 0) * (Number(item.quantity) || 1))) || 0;
        });
      }
    });
    const bestSellers = Object.values(productSalesMap).sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 5);

    // Sales by Product Breakdown (Donut Chart)
    const totalItemRevenue = Object.values(productSalesMap).reduce((s, p) => s + p.totalRevenue, 0) || 1;
    const sortedProducts = Object.values(productSalesMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
    const DONUT_COLORS = ['#133E2B', '#C9A44C', '#E28B38', '#2E8B57', '#3B82F6', '#A3B8B0'];
    const topProducts = sortedProducts.slice(0, 5);
    const othersRevenue = sortedProducts.slice(5).reduce((s, p) => s + p.totalRevenue, 0);
    const salesByProduct = topProducts.map((p, idx) => ({
      name: p.name,
      revenue: p.totalRevenue,
      percent: Math.round((p.totalRevenue / totalItemRevenue) * 100),
      color: DONUT_COLORS[idx % DONUT_COLORS.length]
    }));
    if (othersRevenue > 0) {
      salesByProduct.push({
        name: 'Others',
        revenue: othersRevenue,
        percent: Math.max(1, 100 - salesByProduct.reduce((s, p) => s + p.percent, 0)),
        color: DONUT_COLORS[5]
      });
    }

    // Average customer review rating
    const reviews = db.Reviews ? db.Reviews.find() : [];
    const ratingSum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avgRating = reviews.length > 0 ? Number((ratingSum / reviews.length).toFixed(1)) : 4.8;
    const activeProductsCount = products.filter(p => p.isActive !== false).length;

    // Week vs previous week trends
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const lastWeekOrders = orders.filter(o => {
      const od = new Date(o.createdAt || 0);
      return od >= fourteenDaysAgo && od < sevenDaysAgo && o.orderStatus !== 'Cancelled';
    });
    const lastWeekSales = lastWeekOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const thisWeekOrdersCount = orders.filter(o => {
      const od = new Date(o.createdAt || 0);
      return od >= sevenDaysAgo && o.orderStatus !== 'Cancelled';
    }).length;
    const ordersTrendPercent = lastWeekOrders.length > 0
      ? Math.round(((thisWeekOrdersCount - lastWeekOrders.length) / lastWeekOrders.length) * 100)
      : 12;
    const salesTrendPercent = lastWeekSales > 0
      ? Math.round(((thisWeekSales - lastWeekSales) / lastWeekSales) * 100)
      : 18;

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
      success: true,
      stats: {
        todayOrdersCount,
        todaySales,
        thisWeekSales,
        monthlySales,
        totalSales,
        realProfit,
        profitMarginPercent,
        hasMissingCostData,
        profitStatusMessage,
        totalOrders: orders.length,
        totalCustomers: customers.length,
        totalProducts: products.length,
        activeProductsCount,
        totalDeliveryBoys: deliveryAgents.length,
        activeDeliveryBoys,
        inactiveDeliveryBoys,
        pendingOrders: statusCounts['Order Placed'] + statusCounts['Confirmed'] + statusCounts['Preparing'],
        deliveredOrders: statusCounts['Delivered'],
        cancelledOrders: statusCounts['Cancelled'],
        outForDelivery: statusCounts['Out for Delivery'],
        statusCounts,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        outOfStockCount: outOfStockProducts.length,
        activeOffersCount: activeOffers.length,
        cod: { codCollected, codPending },
        pendingReturns: returnRequests.filter(r => r.status === 'Pending').length,
        bestSellers,
        salesByProduct,
        avgRating,
        ordersTrendPercent,
        salesTrendPercent,
        customersTrendPercent: 10,
        salesTrends: last7Days,
        last30Days,
        recentOrders,
        actionRequired,
        actionRequiredCount: actionRequired.length
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

router.put('/orders/:id/status', async (req, res) => {
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
      sendOrderConfirmationNotifications(updated).catch(err => {
        console.error('[BPS Notification] Order confirmation notification error:', err);
      });
    } else if (status === 'Cancelled') {
      sendOrderCancelledNotifications(updated, note, 'admin').catch(err => {
        console.error('[BPS Notification] Order cancellation notification error:', err);
      });
    } else {
      sendOrderStatusUpdateNotifications(updated, status).catch(err => {
        console.error('[BPS Notification] Order status notification error:', err);
      });
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
    sendOrderConfirmationNotifications(updated).catch(err => {
      console.error('[BPS Notification] Order confirmation notification error:', err);
    });

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

    // Automatically send customer and admin cancellation notifications
    sendOrderCancelledNotifications(updated, reason, 'admin').catch(err => {
      console.error('[BPS Notification] Order cancellation notification error:', err);
    });

    const finalOrder = db.Orders.findById(order._id) || updated;
    res.json({ success: true, message: 'Order Cancelled. Customer notified and stock restored.', order: finalOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
});

// Admin Notification Audit Query Endpoints
router.get('/notifications', (req, res) => {
  try {
    const logs = db.Notifications ? db.Notifications.find() : [];
    logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    res.json({ success: true, count: logs.length, notifications: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

router.get('/orders/:id/notifications', (req, res) => {
  try {
    const { id } = req.params;
    const order = db.Orders.findOne(o => o._id === id || o.orderId === id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const logs = db.Notifications ? db.Notifications.find(n => n.orderId === order.orderId || n.orderId === order._id) : [];
    res.json({ success: true, orderId: order.orderId, notifications: logs, status: order.notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch order notifications' });
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
    let { agentId, agentName, agentPhone, note, deliveryBoyId } = req.body;
    agentId = agentId || deliveryBoyId;

    if (agentId && (!agentName || !agentPhone)) {
      const agentUser = db.Users.findOne(u => u._id === agentId || u.mobile === agentId);
      if (agentUser) {
        agentName = agentName || agentUser.name;
        agentPhone = agentPhone || agentUser.mobile;
        agentId = agentUser._id;
      }
    }

    const order = db.Orders.findOne(o => o._id === id || o.orderId === id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Prevent assignment of cancelled, delivered, or invalid orders (Feature 41)
    if (order.orderStatus === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot assign a cancelled order.' });
    }
    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({ success: false, message: 'Order is already delivered.' });
    }

    // Validate active and available delivery agent (Feature 58)
    const agent = db.DeliveryAgents.findOne(a => a._id === agentId || a.userId === agentId);
    if (agent) {
      if (agent.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Selected delivery partner is currently deactivated and cannot receive new orders.' });
      }
      if (agent.availabilityStatus === 'OFFLINE') {
        return res.status(400).json({ success: false, message: 'Selected delivery partner is currently marked OFFLINE.' });
      }
    }

    const timeline = order.statusTimeline || [];
    const prevAgentName = order.assignedDeliveryBoy?.name;
    const isReassigned = Boolean(prevAgentName && prevAgentName !== agentName);

    const assignmentNote = isReassigned
      ? `Reassigned from ${prevAgentName} to ${agentName} (${agentPhone}) by ${req.user?.name || 'Admin'}${note ? `. Reason: ${note}` : ''}`
      : `Assigned to: ${agentName} (${agentPhone}) by ${req.user?.name || 'Admin'}${note ? `. Note: ${note}` : ''}`;

    // Maintain full assignment history (Feature 42)
    const assignmentHistory = order.assignmentHistory || [];
    assignmentHistory.push({
      orderId: order.orderId,
      deliveryBoyId: agentId,
      agentName,
      agentPhone,
      assignedBy: req.user?.name || 'Admin',
      assignedById: req.user?._id || '',
      assignedAt: new Date().toISOString(),
      action: isReassigned ? 'REASSIGNED' : 'ASSIGNED',
      previousAgent: prevAgentName || null,
      note: note || ''
    });

    timeline.push({
      status: 'Delivery Assigned',
      timestamp: new Date().toISOString(),
      note: assignmentNote
    });

    const updated = db.Orders.updateById(order._id, {
      orderStatus: 'Delivery Assigned',
      assignedDeliveryBoy: {
        agentId,
        name: agentName,
        phone: agentPhone,
        assignedAt: new Date().toISOString(),
        status: 'Assigned',
        note: note || ''
      },
      assignmentHistory,
      statusTimeline: timeline
    });

    logAdminAction(req.user, isReassigned ? 'ORDER_REASSIGNED' : 'ORDER_ASSIGNED', {
      orderId: order.orderId,
      agent: agentName,
      previousAgent: prevAgentName || null,
      note: note || ''
    });

    // Real-time In-App Notification for Delivery Boy
    try {
      createInAppNotification({
        recipientRole: 'delivery',
        recipientUserId: agent?.userId || agentId,
        title: isReassigned ? 'Reassigned Delivery Order' : 'New Delivery Assigned',
        message: `Order #${order.orderId} (₹${order.totalAmount}) assigned to you. Address: ${order.shippingAddress?.houseFlat || ''}, ${order.shippingAddress?.streetArea || ''}`,
        type: 'delivery',
        orderId: order.orderId,
        link: '/delivery/dashboard'
      });

      createInAppNotification({
        recipientRole: 'customer',
        recipientUserId: order.customerId,
        customerId: order.customerId,
        customerPhone: order.customerPhone,
        title: 'Delivery Partner Assigned',
        message: `Your order #${order.orderId} is assigned to ${agentName} (${agentPhone}).`,
        type: 'delivery',
        orderId: order.orderId,
        link: `/tracking?id=${order.orderId}`
      });

      eventBus.emit('DELIVERY_ASSIGNED', {
        order: updated,
        deliveryBoy: { agentId, name: agentName, phone: agentPhone, userId: agent?.userId }
      });
    } catch (err) {
      console.error('[Notification] Assign delivery notification error:', err);
    }

    res.json({
      success: true,
      message: isReassigned ? `Order reassigned to ${agentName}` : `Assigned to ${agentName}`,
      order: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign agent' });
  }
});

// Remove delivery assignment (Feature 42)
router.put('/orders/:id/remove-assignment', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const order = db.Orders.findOne(o => o._id === id || o.orderId === id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.orderStatus === 'Delivered' || order.orderStatus === 'Out for Delivery') {
      return res.status(400).json({
        success: false,
        message: `Cannot remove assignment for order in state "${order.orderStatus}".`
      });
    }

    const prevAgent = order.assignedDeliveryBoy;
    const timeline = order.statusTimeline || [];
    timeline.push({
      status: 'Ready for Delivery',
      timestamp: new Date().toISOString(),
      note: `Delivery assignment removed by ${req.user?.name || 'Admin'}${reason ? `. Reason: ${reason}` : ''}`
    });

    const assignmentHistory = order.assignmentHistory || [];
    assignmentHistory.push({
      orderId: order.orderId,
      deliveryBoyId: prevAgent?.agentId || null,
      agentName: prevAgent?.name || 'Unknown',
      removedBy: req.user?.name || 'Admin',
      removedAt: new Date().toISOString(),
      action: 'REMOVED',
      note: reason || ''
    });

    const updated = db.Orders.updateById(order._id, {
      orderStatus: 'Ready for Delivery',
      assignedDeliveryBoy: null,
      assignmentHistory,
      statusTimeline: timeline
    });

    logAdminAction(req.user, 'ORDER_ASSIGNMENT_REMOVED', {
      orderId: order.orderId,
      previousAgent: prevAgent?.name || null,
      reason: reason || ''
    });

    res.json({ success: true, message: 'Assignment removed successfully', order: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove assignment' });
  }
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
    const { name, category, shortDescription, description, ingredients, price, originalPrice, costPrice, weight, weights, stock, lowStockThreshold, isFeatured, isActive, isBestSeller, isNew, image, images, sku, tags } = req.body;
    if (!name || !price || !category) return res.status(400).json({ success: false, message: 'Name, price, and category are required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const numPrice = Number(price); const numOriginal = originalPrice ? Number(originalPrice) : numPrice;
    const numCost = (costPrice !== undefined && costPrice !== null && costPrice !== '') ? Number(costPrice) : null;
    const generatedSku = sku ? sku.trim() : `BPS-${(category || 'FLR').slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const productImages = Array.isArray(images) && images.length > 0 ? images : (image ? [image] : []);
    const newProduct = db.Products.insertOne({
      name, slug, category, sku: generatedSku, shortDescription: shortDescription || '', description: description || '', ingredients: ingredients || '',
      price: numPrice, originalPrice: numOriginal, costPrice: numCost,
      discountPercent: numOriginal > numPrice ? Math.round(((numOriginal - numPrice) / numOriginal) * 100) : 0,
      weight: weight || '5 KG',
      weights: weights || [{ weight: weight || '5 KG', price: numPrice, originalPrice: numOriginal, inStock: true, stockCount: Number(stock) || 20 }],
      stock: Number(stock) || 0, lowStockThreshold: Number(lowStockThreshold) || 5,
      rating: 0, reviewCount: 0, isFeatured: Boolean(isFeatured), isBestSeller: Boolean(isBestSeller), isNew: Boolean(isNew),
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      image: productImages[0] || image || '', images: productImages, tags: tags || []
    });
    logAdminAction(req.user, 'PRODUCT_CREATED', { name, price, category, sku: generatedSku });
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
    if (updates.costPrice !== undefined) {
      updates.costPrice = (updates.costPrice !== null && updates.costPrice !== '') ? Number(updates.costPrice) : null;
    }
    if (updates.stock !== undefined) updates.stock = Number(updates.stock);
    if (updates.lowStockThreshold !== undefined) updates.lowStockThreshold = Number(updates.lowStockThreshold);
    if (updates.price && updates.originalPrice && updates.originalPrice > updates.price) {
      updates.discountPercent = Math.round(((updates.originalPrice - updates.price) / updates.originalPrice) * 100);
    }
    if (updates.images && Array.isArray(updates.images) && updates.images.length > 0) {
      if (!updates.image) updates.image = updates.images[0];
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

    // Automation event triggers
    const threshold = updated.lowStockThreshold !== undefined ? updated.lowStockThreshold : 5;
    if (newStock <= 0) {
      eventBus.emit('STOCK_OUT', { product: updated });
    } else if (newStock <= threshold) {
      eventBus.emit('STOCK_LOW', { product: updated, stock: newStock, threshold });
    }

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

// Helper to generate an authentic unique coupon code e.g. BPS7K4M2, FRESH8Q2, MILL5X9
function generateUniqueCouponCode(prefixChoice = 'BPS') {
  const prefixes = ['BPS', 'FRESH', 'MILL'];
  const prefix = prefixes.includes(prefixChoice) ? prefixChoice : prefixes[Math.floor(Math.random() * prefixes.length)];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let attempt = 0; attempt < 50; attempt++) {
    let suffix = '';
    const lengthNeeded = 8 - prefix.length;
    for (let i = 0; i < lengthNeeded; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `${prefix}${suffix}`;
    const exists = db.Offers.findOne(o => o.code && o.code.toUpperCase() === code);
    if (!exists) return code;
  }
  return `BPS${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

router.post('/offers/generate-coupon', (req, res) => {
  try {
    const { prefix, discountType, discountValue, minOrderValue, maxDiscount, expiryDays, usageLimit, description, bannerText } = req.body;

    if (!discountValue || Number(discountValue) <= 0) {
      return res.status(400).json({ success: false, message: 'Please specify a valid discount value.' });
    }

    const code = generateUniqueCouponCode(prefix);
    const isPercent = discountType === 'percentage';
    const now = new Date();
    const days = Number(expiryDays) || 30;
    const expiryDate = new Date(now.getTime() + days * 86400000);

    const newCoupon = db.Offers.insertOne({
      name: `${isPercent ? `${discountValue}% OFF` : `₹${discountValue} Flat OFF`} (${code})`,
      code,
      discountPercent: isPercent ? Number(discountValue) : 0,
      flatDiscount: !isPercent ? Number(discountValue) : 0,
      minOrderValue: Number(minOrderValue) || 0,
      maxDiscount: isPercent ? (Number(maxDiscount) || 0) : 0,
      usageLimit: Number(usageLimit) || 100,
      timesUsed: 0,
      startDate: now.toISOString(),
      endDate: expiryDate.toISOString(),
      description: description || `Enjoy ${isPercent ? `${discountValue}% discount` : `₹${discountValue} off`} on fresh stone-ground flours.`,
      bannerText: bannerText || `Use code ${code} for savings!`,
      isActive: true,
      isAutoGenerated: true
    });

    logAdminAction(req.user, 'COUPON_GENERATED', { code, discountValue, isPercent });

    res.status(201).json({
      success: true,
      message: `Coupon code '${code}' generated successfully!`,
      coupon: newCoupon
    });
  } catch (err) {
    console.error('Error generating coupon:', err);
    res.status(500).json({ success: false, message: 'Failed to generate coupon' });
  }
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
    if (cleanMobile.length < 10) return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number' });

    // Check if phone matches any Administrator
    const existingAdmin = db.Users.findOne(u => (u.role === 'admin' || u.role === 'super_admin') && u.mobile && u.mobile.slice(-10) === cleanMobile);
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: `This mobile number (${cleanMobile}) belongs to Store Administrator (${existingAdmin.name}). Please enter the delivery boy's own personal 10-digit mobile number.`
      });
    }

    // Check if already an active delivery agent
    const existingAgent = db.DeliveryAgents.findOne(a => a.mobile && a.mobile.slice(-10) === cleanMobile);
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: `A delivery partner (${existingAgent.name}) is already registered with mobile number ${cleanMobile}.`
      });
    }

    const hashed = await bcrypt.hash(password, 8);
    let user = db.Users.findOne(u => u.mobile && u.mobile.slice(-10) === cleanMobile);

    if (user) {
      // Existing customer converted to delivery partner
      user = db.Users.updateById(user._id, {
        name: name.trim(),
        email: req.body.email ? req.body.email.trim() : user.email,
        password: hashed,
        role: 'delivery',
        status: 'active'
      });
    } else {
      user = db.Users.insertOne({
        name: name.trim(),
        mobile: cleanMobile,
        email: req.body.email ? req.body.email.trim() : '',
        password: hashed,
        role: 'delivery',
        status: 'active',
        addresses: []
      });
    }

    const agent = db.DeliveryAgents.insertOne({
      userId: user._id,
      name: name.trim(),
      mobile: cleanMobile,
      status: 'active',
      totalAssigned: 0,
      totalCashCollected: 0,
      totalCashDeposited: 0,
      cashDifference: 0
    });

    logAdminAction(req.user, 'DELIVERY_AGENT_ADDED', { name: name.trim(), mobile: cleanMobile, agentId: agent._id });
    res.status(201).json({ success: true, message: 'Delivery agent added successfully', agent });
  } catch (err) {
    console.error('Error adding delivery agent:', err);
    res.status(500).json({ success: false, message: 'Failed to add delivery agent: ' + (err.message || '') });
  }
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
    const agent = db.DeliveryAgents.findById(agentId) || db.DeliveryAgents.findOne(a => a._id === agentId || a.userId === agentId);
    if (!agent) return res.status(404).json({ success: false, message: 'Delivery agent not found' });
    
    const depositAmount = Number(amountDeposited) || 0;
    if (depositAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid deposit amount greater than 0.' });
    }

    const currentDeposited = agent.totalCashDeposited || 0;
    const currentCollected = agent.totalCashCollected || 0;
    const newTotalDeposited = currentDeposited + depositAmount;
    const outstandingCash = Math.max(0, currentCollected - newTotalDeposited);

    db.DeliveryAgents.updateById(agent._id, {
      totalCashDeposited: newTotalDeposited,
      cashDifference: outstandingCash
    });

    const record = db.CashSettlements.insertOne({
      agentId: agent._id,
      agentName: agent.name,
      agentMobile: agent.mobile,
      amountDeposited: depositAmount,
      notes: notes || '',
      recordedBy: req.user?.name || 'Super Admin',
      recordedById: req.user?._id || '',
      status: 'Received',
      date: new Date().toISOString()
    });

    logAdminAction(req.user, 'CASH_SETTLED', {
      agentName: agent.name,
      amount: depositAmount,
      notes: notes || ''
    });

    // Automation event trigger for settlement confirmation
    eventBus.emit('SETTLEMENT_CONFIRMED', {
      agent,
      amount: depositAmount,
      record,
      remaining: outstandingCash
    });

    res.json({
      success: true,
      message: `₹${depositAmount} cash handover recorded for ${agent.name}`,
      settlementRecord: record
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record settlement' });
  }
});

router.get('/cash-settlements', (req, res) => {
  let records = db.CashSettlements.find();
  const { agentId, search } = req.query;
  if (agentId) {
    records = records.filter(r => r.agentId === agentId || (r.agentName && r.agentName.toLowerCase().includes(agentId.toLowerCase())));
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    records = records.filter(r =>
      (r.agentName && r.agentName.toLowerCase().includes(q)) ||
      (r.recordedBy && r.recordedBy.toLowerCase().includes(q)) ||
      (r.notes && r.notes.toLowerCase().includes(q)) ||
      (r.amountDeposited && String(r.amountDeposited).includes(q))
    );
  }
  records.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  res.json({ success: true, settlements: records });
});

// Settlement Verification & Mismatch Handling (Features 55 & 56)
router.put('/cash-settlements/:id/verify', (req, res) => {
  try {
    const { id } = req.params;
    const { notes, remarks, verifiedAmount } = req.body || {};
    const settlement = db.CashSettlements.findOne(s => s._id === id || s.id === id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement record not found' });

    const isMismatch = settlement.difference !== 0;
    const updated = db.CashSettlements.updateById(settlement._id, {
      status: 'VERIFIED',
      verifiedAt: new Date().toISOString(),
      verifiedBy: req.user.name,
      adminNotes: remarks || notes || settlement.adminNotes || 'Verified by admin'
    });

    // Update agent's totalCashDeposited and cashDifference
    const agent = db.DeliveryAgents.findOne(a => a._id === settlement.agentId || a.userId === settlement.deliveryBoyId);
    if (agent) {
      const prevDeposited = Number(agent.totalCashDeposited) || 0;
      const newTotalDeposited = prevDeposited + (Number(settlement.depositedAmount) || 0);
      const outstanding = Math.max(0, (Number(agent.totalCashCollected) || 0) - newTotalDeposited);
      db.DeliveryAgents.updateById(agent._id, {
        totalCashDeposited: newTotalDeposited,
        cashDifference: outstanding
      });
    }

    logAdminAction(req.user, isMismatch ? 'SETTLEMENT_EXCEPTION_LOGGED' : 'SETTLEMENT_VERIFIED', {
      settlementId: settlement._id,
      amount: settlement.depositedAmount,
      difference: settlement.difference
    });

    res.json({
      success: true,
      message: `Settlement verified successfully for ₹${settlement.depositedAmount}.`,
      settlement: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to verify settlement' });
  }
});

router.put('/cash-settlements/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const settlement = db.CashSettlements.findOne(s => s._id === id || s.id === id);
    if (!settlement) return res.status(404).json({ success: false, message: 'Settlement record not found' });

    const updated = db.CashSettlements.updateById(settlement._id, {
      status: 'REJECTED',
      rejectionReason: reason || 'Cash handover rejected by admin',
      verifiedAt: new Date().toISOString(),
      verifiedBy: req.user.name
    });

    logAdminAction(req.user, 'SETTLEMENT_REJECTED', {
      settlementId: settlement._id,
      reason: reason || ''
    });

    res.json({ success: true, message: 'Settlement rejected', settlement: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject settlement' });
  }
});

// Delivery Performance Analytics (Feature 57)
router.get('/delivery-performance', (req, res) => {
  try {
    const agents = db.DeliveryAgents.find();
    const orders = db.Orders.find();

    const performance = agents.map(agent => {
      const agentOrders = orders.filter(o =>
        o.assignedDeliveryBoy &&
        (o.assignedDeliveryBoy.agentId === agent._id ||
         o.assignedDeliveryBoy.agentId === agent.userId ||
         o.assignedDeliveryBoy.phone === agent.mobile)
      );

      const totalAssigned = agentOrders.length;
      const deliveredOrders = agentOrders.filter(o => o.orderStatus === 'Delivered');
      const failedOrders = agentOrders.filter(o => o.orderStatus === 'Delivery Attempt Failed');
      const totalDelivered = deliveredOrders.length;
      const totalFailed = failedOrders.length;

      const totalAttempted = totalDelivered + totalFailed;
      const deliverySuccessRate = totalAttempted > 0 ? Math.round((totalDelivered / totalAttempted) * 100) : 0;
      const failedDeliveryRate = totalAttempted > 0 ? Math.round((totalFailed / totalAttempted) * 100) : 0;

      let codCollected = 0;
      let codPending = 0;
      let codExceptions = 0;

      agentOrders.forEach(o => {
        if (o.paymentMethod === 'Cash on Delivery') {
          if (o.paymentStatus === 'COD Collected' || o.orderStatus === 'Delivered') {
            codCollected += (Number(o.codCollected) || Number(o.totalAmount) || 0);
          } else if (o.paymentStatus === 'COD Exception') {
            codExceptions += (Number(o.codCollected) || 0);
          } else if (o.orderStatus !== 'Cancelled') {
            codPending += Number(o.totalAmount) || 0;
          }
        }
      });

      const totalDeposited = Number(agent.totalCashDeposited) || 0;
      const cashDifference = codCollected - totalDeposited;

      return {
        agentId: agent._id,
        userId: agent.userId,
        name: agent.name,
        mobile: agent.mobile,
        status: agent.status,
        availability: agent.availabilityStatus || 'AVAILABLE',
        totalAssigned,
        totalDelivered,
        totalFailed,
        deliverySuccessRate,
        failedDeliveryRate,
        codCollected,
        codPending,
        codExceptions,
        totalDeposited,
        cashDifference
      };
    });

    res.json({ success: true, performance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to calculate delivery performance' });
  }
});

// Customer Analytics & Segmentation (Features 83 & 84)
router.get('/customer-analytics', (req, res) => {
  try {
    const customers = db.Users.find(u => u.role === 'customer');
    const orders = db.Orders.find();

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const fortyFiveDaysAgo = now - 45 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    let totalSpending = 0;
    let totalCustomerOrders = 0;
    let returningCustomersCount = 0;
    let newCustomersCount = 0;

    const analyzedCustomers = customers.map(cust => {
      const custOrders = orders.filter(o =>
        (o.customerId && o.customerId === cust._id) ||
        (o.customerPhone && o.customerPhone === cust.mobile)
      ).filter(o => o.orderStatus !== 'Cancelled');

      custOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      const ordersCount = custOrders.length;
      const customerSpend = custOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      const lastOrderDate = custOrders[0]?.createdAt || null;
      const lastOrderTime = lastOrderDate ? new Date(lastOrderDate).getTime() : 0;
      const joinedTime = cust.createdAt ? new Date(cust.createdAt).getTime() : 0;

      totalSpending += customerSpend;
      totalCustomerOrders += ordersCount;

      if (ordersCount >= 2) returningCustomersCount++;
      if (joinedTime >= thirtyDaysAgo) newCustomersCount++;

      // Segment classification (Feature 84: NEW, REGULAR, VIP, INACTIVE, AT_RISK)
      let segment = 'NEW';
      if (ordersCount === 0) {
        segment = joinedTime < ninetyDaysAgo ? 'INACTIVE' : 'NEW';
      } else if (ordersCount >= 5 || customerSpend >= 5000) {
        segment = 'VIP';
      } else if (ordersCount >= 2) {
        if (lastOrderTime < fortyFiveDaysAgo) {
          segment = lastOrderTime < ninetyDaysAgo ? 'INACTIVE' : 'AT_RISK';
        } else {
          segment = 'REGULAR';
        }
      } else {
        segment = lastOrderTime < fortyFiveDaysAgo ? 'AT_RISK' : 'NEW';
      }

      return {
        id: cust._id,
        name: cust.name,
        email: cust.email,
        mobile: cust.mobile,
        ordersCount,
        totalSpend: customerSpend,
        avgOrderValue: ordersCount > 0 ? Math.round(customerSpend / ordersCount) : 0,
        lastOrderDate,
        joinedDate: cust.createdAt,
        segment,
        loyaltyPoints: cust.loyaltyPoints || 0,
        walletBalance: cust.walletBalance || 0
      };
    });

    const averageOrderValue = totalCustomerOrders > 0 ? Math.round(totalSpending / totalCustomerOrders) : 0;
    const repeatPurchaseRate = customers.length > 0 ? Math.round((returningCustomersCount / customers.length) * 100) : 0;

    const segmentCounts = {
      NEW: analyzedCustomers.filter(c => c.segment === 'NEW').length,
      REGULAR: analyzedCustomers.filter(c => c.segment === 'REGULAR').length,
      VIP: analyzedCustomers.filter(c => c.segment === 'VIP').length,
      AT_RISK: analyzedCustomers.filter(c => c.segment === 'AT_RISK').length,
      INACTIVE: analyzedCustomers.filter(c => c.segment === 'INACTIVE').length
    };

    res.json({
      success: true,
      metrics: {
        totalCustomers: customers.length,
        newCustomers: newCustomersCount,
        returningCustomers: returningCustomersCount,
        totalSpending,
        averageOrderValue,
        repeatPurchaseRate,
        segmentCounts
      },
      customers: analyzedCustomers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate customer analytics' });
  }
});

// Replacement Creation for Approved Returns (Feature 65)
router.post('/returns/:id/create-replacement', (req, res) => {
  try {
    const { id } = req.params;
    const { productId, variantWeight, quantity, notes } = req.body || {};

    const returnReq = db.ReturnRequests.findById(id) || db.ReturnRequests.findOne(r => r._id === id || r.id === id);
    if (!returnReq) return res.status(404).json({ success: false, message: 'Return request not found' });

    const originalOrder = db.Orders.findOne(o => o.orderId === returnReq.orderId || o._id === returnReq.orderDbId);
    if (!originalOrder) return res.status(404).json({ success: false, message: 'Original order not found' });

    const targetProductId = productId || returnReq.productId || originalOrder.items?.[0]?.productId;
    const product = db.Products.findById(targetProductId);
    if (!product) return res.status(400).json({ success: false, message: 'Replacement product not found in catalog' });

    const replaceQty = Number(quantity) || 1;
    if (product.stock < replaceQty) {
      return res.status(400).json({ success: false, message: `Insufficient stock for replacement (${product.stock} units available)` });
    }

    // Decrement stock for replacement product
    db.Products.updateById(product._id, { stock: product.stock - replaceQty });

    const replacementRecord = db.Replacements.insertOne({
      returnRequestId: returnReq._id,
      originalOrderId: originalOrder.orderId,
      customerId: returnReq.customerId,
      customerName: returnReq.customerName,
      customerPhone: returnReq.customerPhone,
      productId: product._id,
      productName: product.name,
      variantWeight: variantWeight || product.weight || '5 KG',
      quantity: replaceQty,
      status: 'REPLACEMENT_INITIATED',
      approvedBy: req.user.name,
      notes: notes || '',
      createdAt: new Date().toISOString()
    });

    const updatedReturn = db.ReturnRequests.updateById(returnReq._id, {
      status: 'REPLACEMENT_INITIATED',
      resolutionType: 'replacement',
      replacementId: replacementRecord._id,
      adminNotes: notes ? `${returnReq.adminNotes ? returnReq.adminNotes + ' | ' : ''}Replacement approved: ${product.name} (${replaceQty})` : returnReq.adminNotes
    });

    eventBus.emit('RETURN_STATUS_CHANGED', {
      returnRequest: updatedReturn,
      status: 'REPLACEMENT_INITIATED',
      resolutionNote: `Replacement dispatched: ${product.name} × ${replaceQty}`
    });

    logAdminAction(req.user, 'REPLACEMENT_CREATED', {
      returnId: returnReq._id,
      replacementId: replacementRecord._id,
      product: product.name,
      quantity: replaceQty
    });

    res.status(201).json({
      success: true,
      message: `Replacement order initiated for ${product.name} (Qty: ${replaceQty}). Inventory automatically decremented.`,
      replacement: replacementRecord,
      replacementOrder: {
        ...replacementRecord,
        totalAmount: 0,
        orderId: `REP-${originalOrder.orderId}`
      },
      returnRequest: updatedReturn
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create replacement' });
  }
});

// Support Tickets Admin Management (Feature 68)
router.get('/tickets', (req, res) => {
  try {
    const tickets = db.Tickets ? db.Tickets.find() : [];
    tickets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ success: true, count: tickets.length, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
});

router.get('/tickets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const ticket = db.Tickets.findOne(t => t._id === id || t.ticketId === id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' });
  }
});

router.put('/tickets/:id/reply', (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body || {};
    if (!message || !message.trim()) return res.status(400).json({ success: false, message: 'Reply message cannot be empty' });

    const ticket = db.Tickets.findOne(t => t._id === id || t.ticketId === id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const replies = ticket.replies || [];
    const newReply = {
      id: 'rep_' + Date.now(),
      senderRole: 'admin',
      senderName: req.user.name,
      senderId: req.user._id,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      isInternal: false
    };
    replies.push(newReply);

    const updated = db.Tickets.updateById(ticket._id, {
      replies,
      status: 'WAITING_FOR_CUSTOMER'
    });

    eventBus.emit('TICKET_REPLIED', {
      ticket: updated,
      senderRole: 'admin',
      senderName: req.user.name
    });

    res.json({ success: true, message: 'Reply submitted', ticket: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit reply' });
  }
});

router.put('/tickets/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignedAdmin } = req.body || {};
    const ticket = db.Tickets.findOne(t => t._id === id || t.ticketId === id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const updates = {};
    if (status) updates.status = status.toUpperCase();
    if (priority) updates.priority = priority.toUpperCase();
    if (assignedAdmin !== undefined) updates.assignedAdmin = assignedAdmin;

    const updated = db.Tickets.updateById(ticket._id, updates);
    res.json({ success: true, message: 'Ticket updated', ticket: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update ticket' });
  }
});

router.post('/tickets/:id/internal-note', (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body || {};
    if (!note || !note.trim()) return res.status(400).json({ success: false, message: 'Internal note cannot be empty' });

    const ticket = db.Tickets.findOne(t => t._id === id || t.ticketId === id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const internalNotes = ticket.internalNotes || [];
    internalNotes.push({
      id: 'note_' + Date.now(),
      adminName: req.user.name,
      adminEmail: req.user.email,
      note: note.trim(),
      timestamp: new Date().toISOString()
    });

    const updated = db.Tickets.updateById(ticket._id, { internalNotes });
    res.json({ success: true, message: 'Internal note saved (not visible to customer)', internalNotes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save internal note' });
  }
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
