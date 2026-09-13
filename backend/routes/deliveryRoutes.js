const express = require('express');
const db = require('../config/db');
const { authenticate, deliveryOrAdminOnly } = require('../middleware/auth');
const { sendOrderStatusUpdateNotifications, sendAdminOrderDeliveredEmail } = require('../services/notificationService');

const router = express.Router();

// Apply auth to all delivery routes
router.use(authenticate, deliveryOrAdminOnly);

// 1. GET ORDERS ASSIGNED TO CURRENT DELIVERY AGENT
router.get('/my-deliveries', (req, res) => {
  try {
    const user = req.user;
    let orders = [];

    if (user.role === 'admin') {
      orders = db.Orders.find(o => o.assignedDeliveryBoy !== null);
    } else {
      orders = db.Orders.find(o => {
        return (
          o.assignedDeliveryBoy &&
          (o.assignedDeliveryBoy.agentId === user._id || o.assignedDeliveryBoy.phone === user.mobile)
        );
      });
    }

    orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Calculate pending COD cash to collect
    let pendingCodTotal = 0;
    let collectedCodTotal = 0;

    orders.forEach(o => {
      if (o.paymentMethod === 'Cash on Delivery') {
        if (o.paymentStatus === 'COD Collected' || o.orderStatus === 'Delivered') {
          collectedCodTotal += o.totalAmount;
        } else if (o.orderStatus !== 'Cancelled') {
          pendingCodTotal += o.totalAmount;
        }
      }
    });

    res.json({
      success: true,
      orders,
      summary: {
        totalAssigned: orders.length,
        pendingCodTotal,
        collectedCodTotal
      }
    });
  } catch (err) {
    console.error('Error fetching deliveries:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery orders' });
  }
});

// 2. COMPLETE DELIVERY WITH OTP & CASH COLLECTION
router.post('/complete-delivery/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const { otp, cashCollected } = req.body;
    const user = req.user;

    const order = db.Orders.findOne(o => o._id === orderId || o.orderId === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({ success: false, message: 'Order is already marked delivered.' });
    }

    // OTP verification check
    if (!otp || (order.deliveryOtp && order.deliveryOtp.trim() !== otp.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid delivery OTP provided by customer. Please verify.'
      });
    }

    const timeline = order.statusTimeline || [];
    timeline.push({
      status: 'Delivered',
      timestamp: new Date().toISOString(),
      note: `Delivered by ${user.name}. OTP verified: ${otp}. Cash collected: ₹${order.totalAmount}`
    });

    const updatedOrder = db.Orders.updateById(order._id, {
      orderStatus: 'Delivered',
      paymentStatus: 'COD Collected',
      deliveredAt: new Date().toISOString(),
      deliveredBy: {
        agentId: user._id,
        name: user.name,
        phone: user.mobile
      },
      otpVerified: true,
      otpVerifiedAt: new Date().toISOString(),
      statusTimeline: timeline
    });

    // Update delivery agent statistics
    const agent = db.DeliveryAgents.findOne(a => a.userId === user._id || a.mobile === user.mobile);
    if (agent) {
      const newCollected = (agent.totalCashCollected || 0) + order.totalAmount;
      const cashDiff = newCollected - (agent.totalCashDeposited || 0);
      db.DeliveryAgents.updateById(agent._id, {
        totalCashCollected: newCollected,
        cashDifference: cashDiff
      });
    }

    // Trigger customer notification for delivery completion (WhatsApp + Email)
    sendOrderStatusUpdateNotifications(updatedOrder, 'Delivered').catch(err => {
      console.error('[BPS Notification] Delivered notification failed:', err);
    });

    // Trigger admin notification for delivery completion
    sendAdminOrderDeliveredEmail(updatedOrder, user.name).catch(err => {
      console.error('[BPS Notification] Admin delivered notification failed:', err);
    });

    res.json({
      success: true,
      message: `Order #${order.orderId} delivered and COD cash of ₹${order.totalAmount} collected!`,
      order: updatedOrder
    });
  } catch (err) {
    console.error('Error completing delivery:', err);
    res.status(500).json({ success: false, message: 'Failed to complete delivery' });
  }
});

// 3. MARK ORDER OUT FOR DELIVERY
router.post('/out-for-delivery/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const order = db.Orders.findOne(o => o._id === orderId || o.orderId === orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const timeline = order.statusTimeline || [];
    timeline.push({
      status: 'Out for Delivery',
      timestamp: new Date().toISOString(),
      note: 'Delivery executive is on the way to your address'
    });

    const updated = db.Orders.updateById(order._id, {
      orderStatus: 'Out for Delivery',
      statusTimeline: timeline
    });

    // Trigger customer notification for Out for Delivery
    sendOrderStatusUpdateNotifications(updated, 'Out for Delivery').catch(err => {
      console.error('[BPS Notification] Out for Delivery notification failed:', err);
    });

    res.json({ success: true, message: 'Order status updated to Out for Delivery', order: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

module.exports = router;
