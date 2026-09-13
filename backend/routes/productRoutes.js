const express = require('express');
const db = require('../config/db');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');

const router = express.Router();

// 1. GET ALL PRODUCTS (with search, category, weight, price, rating, inStock, sorting)
router.get('/', (req, res) => {
  try {
    let products = db.Products.find(p => p.isActive !== false);

    const { search, category, weight, minPrice, maxPrice, inStock, hasOffer, rating, sort } = req.query;

    // Search query
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      products = products.filter(p => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
          (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
        );
      });
    }

    // Category filter
    if (category && category !== 'All') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    // Weight filter
    if (weight && weight !== 'All') {
      products = products.filter(p => {
        if (p.weight === weight) return true;
        if (p.weights && p.weights.some(w => w.weight === weight)) return true;
        return false;
      });
    }

    // Price range filter
    if (minPrice) {
      products = products.filter(p => p.price >= Number(minPrice));
    }
    if (maxPrice) {
      products = products.filter(p => p.price <= Number(maxPrice));
    }

    // In-stock filter
    if (inStock === 'true') {
      products = products.filter(p => p.stock > 0);
    }

    // Has discount/offer filter
    if (hasOffer === 'true') {
      products = products.filter(p => p.discountPercent > 0 || (p.originalPrice && p.originalPrice > p.price));
    }

    // Rating filter
    if (rating) {
      products = products.filter(p => (p.rating || 0) >= Number(rating));
    }

    // Sorting
    if (sort) {
      switch (sort) {
        case 'price-low':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          products.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case 'newest':
          products.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          break;
        case 'recommended':
        default:
          products.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
          break;
      }
    }

    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// 2. GET FEATURED PRODUCTS
router.get('/featured', (req, res) => {
  const products = db.Products.find(p => p.isActive !== false && p.isFeatured === true);
  res.json({ success: true, products });
});

// 3. GET CATEGORIES LIST
router.get('/categories', (req, res) => {
  const products = db.Products.find(p => p.isActive !== false);
  const categories = ['All', ...new Set(products.map(p => p.category))];
  res.json({ success: true, categories });
});

// 4. GET SINGLE PRODUCT BY ID OR SLUG
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const product = db.Products.findOne(p => p._id === id || p.slug === id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  // Fetch reviews for this product
  const reviews = db.Reviews.find(r => r.productId === product._id && r.isVisible !== false);

  res.json({
    success: true,
    product: {
      ...product,
      reviews
    }
  });
});

// 5. GET REVIEWS FOR A PRODUCT
router.get('/:id/reviews', (req, res) => {
  const { id } = req.params;
  const product = db.Products.findById(id) || db.Products.findOne({ slug: id });
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  const reviews = db.Reviews.find(r => r.productId === product._id && r.isVisible !== false);
  res.json({ success: true, reviews });
});

// 6. ADD REVIEW (Enforcing verified buyer requirement)
router.post('/:id/reviews', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, imageUrl } = req.body;
    const user = req.user;

    const product = db.Products.findById(id) || db.Products.findOne({ slug: id });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Star rating between 1 and 5 is required.' });
    }
    if (!comment || comment.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Review comment must be at least 5 characters long.' });
    }

    // Check if user has purchased this product
    const deliveredOrders = db.Orders.find(o => {
      return (
        (o.customerId === user._id || o.customerPhone === user.mobile) &&
        o.orderStatus === 'Delivered' &&
        o.items.some(item => item.productId === product._id)
      );
    });

    if (deliveredOrders.length === 0 && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only customers who have ordered and received this product can write a verified review.'
      });
    }

    // Check if user already reviewed
    const existingReview = db.Reviews.findOne(r => r.productId === product._id && (r.customerPhone === user.mobile || r.userId === user._id));

    if (existingReview) {
      const updated = db.Reviews.updateById(existingReview._id, {
        rating: Number(rating),
        comment: comment.trim(),
        imageUrl: imageUrl || existingReview.imageUrl,
        updatedAt: new Date().toISOString()
      });
      return res.json({ success: true, message: 'Your review has been updated!', review: updated });
    }

    const newReview = db.Reviews.insertOne({
      productId: product._id,
      userId: user._id,
      customerName: user.name,
      customerPhone: user.mobile,
      rating: Number(rating),
      comment: comment.trim(),
      imageUrl: imageUrl || '',
      verifiedPurchase: true,
      isVisible: true
    });

    // Update product rating average
    const allReviews = db.Reviews.find(r => r.productId === product._id && r.isVisible !== false);
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    db.Products.updateById(product._id, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: allReviews.length
    });

    res.status(201).json({ success: true, message: 'Review submitted successfully!', review: newReview });
  } catch (err) {
    console.error('Add review error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
});

module.exports = router;
