require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function seedDatabase() {
  console.log('Seeding BPS Fresh Mills database...');

  // 1. Settings
  const existingSettings = db.Settings.find();
  if (existingSettings.length === 0) {
    db.Settings.insertOne({
      shopName: 'BPS Fresh Mills',
      tagline: 'Freshly Milled. Naturally Good.',
      phone: '6386621332',
      whatsapp: '6386621332',
      email: 'bpsfreshmills@gmail.com',
      shopAddress: 'Lakhanpur, Cholapur, Varanasi 221101',
      shopLat: 25.4678,
      shopLon: 83.0564,
      maxDeliveryRadiusKm: 15,
      deliveryCharge: 40,
      freeDeliveryThreshold: 500,
      businessHours: 'Mon - Sat: 8:00 AM - 8:30 PM | Sunday: 9:00 AM - 2:00 PM',
      supportPhone: '6386621332',
      supportWhatsapp: '6386621332',
      supportEmail: 'bpsfreshmills@gmail.com',
      whatsappDefaultMessage: 'Hello BPS Fresh Mills! I would like to enquire about your fresh chakki atta.',
      callEnabled: true,
      whatsappEnabled: true,
      returnPolicy: 'Because our flours are freshly milled food products with zero preservatives, returns or replacements are accepted within 48 hours of delivery for damaged packaging, wrong product, or verified quality concerns.',
      terms: 'All flours are stone-ground on order or in daily micro-batches to ensure peak freshness and nutrient retention. Delivery is strictly provided within our 15 KM service radius.',
      privacyPolicy: 'We strictly protect customer phone numbers and delivery addresses. We never share customer data with unauthorized third parties.'
    });
    console.log('✔ Settings initialized.');
  }

  // 2. Users (Admin, Delivery Agents, Sample Customer)
  const existingUsers = db.Users.find();
  if (existingUsers.length === 0) {
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const deliveryPasswordHash = await bcrypt.hash('Delivery@123', 10);
    const customerPasswordHash = await bcrypt.hash('Customer@123', 10);

    const adminUser = db.Users.insertOne({
      name: 'BPS Admin',
      email: 'admin@bpsfreshmills.com',
      mobile: '9876543210',
      password: adminPasswordHash,
      role: 'admin',
      addresses: []
    });

    const deliveryUser1 = db.Users.insertOne({
      name: 'Amit Kumar',
      email: 'amit.delivery@bpsfreshmills.com',
      mobile: '9812345678',
      password: deliveryPasswordHash,
      role: 'delivery',
      status: 'active',
      totalDelivered: 42,
      addresses: []
    });

    const deliveryUser2 = db.Users.insertOne({
      name: 'Rahul Verma',
      email: 'rahul.delivery@bpsfreshmills.com',
      mobile: '9823456789',
      password: deliveryPasswordHash,
      role: 'delivery',
      status: 'active',
      totalDelivered: 29,
      addresses: []
    });

    // Also add to DeliveryAgents collection
    db.DeliveryAgents.insertOne({
      userId: deliveryUser1._id,
      name: 'Amit Kumar',
      mobile: '9812345678',
      activeOrdersCount: 1,
      totalCashCollected: 3850,
      totalCashDeposited: 3850,
      cashDifference: 0,
      status: 'active'
    });

    db.DeliveryAgents.insertOne({
      userId: deliveryUser2._id,
      name: 'Rahul Verma',
      mobile: '9823456789',
      activeOrdersCount: 0,
      totalCashCollected: 2100,
      totalCashDeposited: 2100,
      cashDifference: 0,
      status: 'active'
    });

    const customerUser = db.Users.insertOne({
      name: 'Pooja Sharma',
      email: 'pooja.sharma@example.com',
      mobile: '9899001122',
      password: customerPasswordHash,
      role: 'customer',
      addresses: [
        {
          id: 'addr_1',
          name: 'Pooja Sharma',
          mobile: '9899001122',
          houseFlat: 'Flat 302, Palm Heights',
          streetArea: 'Sector 15, Rohini',
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110085',
          landmark: 'Opposite Mother Dairy',
          isDefault: true,
          lat: 28.7100,
          lon: 77.1100,
          distanceKm: 2.1
        }
      ]
    });

    console.log('✔ Users & Delivery Agents created.');
  }

  // 3. Products
  const existingProducts = db.Products.find();
  if (existingProducts.length === 0) {
    const products = [
      {
        name: 'Chakki Fresh Sharbati Atta',
        slug: 'chakki-fresh-sharbati-atta',
        category: 'Whole Wheat',
        shortDescription: '100% MP Sehore Sharbati wheat, traditional slow stone-milled for super soft rotis.',
        description: 'BPS Fresh Mills Sharbati Atta is freshly stone-ground from the finest golden Sharbati wheat grains sourced directly from Sehore, Madhya Pradesh. Our traditional slow chakki milling technique ensures the wheat bran and wheat germ remain intact, retaining natural sweetness, aroma, and high dietary fiber. Every batch is milled fresh on order — no maida mixing, zero preservatives, 100% natural goodness.',
        ingredients: '100% Whole Sharbati Wheat Grains (Triticum aestivum). Slow stone milled.',
        weights: [
          { weight: '5 KG', price: 290, originalPrice: 320, inStock: true, stockCount: 35 },
          { weight: '10 KG', price: 560, originalPrice: 620, inStock: true, stockCount: 22 }
        ],
        price: 290,
        originalPrice: 320,
        discountPercent: 9,
        weight: '5 KG',
        stock: 35,
        lowStockThreshold: 5,
        rating: 4.9,
        reviewCount: 48,
        isFeatured: true,
        isActive: true,
        image: '/products/chakki-atta-bag.jpg',
        images: [
          '/products/chakki-atta-bag.jpg',
          'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
          'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80'
        ],
        tags: ['bestseller', 'stone-ground', 'daily-roti', 'sharbati']
      },
      {
        name: 'Pure Traditional Chakki Whole Wheat Atta',
        slug: 'pure-traditional-chakki-whole-wheat-atta',
        category: 'Whole Wheat',
        shortDescription: 'Classic whole wheat flour, coarse texture with natural bran for wholesome daily meals.',
        description: 'Ground in authentic stone mills, this classic whole wheat flour provides high natural dietary fiber and rich texture. Ideal for daily wholesome rotis, parathas, and pooris. Ground at low RPM to prevent heat generation and preserve vital micronutrients.',
        ingredients: '100% Cleaned Whole Wheat Grains.',
        weights: [
          { weight: '5 KG', price: 240, originalPrice: 270, inStock: true, stockCount: 40 },
          { weight: '10 KG', price: 460, originalPrice: 520, inStock: true, stockCount: 18 }
        ],
        price: 240,
        originalPrice: 270,
        discountPercent: 11,
        weight: '5 KG',
        stock: 40,
        lowStockThreshold: 5,
        rating: 4.8,
        reviewCount: 36,
        isFeatured: true,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80'
        ],
        tags: ['traditional', 'whole-grain', 'fiber-rich']
      },
      {
        name: 'Diabetic Care Multigrain Atta',
        slug: 'diabetic-care-multigrain-atta',
        category: 'Specialty',
        shortDescription: 'Balanced blend of Sharbati wheat, roasted chana, methi seeds, oats, and ragi.',
        description: 'Carefully crafted for individuals seeking a low-glycemic index flour. Combines high-fiber whole wheat with protein-packed roasted black chana, fenugreek (methi) seeds, rolled oats, and calcium-dense ragi. Recommended for balanced blood sugar and digestive wellness.',
        ingredients: 'Whole Wheat (65%), Roasted Chana (15%), Oats (10%), Ragi (5%), Fenugreek/Methi (3%), Flaxseeds (2%).',
        weights: [
          { weight: '5 KG', price: 340, originalPrice: 380, inStock: true, stockCount: 20 },
          { weight: '10 KG', price: 650, originalPrice: 720, inStock: true, stockCount: 12 }
        ],
        price: 340,
        originalPrice: 380,
        discountPercent: 10,
        weight: '5 KG',
        stock: 20,
        lowStockThreshold: 4,
        rating: 4.9,
        reviewCount: 28,
        isFeatured: true,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80'
        ],
        tags: ['multigrain', 'diabetic-care', 'high-protein']
      },
      {
        name: 'Desi Chana Besan (Pure Gram Flour)',
        slug: 'desi-chana-besan-pure-gram-flour',
        category: 'Gram & Pulses',
        shortDescription: '100% pure roasted Bengal gram flour. Unadulterated, fragrant, and silky smooth.',
        description: 'Made solely from supreme grade unpolished Desi Chana dal. Absolutely free from khesari or yellow pea adulteration. Gives heavenly aroma to kadhi, pakoras, dhokla, chilla, and traditional festive laddoos.',
        ingredients: '100% Pure Desi Bengal Gram Dal (Cicer arietinum).',
        weights: [
          { weight: '1 KG', price: 110, originalPrice: 125, inStock: true, stockCount: 25 },
          { weight: '2 KG', price: 210, originalPrice: 245, inStock: true, stockCount: 15 }
        ],
        price: 110,
        originalPrice: 125,
        discountPercent: 12,
        weight: '1 KG',
        stock: 25,
        lowStockThreshold: 5,
        rating: 4.9,
        reviewCount: 31,
        isFeatured: true,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1627485937980-221c88ac04f9?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1627485937980-221c88ac04f9?auto=format&fit=crop&w=800&q=80'
        ],
        tags: ['pure-besan', 'unadulterated', 'fragrant']
      },
      {
        name: 'Fresh Stone-Milled Bajra Atta',
        slug: 'fresh-stone-milled-bajra-atta',
        category: 'Millets',
        shortDescription: 'Naturally gluten-free pearl millet flour. Rich in iron, zinc, and warming comfort.',
        description: 'Freshly ground pearl millet (bajra) flour prepared in clean dedicated chakki stones. A winter staple and nutrient powerhouse that keeps the body warm and energised. Makes delightful traditional bajre ki roti.',
        ingredients: '100% Natural Cleaned Pearl Millet (Bajra).',
        weights: [
          { weight: '1 KG', price: 65, originalPrice: 75, inStock: true, stockCount: 18 },
          { weight: '2 KG', price: 125, originalPrice: 145, inStock: true, stockCount: 14 }
        ],
        price: 65,
        originalPrice: 75,
        discountPercent: 13,
        weight: '1 KG',
        stock: 18,
        lowStockThreshold: 4,
        rating: 4.7,
        reviewCount: 22,
        isFeatured: true,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80'
        ],
        tags: ['gluten-free', 'millets', 'iron-rich']
      },
      {
        name: 'Pure Jowar Atta (Sorghum Flour)',
        slug: 'pure-jowar-atta-sorghum-flour',
        category: 'Millets',
        shortDescription: 'Stone-ground white sorghum flour. Light on the stomach, gluten-free, and cooling.',
        description: 'Finely ground from handpicked white jowar grains. Known for high dietary fiber and easy digestibility. Perfect for wholesome gluten-free bhakri and healthy pancakes.',
        ingredients: '100% Pure White Sorghum (Jowar) Grains.',
        weights: [
          { weight: '1 KG', price: 75, originalPrice: 85, inStock: true, stockCount: 20 },
          { weight: '2 KG', price: 145, originalPrice: 165, inStock: true, stockCount: 10 }
        ],
        price: 75,
        originalPrice: 85,
        discountPercent: 12,
        weight: '1 KG',
        stock: 20,
        lowStockThreshold: 5,
        rating: 4.8,
        reviewCount: 19,
        isFeatured: false,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=800&q=80'
        ],
        tags: ['millets', 'gluten-free', 'cooling']
      },
      {
        name: 'Makki Ka Atta (Yellow Maize Flour)',
        slug: 'makki-ka-atta-yellow-maize-flour',
        category: 'Specialty',
        shortDescription: 'Golden sun-dried corn flour, stone-milled for the authentic Makki Di Roti experience.',
        description: 'Authentic golden yellow corn flour ground to the ideal consistency. Pair with Sarson Ka Saag and freshly churned white butter for a classic wholesome Punjabi culinary delight.',
        ingredients: '100% Natural Yellow Corn Grains.',
        weights: [
          { weight: '1 KG', price: 70, originalPrice: 80, inStock: true, stockCount: 22 },
          { weight: '2 KG', price: 135, originalPrice: 155, inStock: true, stockCount: 12 }
        ],
        price: 70,
        originalPrice: 80,
        discountPercent: 12,
        weight: '1 KG',
        stock: 22,
        lowStockThreshold: 5,
        rating: 4.9,
        reviewCount: 25,
        isFeatured: false,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80'
        ],
        tags: ['winter-special', 'corn-flour', 'traditional']
      },
      {
        name: 'Pure Roasted Gram Sattu',
        slug: 'pure-roasted-gram-sattu',
        category: 'Gram & Pulses',
        shortDescription: 'Traditional roasted Bengal gram sattu. The natural Indian superfood protein shake.',
        description: 'Prepared by roasting selected Bengal gram in sand and slow stone grinding with the husk. Packed with natural plant protein, dietary fiber, and instant cooling hydration. Perfect for refreshing summer sharbat or stuffed sattu parathas.',
        ingredients: '100% Sand-Roasted Desi Chana with Husk.',
        weights: [
          { weight: '1 KG', price: 140, originalPrice: 160, inStock: true, stockCount: 3 }, // low stock example!
          { weight: '2 KG', price: 270, originalPrice: 310, inStock: true, stockCount: 2 }
        ],
        price: 140,
        originalPrice: 160,
        discountPercent: 12,
        weight: '1 KG',
        stock: 3, // Low stock triggers "Only 3 items left."
        lowStockThreshold: 5,
        rating: 4.9,
        reviewCount: 34,
        isFeatured: true,
        isActive: true,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        images: [
          'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'
        ],
        tags: ['superfood', 'high-protein', 'sattu']
      }
    ];

    db.Products.insertMany(products);
    console.log('✔ Products created with real stock and pricing.');
  }

  // 3b. Seed Categories
  const existingCategories = db.Categories.find();
  if (existingCategories.length === 0) {
    const cats = [
      { name: 'Whole Wheat', description: 'Stone-ground whole wheat atta varieties', sortOrder: 1, isActive: true },
      { name: 'Specialty', description: 'Multigrain, diabetic care, and specialty flours', sortOrder: 2, isActive: true },
      { name: 'Gram & Pulses', description: 'Pure besan, sattu and gram flour', sortOrder: 3, isActive: true },
      { name: 'Millets', description: 'Bajra, jowar, ragi and other millet flours', sortOrder: 4, isActive: true },
      { name: 'Rice Flour', description: 'Fresh stone-ground rice flour varieties', sortOrder: 5, isActive: true }
    ];
    db.Categories.insertMany(cats);
    console.log('✔ Categories seeded.');
  }

  // 4. Festival Offers & Coupons
  const existingOffers = db.Offers.find();
  if (existingOffers.length === 0) {
    const offers = [
      {
        name: 'FESTIVE SPECIAL',
        code: 'FRESH10',
        discountPercent: 10,
        flatDiscount: 0,
        minOrderValue: 500,
        maxDiscount: 150,
        description: 'Get 10% OFF on orders above ₹500',
        bannerText: 'FESTIVE SPECIAL: Get 10% OFF on freshly milled flours above ₹500!',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
        isActive: true
      },
      {
        name: 'FREE DELIVERY SPECIAL',
        code: 'FREESHIP',
        discountPercent: 0,
        flatDiscount: 40,
        minOrderValue: 400,
        maxDiscount: 40,
        description: 'Free Delivery on orders above ₹400',
        bannerText: 'FREE DELIVERY: Enjoy free doorstep delivery within 15 KM on orders above ₹400',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
        isActive: true
      },
      {
        name: 'FAMILY PACK OFFER',
        code: 'CHAKKI50',
        discountPercent: 0,
        flatDiscount: 50,
        minOrderValue: 600,
        maxDiscount: 50,
        description: 'Flat ₹50 OFF on orders above ₹600',
        bannerText: 'Stock up for the month! Flat ₹50 OFF on flour orders above ₹600',
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
        isActive: true
      }
    ];
    db.Offers.insertMany(offers);
    console.log('✔ Offers and Coupons initialized.');
  }

  // 5. Sample Initial Orders & Reviews
  const existingOrders = db.Orders.find();
  if (existingOrders.length === 0) {
    const products = db.Products.find();
    const sharbatiAtta = products[0];

    db.Orders.insertOne({
      orderId: 'BPS1024',
      customerId: 'sample_cust_1',
      customerName: 'Pooja Sharma',
      customerPhone: '9899001122',
      customerEmail: 'pooja.sharma@example.com',
      shippingAddress: {
        name: 'Pooja Sharma',
        mobile: '9899001122',
        houseFlat: 'Flat 302, Palm Heights',
        streetArea: 'Sector 15, Rohini',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110085',
        landmark: 'Opposite Mother Dairy',
        distanceKm: 2.1
      },
      items: [
        {
          productId: sharbatiAtta._id,
          name: sharbatiAtta.name,
          weight: '5 KG',
          price: 290,
          quantity: 2,
          subtotal: 580
        }
      ],
      subtotal: 580,
      deliveryCharge: 0,
      discount: 58,
      couponCode: 'FRESH10',
      totalAmount: 522,
      paymentMethod: 'Cash on Delivery',
      paymentStatus: 'COD Collected',
      orderStatus: 'Delivered',
      deliveryOtp: '4821',
      assignedDeliveryBoy: {
        agentId: 'delivery_1',
        name: 'Amit Kumar',
        phone: '9812345678'
      },
      statusTimeline: [
        { status: 'Order Placed', timestamp: '2026-09-10T10:00:00Z' },
        { status: 'Confirmed', timestamp: '2026-09-10T10:15:00Z' },
        { status: 'Preparing', timestamp: '2026-09-10T10:30:00Z' },
        { status: 'Ready for Delivery', timestamp: '2026-09-10T11:00:00Z' },
        { status: 'Out for Delivery', timestamp: '2026-09-10T11:20:00Z' },
        { status: 'Delivered', timestamp: '2026-09-10T11:55:00Z' }
      ]
    });

    // Sample reviews from verified purchasers
    db.Reviews.insertOne({
      productId: sharbatiAtta._id,
      customerName: 'Pooja Sharma',
      customerPhone: '9899001122',
      rating: 5,
      comment: 'Super fresh chakki atta! You can actually smell the authentic aroma of fresh wheat. Rotis puffed up beautifully and stayed soft till dinner.',
      verifiedPurchase: true,
      isVisible: true,
      createdAt: '2026-09-11T12:00:00Z'
    });

    db.Reviews.insertOne({
      productId: sharbatiAtta._id,
      customerName: 'Vikram Mehta',
      customerPhone: '9871122334',
      rating: 5,
      comment: 'Miles ahead of packed supermarket brands. The fact that it is milled fresh on the stone chakki makes all the difference in taste and nutrition.',
      verifiedPurchase: true,
      isVisible: true,
      createdAt: '2026-09-11T16:30:00Z'
    });

    console.log('✔ Sample initial order & verified reviews created.');
  }

  // Ensure first administrator account from environment variables exists
  await ensureAdminAccount();

  // Ensure default delivery accounts exist with active status
  await ensureDeliveryAccounts();

  console.log('✔ BPS Fresh Mills database seeding complete!');
}

async function ensureDeliveryAccounts() {
  const defaultDeliveryPassword = process.env.DELIVERY_DEFAULT_PASSWORD || 'Delivery@123';
  const deliveryHash = await bcrypt.hash(defaultDeliveryPassword, 10);

  const agents = [
    { name: 'Amit Kumar', mobile: '9812345678', email: 'amit.delivery@bpsfreshmills.com' },
    { name: 'Rahul Verma', mobile: '9823456789', email: 'rahul.delivery@bpsfreshmills.com' }
  ];

  for (const agent of agents) {
    let u = db.Users.findOne(x => x.mobile === agent.mobile || (x.email && x.email.toLowerCase() === agent.email));
    if (!u) {
      u = db.Users.insertOne({
        name: agent.name,
        email: agent.email,
        mobile: agent.mobile,
        password: deliveryHash,
        role: 'delivery',
        status: 'active',
        totalDelivered: 25,
        addresses: [],
        createdAt: new Date().toISOString()
      });
    } else {
      db.Users.updateById(u._id, {
        name: agent.name,
        email: agent.email,
        mobile: agent.mobile,
        password: deliveryHash,
        role: 'delivery',
        status: 'active'
      });
    }

    // Also sync in DeliveryAgents table
    let da = db.DeliveryAgents.findOne(x => x.mobile === agent.mobile || x.userId === u._id);
    if (!da) {
      db.DeliveryAgents.insertOne({
        userId: u._id,
        name: agent.name,
        mobile: agent.mobile,
        activeOrdersCount: 1,
        totalCashCollected: 0,
        totalCashDeposited: 0,
        cashDifference: 0,
        status: 'active',
        createdAt: new Date().toISOString()
      });
    } else {
      db.DeliveryAgents.updateById(da._id, {
        status: 'active',
        name: agent.name,
        mobile: agent.mobile
      });
    }
  }
}

async function ensureAdminAccount() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'bpsfreshmills@gmail.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'bps@2005';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  // 1. First search by exact email or alternate spelling or mobile
  let existingAdmin = db.Users.findOne(u => {
    if (u.role === 'super_admin' || u.role === 'admin') return true;
    if (u.email && (
      u.email.toLowerCase() === adminEmail ||
      u.email.toLowerCase() === 'bpsfreshmill@gmail.com' ||
      u.email.toLowerCase() === 'bpsfreshmills@gmail.com'
    )) return true;
    if (u.mobile && u.mobile.slice(-10) === '6386621332') return true;
    return false;
  });

  if (!existingAdmin) {
    db.Users.insertOne({
      name: 'BPS Fresh Mills — Super Admin',
      email: adminEmail,
      mobile: '6386621332',
      password: adminPasswordHash,
      role: 'super_admin',
      addresses: [],
      createdAt: new Date().toISOString()
    });
    console.log(`✔ Super Administrator created for [${adminEmail}]`);
  } else {
    db.Users.updateById(existingAdmin._id, {
      name: 'BPS Fresh Mills — Super Admin',
      email: adminEmail,
      role: 'super_admin',
      password: adminPasswordHash,
      mobile: existingAdmin.mobile || '6386621332'
    });
    console.log(`✔ Super Administrator [${adminEmail}] synchronized with password.`);
  }

  // Clean up any stale admin duplicates
  const staleAdmins = db.Users.find(u => (u.role === 'super_admin' || u.role === 'admin') && u.email && u.email.toLowerCase() !== adminEmail);
  for (const stale of staleAdmins) {
    if (stale.email && (stale.email.includes('bpschakki.com') || stale.email === 'admin@bpsfreshmills.com')) {
      db.Users.deleteById(stale._id);
    }
  }
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = { seedDatabase, ensureAdminAccount, ensureDeliveryAccounts };
