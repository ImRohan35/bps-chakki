const nodemailer = require('nodemailer');
const db = require('../config/db');

// Environment configurations
function getBaseFrontendUrl() {
  const url = process.env.FRONTEND_URL || process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL;
  if (url && url.trim()) {
    return url.trim().replace(/\/$/, '');
  }
  return 'http://localhost:5173';
}

const BRAND_NAME = 'BPS';
const EMAIL_SENDER_NAME = 'BPS Team';

// ─────────────────────────────────────────────────────────────
// 1. HELPERS
// ─────────────────────────────────────────────────────────────

function getTrackingUrl(orderId) {
  const cleanId = encodeURIComponent(orderId || '');
  return `${getBaseFrontendUrl()}/tracking?id=${cleanId}`;
}

function formatDeliveryDate(dateInput) {
  if (!dateInput) {
    const est = new Date();
    est.setDate(est.getDate() + 1);
    return est.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
  if (typeof dateInput === 'string' && isNaN(Date.parse(dateInput))) {
    return dateInput;
  }
  return new Date(dateInput).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let digits = phone.toString().replace(/\D/g, '');
  // Standardize Indian phone number to 91XXXXXXXXXX
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // already 91...
  }
  return digits;
}

// ─────────────────────────────────────────────────────────────
// 2. WHATSAPP NOTIFICATION SERVICE (WhatsApp Cloud API)
// ─────────────────────────────────────────────────────────────

async function sendWhatsAppMessage(recipientPhone, messageText) {
  const phone = cleanPhoneNumber(recipientPhone);
  if (!phone) {
    return {
      success: false,
      status: 'failed',
      error: 'Invalid recipient phone number'
    };
  }

  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';

  if (!phoneId || !token) {
    console.log(`[BPS WhatsApp] Credentials not configured in .env. Message queued for ${phone}:`);
    console.log(messageText);
    return {
      success: false,
      status: 'not_configured',
      recipient: phone,
      timestamp: new Date().toISOString(),
      note: 'WhatsApp API credentials (WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN) not configured in .env'
    };
  }

  try {
    const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: {
        preview_url: true,
        body: messageText
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[BPS WhatsApp] Send failed:', data);
      return {
        success: false,
        status: 'failed',
        error: data.error?.message || 'WhatsApp Cloud API request failed',
        details: data
      };
    }

    console.log(`[BPS WhatsApp] Message successfully sent to ${phone}`);
    return {
      success: true,
      status: 'sent',
      messageId: data.messages?.[0]?.id,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('[BPS WhatsApp] Network error:', err.message);
    return {
      success: false,
      status: 'failed',
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 3. EMAIL NOTIFICATION SERVICE (Nodemailer SMTP)
// ─────────────────────────────────────────────────────────────

function createEmailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });
}

async function sendEmailNotification({ to, subject, htmlText, plainText }) {
  if (!to || !to.includes('@')) {
    return {
      success: false,
      status: 'failed',
      error: 'Invalid recipient email address'
    };
  }

  const transporter = createEmailTransporter();
  const fromAddress = process.env.EMAIL_FROM || `"${EMAIL_SENDER_NAME}" <orders@bpsfreshmills.com>`;

  if (!transporter) {
    console.log(`[BPS Email] SMTP credentials not configured in .env. Email prepared for ${to}:`);
    console.log(`Subject: ${subject}`);
    return {
      success: false,
      status: 'not_configured',
      recipient: to,
      subject,
      timestamp: new Date().toISOString(),
      note: 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) not configured in .env'
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: plainText || subject,
      html: htmlText
    });

    console.log(`[BPS Email] Email successfully sent to ${to}: ${info.messageId}`);
    return {
      success: true,
      status: 'sent',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('[BPS Email] Send failed:', err.message);
    return {
      success: false,
      status: 'failed',
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 4. HTML EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────

function generateOrderConfirmedHtml(order) {
  const trackingUrl = getTrackingUrl(order.orderId);
  const deliveryDateFormatted = formatDeliveryDate(order.expectedDeliveryDate);
  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #1F2937; font-weight: 600;">
        ${item.name}
        <div style="font-size: 12px; color: #6B7280; font-weight: normal;">${item.weight || ''}</div>
      </td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #4B5563; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #1F2937; font-weight: 600; text-align: right;">
        ₹${item.price}
      </td>
      <td style="padding: 12px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #1F2937; font-weight: 700; text-align: right;">
        ₹${item.subtotal || item.price * item.quantity}
      </td>
    </tr>
  `).join('');

  const shipping = order.shippingAddress || {};
  const addressLine = [
    shipping.houseFlat,
    shipping.streetArea,
    shipping.landmark,
    shipping.city,
    shipping.pincode
  ].filter(Boolean).join(', ');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BPS – Order Confirmed – #${order.orderId}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAF9; padding: 25px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 15px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #173D32 0%, #2E8B57 100%); padding: 30px 24px; text-align: center; color: #FFFFFF;">
              <h1 style="margin: 0 0 6px 0; font-size: 28px; font-weight: 800; letter-spacing: 1px; color: #FFFFFF;">
                🌾 ${BRAND_NAME}
              </h1>
              <p style="margin: 0; font-size: 14px; color: #E8F5EC; opacity: 0.9;">Freshly Milled. Naturally Good.</p>
            </td>
          </tr>

          <!-- Confirmation Title -->
          <tr>
            <td style="padding: 30px 24px 15px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #E8F5EC; color: #2E8B57; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; font-size: 24px; margin-bottom: 12px;">✓</div>
              <h2 style="margin: 0 0 8px 0; font-size: 22px; color: #173D32; font-weight: 800;">Order Confirmed!</h2>
              <p style="margin: 0; color: #4B5563; font-size: 15px;">
                Hi <strong>${order.customerName || 'Customer'}</strong>, thank you for shopping with <strong>${BRAND_NAME}</strong>! Your order has been confirmed and is now being processed.
              </p>
            </td>
          </tr>

          <!-- Order Summary Card -->
          <tr>
            <td style="padding: 10px 24px 20px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; padding: 16px;">
                <tr>
                  <td style="font-size: 13px; color: #6B7280; padding: 4px 8px;">Order ID:</td>
                  <td style="font-size: 14px; font-weight: 800; color: #173D32; text-align: right; padding: 4px 8px;">#${order.orderId}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #6B7280; padding: 4px 8px;">Current Status:</td>
                  <td style="font-size: 13px; font-weight: 700; color: #2E8B57; text-align: right; padding: 4px 8px;">${order.orderStatus || 'Confirmed'}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #6B7280; padding: 4px 8px;">Payment Status:</td>
                  <td style="font-size: 13px; font-weight: 700; color: #1F2937; text-align: right; padding: 4px 8px;">${order.paymentStatus || 'COD Pending'}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #6B7280; padding: 4px 8px;">Expected Delivery:</td>
                  <td style="font-size: 14px; font-weight: 700; color: #B45309; text-align: right; padding: 4px 8px;">📅 ${deliveryDateFormatted}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 10px 24px 15px 24px;">
              <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #173D32; font-weight: 700;">Items in Your Order</h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #F3F4F6; border-bottom: 2px solid #E5E7EB;">
                    <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #6B7280; text-align: left;">Product</th>
                    <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #6B7280; text-align: center;">Qty</th>
                    <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #6B7280; text-align: right;">Price</th>
                    <th style="padding: 10px 8px; font-size: 12px; text-transform: uppercase; color: #6B7280; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Financial Totals -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 15px;">
                <tr>
                  <td style="padding: 4px 8px; font-size: 13px; color: #6B7280; text-align: right;">Subtotal:</td>
                  <td style="padding: 4px 8px; font-size: 13px; color: #1F2937; font-weight: 600; text-align: right; width: 100px;">₹${order.subtotal || order.totalAmount}</td>
                </tr>
                ${order.discount ? `
                <tr>
                  <td style="padding: 4px 8px; font-size: 13px; color: #2E8B57; text-align: right;">Discount (${order.couponCode || 'PROMO'}):</td>
                  <td style="padding: 4px 8px; font-size: 13px; color: #2E8B57; font-weight: 600; text-align: right;">-₹${order.discount}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 4px 8px; font-size: 13px; color: #6B7280; text-align: right;">Delivery Charge:</td>
                  <td style="padding: 4px 8px; font-size: 13px; color: #1F2937; font-weight: 600; text-align: right;">${order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 8px 4px 8px; font-size: 16px; font-weight: 800; color: #173D32; text-align: right; border-top: 1px dashed #E5E7EB;">Total Amount:</td>
                  <td style="padding: 10px 8px 4px 8px; font-size: 18px; font-weight: 800; color: #2E8B57; text-align: right; border-top: 1px dashed #E5E7EB;">₹${order.totalAmount}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Address -->
          <tr>
            <td style="padding: 10px 24px 20px 24px;">
              <div style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; padding: 14px 16px;">
                <h4 style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; color: #6B7280; letter-spacing: 0.5px;">Delivery Address</h4>
                <div style="font-size: 14px; color: #1F2937; font-weight: 600;">${shipping.name || order.customerName}</div>
                <div style="font-size: 13px; color: #4B5563; line-height: 1.4; margin-top: 2px;">${addressLine}</div>
                <div style="font-size: 13px; color: #4B5563; margin-top: 4px;">Phone: ${shipping.mobile || order.customerPhone}</div>
              </div>
            </td>
          </tr>

          <!-- Track Your Order Call to Action -->
          <tr>
            <td style="padding: 15px 24px 30px 24px; text-align: center;">
              <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2E8B57; color: #FFFFFF; font-size: 16px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(46, 139, 87, 0.3);">
                👉 Track Your Order
              </a>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #9CA3AF;">
                Or copy and paste this tracking link into your browser:<br>
                <a href="${trackingUrl}" style="color: #2E8B57; word-break: break-all;">${trackingUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #173D32; color: #A7F3D0; padding: 20px 24px; text-align: center; font-size: 12px; line-height: 1.6;">
              <strong style="color: #FFFFFF; font-size: 14px;">${BRAND_NAME} Fresh Mills</strong><br>
              Pure stone chakki atta & unadulterated kitchen essentials.<br>
              Need help? Contact support on WhatsApp or Email.<br>
              Thank you for shopping with ${BRAND_NAME}! ❤️
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function generateStatusUpdateHtml(order, newStatus, messageText) {
  const trackingUrl = getTrackingUrl(order.orderId);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BPS – Order Update: ${newStatus} – #${order.orderId}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAF9; padding: 25px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 15px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #173D32 0%, #2E8B57 100%); padding: 25px 24px; text-align: center; color: #FFFFFF;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px; color: #FFFFFF;">
                🌾 ${BRAND_NAME}
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #E8F5EC;">Order Status Update</p>
            </td>
          </tr>

          <!-- Status Message -->
          <tr>
            <td style="padding: 30px 24px 20px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #E8F5EC; color: #2E8B57; padding: 6px 16px; border-radius: 999px; font-weight: 800; font-size: 14px; margin-bottom: 12px;">
                Status: ${newStatus}
              </div>
              <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #173D32; font-weight: 800;">
                Order #${order.orderId}
              </h2>
              <div style="font-size: 16px; color: #374151; line-height: 1.6; margin: 15px 0; white-space: pre-line; background-color: #F9FAFB; padding: 18px; border-radius: 8px; border-left: 4px solid #2E8B57; text-align: left;">
                ${messageText.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>

          <!-- Track Button -->
          <tr>
            <td style="padding: 10px 24px 30px 24px; text-align: center;">
              <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2E8B57; color: #FFFFFF; font-size: 16px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(46, 139, 87, 0.3);">
                👉 Track Your Order
              </a>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #9CA3AF;">
                <a href="${trackingUrl}" style="color: #2E8B57;">${trackingUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #173D32; color: #A7F3D0; padding: 16px 24px; text-align: center; font-size: 12px;">
              Thank you for shopping with ${BRAND_NAME}! ❤️
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────────
// 5. PUBLIC NOTIFICATION DISPATCH METHODS
// ─────────────────────────────────────────────────────────────

/**
 * Sends WhatsApp and Email confirmation messages for newly placed orders.
 */
async function sendOrderConfirmationNotifications(order) {
  if (!order) return null;

  const trackingUrl = getTrackingUrl(order.orderId);
  const deliveryDateFormatted = formatDeliveryDate(order.expectedDeliveryDate);
  const itemsText = (order.items || []).map(i => `${i.name} (${i.quantity}x)`).join(', ');

  // Requirement 3: EXACT WhatsApp message format
  const whatsappBody = `🎉 Order Confirmed!
Hi ${order.customerName || 'Customer'} 👋
Thank you for your order with ${BRAND_NAME}!
🛍️ Order ID: #${order.orderId}
📦 Items: ${itemsText}
💰 Total: ₹${order.totalAmount}
💳 Payment: ${order.paymentStatus || 'COD Pending'}
📅 Expected Delivery: ${deliveryDateFormatted}
Your order has been confirmed and is now being processed.
👉 Track Your Order: ${trackingUrl}
We'll keep you updated about your order status.
Thank you for shopping with ${BRAND_NAME}! ❤️`;

  const customerPhone = order.customerPhone || order.shippingAddress?.mobile;
  const customerEmail = order.customerEmail || order.shippingAddress?.email;

  const results = {
    whatsapp: null,
    email: null
  };

  // 1. WhatsApp Confirmation
  if (customerPhone) {
    try {
      results.whatsapp = await sendWhatsAppMessage(customerPhone, whatsappBody);
    } catch (e) {
      results.whatsapp = { success: false, status: 'failed', error: e.message };
    }
  } else {
    results.whatsapp = { success: false, status: 'failed', error: 'No phone number provided' };
  }

  // 2. Email Confirmation
  if (customerEmail) {
    try {
      const emailHtml = generateOrderConfirmedHtml(order);
      results.email = await sendEmailNotification({
        to: customerEmail,
        subject: `${BRAND_NAME} – Order Confirmed – #${order.orderId}`,
        htmlText: emailHtml,
        plainText: whatsappBody
      });
    } catch (e) {
      results.email = { success: false, status: 'failed', error: e.message };
    }
  } else {
    results.email = { success: false, status: 'failed', error: 'No email address provided' };
  }

  // 3. Persist notification records in order
  try {
    const existingNotifications = order.notifications || { whatsapp: {}, email: {} };
    const updatedNotifications = {
      whatsapp: {
        lastStatus: results.whatsapp?.status || 'not_configured',
        lastSentAt: new Date().toISOString(),
        error: results.whatsapp?.error || null,
        history: [
          ...(existingNotifications.whatsapp?.history || []),
          { type: 'ORDER_CONFIRMATION', ...results.whatsapp, timestamp: new Date().toISOString() }
        ]
      },
      email: {
        lastStatus: results.email?.status || 'not_configured',
        lastSentAt: new Date().toISOString(),
        error: results.email?.error || null,
        history: [
          ...(existingNotifications.email?.history || []),
          { type: 'ORDER_CONFIRMATION', ...results.email, timestamp: new Date().toISOString() }
        ]
      }
    };

    db.Orders.updateById(order._id, {
      notifications: updatedNotifications
    });
  } catch (err) {
    console.error('Failed to update order notification status:', err);
  }

  return results;
}

/**
 * Sends automatic WhatsApp and Email status updates when admin changes order status.
 * Supported stages: Processing, Shipped, Out for Delivery, Delivered
 */
async function sendOrderStatusUpdateNotifications(order, newStatus) {
  if (!order || !newStatus) return null;

  const trackingUrl = getTrackingUrl(order.orderId);
  const customerName = order.customerName || 'Customer';
  let messageBody = '';

  // Requirement 7: EXACT status update formats
  if (newStatus === 'Processing' || newStatus === 'Preparing') {
    messageBody = `Hi ${customerName}, your ${BRAND_NAME} order #${order.orderId} is now being processed. We'll notify you when it is shipped.
👉 Track Your Order:
${trackingUrl}`;
  } else if (newStatus === 'Shipped' || newStatus === 'Ready for Delivery') {
    messageBody = `🚚 Your ${BRAND_NAME} order #${order.orderId} has been shipped!
Track Your Order:
${trackingUrl}`;
  } else if (newStatus === 'Out for Delivery') {
    messageBody = `🚚 Your ${BRAND_NAME} order #${order.orderId} is out for delivery today.
Track Your Order:
${trackingUrl}`;
  } else if (newStatus === 'Delivered') {
    messageBody = `🎉 Your ${BRAND_NAME} order #${order.orderId} has been delivered successfully.
Thank you for shopping with ${BRAND_NAME}! ❤️`;
  } else if (newStatus === 'Confirmed') {
    messageBody = `Hi ${customerName}, your ${BRAND_NAME} order #${order.orderId} has been confirmed.
Track Your Order:
${trackingUrl}`;
  } else {
    messageBody = `Hi ${customerName}, your ${BRAND_NAME} order #${order.orderId} status has been updated to: ${newStatus}.
Track Your Order:
${trackingUrl}`;
  }

  const customerPhone = order.customerPhone || order.shippingAddress?.mobile;
  const customerEmail = order.customerEmail || order.shippingAddress?.email;

  const results = {
    whatsapp: null,
    email: null
  };

  if (customerPhone) {
    try {
      results.whatsapp = await sendWhatsAppMessage(customerPhone, messageBody);
    } catch (e) {
      results.whatsapp = { success: false, status: 'failed', error: e.message };
    }
  }

  if (customerEmail) {
    try {
      const emailHtml = generateStatusUpdateHtml(order, newStatus, messageBody);
      results.email = await sendEmailNotification({
        to: customerEmail,
        subject: `${BRAND_NAME} – Order Update: ${newStatus} – #${order.orderId}`,
        htmlText: emailHtml,
        plainText: messageBody
      });
    } catch (e) {
      results.email = { success: false, status: 'failed', error: e.message };
    }
  }

  // Update order notification records
  try {
    const existing = db.Orders.findById(order._id);
    const existingNotifications = (existing && existing.notifications) || { whatsapp: {}, email: {} };
    const updatedNotifications = {
      whatsapp: {
        lastStatus: results.whatsapp?.status || existingNotifications.whatsapp?.lastStatus || 'not_configured',
        lastSentAt: new Date().toISOString(),
        error: results.whatsapp?.error || null,
        history: [
          ...(existingNotifications.whatsapp?.history || []),
          { type: `STATUS_${newStatus.toUpperCase()}`, ...results.whatsapp, timestamp: new Date().toISOString() }
        ]
      },
      email: {
        lastStatus: results.email?.status || existingNotifications.email?.lastStatus || 'not_configured',
        lastSentAt: new Date().toISOString(),
        error: results.email?.error || null,
        history: [
          ...(existingNotifications.email?.history || []),
          { type: `STATUS_${newStatus.toUpperCase()}`, ...results.email, timestamp: new Date().toISOString() }
        ]
      }
    };

    db.Orders.updateById(order._id, {
      notifications: updatedNotifications
    });
  } catch (err) {
    console.error('Failed to update status notification record in order:', err);
  }

  return results;
}

module.exports = {
  getTrackingUrl,
  formatDeliveryDate,
  sendWhatsAppMessage,
  sendEmailNotification,
  sendOrderConfirmationNotifications,
  sendOrderStatusUpdateNotifications
};
