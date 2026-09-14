const EventEmitter = require('events');
const db = require('../config/db');
const { broadcastNotification } = require('./notificationStream');
const {
  sendCustomerOrderReceivedNotifications,
  sendAdminNewOrderEmail,
  sendOrderStatusUpdateNotifications,
  sendAdminOrderDeliveredEmail,
  createInAppNotification
} = require('./notificationService');

class AutomationEventBus extends EventEmitter {
  constructor() {
    super();
    this.initListeners();
  }

  initListeners() {
    // 1. ORDER_CREATED: Stock check, Low-stock alerts, Notifications, Real-time broadcast
    this.on('ORDER_CREATED', async (order) => {
      try {
        console.log(`[EventBus] 🚀 ORDER_CREATED: #${order.orderId}`);

        // Check inventory levels for all ordered items
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            const product = db.Products.findById(item.productId);
            if (product) {
              const threshold = Number(product.lowStockThreshold) || 5;
              if (product.stock <= 0) {
                this.emit('STOCK_OUT', { product, orderId: order.orderId });
              } else if (product.stock <= threshold) {
                this.emit('STOCK_LOW', { product, orderId: order.orderId, remaining: product.stock });
              }
            }
          }
        }

        // Create Admin In-App Notification
        createInAppNotification({
          recipientRole: 'admin',
          type: 'order',
          priority: order.totalAmount >= 2000 ? 'HIGH' : 'MEDIUM',
          title: `New Order Received #${order.orderId}`,
          message: `${order.customerName || 'Customer'} placed an order of ₹${order.totalAmount} (${order.paymentMethod || 'COD'}).`,
          orderId: order.orderId
        });

        // Broadcast to all SSE clients to refresh live stats
        broadcastNotification({ role: 'admin' }, {
          event: 'ORDER_CREATED',
          orderId: order.orderId,
          totalAmount: order.totalAmount,
          customerName: order.customerName
        });

        // Push to customer in-app stream
        if (order.customerId) {
          broadcastNotification({ role: 'customer', userId: order.customerId }, {
            event: 'ORDER_PLACED',
            orderId: order.orderId,
            message: `Your order #${order.orderId} is confirmed and preparing at the mill.`
          });
        }
      } catch (err) {
        console.error('[EventBus] Error in ORDER_CREATED listener:', err);
      }
    });

    // 2. STOCK_LOW: Auto warning card for Admin
    this.on('STOCK_LOW', ({ product, remaining }) => {
      try {
        console.log(`[EventBus] ⚠️ STOCK_LOW: ${product.name} (Remaining: ${remaining})`);
        createInAppNotification({
          recipientRole: 'admin',
          type: 'stock',
          priority: 'HIGH',
          title: `Low Stock Alert: ${product.name}`,
          message: `Only ${remaining} units remaining in stock. Please arrange grain procurement / stone milling.`,
          productId: product._id
        });

        broadcastNotification({ role: 'admin' }, {
          event: 'STOCK_LOW',
          productId: product._id,
          productName: product.name,
          remaining
        });
      } catch (err) {
        console.error('[EventBus] Error in STOCK_LOW listener:', err);
      }
    });

    // 3. STOCK_OUT: Auto out-of-stock critical alert
    this.on('STOCK_OUT', ({ product }) => {
      try {
        console.log(`[EventBus] 🚨 STOCK_OUT: ${product.name}`);
        // Ensure product availability flag is updated
        db.Products.updateById(product._id, { isAvailable: false, stock: 0 });

        createInAppNotification({
          recipientRole: 'admin',
          type: 'stock',
          priority: 'CRITICAL',
          title: `Out of Stock: ${product.name}`,
          message: `${product.name} is now completely sold out. Add-to-cart has been automatically disabled.`,
          productId: product._id
        });

        broadcastNotification({ role: 'admin' }, {
          event: 'STOCK_OUT',
          productId: product._id,
          productName: product.name
        });
      } catch (err) {
        console.error('[EventBus] Error in STOCK_OUT listener:', err);
      }
    });

    // 4. DELIVERY_ASSIGNED: Auto notify delivery boy in real time
    this.on('DELIVERY_ASSIGNED', ({ order, deliveryBoy }) => {
      try {
        console.log(`[EventBus] 🛵 DELIVERY_ASSIGNED: Order #${order.orderId} assigned to ${deliveryBoy.name}`);
        createInAppNotification({
          recipientRole: 'delivery',
          recipientId: deliveryBoy.agentId || deliveryBoy.userId,
          type: 'delivery',
          priority: 'HIGH',
          title: `New Delivery Assigned #${order.orderId}`,
          message: `Deliver to ${order.shippingAddress?.houseFlat || ''}, ${order.shippingAddress?.city || ''}. COD amount: ₹${order.totalAmount}`,
          orderId: order.orderId
        });

        // Broadcast directly to delivery boy's phone
        broadcastNotification({ role: 'delivery', userId: deliveryBoy.agentId || deliveryBoy.userId }, {
          event: 'DELIVERY_ASSIGNED',
          orderId: order.orderId,
          customerName: order.customerName,
          totalAmount: order.totalAmount
        });
      } catch (err) {
        console.error('[EventBus] Error in DELIVERY_ASSIGNED listener:', err);
      }
    });

    // 5. DELIVERY_STARTED: Out for delivery transition
    this.on('DELIVERY_STARTED', ({ order, deliveryBoy }) => {
      try {
        console.log(`[EventBus] 🛣️ DELIVERY_STARTED: Order #${order.orderId} out for delivery`);
        if (order.customerId) {
          createInAppNotification({
            recipientRole: 'customer',
            recipientId: order.customerId,
            type: 'delivery',
            priority: 'HIGH',
            title: 'Your Order is Out for Delivery! 🛵',
            message: `${deliveryBoy?.name || 'Our delivery partner'} is on the way with your freshly milled flour.`,
            orderId: order.orderId
          });

          broadcastNotification({ role: 'customer', userId: order.customerId }, {
            event: 'OUT_FOR_DELIVERY',
            orderId: order.orderId,
            deliveryBoyName: deliveryBoy?.name
          });
        }
      } catch (err) {
        console.error('[EventBus] Error in DELIVERY_STARTED listener:', err);
      }
    });

    // 6. DELIVERY_OTP_VERIFIED & COD_COLLECTED
    this.on('DELIVERY_OTP_VERIFIED', ({ order, deliveryAgent, amountCollected }) => {
      try {
        console.log(`[EventBus] ✅ DELIVERY_OTP_VERIFIED: Order #${order.orderId}, Cash: ₹${amountCollected}`);

        // Notify Admin of completed delivery and collected cash
        createInAppNotification({
          recipientRole: 'admin',
          type: 'delivery',
          priority: 'MEDIUM',
          title: `Order #${order.orderId} Delivered & Cash Collected`,
          message: `Delivered by ${deliveryAgent.name}. ₹${amountCollected} collected in cash. Awaiting evening counter deposit.`,
          orderId: order.orderId
        });

        // Broadcast to Admin to update dashboard revenue & COD ledger
        broadcastNotification({ role: 'admin' }, {
          event: 'ORDER_DELIVERED',
          orderId: order.orderId,
          amountCollected,
          agentName: deliveryAgent.name
        });

        // Notify Customer
        if (order.customerId) {
          createInAppNotification({
            recipientRole: 'customer',
            recipientId: order.customerId,
            type: 'order',
            priority: 'HIGH',
            title: 'Order Successfully Delivered! 🌾',
            message: `Your stone-ground fresh flour (Order #${order.orderId}) has been delivered. Thank you for choosing BPS Fresh Mills!`,
            orderId: order.orderId
          });

          broadcastNotification({ role: 'customer', userId: order.customerId }, {
            event: 'DELIVERED',
            orderId: order.orderId
          });
        }
      } catch (err) {
        console.error('[EventBus] Error in DELIVERY_OTP_VERIFIED listener:', err);
      }
    });

    // 7. ORDER_CANCELLED: Auto restore stock and update audit log
    this.on('ORDER_CANCELLED', ({ order, cancelledBy, reason }) => {
      try {
        console.log(`[EventBus] 🛑 ORDER_CANCELLED: Order #${order.orderId}. Restoring inventory...`);

        // Automatically restore inventory for each item
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            const product = db.Products.findById(item.productId);
            if (product) {
              const restoredStock = (product.stock || 0) + (Number(item.quantity) || 1);
              db.Products.updateById(product._id, {
                stock: restoredStock,
                isAvailable: restoredStock > 0
              });
              console.log(`[EventBus] Restored ${item.quantity} units to "${product.name}". New stock: ${restoredStock}`);
            }
          }
        }

        // Notify Admin of cancellation
        createInAppNotification({
          recipientRole: 'admin',
          type: 'order',
          priority: 'HIGH',
          title: `Order Cancelled: #${order.orderId}`,
          message: `Cancelled by ${cancelledBy || 'Customer'}. Reason: ${reason || 'N/A'}. Inventory was automatically restored.`,
          orderId: order.orderId
        });

        broadcastNotification({ role: 'admin' }, {
          event: 'ORDER_CANCELLED',
          orderId: order.orderId,
          reason
        });
      } catch (err) {
        console.error('[EventBus] Error in ORDER_CANCELLED listener:', err);
      }
    });

    // 8. SETTLEMENT_CONFIRMED: Mill counter deposit confirmed
    this.on('SETTLEMENT_CONFIRMED', ({ agent, amount, adminName, notes }) => {
      try {
        console.log(`[EventBus] 💵 SETTLEMENT_CONFIRMED: ₹${amount} deposited by ${agent.name}`);
        createInAppNotification({
          recipientRole: 'admin',
          type: 'delivery',
          priority: 'MEDIUM',
          title: `Cash Deposit Confirmed: ₹${amount}`,
          message: `${agent.name} deposited ₹${amount}. Confirmed by ${adminName || 'Admin'}. Remaining difference: ₹${agent.cashDifference || 0}.`
        });

        broadcastNotification({ role: 'admin' }, {
          event: 'SETTLEMENT_UPDATED',
          agentId: agent._id,
          amountDeposited: amount
        });
      } catch (err) {
        console.error('[EventBus] Error in SETTLEMENT_CONFIRMED listener:', err);
      }
    });

    // 9. OTP_FAILED: Log suspicious repeated OTP attempts
    this.on('OTP_FAILED', ({ order, agentName, failedAttempts }) => {
      try {
        console.log(`[EventBus] ⚠️ OTP_FAILED: Order #${order.orderId}, Attempt #${failedAttempts}`);
        if (failedAttempts >= 3) {
          createInAppNotification({
            recipientRole: 'admin',
            type: 'delivery',
            priority: 'CRITICAL',
            title: `Repeated OTP Failures on Order #${order.orderId}`,
            message: `${failedAttempts} incorrect OTP attempts entered by delivery agent ${agentName}. Please verify with customer directly.`,
            orderId: order.orderId
          });

          broadcastNotification({ role: 'admin' }, {
            event: 'OTP_FAILED_ALERT',
            orderId: order.orderId,
            failedAttempts
          });
        }
      } catch (err) {
        console.error('[EventBus] Error in OTP_FAILED listener:', err);
      }
    });

    // 10. DELIVERY_ARRIVED: Customer notification that partner has arrived at their location
    this.on('DELIVERY_ARRIVED', ({ order, deliveryBoy }) => {
      try {
        console.log(`[EventBus] 📍 DELIVERY_ARRIVED: Order #${order.orderId}`);
        if (order.customerId) {
          createInAppNotification({
            recipientRole: 'customer',
            recipientId: order.customerId,
            type: 'delivery',
            priority: 'HIGH',
            title: 'Your Delivery Partner Has Arrived! 🌾',
            message: `${deliveryBoy?.name || 'Our delivery partner'} has arrived at your address with your fresh flour. Please keep OTP ready.`,
            orderId: order.orderId
          });

          broadcastNotification({ role: 'customer', userId: order.customerId }, {
            event: 'DELIVERY_ARRIVED',
            orderId: order.orderId,
            deliveryBoyName: deliveryBoy?.name
          });
        }
      } catch (err) {
        console.error('[EventBus] Error in DELIVERY_ARRIVED listener:', err);
      }
    });

    // 11. DELIVERY_FAILED: Log failed attempt, notify admin
    this.on('DELIVERY_FAILED', ({ order, deliveryBoy, reason, note, attemptNumber }) => {
      try {
        console.log(`[EventBus] ⚠️ DELIVERY_FAILED: Order #${order.orderId}, Attempt #${attemptNumber}, Reason: ${reason}`);
        createInAppNotification({
          recipientRole: 'admin',
          type: 'delivery',
          priority: 'HIGH',
          title: `Failed Delivery Attempt: Order #${order.orderId}`,
          message: `Attempt #${attemptNumber} failed by ${deliveryBoy?.name || 'Partner'}. Reason: ${reason}. ${note ? `Note: ${note}` : ''}`,
          orderId: order.orderId
        });

        broadcastNotification({ role: 'admin' }, {
          event: 'DELIVERY_FAILED',
          orderId: order.orderId,
          reason,
          attemptNumber
        });
      } catch (err) {
        console.error('[EventBus] Error in DELIVERY_FAILED listener:', err);
      }
    });

    // 12. COD_EXCEPTION: Collected amount differs from expected
    this.on('COD_EXCEPTION', ({ order, deliveryBoy, expectedAmount, collectedAmount, reason }) => {
      try {
        console.log(`[EventBus] 🚨 COD_EXCEPTION: Order #${order.orderId}, Expected: ₹${expectedAmount}, Collected: ₹${collectedAmount}`);
        createInAppNotification({
          recipientRole: 'admin',
          type: 'delivery',
          priority: 'CRITICAL',
          title: `COD Cash Mismatch: Order #${order.orderId}`,
          message: `Expected ₹${expectedAmount} but ${deliveryBoy?.name || 'Partner'} collected ₹${collectedAmount}. Reason: ${reason || 'Not specified'}`,
          orderId: order.orderId
        });

        broadcastNotification({ role: 'admin' }, {
          event: 'COD_EXCEPTION',
          orderId: order.orderId,
          expectedAmount,
          collectedAmount,
          reason
        });
      } catch (err) {
        console.error('[EventBus] Error in COD_EXCEPTION listener:', err);
      }
    });

    // 13. COD_SETTLEMENT_SUBMITTED: Delivery boy submitted daily cash
    this.on('COD_SETTLEMENT_SUBMITTED', ({ settlement, agent }) => {
      try {
        console.log(`[EventBus] 💼 COD_SETTLEMENT_SUBMITTED: ${agent.name}, Amount: ₹${settlement.depositedAmount}`);
        createInAppNotification({
          recipientRole: 'admin',
          type: 'delivery',
          priority: 'HIGH',
          title: `Cash Settlement Submitted: ${agent.name}`,
          message: `${agent.name} submitted cash deposit of ₹${settlement.depositedAmount} for ${settlement.ordersIncluded?.length || 0} orders. Requires admin verification.`,
          settlementId: settlement._id
        });

        broadcastNotification({ role: 'admin' }, {
          event: 'COD_SETTLEMENT_SUBMITTED',
          settlementId: settlement._id,
          agentName: agent.name,
          depositedAmount: settlement.depositedAmount
        });
      } catch (err) {
        console.error('[EventBus] Error in COD_SETTLEMENT_SUBMITTED listener:', err);
      }
    });

    // 14. RETURN_REQUESTED & STATUS UPDATES
    this.on('RETURN_REQUESTED', ({ returnRequest, order }) => {
      try {
        console.log(`[EventBus] 📦 RETURN_REQUESTED: Order #${returnRequest.orderId}, Reason: ${returnRequest.reason}`);
        createInAppNotification({
          recipientRole: 'admin',
          type: 'order',
          priority: 'HIGH',
          title: `New Issue Reported: Order #${returnRequest.orderId}`,
          message: `Customer ${returnRequest.customerName} reported: "${returnRequest.reason}". Details: ${returnRequest.description?.slice(0, 80)}`,
          orderId: returnRequest.orderId
        });

        broadcastNotification({ role: 'admin' }, {
          event: 'RETURN_REQUESTED',
          returnId: returnRequest._id,
          orderId: returnRequest.orderId,
          reason: returnRequest.reason
        });
      } catch (err) {
        console.error('[EventBus] Error in RETURN_REQUESTED listener:', err);
      }
    });

    this.on('RETURN_STATUS_CHANGED', ({ returnRequest, status, resolutionNote }) => {
      try {
        if (returnRequest.customerId) {
          createInAppNotification({
            recipientRole: 'customer',
            recipientId: returnRequest.customerId,
            type: 'order',
            priority: 'HIGH',
            title: `Issue Report Update: ${status}`,
            message: `Your report for Order #${returnRequest.orderId} is now ${status}. ${resolutionNote ? `Note: ${resolutionNote}` : ''}`,
            orderId: returnRequest.orderId
          });

          broadcastNotification({ role: 'customer', userId: returnRequest.customerId }, {
            event: 'RETURN_STATUS_CHANGED',
            returnId: returnRequest._id,
            status
          });
        }
      } catch (err) {
        console.error('[EventBus] Error in RETURN_STATUS_CHANGED listener:', err);
      }
    });

    // 15. TICKET_CREATED & TICKET_REPLIED
    this.on('TICKET_CREATED', ({ ticket }) => {
      try {
        createInAppNotification({
          recipientRole: 'admin',
          type: 'support',
          priority: ticket.priority || 'MEDIUM',
          title: `Support Ticket #${ticket.ticketId}: ${ticket.subject}`,
          message: `New ticket from ${ticket.customerName || 'Customer'} (${ticket.category}). Message: ${ticket.message?.slice(0, 80)}`
        });

        broadcastNotification({ role: 'admin' }, {
          event: 'TICKET_CREATED',
          ticketId: ticket.ticketId,
          subject: ticket.subject
        });
      } catch (err) {
        console.error('[EventBus] Error in TICKET_CREATED listener:', err);
      }
    });

    this.on('TICKET_REPLIED', ({ ticket, senderRole, senderName }) => {
      try {
        if (senderRole === 'admin' && ticket.customerId) {
          createInAppNotification({
            recipientRole: 'customer',
            recipientId: ticket.customerId,
            type: 'support',
            priority: 'HIGH',
            title: `Support Reply on Ticket #${ticket.ticketId}`,
            message: `${senderName || 'BPS Support'} replied to your ticket "${ticket.subject}".`
          });

          broadcastNotification({ role: 'customer', userId: ticket.customerId }, {
            event: 'TICKET_REPLIED',
            ticketId: ticket.ticketId
          });
        } else if (senderRole === 'customer') {
          createInAppNotification({
            recipientRole: 'admin',
            type: 'support',
            priority: 'MEDIUM',
            title: `Customer Reply on Ticket #${ticket.ticketId}`,
            message: `${ticket.customerName || 'Customer'} replied to ticket "${ticket.subject}".`
          });

          broadcastNotification({ role: 'admin' }, {
            event: 'TICKET_REPLIED',
            ticketId: ticket.ticketId
          });
        }
      } catch (err) {
        console.error('[EventBus] Error in TICKET_REPLIED listener:', err);
      }
    });

    // 16. LOYALTY_EARNED: Automatically ledger and credit points on successful order delivery
    this.on('LOYALTY_EARNED', ({ customerId, points, orderId, orderTotal }) => {
      try {
        if (!customerId || !points || points <= 0) return;
        const user = db.Users.findById(customerId);
        if (!user) return;

        const currentBalance = Number(user.loyaltyPoints) || 0;
        const newBalance = currentBalance + points;

        db.Users.updateById(user._id, { loyaltyPoints: newBalance });

        db.LoyaltyLedger.insertOne({
          customerId: user._id,
          type: 'EARNED',
          points,
          orderId,
          reason: `Earned on completed Order #${orderId} (₹${orderTotal})`,
          balanceAfter: newBalance,
          timestamp: new Date().toISOString()
        });

        createInAppNotification({
          recipientRole: 'customer',
          recipientId: user._id,
          type: 'loyalty',
          priority: 'LOW',
          title: `🌾 You Earned ${points} BPS Loyalty Points!`,
          message: `Thank you for your order! You now have ${newBalance} points in your BPS Fresh Mills account.`
        });
      } catch (err) {
        console.error('[EventBus] Error in LOYALTY_EARNED listener:', err);
      }
    });
  }
}

const eventBus = new AutomationEventBus();
module.exports = eventBus;
