const express = require('express');
const db = require('../config/db');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { validateDeliveryArea, calculateDistanceKm } = require('../utils/distance');
const {
  sendCustomerOrderReceivedNotifications,
  sendAdminNewOrderEmail,
  sendOrderConfirmationNotifications,
  sendOrderCancelledNotifications
} = require('../services/notificationService');
const eventBus = require('../services/eventBus');

const router = express.Router();

// Helper to generate next BPS order ID
function generateOrderId() {
  const allOrders = db.Orders.find();
  const baseNum = 1024;
  const nextNum = baseNum + allOrders.length + 1;
  return `BPS${nextNum}`;
}

// 1. CREATE COD ORDER
router.post('/', authenticate, (req, res) => {
  try {
    const user = req.user;
    const { items, shippingAddress, couponCode, notes, millingSlot } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty.' });
    }

    if (!shippingAddress || !shippingAddress.houseFlat || !shippingAddress.pincode) {
      return res.status(400).json({ success: false, message: 'Please provide a complete delivery address.' });
    }

    // 1. Fetch Store Settings for Distance and Delivery Charge
    const settings = db.Settings.find()[0] || {};
    const shopLat = settings.shopLat || 25.4678;
    const shopLon = settings.shopLon || 83.0564;
    const maxRadiusKm = settings.maxDeliveryRadiusKm || 15;
    const standardDeliveryCharge = settings.deliveryCharge !== undefined ? settings.deliveryCharge : 40;
    const freeDeliveryThreshold = settings.freeDeliveryThreshold !== undefined ? settings.freeDeliveryThreshold : 500;

    // Duplicate Order Protection: Check if customer placed an identical order within the last 15 seconds
    const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000).toISOString();
    const recentDuplicate = db.Orders.findOne(o =>
      o.customerId === user._id &&
      o.createdAt > fifteenSecondsAgo &&
      o.items?.length === items.length
    );
    if (recentDuplicate) {
      return res.status(429).json({
        success: false,
        message: 'A duplicate order was recently submitted. Please wait a moment before trying again.'
      });
    }

    // 2. Validate 15 KM Delivery Distance (Feature 60: Point 5)
    const custLat = shippingAddress.lat;
    const custLon = shippingAddress.lon;
    const distanceCheck = validateDeliveryArea(shopLat, shopLon, custLat, custLon, maxRadiusKm);

    if (!distanceCheck.isDeliverable) {
      return res.status(400).json({
        success: false,
        message: 'Sorry, this location is outside our delivery area.'
      });
    }

    // 3. Stock Check & Inventory Decrement Preparation (Feature 60: Points 6-11)
    let subtotal = 0;
    const processedItems = [];
    const stockUpdates = [];

    for (const item of items) {
      let product = db.Products.findById(item.productId);
      if (!product && item.name) {
        product = db.Products.findOne(p => p.name.toLowerCase() === item.name.toLowerCase());
        if (product) {
          item.productId = product._id;
        }
      }
      if (!product || product.isActive === false) {
        return res.status(400).json({
          success: false,
          message: `Product "${item.name || 'item'}" is not available.`
        });
      }

      const requestedQty = Number(item.quantity) || 1;
      if (product.stock <= 0) {
        return res.status(400).json({
          success: false,
          message: `Sorry, "${product.name}" is currently out of stock.`
        });
      }

      if (product.stock < requestedQty) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} units are currently available.`
        });
      }

      // Check variant pricing/stock if provided
      let unitPrice = product.price;
      if (item.weight && product.weights && product.weights.length > 0) {
        const variant = product.weights.find(w => w.weight === item.weight);
        if (variant) {
          if (variant.isActive === false) {
            return res.status(400).json({
              success: false,
              message: `Variant "${item.weight}" for "${product.name}" is currently unavailable.`
            });
          }
          unitPrice = variant.price;
        }
      }

      const itemSubtotal = unitPrice * requestedQty;
      subtotal += itemSubtotal;

      processedItems.push({
        productId: product._id,
        name: product.name,
        weight: item.weight || product.weight || '5 KG',
        texture: item.texture || 'Medium',
        price: unitPrice,
        costPrice: (product.costPrice !== undefined && product.costPrice !== null) ? Number(product.costPrice) : null,
        quantity: requestedQty,
        subtotal: itemSubtotal,
        image: product.image || (product.images && product.images[0]) || ''
      });

      stockUpdates.push({
        productId: product._id,
        newStock: product.stock - requestedQty,
        name: product.name
      });
    }

    // 4. Coupon & Offer validation (Feature 60: Points 12-13)
    let discount = 0;
    let appliedCoupon = null;
    if (couponCode && couponCode.trim()) {
      const code = couponCode.trim().toUpperCase();
      const offer = db.Offers.findOne(o => o.code && o.code.toUpperCase() === code);
      if (!offer || !offer.isActive) {
        return res.status(400).json({
          success: false,
          message: 'This coupon code is invalid or inactive.'
        });
      }

      // Check expiry date
      if (offer.expiryDate && new Date(offer.expiryDate) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'This coupon has expired.'
        });
      }

      if (offer.minOrderValue && subtotal < offer.minOrderValue) {
        return res.status(400).json({
          success: false,
          message: `This coupon requires a minimum cart value of ₹${offer.minOrderValue}.`
        });
      }

      if (offer.discountPercent && offer.discountPercent > 0) {
        discount = Math.round((subtotal * offer.discountPercent) / 100);
        if (offer.maxDiscount && discount > offer.maxDiscount) {
          discount = offer.maxDiscount;
        }
      } else if (offer.flatDiscount && offer.flatDiscount > 0) {
        discount = offer.flatDiscount;
      }
      if (discount > subtotal) discount = subtotal;
      appliedCoupon = code;
    }

    // 5. Delivery Fee recalculation on backend (Feature 60: Point 14)
    const eligibleForFreeDelivery = subtotal >= freeDeliveryThreshold;
    const deliveryCharge = eligibleForFreeDelivery ? 0 : standardDeliveryCharge;
    const totalAmount = Math.max(0, subtotal - discount + deliveryCharge);

    // 6. Generate Delivery OTP & Order ID
    const orderId = generateOrderId();
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // 7. Atomic Stock Decrement
    for (const update of stockUpdates) {
      db.Products.updateById(update.productId, { stock: update.newStock });
    }

    // 8. Create Order Document
    const estDelivery = new Date();
    estDelivery.setDate(estDelivery.getDate() + 1);
    const expectedDeliveryDate = estDelivery.toISOString();

    const newOrder = db.Orders.insertOne({
      orderId,
      customerId: user._id,
      customerName: user.name || shippingAddress.name,
      customerPhone: user.mobile || shippingAddress.mobile,
      customerEmail: user.email || shippingAddress.email || '',
      shippingAddress: {
        ...shippingAddress,
        distanceKm: distanceCheck.distanceKm
      },
      items: processedItems,
      subtotal,
      deliveryCharge,
      discount,
      couponCode: appliedCoupon,
      totalAmount,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'COD Pending',
      orderStatus: 'Pending Admin Confirmation',
      expectedDeliveryDate,
      trackingNumber: '',
      deliveryOtp,
      millingSlot: millingSlot || 'Morning Batch (8:00 AM - 11:30 AM)',
      notes: notes || '',
      assignedDeliveryBoy: null,
      notifications: {
        whatsapp: { lastStatus: 'pending', lastSentAt: null },
        email: { lastStatus: 'pending', lastSentAt: null },
        adminEmail: { lastStatus: 'pending', lastSentAt: null }
      },
      statusTimeline: [
        {
          status: 'Order Placed',
          timestamp: new Date().toISOString(),
          note: 'Order placed by customer.'
        },
        {
          status: 'Pending Admin Confirmation',
          timestamp: new Date().toISOString(),
          note: 'Order received. Awaiting review and confirmation by BPS Store Admin.'
        }
      ]
    });

    // 9. Automation Event Bus Trigger (Handles inventory checks, auto notifications, and real-time SSE push)
    eventBus.emit('ORDER_CREATED', newOrder);

    // 10. Immediately trigger external notifications (Customer WhatsApp + Customer Email + Admin Email)
    sendCustomerOrderReceivedNotifications(newOrder).catch(err => {
      console.error('[BPS Notification] Customer order received notification failed:', err);
    });
    sendAdminNewOrderEmail(newOrder).catch(err => {
      console.error('[BPS Notification] Admin new order email dispatch failed:', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Order Placed! Awaiting Admin Confirmation.',
      order: newOrder
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

// 2. GET CURRENT CUSTOMER'S ORDERS
router.get('/my-orders', authenticate, (req, res) => {
  try {
    const user = req.user;
    const orders = db.Orders.find(o => o.customerId === user._id || o.customerPhone === user.mobile);
    // Sort by latest first
    orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
});

// 3. GET SINGLE ORDER DETAILS & TRACKING
router.get('/track/:id', optionalAuthenticate, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const cleanId = (id || '').trim().toLowerCase();
    const order = db.Orders.findOne(o => 
      (o._id && o._id.toLowerCase() === cleanId) || 
      (o.orderId && o.orderId.toLowerCase() === cleanId) ||
      o._id === id || 
      o.orderId === id
    );
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (user) {
      if (user.role === 'customer' && order.customerId !== user._id && order.customerPhone !== user.mobile) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to this order' });
      }
      return res.json({ success: true, order });
    }

    // Direct link from WhatsApp/Email: provide safe tracking details
    const safeOrder = {
      ...order,
      deliveryOtp: undefined,
      customerPhone: order.customerPhone ? `${order.customerPhone.slice(0, 2)}******${order.customerPhone.slice(-2)}` : '',
      customerEmail: order.customerEmail ? `${order.customerEmail.slice(0, 2)}***@***` : ''
    };

    res.json({ success: true, order: safeOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tracking details' });
  }
});

router.get('/:id', optionalAuthenticate, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const cleanId = (id || '').trim().toLowerCase();
    const order = db.Orders.findOne(o => 
      (o._id && o._id.toLowerCase() === cleanId) || 
      (o.orderId && o.orderId.toLowerCase() === cleanId) ||
      o._id === id || 
      o.orderId === id
    );
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorization check: Customer can only view their own orders unless admin or delivery
    if (user) {
      if (user.role === 'customer' && order.customerId !== user._id && order.customerPhone !== user.mobile) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to this order' });
      }
      return res.json({ success: true, order });
    }

    // If unauthenticated (e.g. direct link clicked from WhatsApp or Email)
    const safeOrder = {
      ...order,
      deliveryOtp: undefined,
      customerPhone: order.customerPhone ? `${order.customerPhone.slice(0, 2)}******${order.customerPhone.slice(-2)}` : '',
      customerEmail: order.customerEmail ? `${order.customerEmail.slice(0, 2)}***@***` : ''
    };

    res.json({ success: true, order: safeOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
});

// 4. CANCEL ORDER (Customer can cancel if not dispatched yet)
router.post('/:id/cancel', optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const user = req.user;

    const order = db.Orders.findOne(o => o._id === id || o.orderId === id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (user && user.role === 'customer' && order.customerId && order.customerId !== user._id && order.customerPhone !== user.mobile) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    if (['Out for Delivery', 'Delivered', 'Cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled at this stage (${order.orderStatus}). Please contact support.`
      });
    }

    // Restock items
    for (const item of order.items || []) {
      const product = db.Products.findById(item.productId);
      if (product) {
        db.Products.updateById(product._id, {
          stock: product.stock + (Number(item.quantity) || 1)
        });
      }
    }

    const timeline = order.statusTimeline || [];
    timeline.push({
      status: 'Cancelled',
      timestamp: new Date().toISOString(),
      note: reason || 'Cancelled by customer'
    });

    const updated = db.Orders.updateById(order._id, {
      orderStatus: 'Cancelled',
      paymentStatus: 'Cancelled',
      statusTimeline: timeline
    });

    // Automation Event Bus Trigger (Restores inventory & logs audit event)
    eventBus.emit('ORDER_CANCELLED', { order: updated, cancelledBy: user?.name || 'Customer', reason });

    // Trigger automated notifications (Customer WhatsApp + Customer Email + Admin Email)
    sendOrderCancelledNotifications(updated, reason || 'Customer requested cancellation', 'customer').catch(err => {
      console.error('[BPS Notification] Order cancellation notification error:', err);
    });

    res.json({ success: true, message: 'Order has been cancelled successfully', order: updated });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel order' });
  }
});

// 5. VALIDATE DELIVERY DISTANCE HELPER ENDPOINT
router.post('/check-delivery-distance', (req, res) => {
  const { lat, lon } = req.body;
  const settings = db.Settings.find()[0] || {};
  const shopLat = settings.shopLat || 25.4678;
  const shopLon = settings.shopLon || 83.0564;
  const maxRadiusKm = settings.maxDeliveryRadiusKm || 15;

  const result = validateDeliveryArea(shopLat, shopLon, lat, lon, maxRadiusKm);
  res.json({ success: true, ...result });
});

// 6. GET ORDER INVOICE (Features 78-80)
router.get('/:id/invoice', optionalAuthenticate, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const cleanId = (id || '').trim().toLowerCase();
    const order = db.Orders.findOne(o =>
      (o._id && o._id.toLowerCase() === cleanId) ||
      (o.orderId && o.orderId.toLowerCase() === cleanId) ||
      o._id === id ||
      o.orderId === id
    );

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Authorization: customer can only access their own invoice unless admin
    if (user && user.role === 'customer' && order.customerId && order.customerId !== user._id && order.customerPhone !== user.mobile) {
      return res.status(403).json({ success: false, message: 'Access denied. You cannot view another customer\'s invoice.' });
    }

    const settings = db.Settings.find()[0] || {};

    const invoice = {
      brand: {
        name: 'BPS Fresh Mills',
        tagline: settings.tagline || 'Freshly Milled. Naturally Good.',
        address: settings.shopAddress || 'Lakhanpur, Cholapur, Varanasi 221101',
        phone: settings.phone || '+91 6386621332',
        email: settings.email || 'bpsfreshmills@gmail.com'
      },
      invoiceNumber: `INV-${order.orderId}`,
      invoiceDate: order.createdAt || new Date().toISOString(),
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
        address: order.shippingAddress
      },
      items: (order.items || []).map(it => ({
        name: it.name,
        weight: it.weight || '5 KG',
        quantity: it.quantity,
        unitPrice: it.price,
        subtotal: it.subtotal || (it.price * it.quantity)
      })),
      pricing: {
        subtotal: order.subtotal,
        discount: order.discount || 0,
        couponCode: order.couponCode || null,
        deliveryCharge: order.deliveryCharge || 0,
        totalAmount: order.totalAmount
      }
    };

    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  }
});

module.exports = router;
