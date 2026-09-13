import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('bps_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [coupon, setCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem('bps_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [storeSettings, setStoreSettings] = useState({
    deliveryCharge: 40,
    freeDeliveryThreshold: 500,
    maxDeliveryRadiusKm: 15
  });

  // Fetch settings for dynamic delivery fee
  useEffect(() => {
    fetchApi('/public/settings')
      .then(res => {
        if (res.success && res.settings) {
          setStoreSettings(res.settings);
        }
      })
      .catch(() => {});
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('bps_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Save coupon to localStorage
  useEffect(() => {
    if (coupon) {
      localStorage.setItem('bps_coupon', JSON.stringify(coupon));
    } else {
      localStorage.removeItem('bps_coupon');
    }
  }, [coupon]);

  const addToCart = (product, selectedWeight, qty = 1) => {
    const weight = selectedWeight || product.weight || '5 KG';
    let unitPrice = product.price;

    if (product.weights && product.weights.length > 0) {
      const variant = product.weights.find(w => w.weight === weight);
      if (variant) unitPrice = variant.price;
    }

    const availableStock = product.stock !== undefined ? product.stock : 20;
    if (availableStock <= 0) {
      return { success: false, message: 'Sorry, this product is currently out of stock.' };
    }

    let message = '';
    setCartItems(prev => {
      const existingIdx = prev.findIndex(item => item.productId === product._id && item.weight === weight);
      if (existingIdx > -1) {
        const currentItem = prev[existingIdx];
        const newQty = currentItem.quantity + qty;

        if (newQty > availableStock) {
          message = `Cannot add more. Only ${availableStock} units available in stock.`;
          return prev;
        }

        const updated = [...prev];
        updated[existingIdx] = {
          ...currentItem,
          quantity: newQty,
          maxStock: availableStock
        };
        message = `Updated quantity for ${product.name}`;
        return updated;
      } else {
        if (qty > availableStock) {
          message = `Cannot add ${qty}. Only ${availableStock} units available in stock.`;
          return prev;
        }

        message = `Added ${product.name} (${weight}) to cart!`;
        return [
          ...prev,
          {
            productId: product._id,
            name: product.name,
            weight,
            price: unitPrice,
            quantity: qty,
            maxStock: availableStock,
            image: product.image || (product.images && product.images[0]) || ''
          }
        ];
      }
    });

    return { success: true, message };
  };

  const updateQuantity = (productId, weight, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId, weight);
      return;
    }

    setCartItems(prev =>
      prev.map(item => {
        if (item.productId === productId && item.weight === weight) {
          if (newQty > item.maxStock) {
            return { ...item, quantity: item.maxStock };
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId, weight) => {
    setCartItems(prev => prev.filter(item => !(item.productId === productId && item.weight === weight)));
  };

  const clearCart = () => {
    setCartItems([]);
    setCoupon(null);
  };

  const applyCoupon = async (code) => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const res = await fetchApi('/offers/apply-coupon', {
      method: 'POST',
      body: JSON.stringify({ code, cartTotal: subtotal })
    });

    if (res.success && res.coupon) {
      setCoupon(res.coupon);
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || 'Failed to apply coupon' };
  };

  const removeCoupon = () => {
    setCoupon(null);
  };

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const discount = coupon ? Math.min(subtotal, coupon.discount) : 0;
  const deliveryCharge =
    subtotal === 0 || subtotal >= (storeSettings.freeDeliveryThreshold || 500)
      ? 0
      : (storeSettings.deliveryCharge !== undefined ? storeSettings.deliveryCharge : 40);

  const finalTotal = Math.max(0, subtotal - discount + deliveryCharge);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        totalItemCount,
        subtotal,
        discount,
        deliveryCharge,
        finalTotal,
        coupon,
        storeSettings,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyCoupon,
        removeCoupon
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
