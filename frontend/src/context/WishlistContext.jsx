import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../utils/api';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const saved = localStorage.getItem('bps_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync with backend on mount if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('bps_token');
    if (!token) return;

    fetchApi('/auth/wishlist')
      .then(res => {
        if (res.success && Array.isArray(res.wishlist) && res.wishlist.length > 0) {
          setWishlistItems(prev => {
            const merged = [...res.wishlist];
            prev.forEach(p => {
              if (!merged.some(m => (m._id || m.productId) === (p._id || p.productId))) {
                merged.push(p);
              }
            });
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem('bps_wishlist', JSON.stringify(wishlistItems));
    const token = localStorage.getItem('bps_token');
    if (token) {
      fetchApi('/auth/wishlist', {
        method: 'POST',
        body: JSON.stringify({ wishlist: wishlistItems })
      }).catch(() => {});
    }
  }, [wishlistItems]);

  const toggleWishlist = (product) => {
    setWishlistItems(prev => {
      const exists = prev.some(item => item._id === product._id);
      if (exists) {
        return prev.filter(item => item._id !== product._id);
      } else {
        return [...prev, product];
      }
    });
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item._id === productId);
  };

  const removeFromWishlist = (productId) => {
    setWishlistItems(prev => prev.filter(item => item._id !== productId));
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount: wishlistItems.length,
        toggleWishlist,
        isInWishlist,
        removeFromWishlist
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
