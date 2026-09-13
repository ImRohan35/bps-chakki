const nodemailer = require('nodemailer');
const db = require('../config/db');

// ─────────────────────────────────────────────────────────────
// 1. ENVIRONMENT & URL RESOLUTION
// ─────────────────────────────────────────────────────────────

function getBaseFrontendUrl() {
  const envUrl = process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL;
  if (envUrl && typeof envUrl === 'string') {
    const trimmed = envUrl.trim().replace(/\/$/, '');
    // Strictly prevent localhost or private IPs in production links
    if (
      trimmed &&
      !trimmed.includes('localhost') &&
      !trimmed.includes('127.0.0.1') &&
      !trimmed.includes('10.178.') &&
      !trimmed.includes('192.168.')
    ) {
      return trimmed;
    }
  }
  // Production default
  return 'https://bps-chakki.onrender.com';
}

const BRAND_NAME = 'BPS';
const EMAIL_SENDER_NAME = 'BPS Team';

// ─────────────────────────────────────────────────────────────
// 2. HELPERS & FORMATTERS
// ─────────────────────────────────────────────────────────────

function getTrackingUrl(orderId) {
  const cleanId = encodeURIComponent(orderId || '');
  return `${getBaseFrontendUrl()}/tracking?id=${cleanId}`;
}

function cleanPhoneNumber(phone) {
  if (!phone) return '';
  let digits = phone.toString().replace(/\D/g, '');
  // Standardize Indian phone numbers to 91XXXXXXXXXX
  if (digits.length === 10) {
    digits = `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = `91${digits.slice(1)}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    // already 91...
  }
  return digits;
}

function getOrderProductSummary(order) {
  if (!order || !order.items || order.items.length === 0) {
    return {
      productName: 'Store Items',
      quantity: 1
    };
  }
  const productName = order.items
    .map(i => `${i.name || 'Item'}${i.weight ? ` (${i.weight})` : ''}`)
    .join(', ');
  const quantity = order.items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
  return { productName, quantity };
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

// ─────────────────────────────────────────────────────────────
// 3. AUDIT & NOTIFICATION LOG RECORDER
// ─────────────────────────────────────────────────────────────

/**
 * Stores notification audit log as required:
 * orderId, customerId, notificationType, channel (WhatsApp/Email), status, timestamp, errorMessage
 */
function recordNotificationLog(order, { notificationType, channel, result }) {
  if (!order) return null;

  const isSuccess = result && result.success === true;
  const isNotConfigured = result && result.status === 'not_configured';
  const status = isSuccess ? 'Sent' : (isNotConfigured ? 'Not Configured' : 'Failed');
  const errorMessage = result?.error || (isNotConfigured ? result?.note : null) || null;

  const logEntry = {
    orderId: order.orderId || order._id,
    customerId: order.customerId || '',
    notificationType: notificationType || 'GENERAL',
    channel: channel || 'Unknown', // 'WhatsApp' | 'Email'
    status, // 'Sent' | 'Failed' | 'Pending' | 'Not Configured'
    timestamp: new Date().toISOString(),
    errorMessage
  };

  // 1. Record in db.Notifications collection
  try {
    if (db.Notifications) {
      db.Notifications.insertOne(logEntry);
    }
  } catch (err) {
    console.error('[Notification Log] Error saving to db.Notifications:', err.message);
  }

  // 2. Update order.notifications and order.notifications.logs
  try {
    const currentOrder = db.Orders.findById(order._id);
    if (currentOrder) {
      const existing = currentOrder.notifications || {};
      const channelKey = channel.toLowerCase() === 'whatsapp' ? 'whatsapp' : (channel.toLowerCase().includes('admin') ? 'adminEmail' : 'email');
      const channelObj = existing[channelKey] || {};

      channelObj.lastStatus = isSuccess ? 'sent' : (isNotConfigured ? 'not_configured' : 'failed');
      channelObj.lastSentAt = new Date().toISOString();
      channelObj.error = errorMessage;
      if (!channelObj.history) channelObj.history = [];
      channelObj.history.push(logEntry);

      const logs = existing.logs || [];
      logs.push(logEntry);

      db.Orders.updateById(order._id, {
        notifications: {
          ...existing,
          [channelKey]: channelObj,
          logs
        }
      });
    }
  } catch (err) {
    console.error('[Notification Log] Error updating order.notifications:', err.message);
  }

  return logEntry;
}

// ─────────────────────────────────────────────────────────────
// 4. REAL WHATSAPP DISPATCHER (WhatsApp Cloud API)
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

  // Do not fake WhatsApp: if credentials are not configured, report not_configured
  if (!phoneId || !token) {
    console.log(`[BPS WhatsApp] Credentials not configured in .env. Target recipient: ${phone}`);
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

    console.log(`[BPS WhatsApp] Message successfully sent to ${phone}: ${data.messages?.[0]?.id}`);
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
// 5. REAL EMAIL DISPATCHER (Nodemailer SMTP)
// ─────────────────────────────────────────────────────────────

function createEmailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const isSecure = port === 465 || process.env.SMTP_SECURE === 'true';

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    }
  });
}

async function sendEmailNotification({ to, subject, htmlText, plainText, fromName }) {
  if (!to || !to.includes('@')) {
    return {
      success: false,
      status: 'failed',
      error: 'Invalid recipient email address'
    };
  }

  const transporter = createEmailTransporter();
  const senderTitle = fromName || EMAIL_SENDER_NAME;
  const fromAddress = process.env.EMAIL_FROM || `"${senderTitle}" <orders@bpsfreshmills.com>`;

  if (!transporter) {
    console.log(`[BPS Email] SMTP credentials not configured in .env. Target recipient: ${to}, Subject: ${subject}`);
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
// 6. EMAIL HTML TEMPLATES
// ─────────────────────────────────────────────────────────────

function generateCustomerOrderReceivedHtml(order) {
  const trackingUrl = getTrackingUrl(order.orderId);
  const { productName, quantity } = getOrderProductSummary(order);
  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #1F2937; font-weight: 600;">
        ${item.name} <span style="color: #6B7280; font-size: 12px;">(${item.weight || ''})</span>
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; text-align: center; color: #4B5563;">
        ${item.quantity}
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; text-align: right; color: #1F2937;">
        ₹${item.price}
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; text-align: right; font-weight: 700; color: #173D32;">
        ₹${item.subtotal || item.price * item.quantity}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BPS – Order Received – #${order.orderId}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAF9; padding: 25px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 15px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #173D32 0%, #2E8B57 100%); padding: 30px 24px; text-align: center; color: #FFFFFF;">
              <h1 style="margin: 0 0 6px 0; font-size: 28px; font-weight: 800; letter-spacing: 1px; color: #FFFFFF;">
                🌾 ${BRAND_NAME}
              </h1>
              <p style="margin: 0; font-size: 14px; color: #E8F5EC; opacity: 0.9;">Freshly Milled. Naturally Good.</p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 30px 24px 15px 24px; text-align: center;">
              <h2 style="margin: 0 0 8px 0; font-size: 22px; color: #173D32; font-weight: 800;">🎉 Order Received!</h2>
              <p style="margin: 0; color: #4B5563; font-size: 15px;">
                Hi <strong>${order.customerName || 'Customer'}</strong>,<br>
                Your order with <strong>${BRAND_NAME}</strong> has been received.
              </p>
            </td>
          </tr>

          <!-- Order Summary Card -->
          <tr>
            <td style="padding: 10px 24px 15px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; padding: 16px;">
                <tr>
                  <td style="font-size: 13px; color: #6B7280; padding: 4px 8px;">Order ID:</td>
                  <td style="font-size: 14px; font-weight: 800; color: #173D32; text-align: right; padding: 4px 8px;">#${order.orderId}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #6B7280; padding: 4px 8px;">Status:</td>
                  <td style="font-size: 13px; font-weight: 800; color: #D97706; text-align: right; padding: 4px 8px;">Pending Admin Confirmation</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #6B7280; padding: 4px 8px;">Total Quantity:</td>
                  <td style="font-size: 13px; font-weight: 600; color: #1F2937; text-align: right; padding: 4px 8px;">${quantity} items</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #6B7280; padding: 4px 8px;">Total Amount:</td>
                  <td style="font-size: 16px; font-weight: 800; color: #2E8B57; text-align: right; padding: 4px 8px;">₹${order.totalAmount}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 10px 24px;">
              <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #173D32;">Items in Your Order</h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <thead>
                  <tr style="background-color: #F3F4F6; border-bottom: 2px solid #E5E7EB;">
                    <th style="padding: 8px; text-align: left; font-size: 12px; color: #6B7280;">Product</th>
                    <th style="padding: 8px; text-align: center; font-size: 12px; color: #6B7280;">Qty</th>
                    <th style="padding: 8px; text-align: right; font-size: 12px; color: #6B7280;">Price</th>
                    <th style="padding: 8px; text-align: right; font-size: 12px; color: #6B7280;">Total</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
            </td>
          </tr>

          <!-- Confirmation Note -->
          <tr>
            <td style="padding: 15px 24px 5px 24px;">
              <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px 16px; font-size: 14px; color: #92400E; text-align: center;">
                ⏳ <strong>We will notify you once your order is confirmed.</strong>
              </div>
            </td>
          </tr>

          <!-- Track CTA Button -->
          <tr>
            <td style="padding: 20px 24px 30px 24px; text-align: center;">
              <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2E8B57; color: #FFFFFF; font-size: 16px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(46, 139, 87, 0.3);">
                👉 Track Your Order
              </a>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #9CA3AF;">
                <a href="${trackingUrl}" style="color: #2E8B57; word-break: break-all;">${trackingUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #173D32; color: #A7F3D0; padding: 18px 24px; text-align: center; font-size: 12px;">
              ${BRAND_NAME} Team • Pure stone chakki atta & essentials
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateAdminNewOrderHtml(order, addressLine) {
  const adminUrl = `${getBaseFrontendUrl()}/admin/login`;
  const itemsHtml = (order.items || []).map(item => `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; color: #1F2937; font-weight: 600;">
        ${item.name} <span style="color: #6B7280; font-size: 12px;">(${item.weight || ''})</span>
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; text-align: center; color: #4B5563;">
        ${item.quantity}
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; text-align: right; color: #1F2937;">
        ₹${item.price}
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 14px; text-align: right; font-weight: 700; color: #173D32;">
        ₹${item.subtotal || item.price * item.quantity}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BPS – New Order Received – #${order.orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 25px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB; box-shadow: 0 4px 15px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: linear-gradient(135deg, #173D32 0%, #2E8B57 100%); padding: 25px 24px; text-align: center; color: #FFFFFF;">
              <h1 style="margin: 0 0 4px 0; font-size: 26px; font-weight: 800; color: #FFFFFF;">🌾 BPS Store</h1>
              <p style="margin: 0; font-size: 14px; color: #E8F5EC;">New Customer Order Notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 24px 10px 24px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #173D32;">New Order Received! 🛍️</h2>
              <table role="presentation" width="100%" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; padding: 14px;">
                <tr><td style="padding: 4px; color: #6B7280; font-size: 13px;">Order ID:</td><td style="padding: 4px; font-weight: 800; color: #173D32; font-size: 14px; text-align: right;">#${order.orderId}</td></tr>
                <tr><td style="padding: 4px; color: #6B7280; font-size: 13px;">Customer:</td><td style="padding: 4px; font-weight: 700; color: #1F2937; font-size: 14px; text-align: right;">${order.customerName}</td></tr>
                <tr><td style="padding: 4px; color: #6B7280; font-size: 13px;">Phone:</td><td style="padding: 4px; font-weight: 600; color: #1F2937; font-size: 13px; text-align: right;">${order.customerPhone}</td></tr>
                <tr><td style="padding: 4px; color: #6B7280; font-size: 13px;">Email:</td><td style="padding: 4px; color: #1F2937; font-size: 13px; text-align: right;">${order.customerEmail || 'N/A'}</td></tr>
                <tr><td style="padding: 4px; color: #6B7280; font-size: 13px;">Payment Status:</td><td style="padding: 4px; font-weight: 700; color: #B45309; font-size: 13px; text-align: right;">${order.paymentStatus || 'COD Pending'}</td></tr>
                <tr><td style="padding: 4px; color: #6B7280; font-size: 13px;">Status:</td><td style="padding: 4px; font-weight: 800; color: #D97706; font-size: 13px; text-align: right;">Pending Admin Confirmation</td></tr>
                <tr><td style="padding: 4px; color: #6B7280; font-size: 13px;">Order Date & Time:</td><td style="padding: 4px; color: #4B5563; font-size: 13px; text-align: right;">${new Date(order.createdAt || Date.now()).toLocaleString('en-IN')}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 24px;">
              <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #173D32;">Items Ordered</h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <thead>
                  <tr style="background-color: #F3F4F6; border-bottom: 2px solid #E5E7EB;">
                    <th style="padding: 8px; text-align: left; font-size: 12px; color: #6B7280;">Product</th>
                    <th style="padding: 8px; text-align: center; font-size: 12px; color: #6B7280;">Qty</th>
                    <th style="padding: 8px; text-align: right; font-size: 12px; color: #6B7280;">Price</th>
                    <th style="padding: 8px; text-align: right; font-size: 12px; color: #6B7280;">Total</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
              </table>
              <div style="text-align: right; padding-top: 12px; font-size: 17px; font-weight: 800; color: #173D32;">
                Grand Total: <span style="color: #2E8B57;">₹${order.totalAmount}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 24px;">
              <div style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; padding: 12px;">
                <strong style="font-size: 13px; color: #6B7280; text-transform: uppercase;">Delivery Address:</strong>
                <div style="font-size: 14px; color: #1F2937; margin-top: 4px; line-height: 1.4;">${addressLine}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 24px 30px 24px; text-align: center;">
              <a href="${adminUrl}" target="_blank" style="display: inline-block; background-color: #173D32; color: #FFFFFF; font-size: 15px; font-weight: 800; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
                Open Admin Dashboard to Review & Confirm
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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
          
          <!-- Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #173D32 0%, #2E8B57 100%); padding: 30px 24px; text-align: center; color: #FFFFFF;">
              <h1 style="margin: 0 0 6px 0; font-size: 28px; font-weight: 800; letter-spacing: 1px; color: #FFFFFF;">
                🌾 ${BRAND_NAME}
              </h1>
              <p style="margin: 0; font-size: 14px; color: #E8F5EC; opacity: 0.9;">Freshly Milled. Naturally Good.</p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 30px 24px 15px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #E8F5EC; color: #2E8B57; width: 50px; height: 50px; line-height: 50px; border-radius: 50%; font-size: 24px; margin-bottom: 12px;">✓</div>
              <h2 style="margin: 0 0 8px 0; font-size: 22px; color: #173D32; font-weight: 800;">🎉 Order Confirmed!</h2>
              <p style="margin: 0; color: #4B5563; font-size: 15px;">
                Hi <strong>${order.customerName || 'Customer'}</strong>,<br>
                Your ${BRAND_NAME} order <strong>#${order.orderId}</strong> has been confirmed.
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
                  <td style="font-size: 13px; color: #6B7280; padding: 4px 8px;">Status:</td>
                  <td style="font-size: 13px; font-weight: 700; color: #2E8B57; text-align: right; padding: 4px 8px;">Confirmed</td>
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
                <tbody>${itemsHtml}</tbody>
              </table>

              <div style="text-align: right; padding-top: 14px; font-size: 18px; font-weight: 800; color: #173D32;">
                Total: <span style="color: #2E8B57;">₹${order.totalAmount}</span>
              </div>
            </td>
          </tr>

          <!-- Delivery Address -->
          <tr>
            <td style="padding: 10px 24px 20px 24px;">
              <div style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; padding: 14px 16px;">
                <h4 style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; color: #6B7280;">Delivery Address</h4>
                <div style="font-size: 14px; color: #1F2937; font-weight: 600;">${shipping.name || order.customerName}</div>
                <div style="font-size: 13px; color: #4B5563; line-height: 1.4; margin-top: 2px;">${addressLine}</div>
              </div>
            </td>
          </tr>

          <!-- Track Button -->
          <tr>
            <td style="padding: 15px 24px 30px 24px; text-align: center;">
              <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2E8B57; color: #FFFFFF; font-size: 16px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(46, 139, 87, 0.3);">
                👉 Track Your Order
              </a>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #9CA3AF;">
                <a href="${trackingUrl}" style="color: #2E8B57; word-break: break-all;">${trackingUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #173D32; color: #A7F3D0; padding: 20px 24px; text-align: center; font-size: 12px; line-height: 1.6;">
              Thank you for shopping with ${BRAND_NAME}! ❤️
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateOrderCancelledHtml(order, reason) {
  const { productName } = getOrderProductSummary(order);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BPS – Order Cancelled – #${order.orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 25px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: #DC2626; padding: 25px 24px; text-align: center; color: #FFFFFF;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #FFFFFF;">🌾 ${BRAND_NAME}</h1>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #FEE2E2;">Order Cancellation Notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 24px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #991B1B;">❌ Order Cancelled</h2>
              <p style="font-size: 15px; color: #4B5563; line-height: 1.5;">
                Hi <strong>${order.customerName || 'Customer'}</strong>,<br>
                Your ${BRAND_NAME} order <strong>#${order.orderId}</strong> has been cancelled successfully.
              </p>
              <div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left;">
                <div style="font-size: 14px; margin-bottom: 6px;"><strong>Product:</strong> ${productName}</div>
                <div style="font-size: 14px; margin-bottom: 6px;"><strong>Total:</strong> ₹${order.totalAmount}</div>
                <div style="font-size: 14px; color: #991B1B;"><strong>Status:</strong> Cancelled</div>
                ${reason ? `<div style="font-size: 13px; color: #7F1D1D; margin-top: 8px;"><strong>Reason:</strong> ${reason}</div>` : ''}
              </div>
              <p style="font-size: 14px; color: #173D32; font-weight: 700; margin-top: 25px;">
                BPS Team
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateAdminCancellationHtml(order, reason, cancelledBy) {
  const adminUrl = `${getBaseFrontendUrl()}/admin/login`;
  const { productName } = getOrderProductSummary(order);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BPS – Order Cancelled – #${order.orderId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 25px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB;" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: #991B1B; padding: 22px 24px; text-align: center; color: #FFFFFF;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF;">🌾 BPS Store Admin</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #FEE2E2;">Order Cancellation Alert</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px 24px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #991B1B;">Order #${order.orderId} Has Been Cancelled</h2>
              <div style="background-color: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; padding: 14px; font-size: 14px; line-height: 1.6;">
                <div><strong>Cancelled By:</strong> ${cancelledBy === 'customer' ? 'Customer' : 'Store Admin'}</div>
                <div><strong>Customer:</strong> ${order.customerName} (${order.customerPhone})</div>
                <div><strong>Product:</strong> ${productName}</div>
                <div><strong>Amount:</strong> ₹${order.totalAmount}</div>
                <div><strong>Reason:</strong> ${reason || 'N/A'}</div>
                <div><strong>Inventory:</strong> Restocked automatically.</div>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <a href="${adminUrl}" target="_blank" style="display: inline-block; background-color: #173D32; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 10px 24px; border-radius: 6px;">
                  Open Admin Dashboard
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateStatusUpdateHtml(order, newStatus, messageText) {
  const trackingUrl = getTrackingUrl(order.orderId);
  const { productName, quantity } = getOrderProductSummary(order);

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

          <!-- Status Card -->
          <tr>
            <td style="padding: 25px 24px 15px 24px; text-align: center;">
              <div style="display: inline-block; background-color: #E8F5EC; color: #2E8B57; padding: 6px 18px; border-radius: 999px; font-weight: 800; font-size: 14px; margin-bottom: 12px;">
                Status: ${newStatus}
              </div>
              <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #173D32; font-weight: 800;">
                Order #${order.orderId}
              </h2>
              <div style="font-size: 15px; color: #374151; line-height: 1.6; margin: 15px 0; background-color: #F9FAFB; padding: 16px; border-radius: 8px; border-left: 4px solid #2E8B57; text-align: left;">
                ${messageText.replace(/\n/g, '<br>')}
              </div>
            </td>
          </tr>

          <!-- Order Overview -->
          <tr>
            <td style="padding: 0 24px 15px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; padding: 14px;">
                <tr><td style="padding: 4px; color: #6B7280; font-size: 13px;">Product:</td><td style="padding: 4px; font-weight: 600; color: #1F2937; font-size: 13px; text-align: right;">${productName}</td></tr>
                <tr><td style="padding: 4px; color: #6B7280; font-size: 13px;">Quantity:</td><td style="padding: 4px; font-weight: 600; color: #1F2937; font-size: 13px; text-align: right;">${quantity} items</td></tr>
                <tr><td style="padding: 4px; color: #6B7280; font-size: 13px;">Total Amount:</td><td style="padding: 4px; font-weight: 800; color: #2E8B57; font-size: 14px; text-align: right;">₹${order.totalAmount}</td></tr>
                <tr><td style="padding: 4px; color: #6B7280; font-size: 13px;">Current Status:</td><td style="padding: 4px; font-weight: 700; color: #173D32; font-size: 13px; text-align: right;">${newStatus}</td></tr>
              </table>
            </td>
          </tr>

          <!-- Track Button -->
          <tr>
            <td style="padding: 10px 24px 30px 24px; text-align: center;">
              <a href="${trackingUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2E8B57; color: #FFFFFF; font-size: 16px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(46, 139, 87, 0.3);">
                👉 Track Your Order
              </a>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #9CA3AF;">
                <a href="${trackingUrl}" style="color: #2E8B57; word-break: break-all;">${trackingUrl}</a>
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
</html>`;
}

// ─────────────────────────────────────────────────────────────
// 7. PUBLIC NOTIFICATION DISPATCH METHODS
// ─────────────────────────────────────────────────────────────

/**
 * Triggered immediately when CUSTOMER PLACES ORDER:
 * 1. Customer WhatsApp
 * 2. Customer Email
 */
async function sendCustomerOrderReceivedNotifications(order) {
  if (!order) return null;

  const trackingUrl = getTrackingUrl(order.orderId);
  const { productName, quantity } = getOrderProductSummary(order);
  const customerName = order.customerName || 'Customer';

  // Exact Customer WhatsApp format specified in prompt:
  const whatsappBody = `🎉 Order Received!

Hi ${customerName},

Your order with ${BRAND_NAME} has been received.

Order ID: #${order.orderId}
Product: ${productName}
Quantity: ${quantity}
Total: ₹${order.totalAmount}

Status: Pending Admin Confirmation

We will notify you once your order is confirmed.

Track Your Order:
${trackingUrl}

${BRAND_NAME} Team`;

  const customerPhone = order.customerPhone || order.shippingAddress?.mobile;
  const customerEmail = order.customerEmail || order.shippingAddress?.email;

  const results = { whatsapp: null, email: null };

  // Dispatch WhatsApp
  if (customerPhone) {
    try {
      results.whatsapp = await sendWhatsAppMessage(customerPhone, whatsappBody);
    } catch (e) {
      results.whatsapp = { success: false, status: 'failed', error: e.message };
    }
  } else {
    results.whatsapp = { success: false, status: 'failed', error: 'No customer phone number' };
  }
  recordNotificationLog(order, {
    notificationType: 'ORDER_RECEIVED',
    channel: 'WhatsApp',
    result: results.whatsapp
  });

  // Dispatch Customer Email
  if (customerEmail) {
    try {
      const htmlText = generateCustomerOrderReceivedHtml(order);
      results.email = await sendEmailNotification({
        to: customerEmail,
        subject: `${BRAND_NAME} – Order Received – #${order.orderId}`,
        htmlText,
        plainText: whatsappBody
      });
    } catch (e) {
      results.email = { success: false, status: 'failed', error: e.message };
    }
  } else {
    results.email = { success: false, status: 'failed', error: 'No customer email address' };
  }
  recordNotificationLog(order, {
    notificationType: 'ORDER_RECEIVED',
    channel: 'Email',
    result: results.email
  });

  return results;
}

/**
 * Triggered immediately when CUSTOMER PLACES ORDER:
 * 3. Admin Email notification
 */
async function sendAdminNewOrderEmail(order) {
  if (!order) return null;

  const adminEmail = (process.env.ADMIN_EMAIL || 'bpsfreshmill@gmail.com').trim();
  const { productName, quantity } = getOrderProductSummary(order);
  const itemsText = (order.items || []).map(i => `${i.name} (${i.weight || ''}) x${i.quantity} @ ₹${i.price}`).join('\n');
  const shipping = order.shippingAddress || {};
  const addressLine = [
    shipping.houseFlat,
    shipping.streetArea,
    shipping.landmark,
    shipping.city,
    shipping.pincode
  ].filter(Boolean).join(', ');

  const plainText = `BPS – New Order Received – #${order.orderId}

Order ID: #${order.orderId}
Customer: ${order.customerName || 'Customer'}
Phone: ${order.customerPhone || 'N/A'}
Email: ${order.customerEmail || 'N/A'}

Product:
${itemsText}

Quantity: ${quantity}
Total: ₹${order.totalAmount}
Status: Pending Admin Confirmation

Delivery Address:
${addressLine}

Review & Confirm on Admin Dashboard:
${getBaseFrontendUrl()}/admin/login`;

  const htmlText = generateAdminNewOrderHtml(order, addressLine);

  let result = null;
  try {
    result = await sendEmailNotification({
      to: adminEmail,
      subject: `BPS – New Order Received – #${order.orderId}`,
      htmlText,
      plainText,
      fromName: 'BPS Store'
    });
    console.log(`[BPS Admin Email] Notification dispatched to ${adminEmail} for #${order.orderId}`);
  } catch (err) {
    console.error(`[BPS Admin Email] Failed to send to ${adminEmail}:`, err.message);
    result = { success: false, status: 'failed', error: err.message };
  }

  recordNotificationLog(order, {
    notificationType: 'ADMIN_NEW_ORDER',
    channel: 'Admin Email',
    result
  });

  return result;
}

/**
 * Triggered immediately when ADMIN CONFIRMS ORDER:
 * 1. WhatsApp to customer
 * 2. Email to customer
 */
async function sendOrderConfirmationNotifications(order) {
  if (!order) return null;

  const trackingUrl = getTrackingUrl(order.orderId);
  const { productName, quantity } = getOrderProductSummary(order);
  const customerName = order.customerName || 'Customer';

  // Exact Customer WhatsApp format specified in prompt:
  const whatsappBody = `🎉 Order Confirmed!

Hi ${customerName},

Your BPS order #${order.orderId} has been confirmed.

Product: ${productName}
Quantity: ${quantity}
Total: ₹${order.totalAmount}

Status: Confirmed

Track Your Order:
${trackingUrl}

Thank you for shopping with BPS!`;

  const customerPhone = order.customerPhone || order.shippingAddress?.mobile;
  const customerEmail = order.customerEmail || order.shippingAddress?.email;

  const results = { whatsapp: null, email: null };

  if (customerPhone) {
    try {
      results.whatsapp = await sendWhatsAppMessage(customerPhone, whatsappBody);
    } catch (e) {
      results.whatsapp = { success: false, status: 'failed', error: e.message };
    }
  } else {
    results.whatsapp = { success: false, status: 'failed', error: 'No customer phone' };
  }
  recordNotificationLog(order, {
    notificationType: 'ORDER_CONFIRMED',
    channel: 'WhatsApp',
    result: results.whatsapp
  });

  if (customerEmail) {
    try {
      const emailHtml = generateOrderConfirmedHtml(order);
      results.email = await sendEmailNotification({
        to: customerEmail,
        subject: `BPS – Order Confirmed – #${order.orderId}`,
        htmlText: emailHtml,
        plainText: whatsappBody
      });
    } catch (e) {
      results.email = { success: false, status: 'failed', error: e.message };
    }
  } else {
    results.email = { success: false, status: 'failed', error: 'No customer email' };
  }
  recordNotificationLog(order, {
    notificationType: 'ORDER_CONFIRMED',
    channel: 'Email',
    result: results.email
  });

  return results;
}

/**
 * Triggered immediately when CUSTOMER OR ADMIN CANCELS ORDER:
 * 1. WhatsApp to customer
 * 2. Email to customer
 * 3. Cancellation update to admin email
 */
async function sendOrderCancelledNotifications(order, reason, cancelledBy = 'customer') {
  if (!order) return null;

  const { productName } = getOrderProductSummary(order);
  const customerName = order.customerName || 'Customer';

  // Exact Customer WhatsApp format specified in prompt:
  const whatsappBody = `❌ Order Cancelled

Hi ${customerName},

Your BPS order #${order.orderId} has been cancelled successfully.

Product: ${productName}
Total: ₹${order.totalAmount}

Status: Cancelled

BPS Team`;

  const customerPhone = order.customerPhone || order.shippingAddress?.mobile;
  const customerEmail = order.customerEmail || order.shippingAddress?.email;
  const adminEmail = (process.env.ADMIN_EMAIL || 'bpsfreshmill@gmail.com').trim();

  const results = { whatsapp: null, email: null, adminEmail: null };

  // 1. WhatsApp to customer
  if (customerPhone) {
    try {
      results.whatsapp = await sendWhatsAppMessage(customerPhone, whatsappBody);
    } catch (e) {
      results.whatsapp = { success: false, status: 'failed', error: e.message };
    }
  } else {
    results.whatsapp = { success: false, status: 'failed', error: 'No customer phone' };
  }
  recordNotificationLog(order, {
    notificationType: 'ORDER_CANCELLED',
    channel: 'WhatsApp',
    result: results.whatsapp
  });

  // 2. Email to customer
  if (customerEmail) {
    try {
      const emailHtml = generateOrderCancelledHtml(order, reason);
      results.email = await sendEmailNotification({
        to: customerEmail,
        subject: `BPS – Order Cancelled – #${order.orderId}`,
        htmlText: emailHtml,
        plainText: whatsappBody
      });
    } catch (e) {
      results.email = { success: false, status: 'failed', error: e.message };
    }
  } else {
    results.email = { success: false, status: 'failed', error: 'No customer email' };
  }
  recordNotificationLog(order, {
    notificationType: 'ORDER_CANCELLED',
    channel: 'Email',
    result: results.email
  });

  // 3. Cancellation update to admin email
  try {
    const adminHtml = generateAdminCancellationHtml(order, reason, cancelledBy);
    results.adminEmail = await sendEmailNotification({
      to: adminEmail,
      subject: `BPS – Order Cancelled – #${order.orderId}`,
      htmlText: adminHtml,
      plainText: `BPS Order #${order.orderId} has been cancelled by ${cancelledBy}. Reason: ${reason || 'N/A'}`
    });
  } catch (e) {
    results.adminEmail = { success: false, status: 'failed', error: e.message };
  }
  recordNotificationLog(order, {
    notificationType: 'ORDER_CANCELLED_ADMIN',
    channel: 'Admin Email',
    result: results.adminEmail
  });

  return results;
}

/**
 * Triggered immediately when ORDER STATUS UPDATES:
 * Confirmed -> Processing -> Shipped -> Out for Delivery -> Delivered
 * Every notification includes:
 * - BPS
 * - Customer name
 * - Order ID
 * - Product
 * - Quantity
 * - Total amount
 * - Current status
 * - Track Your Order link
 */
async function sendOrderStatusUpdateNotifications(order, newStatus) {
  if (!order || !newStatus) return null;

  const trackingUrl = getTrackingUrl(order.orderId);
  const { productName, quantity } = getOrderProductSummary(order);
  const customerName = order.customerName || 'Customer';

  let statusDescription = `Your BPS order #${order.orderId} status has been updated to: ${newStatus}.`;
  if (newStatus === 'Processing' || newStatus === 'Preparing') {
    statusDescription = `Your BPS order #${order.orderId} is now being processed and packed.`;
  } else if (newStatus === 'Shipped' || newStatus === 'Ready for Delivery') {
    statusDescription = `Your BPS order #${order.orderId} has been shipped and is on the way!`;
  } else if (newStatus === 'Out for Delivery') {
    statusDescription = `Your BPS order #${order.orderId} is out for delivery today. Please be ready to receive it.`;
  } else if (newStatus === 'Delivered') {
    statusDescription = `Your BPS order #${order.orderId} has been delivered successfully. Thank you for shopping with BPS!`;
  }

  const whatsappBody = `📢 Order Update: ${newStatus}

Hi ${customerName},

${statusDescription}

Order ID: #${order.orderId}
Product: ${productName}
Quantity: ${quantity}
Total: ₹${order.totalAmount}

Status: ${newStatus}

Track Your Order:
${trackingUrl}

BPS Team`;

  const customerPhone = order.customerPhone || order.shippingAddress?.mobile;
  const customerEmail = order.customerEmail || order.shippingAddress?.email;

  const results = { whatsapp: null, email: null };

  if (customerPhone) {
    try {
      results.whatsapp = await sendWhatsAppMessage(customerPhone, whatsappBody);
    } catch (e) {
      results.whatsapp = { success: false, status: 'failed', error: e.message };
    }
  } else {
    results.whatsapp = { success: false, status: 'failed', error: 'No customer phone' };
  }
  recordNotificationLog(order, {
    notificationType: `STATUS_${newStatus.toUpperCase()}`,
    channel: 'WhatsApp',
    result: results.whatsapp
  });

  if (customerEmail) {
    try {
      const emailHtml = generateStatusUpdateHtml(order, newStatus, statusDescription);
      results.email = await sendEmailNotification({
        to: customerEmail,
        subject: `BPS – Order Update: ${newStatus} – #${order.orderId}`,
        htmlText: emailHtml,
        plainText: whatsappBody
      });
    } catch (e) {
      results.email = { success: false, status: 'failed', error: e.message };
    }
  } else {
    results.email = { success: false, status: 'failed', error: 'No customer email' };
  }
  recordNotificationLog(order, {
    notificationType: `STATUS_${newStatus.toUpperCase()}`,
    channel: 'Email',
    result: results.email
  });

  return results;
}

/**
 * Triggered immediately when ORDER IS DELIVERED by Delivery Boy:
 * Admin Email Notification with Delivery Boy & OTP verified status
 */
async function sendAdminOrderDeliveredEmail(order, deliveryBoyName = '') {
  if (!order) return null;
  const adminEmail = (process.env.ADMIN_EMAIL || 'bpsfreshmill@gmail.com').trim();
  const { productName } = getOrderProductSummary(order);

  const subject = `BPS – Order Delivered – #${order.orderId}`;
  const plainText = `🔔 Order Delivered

Order #${order.orderId}
Customer: ${order.customerName || 'Customer'}
Delivery Boy: ${deliveryBoyName || order.deliveredBy?.name || 'Assigned Agent'}
OTP Verified: ✅ Yes
Total Collected: ₹${order.totalAmount}
Time: ${new Date().toLocaleTimeString('en-IN')}`;

  const htmlText = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin: 0; padding: 0; background: #F8FAF9; font-family: sans-serif; color: #1F2937;">
  <div style="max-width: 560px; margin: 20px auto; background: #FFF; border-radius: 12px; overflow: hidden; border: 1px solid #E5E7EB;">
    <div style="background: #173D32; padding: 20px 24px; text-align: center; color: #FFF;">
      <h2 style="margin: 0; font-size: 22px;">🔔 Order Delivered</h2>
      <p style="margin: 4px 0 0; color: #A7F3D0; font-size: 13px;">BPS Delivery Verification</p>
    </div>
    <div style="padding: 24px;">
      <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <div style="font-size: 16px; font-weight: 800; color: #166534; margin-bottom: 8px;">Order #${order.orderId} Delivered Successfully!</div>
        <div style="font-size: 14px; line-height: 1.6;">
          <div><strong>Customer:</strong> ${order.customerName} (${order.customerPhone || 'N/A'})</div>
          <div><strong>Delivery Boy:</strong> ${deliveryBoyName || order.deliveredBy?.name || 'Delivery Partner'}</div>
          <div><strong>OTP Verified:</strong> <span style="color: #166534; font-weight: 800;">✅ YES</span></div>
          <div><strong>Cash Collected:</strong> ₹${order.totalAmount}</div>
          <div><strong>Product:</strong> ${productName}</div>
          <div><strong>Delivered At:</strong> ${new Date().toLocaleString('en-IN')}</div>
        </div>
      </div>
      <div style="text-align: center; margin-top: 15px;">
        <a href="${getBaseFrontendUrl()}/admin/dashboard" style="display: inline-block; background: #173D32; color: #FFF; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px;">Open Admin Dashboard</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  let result = null;
  try {
    result = await sendEmailNotification({
      to: adminEmail,
      subject,
      htmlText,
      plainText,
      fromName: 'BPS Delivery'
    });
  } catch (err) {
    result = { success: false, status: 'failed', error: err.message };
  }

  recordNotificationLog(order, {
    notificationType: 'ORDER_DELIVERED_ADMIN',
    channel: 'Admin Email',
    result
  });

  return result;
}

module.exports = {
  getBaseFrontendUrl,
  getTrackingUrl,
  formatDeliveryDate,
  getOrderProductSummary,
  recordNotificationLog,
  sendWhatsAppMessage,
  sendEmailNotification,
  sendCustomerOrderReceivedNotifications,
  sendAdminNewOrderEmail,
  sendOrderConfirmationNotifications,
  sendOrderCancelledNotifications,
  sendOrderStatusUpdateNotifications,
  sendAdminOrderDeliveredEmail
};
