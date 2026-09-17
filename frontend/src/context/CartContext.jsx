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

  // Sync with backend on mount if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('bps_token');
    if (!token) return;

    fetchApi('/auth/cart')
      .then(res => {
        if (res.success && Array.isArray(res.cart) && res.cart.length > 0) {
          setCartItems(prev => {
            if (!prev || prev.length === 0) return res.cart;
            const merged = [...res.cart];
            prev.forEach(localItem => {
              const idx = merged.findIndex(
                m => m.productId === localItem.productId && m.weight === localItem.weight && (m.texture || 'Medium') === (localItem.texture || 'Medium')
              );
              if (idx > -1) {
                merged[idx].quantity = Math.max(merged[idx].quantity, localItem.quantity);
              } else {
                merged.push(localItem);
              }
            });
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Save cart to localStorage and DB
  useEffect(() => {
    localStorage.setItem('bps_cart', JSON.stringify(cartItems));
    const token = localStorage.getItem('bps_token');
    if (token) {
      fetchApi('/auth/cart', {
        method: 'POST',
        body: JSON.stringify({ cart: cartItems })
      }).catch(() => {});
    }
  }, [cartItems]);

  // Save coupon to localStorage
  useEffect(() => {
    if (coupon) {
      localStorage.setItem('bps_coupon', JSON.stringify(coupon));
    } else {
      localStorage.removeItem('bps_coupon');
    }
  }, [coupon]);

  const addToCart = (product, selectedWeight, qty = 1, selectedTexture = 'Medium') => {
    const weight = selectedWeight || product.weight || '5 KG';
    const texture = selectedTexture || 'Medium';
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
      const existingIdx = prev.findIndex(
        item => item.productId === product._id && item.weight === weight && (item.texture || 'Medium') === texture
      );
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
        message = `Updated quantity for ${product.name} (${texture})`;
        return updated;
      } else {
        if (qty > availableStock) {
          message = `Cannot add ${qty}. Only ${availableStock} units available in stock.`;
          return prev;
        }

        message = `Added ${product.name} (${weight}, ${texture}) to cart!`;
        return [
          ...prev,
          {
            productId: product._id,
            name: product.name,
            weight,
            texture,
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

  const updateQuantity = (productId, weight, newQty, texture = 'Medium') => {
    if (newQty <= 0) {
      removeFromCart(productId, weight, texture);
      return;
    }

    setCartItems(prev =>
      prev.map(item => {
        if (item.productId === productId && item.weight === weight && (item.texture || 'Medium') === texture) {
          if (newQty > item.maxStock) {
            return { ...item, quantity: item.maxStock };
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId, weight, texture = 'Medium') => {
    setCartItems(prev =>
      prev.filter(
        item => !(item.productId === productId && item.weight === weight && (item.texture || 'Medium') === texture)
      )
    );
  };

  const reorderItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) return { success: false, count: 0 };
    let addedCount = 0;
    setCartItems(prev => {
      const updated = [...prev];
      items.forEach(pastItem => {
        const pId = pastItem.productId || pastItem._id;
        const weight = pastItem.weight || '5 KG';
        const texture = pastItem.texture || 'Medium';
        const qty = pastItem.quantity || 1;
        const price = pastItem.price || 0;

        const idx = updated.findIndex(
          it => it.productId === pId && it.weight === weight && (it.texture || 'Medium') === texture
        );
        if (idx > -1) {
          updated[idx].quantity += qty;
        } else {
          updated.push({
            productId: pId,
            name: pastItem.name,
            weight,
            texture,
            price,
            quantity: qty,
            maxStock: pastItem.stock || 50,
            image: pastItem.image || ''
          });
        }
        addedCount++;
      });
      return updated;
    });
    return { success: true, count: addedCount };
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
        reorderItems,
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
