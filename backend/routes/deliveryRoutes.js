const express = require('express');
const db = require('../config/db');
const { authenticate, deliveryOrAdminOnly } = require('../middleware/auth');
const { sendOrderStatusUpdateNotifications, sendAdminOrderDeliveredEmail } = require('../services/notificationService');
const eventBus = require('../services/eventBus');

const router = express.Router();

// Apply auth to all delivery routes (delivery or admin only)
router.use(authenticate, deliveryOrAdminOnly);

// Helper to check if order is assigned to this user
function isOrderAssignedToUser(order, user) {
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  if (!order.assignedDeliveryBoy) return false;
  return (
    order.assignedDeliveryBoy.agentId === user._id ||
    order.assignedDeliveryBoy.id === user._id ||
    order.assignedDeliveryBoy.phone === user.mobile ||
    order.assignedDeliveryBoy.mobile === user.mobile
  );
}

// 1. GET ORDERS ASSIGNED TO CURRENT DELIVERY AGENT
router.get('/my-deliveries', (req, res) => {
  try {
    const user = req.user;
    let orders = [];

    if (user.role === 'admin' || user.role === 'super_admin') {
      orders = db.Orders.find(o => o.assignedDeliveryBoy !== null);
    } else {
      orders = db.Orders.find(o => isOrderAssignedToUser(o, user));
    }

    orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Calculate real-time COD totals
    let pendingCodTotal = 0;
    let collectedCodTotal = 0;
    let exceptionCodTotal = 0;

    orders.forEach(o => {
      if (o.paymentMethod === 'Cash on Delivery') {
        if (o.paymentStatus === 'COD Collected' || o.orderStatus === 'Delivered') {
          collectedCodTotal += (Number(o.codCollected) || Number(o.totalAmount) || 0);
        } else if (o.paymentStatus === 'COD Exception') {
          exceptionCodTotal += (Number(o.codCollected) || 0);
        } else if (o.orderStatus !== 'Cancelled') {
          pendingCodTotal += Number(o.totalAmount) || 0;
        }
      }
    });

    res.json({
      success: true,
      orders,
      summary: {
        totalAssigned: orders.length,
        pendingCodTotal,
        collectedCodTotal,
        exceptionCodTotal
      }
    });
  } catch (err) {
    console.error('Error fetching deliveries:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch delivery orders' });
  }
});

// 2. GET SINGLE ASSIGNED ORDER DETAILS (Feature 43 - strictly rejects unauthorized access)
router.get('/orders/:id', (req, res) => {
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

    if (!isOrderAssignedToUser(order, user)) {
      return res.status(403).json({
        success: false,
        message: 'Security Alert: Access denied. This order is not assigned to your route.'
      });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
});

// 3. START DELIVERY (DELIVERY_ASSIGNED -> OUT_FOR_DELIVERY) (Feature 46)
router.post('/start-delivery/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const user = req.user;
    const order = db.Orders.findOne(o => o._id === orderId || o.orderId === orderId);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!isOrderAssignedToUser(order, user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized action on this order' });
    }

    if (order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled') {
      return res.status(400).json({ success: false, message: `Cannot start delivery for an order with status "${order.orderStatus}".` });
    }

    const timeline = order.statusTimeline || [];
    timeline.push({
      status: 'Out for Delivery',
      timestamp: new Date().toISOString(),
      note: `Delivery partner ${user.name} is on the way with your freshly ground flour.`
    });

    const updated = db.Orders.updateById(order._id, {
      orderStatus: 'Out for Delivery',
      dispatchedAt: new Date().toISOString(),
      statusTimeline: timeline
    });

    eventBus.emit('DELIVERY_STARTED', {
      order: updated,
      deliveryBoy: user
    });

    sendOrderStatusUpdateNotifications(updated, 'Out for Delivery').catch(err => {
      console.error('[BPS Notification] Out for Delivery notification error:', err);
    });

    res.json({ success: true, message: 'Order status updated to Out for Delivery', order: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to start delivery' });
  }
});

// Backward compatibility alias for out-for-delivery
router.post('/out-for-delivery/:orderId', (req, res) => {
  req.url = `/start-delivery/${req.params.orderId}`;
  router.handle(req, res);
});

// 4. MARK ARRIVED AT CUSTOMER LOCATION (Feature 47)
router.post('/arrived/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const user = req.user;
    const order = db.Orders.findOne(o => o._id === orderId || o.orderId === orderId);

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!isOrderAssignedToUser(order, user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized action on this order' });
    }

    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({ success: false, message: 'Order is already marked delivered.' });
    }

    const timeline = order.statusTimeline || [];
    timeline.push({
      status: 'Arrived',
      timestamp: new Date().toISOString(),
      note: `Delivery partner ${user.name} has arrived at your address.`
    });

    const updated = db.Orders.updateById(order._id, {
      orderStatus: 'Arrived',
      arrivedAt: new Date().toISOString(),
      statusTimeline: timeline
    });

    eventBus.emit('DELIVERY_ARRIVED', {
      order: updated,
      deliveryBoy: user
    });

    res.json({
      success: true,
      message: 'Status updated to Arrived. Customer has been alerted to provide OTP.',
      order: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update arrival status' });
  }
});

// 5. COMPLETE DELIVERY WITH OTP & COD AMOUNT VALIDATION (Features 48, 49, 52, 53)
router.post('/complete-delivery/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const { otp, amountCollected, collectedAmount, exceptionReason, deliveryNotes } = req.body;
    const user = req.user;

    const order = db.Orders.findOne(o => o._id === orderId || o.orderId === orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!isOrderAssignedToUser(order, user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized action on this order' });
    }

    if (order.orderStatus === 'Delivered') {
      return res.status(400).json({ success: false, message: 'Order is already marked delivered.' });
    }

    // Rate Limiting on OTP attempts (Max 5 attempts)
    const currentAttempts = Number(order.failedOtpAttempts) || 0;
    if (currentAttempts >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Security Lockout: Maximum 5 incorrect OTP attempts reached for this order. Contact store admin.'
      });
    }

    // OTP verification check
    if (!otp || (order.deliveryOtp && order.deliveryOtp.trim() !== otp.trim())) {
      const updatedAttempts = currentAttempts + 1;
      db.Orders.updateById(order._id, { failedOtpAttempts: updatedAttempts });
      eventBus.emit('OTP_FAILED', {
        order,
        agentName: user.name,
        failedAttempts: updatedAttempts
      });

      return res.status(400).json({
        success: false,
        message: `Invalid delivery OTP. Attempt ${updatedAttempts} of 5.`,
        remainingAttempts: Math.max(0, 5 - updatedAttempts)
      });
    }

    // COD Amount Validation (Feature 53)
    const expectedAmount = Number(order.totalAmount) || 0;
    const rawCollected = amountCollected !== undefined ? amountCollected : collectedAmount;
    const collected = rawCollected !== undefined ? Number(rawCollected) : expectedAmount;
    const hasMismatch = collected !== expectedAmount;

    if (hasMismatch && (!exceptionReason || !exceptionReason.trim())) {
      return res.status(400).json({
        success: false,
        message: `Cash mismatch detected (Expected: ₹${expectedAmount}, Collected: ₹${collected}). A valid exception reason is required.`
      });
    }

    const paymentStatus = hasMismatch ? 'COD Exception' : 'COD Collected';
    const timeline = order.statusTimeline || [];
    timeline.push({
      status: 'Delivered',
      timestamp: new Date().toISOString(),
      note: `Delivered by ${user.name}. OTP verified. Expected: ₹${expectedAmount}, Collected: ₹${collected}.${hasMismatch ? ` Exception: ${exceptionReason}` : ''}`
    });

    const deliveryAttempts = order.deliveryAttempts || [];
    deliveryAttempts.push({
      attemptNumber: deliveryAttempts.length + 1,
      timestamp: new Date().toISOString(),
      status: 'Delivered',
      agentName: user.name,
      note: 'OTP verified successfully at customer doorstep.'
    });

    const updatedOrder = db.Orders.updateById(order._id, {
      orderStatus: 'Delivered',
      paymentStatus,
      codExpected: expectedAmount,
      codCollected: collected,
      codDifference: expectedAmount - collected,
      codExceptionReason: hasMismatch ? exceptionReason.trim() : '',
      deliveredAt: new Date().toISOString(),
      deliveredBy: {
        agentId: user._id,
        name: user.name,
        phone: user.mobile
      },
      deliveryNotes: deliveryNotes || '',
      otpVerified: true,
      otpVerifiedAt: new Date().toISOString(),
      statusTimeline: timeline,
      deliveryAttempts
    });

    // Update delivery agent statistics
    const agent = db.DeliveryAgents.findOne(a => a.userId === user._id || a.mobile === user.mobile);
    if (agent) {
      const prevCollected = Number(agent.totalCashCollected) || 0;
      const newCollected = prevCollected + collected;
      const prevDeposited = Number(agent.totalCashDeposited) || 0;
      const cashDiff = newCollected - prevDeposited;

      db.DeliveryAgents.updateById(agent._id, {
        totalCashCollected: newCollected,
        cashDifference: cashDiff,
        totalDelivered: (Number(agent.totalDelivered) || 0) + 1
      });
    }

    // Trigger domain events
    eventBus.emit('DELIVERY_OTP_VERIFIED', {
      order: updatedOrder,
      deliveryAgent: user,
      amountCollected: collected
    });

    if (hasMismatch) {
      eventBus.emit('COD_EXCEPTION', {
        order: updatedOrder,
        deliveryBoy: user,
        expectedAmount,
        collectedAmount: collected,
        reason: exceptionReason
      });
    }

    // Automatically award loyalty points on delivery (e.g., ₹100 = 1 pt)
    const settings = db.Settings.find()[0] || {};
    const earningRate = Number(settings.loyaltyEarningRate) || 100;
    const earnedPoints = Math.floor((expectedAmount) / earningRate);
    if (earnedPoints > 0 && order.customerId) {
      eventBus.emit('LOYALTY_EARNED', {
        customerId: order.customerId,
        points: earnedPoints,
        orderId: order.orderId,
        orderTotal: expectedAmount
      });
    }

    sendOrderStatusUpdateNotifications(updatedOrder, 'Delivered').catch(err => {
      console.error('[BPS Notification] Delivered notification failed:', err);
    });

    sendAdminOrderDeliveredEmail(updatedOrder, user.name).catch(err => {
      console.error('[BPS Notification] Admin delivered notification failed:', err);
    });

    res.json({
      success: true,
      message: `Order #${order.orderId} delivered! COD collection: ₹${collected}`,
      order: updatedOrder
    });
  } catch (err) {
    console.error('Error completing delivery:', err);
    res.status(500).json({ success: false, message: 'Failed to complete delivery' });
  }
});

// 6. REPORT FAILED DELIVERY (Features 50 & 51)
router.post('/failed-delivery/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, note } = req.body;
    const user = req.user;

    const order = db.Orders.findOne(o => o._id === orderId || o.orderId === orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (!isOrderAssignedToUser(order, user)) {
      return res.status(403).json({ success: false, message: 'Unauthorized action on this order' });
    }

    const validReasons = [
      'Customer unavailable',
      'Phone unreachable',
      'Wrong address',
      'Customer refused',
      'Delivery area issue',
      'Other'
    ];

    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid failure reason.'
      });
    }

    if (reason === 'Other' && (!note || !note.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a note explaining the failure reason.'
      });
    }

    const deliveryAttempts = order.deliveryAttempts || [];
    const attemptNumber = deliveryAttempts.length + 1;

    deliveryAttempts.push({
      attemptNumber,
      timestamp: new Date().toISOString(),
      status: 'Failed',
      reason,
      note: note ? note.trim() : '',
      agentName: user.name,
      agentId: user._id
    });

    const timeline = order.statusTimeline || [];
    timeline.push({
      status: 'Delivery Attempt Failed',
      timestamp: new Date().toISOString(),
      note: `Attempt #${attemptNumber} failed: ${reason}. ${note ? `(${note.trim()})` : ''}`
    });

    const updated = db.Orders.updateById(order._id, {
      orderStatus: 'Delivery Attempt Failed',
      deliveryAttempts,
      statusTimeline: timeline
    });

    // Update agent failed delivery count
    const agent = db.DeliveryAgents.findOne(a => a.userId === user._id || a.mobile === user.mobile);
    if (agent) {
      db.DeliveryAgents.updateById(agent._id, {
        totalFailed: (Number(agent.totalFailed) || 0) + 1
      });
    }

    eventBus.emit('DELIVERY_FAILED', {
      order: updated,
      deliveryBoy: user,
      reason,
      note: note || '',
      attemptNumber
    });

    res.json({
      success: true,
      message: `Delivery attempt #${attemptNumber} logged as failed (${reason}).`,
      order: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record failed delivery attempt' });
  }
});

// 7. GET DELIVERY BOY COD LEDGER (Feature 54)
router.get('/cod-ledger', (req, res) => {
  try {
    const user = req.user;
    const orders = db.Orders.find(o => isOrderAssignedToUser(o, user));

    let totalAssignedCod = 0;
    let totalCollectedCod = 0;
    let totalExceptions = 0;

    orders.forEach(o => {
      const isCod = !o.paymentMethod || o.paymentMethod.toLowerCase().includes('cash') || o.paymentMethod.toLowerCase().includes('cod');
      if (isCod && o.orderStatus !== 'Cancelled') {
        totalAssignedCod += (Number(o.totalAmount) || 0);
        if (o.paymentStatus === 'COD Collected' || o.orderStatus === 'Delivered') {
          totalCollectedCod += (Number(o.codCollected) || Number(o.totalAmount) || 0);
        } else if (o.paymentStatus === 'COD Exception') {
          totalExceptions += (Number(o.codCollected) || 0);
        }
      }
    });

    const agent = db.DeliveryAgents.findOne(a => a.userId === user._id || a.mobile === user.mobile) || {};
    const totalDeposited = Number(agent.totalCashDeposited) || 0;
    const pendingToDeposit = Math.max(0, totalCollectedCod - totalDeposited);

    const pastSettlements = db.CashSettlements.find(s =>
      s.deliveryBoyId === user._id || s.agentId === user._id || s.mobile === user.mobile
    );
    pastSettlements.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({
      success: true,
      totalCollected: totalCollectedCod,
      totalAssigned: totalAssignedCod,
      pendingToDeposit,
      ledger: {
        totalAssignedCod,
        totalCollectedCod,
        totalDeposited,
        pendingToDeposit,
        totalExceptions,
        cashDifference: totalCollectedCod - totalDeposited
      },
      settlements: pastSettlements
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch COD ledger' });
  }
});

// 8. SUBMIT CASH SETTLEMENT (Feature 55 - Delivery Boy submits, requires Admin verification)
router.post('/submit-settlement', (req, res) => {
  try {
    const user = req.user;
    const { depositedAmount, amountSubmitted, orderIds, notes } = req.body;

    const rawDeposit = depositedAmount !== undefined ? depositedAmount : amountSubmitted;
    const depositNum = Number(rawDeposit);
    if (!depositNum || isNaN(depositNum) || depositNum <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid deposit amount.' });
    }

    const assignedOrders = db.Orders.find(o => isOrderAssignedToUser(o, user));
    const deliveredCodOrders = assignedOrders.filter(o =>
      o.orderStatus === 'Delivered' &&
      (o.paymentStatus === 'COD Collected' || o.paymentStatus === 'COD Exception')
    );

    const expectedTotal = deliveredCodOrders.reduce((sum, o) => sum + (Number(o.codCollected) || Number(o.totalAmount) || 0), 0);

    const agent = db.DeliveryAgents.findOne(a => a.userId === user._id || a.mobile === user.mobile);
    const prevDeposited = agent ? Number(agent.totalCashDeposited) || 0 : 0;
    const pendingBeforeDeposit = expectedTotal - prevDeposited;
    const difference = pendingBeforeDeposit - depositNum;

    const settlement = db.CashSettlements.insertOne({
      deliveryBoyId: user._id,
      agentId: agent?._id || user._id,
      deliveryBoyName: user.name,
      deliveryBoyPhone: user.mobile,
      expectedAmount: pendingBeforeDeposit,
      depositedAmount: depositNum,
      difference,
      ordersIncluded: Array.isArray(orderIds) && orderIds.length > 0 ? orderIds : deliveredCodOrders.map(o => o.orderId),
      status: 'SUBMITTED', // SUBMITTED -> Admin must verify
      submittedAt: new Date().toISOString(),
      verifiedAt: null,
      verifiedBy: null,
      notes: notes ? notes.trim() : ''
    });

    eventBus.emit('COD_SETTLEMENT_SUBMITTED', {
      settlement,
      agent: user
    });

    res.status(201).json({
      success: true,
      message: `Cash settlement of ₹${depositNum} submitted. Hand over physical cash to the store administrator for verification.`,
      settlement
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit settlement' });
  }
});

// 9. DELIVERY BOY AVAILABILITY STATUS (Feature 58: AVAILABLE, BUSY, OFFLINE)
router.get('/availability', (req, res) => {
  try {
    const user = req.user;
    const agent = db.DeliveryAgents.findOne(a => a.userId === user._id || a.mobile === user.mobile);
    res.json({
      success: true,
      availability: agent?.availabilityStatus || user.availabilityStatus || 'AVAILABLE'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch availability status' });
  }
});

router.put('/availability', (req, res) => {
  try {
    const user = req.user;
    const { status } = req.body;
    const validStatuses = ['AVAILABLE', 'BUSY', 'OFFLINE'];

    if (!status || !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be AVAILABLE, BUSY, or OFFLINE.'
      });
    }

    const cleanStatus = status.toUpperCase();

    // Update in Users collection
    db.Users.updateById(user._id, { availabilityStatus: cleanStatus });

    // Update in DeliveryAgents collection if exists
    const agent = db.DeliveryAgents.findOne(a => a.userId === user._id || a.mobile === user.mobile);
    if (agent) {
      db.DeliveryAgents.updateById(agent._id, { availabilityStatus: cleanStatus });
    }

    res.json({
      success: true,
      message: `Availability updated to ${cleanStatus}`,
      availability: cleanStatus
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update availability status' });
  }
});

module.exports = router;

