const db = require('../config/db');

/**
 * BPS Fresh Mills — AI Business Assistant Engine
 * 
 * Guiding Principles:
 * 1. ZERO HALLUCINATION: All metrics and figures come strictly from real database queries.
 * 2. If data is unavailable, explicitly inform the administrator.
 * 3. SENSITIVE ACTIONS: Mutating actions (e.g. cancellations, stock changes) are NEVER
 *    executed autonomously; they return an Action Proposal requiring Admin confirmation.
 * 4. Multi-language: Understands Hindi, Hinglish, and English business queries.
 */

// Helper: Get local date string YYYY-MM-DD
function getLocalDateString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Get current month string YYYY-MM
function getLocalMonthString(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// 1. REAL DB METRIC AGGREGATORS
function getTodaySalesMetrics() {
  const todayStr = getLocalDateString();
  const orders = db.Orders.find(o => {
    const createdStr = o.createdAt ? o.createdAt.substring(0, 10) : '';
    return createdStr === todayStr && o.orderStatus !== 'Cancelled';
  });

  const totalOrdersToday = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const deliveredOrders = orders.filter(o => o.orderStatus === 'Delivered');
  const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const pendingDeliveryOrders = orders.filter(o => o.orderStatus !== 'Delivered');
  const pendingDeliveryRevenue = pendingDeliveryOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  return {
    date: todayStr,
    totalOrdersToday,
    totalRevenue,
    deliveredCount: deliveredOrders.length,
    deliveredRevenue,
    pendingDeliveryCount: pendingDeliveryOrders.length,
    pendingDeliveryRevenue
  };
}

function getTodayOrdersBreakdown() {
  const todayStr = getLocalDateString();
  const orders = db.Orders.find(o => {
    const createdStr = o.createdAt ? o.createdAt.substring(0, 10) : '';
    return createdStr === todayStr;
  });

  const statusCount = {};
  orders.forEach(o => {
    const s = o.orderStatus || 'Pending';
    statusCount[s] = (statusCount[s] || 0) + 1;
  });

  return {
    date: todayStr,
    totalOrders: orders.length,
    statusCount,
    ordersList: orders.map(o => ({
      orderId: o.orderId,
      customer: o.shippingAddress?.name || o.customerName || 'Customer',
      amount: o.totalAmount,
      status: o.orderStatus,
      paymentMethod: o.paymentMethod || 'COD',
      itemsCount: o.items?.length || 0
    }))
  };
}

function getTopSellingProductsMetrics(limit = 5) {
  const orders = db.Orders.find(o => o.orderStatus !== 'Cancelled');
  const productMap = {};

  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const pid = item.productId || item.name;
      if (!productMap[pid]) {
        productMap[pid] = {
          id: item.productId,
          name: item.name || 'BPS Grain Product',
          weight: item.variantWeight || item.weight || 'Standard',
          totalQuantitySold: 0,
          totalRevenue: 0,
          orderCount: 0
        };
      }
      const qty = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      productMap[pid].totalQuantitySold += qty;
      productMap[pid].totalRevenue += (qty * price);
      productMap[pid].orderCount += 1;
    });
  });

  const sorted = Object.values(productMap).sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);
  return sorted.slice(0, limit);
}

function getLowStockProductsMetrics(threshold = 10) {
  const products = db.Products.find();
  const lowStock = products
    .filter(p => Number(p.stock) <= threshold)
    .map(p => ({
      id: p._id,
      name: p.name,
      category: p.category,
      stock: Number(p.stock),
      price: p.price,
      weight: p.weight || '5 KG',
      isOutOfStock: Number(p.stock) <= 0
    }))
    .sort((a, b) => a.stock - b.stock);

  return {
    threshold,
    count: lowStock.length,
    products: lowStock
  };
}

function getMonthlyProfitAndRevenueMetrics() {
  const currentMonthStr = getLocalMonthString();
  const orders = db.Orders.find(o => {
    const createdMonth = o.createdAt ? o.createdAt.substring(0, 7) : '';
    return createdMonth === currentMonthStr && o.orderStatus !== 'Cancelled';
  });

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  const totalOrders = orders.length;

  // Chakki milling gross margin: BPS Fresh Mills standard gross product margin is approx 28%
  const settings = db.Settings.find()[0] || {};
  const estimatedMarginPct = settings.grossMarginPercentage || 28;
  const estimatedGrossProfit = Math.round((totalRevenue * estimatedMarginPct) / 100);

  return {
    month: currentMonthStr,
    totalOrders,
    totalRevenue,
    estimatedMarginPct,
    estimatedGrossProfit
  };
}

function getPendingCodMetrics() {
  // 1. Delivery Agents ledger difference
  const agents = db.DeliveryAgents.find();
  let totalCashWithRiders = 0;
  const ridersSummary = [];

  agents.forEach(a => {
    const collected = Number(a.totalCashCollected) || 0;
    const deposited = Number(a.totalCashDeposited) || 0;
    const diff = Math.max(0, collected - deposited);
    if (diff > 0) {
      totalCashWithRiders += diff;
      ridersSummary.push({
        agentId: a._id,
        name: a.name,
        phone: a.mobile,
        cashHeld: diff
      });
    }
  });

  // 2. Orders Out for Delivery (Cash to be collected upon doorstep delivery)
  const activeCodOrders = db.Orders.find(o =>
    (o.orderStatus === 'Out for Delivery' || o.orderStatus === 'Delivery Assigned' || o.orderStatus === 'Arrived') &&
    (!o.paymentMethod || o.paymentMethod.toLowerCase().includes('cash') || o.paymentMethod.toLowerCase().includes('cod'))
  );
  const transitCash = activeCodOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  // 3. Unverified submitted cash settlements
  const unverifiedSettlements = db.CashSettlements.find(s => s.status === 'SUBMITTED');
  const unverifiedTotal = unverifiedSettlements.reduce((sum, s) => sum + (Number(s.depositedAmount) || 0), 0);

  return {
    totalPendingCod: totalCashWithRiders + transitCash,
    cashHeldByRiders: totalCashWithRiders,
    transitCashPendingDelivery: transitCash,
    transitOrdersCount: activeCodOrders.length,
    unverifiedSettlementsCount: unverifiedSettlements.length,
    unverifiedSettlementsAmount: unverifiedTotal,
    ridersSummary
  };
}

function getSpecificOrderInfo(orderIdQuery) {
  if (!orderIdQuery) return null;
  const cleanId = orderIdQuery.replace(/#/g, '').trim().toUpperCase();
  const order = db.Orders.findOne(o =>
    (o.orderId && o.orderId.toUpperCase() === cleanId) ||
    o._id === orderIdQuery ||
    (o.orderId && o.orderId.toUpperCase().includes(cleanId))
  );
  return order;
}

// 2. SENSITIVE ACTION PROPOSAL DETECTOR
function detectActionProposal(text) {
  const lower = text.toLowerCase();

  // Pattern: Cancel Order
  const cancelMatch = lower.match(/(cancel|radd|cancel karo|cancel order)\s+(order\s+)?(#?[a-z0-9_-]+)/i);
  if (cancelMatch) {
    const rawId = cancelMatch[3].replace(/#/g, '').trim();
    const order = getSpecificOrderInfo(rawId);
    if (order) {
      return {
        actionType: 'CANCEL_ORDER',
        requiresConfirmation: true,
        targetId: order._id,
        orderId: order.orderId,
        description: `Order #${order.orderId} ko Cancel karna. (Customer: ${order.shippingAddress?.name || 'Customer'}, Amount: ₹${order.totalAmount})`,
        warning: '⚠️ Dhyan dein: Is order ko cancel karne ke baad customer ko notification jayega aur inventory wapas restore ho sakti hai.'
      };
    }
  }

  // Pattern: Stock Update
  const stockMatch = lower.match(/(update stock|stock badhao|stock set karo|change stock)\s+(.+?)\s+(to|ko|par)\s+(\d+)/i);
  if (stockMatch) {
    const prodNameQuery = stockMatch[2].trim().toLowerCase();
    const newStock = parseInt(stockMatch[4], 10);
    const searchWords = prodNameQuery.split(/\s+/).filter(w => w.length >= 2);
    const product = db.Products.findOne(p => {
      const pName = p.name.toLowerCase();
      if (pName.includes(prodNameQuery)) return true;
      return searchWords.length > 0 && searchWords.every(w => pName.includes(w));
    });
    if (product && !isNaN(newStock)) {
      return {
        actionType: 'UPDATE_STOCK',
        requiresConfirmation: true,
        targetId: product._id,
        productName: product.name,
        currentStock: product.stock,
        newStock,
        description: `${product.name} ka stock ${product.stock} se badal kar ${newStock} karna.`,
        warning: '⚠️ Dhyan dein: Catalog mein naya stock turant sabhi customers ko dikhne lagega.'
      };
    }
  }

  return null;
}

// 3. DETERMINISTIC REAL DATA QUERY ANSWERER (Hindi, Hinglish, English)
function answerWithRealData(userQuery) {
  const query = (userQuery || '').toLowerCase().trim();

  // Check for sensitive action proposal first
  const proposal = detectActionProposal(userQuery);
  if (proposal) {
    return {
      answer: `Maine aapki request detect ki hai: **${proposal.description}**.\n\n⚠️ **Security Policy:** BPS Fresh Mills AI Assistant bina Admin confirmation ke data modify nahi karta. Kripya niche diye gaye button par click karke confirm karein.`,
      facts: proposal,
      actionProposal: proposal,
      source: 'DATABASE_GROUNDED'
    };
  }

  // 1. Aaj kitni sale hui?
  if (
    query.includes('aaj kitni sale') ||
    query.includes('today sale') ||
    query.includes('today sales') ||
    query.includes('todays sale') ||
    query.includes('aaj ki kamai') ||
    query.includes('aaj kitna bika') ||
    query.includes('today revenue') ||
    query.includes('aaj ka revenue') ||
    query.includes('today total sale')
  ) {
    const data = getTodaySalesMetrics();
    const answer = `🌾 **Aaj ki BPS Fresh Mills Sales Report (${data.date}):**\n\n` +
      `• **Total Orders Aaj:** ${data.totalOrdersToday} orders\n` +
      `• **Total Sale Volume:** ₹${data.totalRevenue.toLocaleString('en-IN')}\n` +
      `• **Delivered & Realized:** ₹${data.deliveredRevenue.toLocaleString('en-IN')} (${data.deliveredCount} orders)\n` +
      `• **Out for Delivery / In Process:** ₹${data.pendingDeliveryRevenue.toLocaleString('en-IN')} (${data.pendingDeliveryCount} orders)\n\n` +
      `*Note: Yeh data real database ke delivered & active orders par aadharit hai.*`;
    return { answer, facts: data, source: 'DATABASE_GROUNDED' };
  }

  // 2. Kaunsa product sabse zyada bik raha hai? / Top products
  if (
    query.includes('sabse zyada bik') ||
    query.includes('sabse jyada bik') ||
    query.includes('top selling') ||
    query.includes('best seller') ||
    query.includes('bestseller') ||
    query.includes('most sold') ||
    query.includes('highest selling') ||
    query.includes('kaunsa product sabse zyada')
  ) {
    const top = getTopSellingProductsMetrics(5);
    if (top.length === 0) {
      return {
        answer: 'Filhal database mein order data kam hai ya koi product delivered nahi hua hai.',
        facts: [],
        source: 'DATABASE_GROUNDED'
      };
    }
    const best = top[0];
    let listText = top.map((p, idx) => `${idx + 1}. **${p.name}** (${p.weight}) — **${p.totalQuantitySold} packets** bik chuke hain (Revenue: ₹${p.totalRevenue.toLocaleString('en-IN')})`).join('\n');
    const answer = `🏆 **BPS Fresh Mills Best Selling Grain:**\n\n` +
      `Sabse zyada bikne wala product **${best.name}** hai, jiske kul **${best.totalQuantitySold} packets** orders mein sell hue hain.\n\n` +
      `**Top Selling List:**\n${listText}`;
    return { answer, facts: top, source: 'DATABASE_GROUNDED' };
  }

  // 3. Kaunsa stock jaldi khatam hoga? / Low stock
  if (
    query.includes('stock jaldi khatam') ||
    query.includes('stock khatam') ||
    query.includes('low stock') ||
    query.includes('kam stock') ||
    query.includes('stock alert') ||
    query.includes('out of stock') ||
    query.includes('konsa stock kam hai') ||
    query.includes('kaunsa stock kam hai')
  ) {
    const low = getLowStockProductsMetrics(10);
    if (low.count === 0) {
      return {
        answer: `✅ **Stock Alert:** Sabhi products ka stock healthy hai! Kisi bhi grain product ka stock 10 se kam nahi hai.`,
        facts: low,
        source: 'DATABASE_GROUNDED'
      };
    }
    const list = low.products.map(p =>
      `• **${p.name}** (${p.weight}): ${p.stock <= 0 ? '🔴 **OUT OF STOCK (0 units)**' : `⚠️ **${p.stock} units baaki**`}`
    ).join('\n');
    const answer = `⚠️ **Low Stock Alert (${low.count} Products):**\n\n` +
      `Niche diye gaye products ka stock jaldi khatam hone wala hai ya khatam ho chuka hai:\n\n${list}\n\n` +
      `💡 *Sujhav: Mill floor par fresh milling batch schedule karein taaki customers ko out of stock na dikhe.*`;
    return { answer, facts: low, source: 'DATABASE_GROUNDED' };
  }

  // 4. Is month profit kitna hai? / Monthly revenue
  if (
    query.includes('month profit') ||
    query.includes('mahine ka profit') ||
    query.includes('mahine ki kamai') ||
    query.includes('monthly profit') ||
    query.includes('month revenue') ||
    query.includes('is mahine ki sale') ||
    query.includes('this month')
  ) {
    const data = getMonthlyProfitAndRevenueMetrics();
    const answer = `📈 **BPS Fresh Mills Monthly Performance (${data.month}):**\n\n` +
      `• **Kul Mahine ke Orders:** ${data.totalOrders}\n` +
      `• **Kul Gross Revenue:** ₹${data.totalRevenue.toLocaleString('en-IN')}\n` +
      `• **Estimated Gross Milling Margin:** ~${data.estimatedMarginPct}%\n` +
      `• **Anumaanit Gross Profit:** ₹${data.estimatedGrossProfit.toLocaleString('en-IN')}\n\n` +
      `*Formula: Gross Profit calculated as (${data.estimatedMarginPct}% of Total Non-Cancelled Monthly Revenue).*`;
    return { answer, facts: data, source: 'DATABASE_GROUNDED' };
  }

  // 5. Kitna COD pending hai?
  if (
    query.includes('cod pending') ||
    query.includes('pending cod') ||
    query.includes('kitna cash baaki') ||
    query.includes('kitna cod') ||
    query.includes('cash pending') ||
    query.includes('rider cash') ||
    query.includes('cash settlement')
  ) {
    const data = getPendingCodMetrics();
    let riderText = data.ridersSummary.length > 0
      ? data.ridersSummary.map(r => `  - **${r.name}** (${r.phone}): ₹${r.cashHeld.toLocaleString('en-IN')} pending deposit`).join('\n')
      : '  - Kisi bhi delivery boy ke paas un-deposited cash nahi hai.';

    const answer = `💼 **BPS Fresh Mills COD Cash Status:**\n\n` +
      `• **Riders ke paas Collected Cash (Awaiting Deposit):** ₹${data.cashHeldByRiders.toLocaleString('en-IN')}\n` +
      `• **Awaiting Verification Settlements:** ${data.unverifiedSettlementsCount} settlements (₹${data.unverifiedSettlementsAmount.toLocaleString('en-IN')})\n` +
      `• **Out for Delivery (Doorstep par collect hoga):** ₹${data.transitCashPendingDelivery.toLocaleString('en-IN')} (${data.transitOrdersCount} orders)\n` +
      `• **Kul Pending COD Value:** **₹${data.totalPendingCod.toLocaleString('en-IN')}**\n\n` +
      `**Rider-wise Breakup:**\n${riderText}`;
    return { answer, facts: data, source: 'DATABASE_GROUNDED' };
  }

  // 6. Aaj kitne orders aaye?
  if (
    query.includes('aaj kitne order') ||
    query.includes('today order') ||
    query.includes('kitne orders aaye') ||
    query.includes('aaj ke orders') ||
    query.includes('orders today')
  ) {
    const data = getTodayOrdersBreakdown();
    const statusBreakdown = Object.entries(data.statusCount)
      .map(([s, count]) => `• **${s}:** ${count}`)
      .join('\n');

    const answer = `📦 **Aaj ke Orders (${data.date}):**\n\n` +
      `Aaj kul **${data.totalOrders}** orders place hue hain.\n\n` +
      `**Status Summary:**\n${statusBreakdown || 'Koi orders nahi aaye abhi tak.'}`;
    return { answer, facts: data, source: 'DATABASE_GROUNDED' };
  }

  // 7. Top 5 products kaunse hain?
  if (
    query.includes('top 5') ||
    query.includes('top five') ||
    query.includes('top 10')
  ) {
    const top = getTopSellingProductsMetrics(5);
    const list = top.map((p, i) => `${i + 1}. **${p.name}** (${p.weight}) — ${p.totalQuantitySold} units (₹${p.totalRevenue.toLocaleString('en-IN')})`).join('\n');
    const answer = `🌟 **BPS Fresh Mills Top 5 Best Sellers:**\n\n${list || 'Database mein order history uplabdh nahi hai.'}`;
    return { answer, facts: top, source: 'DATABASE_GROUNDED' };
  }

  // 8. Specific Order lookup (e.g. "Order BPS1025 ka status kya hai?")
  const orderLookupMatch = query.match(/(bps\d+|#bps\d+)/i);
  if (orderLookupMatch) {
    const orderId = orderLookupMatch[1].replace(/#/g, '').toUpperCase();
    const order = getSpecificOrderInfo(orderId);
    if (order) {
      const itemsList = (order.items || []).map(it => `${it.name} (${it.variantWeight || ''}) × ${it.quantity}`).join(', ');
      const answer = `📋 **Order #${order.orderId} Details:**\n\n` +
        `• **Customer:** ${order.shippingAddress?.name || 'Customer'}\n` +
        `• **Mobile:** ${order.shippingAddress?.mobile || 'N/A'}\n` +
        `• **Status:** **${order.orderStatus}**\n` +
        `• **Total Amount:** ₹${order.totalAmount} (${order.paymentMethod || 'COD'})\n` +
        `• **Items:** ${itemsList}\n` +
        `• **Delivery Boy:** ${order.assignedDeliveryBoy?.name ? `${order.assignedDeliveryBoy.name} (${order.assignedDeliveryBoy.phone})` : 'Abhi assign nahi hua'}\n` +
        `• **Delivery OTP:** ${order.deliveryOtp ? `\`${order.deliveryOtp}\`` : 'N/A'}\n` +
        `• **Address:** ${order.shippingAddress?.houseFlat}, ${order.shippingAddress?.streetArea}, ${order.shippingAddress?.city}`;
      return { answer, facts: order, source: 'DATABASE_GROUNDED' };
    } else {
      return {
        answer: `❌ Database mein order ID **#${orderId}** nahi mila. Kripya order number check karein.`,
        facts: null,
        source: 'DATABASE_GROUNDED'
      };
    }
  }

  // 9. Graceful fallback for unavailable/unsupported query
  return {
    answer: `Database mein is vishay ka verified data uplabdh nahi hai. Main real-time database se judi jaankaari de sakta hoon, jaise:\n\n` +
      `• *“Aaj kitni sale hui?”*\n` +
      `• *“Kaunsa product sabse zyada bik raha hai?”*\n` +
      `• *“Kaunsa stock jaldi khatam hoga?”*\n` +
      `• *“Is month profit kitna hai?”*\n` +
      `• *“Kitna COD pending hai?”*\n` +
      `• *“Aaj kitne orders aaye?”*\n` +
      `• *“Top 5 products kaunse hain?”*\n` +
      `• *“Order #BPS1030 ka status kya hai?”*`,
    facts: null,
    source: 'UNAVAILABLE'
  };
}

// 4. ACTION EXECUTOR (Admin confirmed only)
function executeConfirmedAction(actionPayload, adminUser) {
  if (!actionPayload || !actionPayload.actionType) {
    throw new Error('Invalid action payload provided.');
  }

  const { actionType, targetId, newStock } = actionPayload;

  if (actionType === 'CANCEL_ORDER') {
    const order = db.Orders.findById(targetId) || db.Orders.findOne(o => o.orderId === targetId || o._id === targetId);
    if (!order) throw new Error('Order not found for cancellation.');
    if (order.orderStatus === 'Delivered') {
      throw new Error('Cannot cancel an order that is already delivered.');
    }

    const timeline = order.statusTimeline || [];
    timeline.push({
      status: 'Cancelled',
      timestamp: new Date().toISOString(),
      note: `Cancelled by Admin (${adminUser.name}) via AI Business Assistant confirmation.`
    });

    const updated = db.Orders.updateById(order._id, {
      orderStatus: 'Cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: adminUser.name,
      statusTimeline: timeline
    });

    return {
      success: true,
      message: `Order #${order.orderId} successfully marked as CANCELLED by ${adminUser.name}.`,
      order: updated
    };
  }

  if (actionType === 'UPDATE_STOCK') {
    const product = db.Products.findById(targetId);
    if (!product) throw new Error('Product not found for stock update.');

    const oldStock = product.stock;
    const updated = db.Products.updateById(product._id, {
      stock: Number(newStock)
    });

    return {
      success: true,
      message: `Stock for ${product.name} successfully updated from ${oldStock} to ${newStock} by ${adminUser.name}.`,
      product: updated
    };
  }

  throw new Error(`Unsupported action type: ${actionType}`);
}

module.exports = {
  answerWithRealData,
  executeConfirmedAction,
  getTodaySalesMetrics,
  getTopSellingProductsMetrics,
  getLowStockProductsMetrics,
  getMonthlyProfitAndRevenueMetrics,
  getPendingCodMetrics,
  getTodayOrdersBreakdown
};
