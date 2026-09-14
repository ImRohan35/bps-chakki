/**
 * Automated Test Suite for BPS Fresh Mills Features 38–90
 * Verifies Delivery Boy Portal, Order Lifecycle, OTP Verification, COD Management & Settlements,
 * 15 KM Radius Bounds, Returns & Photo Upload, Support Tickets, Invoices, Security Isolation,
 * Loyalty Points, Wallet Ledgers, Referrals, and Personalization.
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:5000/api';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(url, { method, headers }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n=============================================================');
  console.log('  RUNNING BPS FRESH MILLS AUTOMATED VERIFICATION: 38–90');
  console.log('=============================================================\n');

  try {
    // ── 1. AUTHENTICATION OF ROLES ──
    console.log('[TEST GROUP 1] Role Authentication & Security Isolation');

    // Admin login
    const adminLogin = await request('POST', '/auth/login', {
      identifier: 'bpsfreshmills@gmail.com',
      password: 'bps@2005'
    });
    assert(adminLogin.status === 200 && adminLogin.data.success, 'Admin authenticated successfully');
    const adminToken = adminLogin.data.token;

    // Delivery Boy login (via dedicated endpoint Feature 39)
    const deliveryLogin = await request('POST', '/auth/delivery-login', {
      identifier: '9812345678',
      password: 'Delivery@123'
    });
    assert(deliveryLogin.status === 200 && deliveryLogin.data.success, 'Delivery Boy logged in via dedicated portal endpoint');
    const deliveryToken = deliveryLogin.data.token;
    const deliveryUser = deliveryLogin.data.user;

    // Customer 1 login
    const customerLogin = await request('POST', '/auth/login', {
      identifier: '9899001122',
      password: 'Customer@123'
    });
    assert(customerLogin.status === 200 && customerLogin.data.success, 'Customer authenticated successfully');
    const customerToken = customerLogin.data.token;
    const customerUser = customerLogin.data.user;

    // ── 2. DELIVERY BOY AVAILABILITY STATUS (Feature 40) ──
    console.log('\n[TEST GROUP 2] Rider Availability Toggle');
    const availRes = await request('PUT', '/delivery/availability', { status: 'AVAILABLE' }, deliveryToken);
    assert(availRes.status === 200 && availRes.data.availability === 'AVAILABLE', 'Rider set status to AVAILABLE');

    const invalidAvail = await request('PUT', '/delivery/availability', { status: 'FLYING' }, deliveryToken);
    assert(invalidAvail.status === 400, 'Invalid availability rejected');

    // ── 3. 15 KM BOUNDARY CHECK & ORDER CREATION (Features 59-60) ──
    // ── 3. 15 KM BOUNDARY CHECK & ORDER CREATION (Features 59-60) ──
    console.log('\n[TEST GROUP 3] 15 KM Radius & Order Engine');

    const productsRes = await request('GET', '/products');
    assert(productsRes.status === 200 && productsRes.data.products?.length > 0, 'Fetched active products catalog');
    const testProduct = productsRes.data.products[0];
    const testItem = {
      productId: testProduct._id,
      name: testProduct.name,
      price: testProduct.price || 280,
      weight: '5 KG',
      quantity: 1,
      texture: 'Regular'
    };

    // Outside 15 km address test
    const farOrder = await request('POST', '/orders', {
      items: [testItem],
      shippingAddress: {
        name: 'Pooja Sharma',
        mobile: '9899001122',
        houseFlat: 'A-101 Far Away',
        streetArea: 'Highway Outer',
        city: 'Varanasi',
        pincode: '221001',
        lat: 26.5000, // ~115 km away from shop
        lon: 83.0564
      },
      paymentMethod: 'Cash on Delivery (COD)'
    }, customerToken);

    assert(farOrder.status === 400 && farOrder.data.message === 'Sorry, this location is outside our delivery area.',
      'Order outside 15 KM strictly rejected with exact policy message');

    // Within 15 km address test
    const validOrderRes = await request('POST', '/orders', {
      items: [testItem],
      shippingAddress: {
        name: 'Pooja Sharma',
        mobile: '9899001122',
        houseFlat: 'Flat 302, Palm Heights',
        streetArea: 'Cholapur Main Road',
        city: 'Varanasi',
        pincode: '221101',
        lat: 25.4700, // ~300m from shop
        lon: 83.0570
      },
      paymentMethod: 'Cash on Delivery (COD)'
    }, customerToken);

    assert(validOrderRes.status === 201 && validOrderRes.data.success, 'Valid order created within 15 KM radius');
    const createdOrder = validOrderRes.data.order;
    assert(!!createdOrder.deliveryOtp, 'Generated 4-digit Delivery OTP: ' + createdOrder.deliveryOtp);

    // Duplicate order guard within 15s test
    const dupRes = await request('POST', '/orders', {
      items: [testItem],
      shippingAddress: {
        name: 'Pooja Sharma',
        mobile: '9899001122',
        houseFlat: 'Flat 302, Palm Heights',
        streetArea: 'Cholapur Main Road',
        city: 'Varanasi',
        pincode: '221101'
      },
      paymentMethod: 'Cash on Delivery (COD)'
    }, customerToken);
    assert((dupRes.status === 429 || dupRes.status === 400) && dupRes.data.message.toLowerCase().includes('duplicate'), 'Duplicate order debounced within 15 seconds');

    // ── 4. ORDER ASSIGNMENT & LIFECYCLE (Features 41-44) ──
    console.log('\n[TEST GROUP 4] Order Assignment & Delivery Execution');

    // Admin assigns order to delivery boy
    const assignRes = await request('PUT', `/admin/orders/${createdOrder._id}/assign-delivery`, {
      agentId: deliveryUser._id,
      agentName: deliveryUser.name,
      agentPhone: deliveryUser.mobile
    }, adminToken);
    assert(assignRes.status === 200 && assignRes.data.success, 'Admin assigned order to delivery boy');

    // Delivery boy checks assigned deliveries
    const myDelivs = await request('GET', '/delivery/my-deliveries', null, deliveryToken);
    assert(myDelivs.status === 200 && myDelivs.data.orders.some(o => o._id === createdOrder._id), 'Assigned order appears in rider portal');

    // Rider starts delivery
    const startRes = await request('POST', `/delivery/start-delivery/${createdOrder._id}`, null, deliveryToken);
    assert(startRes.status === 200 && startRes.data.order.orderStatus === 'Out for Delivery', 'Order transitioned to Out for Delivery');

    // Rider marks arrived
    const arrivedRes = await request('POST', `/delivery/arrived/${createdOrder._id}`, null, deliveryToken);
    assert(arrivedRes.status === 200 && arrivedRes.data.order.orderStatus === 'Arrived', 'Order transitioned to Arrived at customer doorstep');

    // ── 5. OTP VERIFICATION & COD SETTLEMENT (Features 47-50) ──
    console.log('\n[TEST GROUP 5] OTP Security & Delivery Completion');

    // Incorrect OTP attempt
    const wrongOtp = await request('POST', `/delivery/complete-delivery/${createdOrder._id}`, {
      otp: '9999',
      collectedAmount: createdOrder.totalAmount
    }, deliveryToken);
    assert(wrongOtp.status === 400 && wrongOtp.data.remainingAttempts !== undefined, 'Incorrect OTP rejected with attempts countdown');

    // Correct OTP completion
    const correctOtp = await request('POST', `/delivery/complete-delivery/${createdOrder._id}`, {
      otp: createdOrder.deliveryOtp,
      collectedAmount: createdOrder.totalAmount
    }, deliveryToken);
    assert(correctOtp.status === 200 && correctOtp.data.order.orderStatus === 'Delivered', 'Order marked Delivered upon valid customer OTP');

    // Check rider COD ledger
    const ledgerRes = await request('GET', '/delivery/cod-ledger', null, deliveryToken);
    assert(ledgerRes.status === 200 && ledgerRes.data.totalCollected >= createdOrder.totalAmount, 'Rider COD ledger accumulated cash collected');

    // Rider submits cash settlement
    const settleSubmit = await request('POST', '/delivery/submit-settlement', {
      amountSubmitted: createdOrder.totalAmount,
      notes: 'Evening deposit of cash collected'
    }, deliveryToken);
    assert(settleSubmit.status === 201 && settleSubmit.data.success, 'Rider submitted cash settlement');
    const settlementId = settleSubmit.data.settlement._id;

    // Admin verifies settlement
    const verifySettle = await request('PUT', `/admin/cash-settlements/${settlementId}/verify`, {
      verifiedAmount: createdOrder.totalAmount,
      remarks: 'Full cash received and verified'
    }, adminToken);
    assert(verifySettle.status === 200 && verifySettle.data.settlement.status === 'VERIFIED', 'Admin verified and approved cash settlement');

    // ── 6. RETURNS & 48H FRESH FOOD WINDOW (Features 61-64) ──
    console.log('\n[TEST GROUP 6] Return Requests & 48-Hour Fresh Window Policy');

    const returnReq = await request('POST', '/returns', {
      orderId: createdOrder.orderId,
      reason: 'Damaged package',
      description: 'Outer seal was torn during transit, flour leaking.',
      imageUrl: '/uploads/sample_damage.jpg'
    }, customerToken);
    assert(returnReq.status === 201 && returnReq.data.success, 'Customer reported return request within 48h window');
    const returnId = returnReq.data.returnRequest._id;

    // Admin creates free replacement order
    const replaceRes = await request('POST', `/admin/returns/${returnId}/create-replacement`, {
      notes: 'Customer packaging damage confirmed. Sending fresh replacement batch.'
    }, adminToken);
    assert(replaceRes.status === 201 && replaceRes.data.success, 'Admin created free replacement order');
    assert(replaceRes.data.replacementOrder.totalAmount === 0, 'Replacement order has ₹0 cost for customer');

    // ── 7. SUPPORT TICKETS & DATA ISOLATION (Features 67-70) ──
    console.log('\n[TEST GROUP 7] Support Tickets & Internal Notes');

    const ticketRes = await request('POST', '/support/tickets', {
      orderId: createdOrder.orderId,
      subject: 'Inquiry regarding fresh milling batch date',
      category: 'Milling Freshness',
      priority: 'MEDIUM',
      message: 'Can you please let me know when this wheat was ground on the chakki stones?'
    }, customerToken);
    assert(ticketRes.status === 201 && ticketRes.data.success, 'Customer opened support ticket');
    const ticketId = ticketRes.data.ticket.ticketId;

    // Customer views own tickets (internal notes must NOT be present)
    const myTickets = await request('GET', '/support/tickets/my-tickets', null, customerToken);
    assert(myTickets.status === 200 && myTickets.data.tickets.length > 0, 'Customer retrieved ticket list');
    assert(!myTickets.data.tickets[0].internalNotes, 'Internal notes strictly hidden from customer view');

    // Admin adds internal note
    const noteRes = await request('POST', `/support/admin/${ticketId}/internal-note`, {
      note: 'Miller checked: ground at 9:30 AM today, batch #M-102.'
    }, adminToken);
    assert(noteRes.status === 200 && noteRes.data.success, 'Admin added internal note to ticket');

    // Admin replies to customer
    const replyRes = await request('POST', `/support/tickets/${ticketId}/reply`, {
      message: 'Hello Rohan, your flour was milled at 9:30 AM this morning right before packing!'
    }, adminToken);
    assert(replyRes.status === 200 && replyRes.data.success, 'Admin replied to customer ticket');

    // ── 8. TAX INVOICE GENERATION (Features 78-80) ──
    console.log('\n[TEST GROUP 8] Tax Invoice & Delivery Receipt');

    const invoiceRes = await request('GET', `/orders/${createdOrder._id}/invoice`, null, customerToken);
    assert(invoiceRes.status === 200 && invoiceRes.data.success, 'Tax invoice generated');
    assert(invoiceRes.data.invoice.orderId === createdOrder.orderId, 'Invoice matches Order ID');
    assert(invoiceRes.data.invoice.items.length > 0, 'Invoice contains itemized products');

    // ── 9. LOYALTY, WALLET & REFERRALS (Features 85-88) ──
    console.log('\n[TEST GROUP 9] Loyalty Points, Wallet & Referral System');

    const loyaltyRes = await request('GET', '/auth/loyalty', null, customerToken);
    assert(loyaltyRes.status === 200 && loyaltyRes.data.success, 'Customer loyalty details retrieved');

    const walletRes = await request('GET', '/auth/wallet', null, customerToken);
    assert(walletRes.status === 200 && walletRes.data.success, 'Customer wallet details retrieved');

    const referralRes = await request('GET', '/auth/referral', null, customerToken);
    assert(referralRes.status === 200 && !!referralRes.data.referralCode, 'Customer referral code retrieved: ' + referralRes.data.referralCode);

    // ── 10. RECENTLY VIEWED & NOTIFICATION PREFERENCES (Features 75, 89) ──
    console.log('\n[TEST GROUP 10] Personalization & Preferences');

    const trackView = await request('POST', '/auth/recently-viewed', { productId: 'prod_1' }, customerToken);
    assert(trackView.status === 200 && trackView.data.success, 'Tracked recently viewed product');

    const prefsRes = await request('PUT', '/auth/preferences', {
      orderUpdates: true,
      deliveryAlerts: true,
      supportUpdates: true,
      promotionalOffers: true,
      reorderReminders: true
    }, customerToken);
    assert(prefsRes.status === 200 && prefsRes.data.preferences.promotionalOffers === true, 'Saved notification preferences');

    // ── SUMMARY ──
    console.log('\n=============================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('=============================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('All 40+ Feature validations passed successfully!\n');
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal error running tests:', err);
    process.exit(1);
  }
}

runTests();
