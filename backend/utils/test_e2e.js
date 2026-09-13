const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🌾 Starting BPS Fresh Mills Comprehensive E2E Tests...\n');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✔ PASS: ${testName}`);
      testsPassed++;
    } else {
      console.error(`✕ FAIL: ${testName}`);
      testsFailed++;
    }
  }

  try {
    // 1. Health check
    const health = await fetch(`${BASE_URL}/health`).then(r => r.json());
    assert(health.status === 'ok' && health.brand === 'BPS Fresh Mills', 'Backend health check ok');

    // 2. Public store settings
    const publicSettings = await fetch(`${BASE_URL}/public/settings`).then(r => r.json());
    assert(publicSettings.success && publicSettings.settings.maxDeliveryRadiusKm === 15, '15 KM Delivery radius configured in settings');

    // 3. Customer Signup
    const testMobile = '99990' + Math.floor(10000 + Math.random() * 90000);
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Customer',
        mobile: testMobile,
        email: `test.${Date.now()}@example.com`,
        password: 'Password@123',
        houseFlat: 'Flat 101, Green View',
        streetArea: 'Sector 14',
        city: 'Delhi',
        pincode: '110085',
        lat: 28.7100,
        lon: 77.1100
      })
    }).then(r => r.json());
    assert(signupRes.success && signupRes.token && signupRes.user.mobile === testMobile, 'Customer Signup with bcrypt password hashing');
    const customerToken = signupRes.token;

    // 4. Customer Login
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testMobile,
        password: 'Password@123'
      })
    }).then(r => r.json());
    assert(loginRes.success && loginRes.user.role === 'customer', 'Customer Login with mobile and password');

    // 5. Product search & filtering
    const productsRes = await fetch(`${BASE_URL}/products?search=Sharbati`).then(r => r.json());
    assert(productsRes.success && productsRes.products.length > 0, 'Product search for "Sharbati" returns results');
    const testProduct = productsRes.products[0];
    const initialStock = testProduct.stock;
    console.log(`  Current stock for ${testProduct.name}: ${initialStock}`);

    // 6. 15 KM Distance verification
    // Inside: (28.7100, 77.1100) ~2.1 km
    const insideRes = await fetch(`${BASE_URL}/orders/check-delivery-distance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 28.7100, lon: 77.1100 })
    }).then(r => r.json());
    assert(insideRes.isDeliverable === true, 'Distance check: 2.1 KM inside 15 KM radius allowed');

    // Outside: (28.4595, 77.0266) ~35 km
    const outsideRes = await fetch(`${BASE_URL}/orders/check-delivery-distance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 28.4595, lon: 77.0266 })
    }).then(r => r.json());
    assert(outsideRes.isDeliverable === false && outsideRes.message.includes('15 KM'), 'Distance check: > 15 KM blocked with exact message');

    // 7. Coupon application
    const couponRes = await fetch(`${BASE_URL}/offers/apply-coupon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'FRESH10', cartTotal: 600 })
    }).then(r => r.json());
    assert(couponRes.success && couponRes.coupon.discount === 60, 'Festival coupon FRESH10 gives 10% discount on ₹600');

    // 8. Order Placement inside 15 KM with atomic stock reduction
    const orderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        items: [
          {
            productId: testProduct._id,
            name: testProduct.name,
            weight: '5 KG',
            price: testProduct.price,
            quantity: 2
          }
        ],
        shippingAddress: {
          houseFlat: 'Flat 101, Green View',
          streetArea: 'Sector 14',
          city: 'Delhi',
          pincode: '110085',
          lat: 28.7100,
          lon: 77.1100
        },
        couponCode: 'FRESH10'
      })
    }).then(r => r.json());
    assert(orderRes.success && orderRes.order.orderId.startsWith('BPS'), `Order placed successfully with ID: #${orderRes.order?.orderId}`);
    const placedOrder = orderRes.order;

    // Verify stock was reduced by 2
    const productAfterOrder = await fetch(`${BASE_URL}/products/${testProduct._id}`).then(r => r.json());
    assert(productAfterOrder.product.stock === initialStock - 2, `Stock automatically reduced from ${initialStock} to ${initialStock - 2}`);

    // 9. Order Placement outside 15 KM is blocked
    const blockedOrderRes = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        items: [{ productId: testProduct._id, name: testProduct.name, price: testProduct.price, quantity: 1 }],
        shippingAddress: {
          houseFlat: 'Tower 5',
          streetArea: 'Faridabad High St',
          city: 'Faridabad',
          pincode: '121001',
          lat: 28.4089,
          lon: 77.3178 // ~45 KM away
        }
      })
    }).then(r => r.json());
    assert(blockedOrderRes.success === false && blockedOrderRes.message.includes('15 KM'), 'Order placement outside 15 KM rejected with error');

    // 10. Admin Login & Authorization
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'admin@bpsfreshmills.com',
        password: 'Admin@123'
      })
    }).then(r => r.json());
    assert(adminLoginRes.success && adminLoginRes.user.role === 'admin', 'Admin Login authenticated with role: admin');
    const adminToken = adminLoginRes.token;

    // 11. Admin Dashboard Analytics
    const dashboardStats = await fetch(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    assert(dashboardStats.success && dashboardStats.stats.totalOrders > 0, 'Admin Dashboard metrics loaded');

    // 12. Admin Order Status Update & Delivery Assignment
    const statusUpdate = await fetch(`${BASE_URL}/admin/orders/${placedOrder._id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Preparing' })
    }).then(r => r.json());
    assert(statusUpdate.success && statusUpdate.order.orderStatus === 'Preparing', 'Admin updated order status to "Preparing"');

    // Assign to delivery boy Amit Kumar
    const assignRes = await fetch(`${BASE_URL}/admin/orders/${placedOrder._id}/assign-delivery`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        agentId: 'delivery_1',
        agentName: 'Amit Kumar',
        agentPhone: '9812345678'
      })
    }).then(r => r.json());
    assert(assignRes.success && assignRes.order.assignedDeliveryBoy.name === 'Amit Kumar', 'Order assigned to delivery boy Amit Kumar');

    // 13. Delivery Boy Login & Completion with OTP
    const deliveryLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '9812345678',
        password: 'Delivery@123'
      })
    }).then(r => r.json());
    assert(deliveryLogin.success && deliveryLogin.user.role === 'delivery', 'Delivery Boy Login authenticated');
    const deliveryToken = deliveryLogin.token;

    // Complete delivery with customer OTP
    const completeDeliveryRes = await fetch(`${BASE_URL}/delivery/complete-delivery/${placedOrder._id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deliveryToken}`
      },
      body: JSON.stringify({
        otp: placedOrder.deliveryOtp,
        cashCollected: true
      })
    }).then(r => r.json());
    assert(completeDeliveryRes.success && completeDeliveryRes.order.orderStatus === 'Delivered', 'Delivery completed with OTP and COD cash marked collected');

    // 14. Verified Customer Review (Allowed now because order is Delivered)
    const reviewRes = await fetch(`${BASE_URL}/products/${testProduct._id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        rating: 5,
        comment: 'Freshly ground wheat aroma is unmatched! Made super tender rotis. Truly authentic chakki flour.'
      })
    }).then(r => r.json());
    assert(reviewRes.success && reviewRes.review.verifiedPurchase === true, 'Verified buyer submitted 5-star product review');

    console.log(`\n========================================`);
    console.log(`🏁 TESTS COMPLETED: ${testsPassed} Passed, ${testsFailed} Failed`);
    console.log(`========================================\n`);

    if (testsFailed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test run encountered an unexpected exception:', err);
    process.exit(1);
  }
}

runTests();
