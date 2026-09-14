import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, ShoppingBag, Truck, Tag, AlertTriangle, MessageSquare, ExternalLink } from 'lucide-react';
import { fetchApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function NotificationBell({ navigate, role = 'customer' }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Load initial notifications
  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetchApi('/notifications');
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [isAuthenticated]);

  // Establish live Server-Sent Events (SSE) stream
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('bps_token');
    const apiBase = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
    const streamUrl = `${apiBase}/notifications/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    let eventSource;
    try {
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'NOTIFICATION' && payload.data) {
            setNotifications(prev => [payload.data, ...prev.filter(n => n._id !== payload.data._id)]);
            setUnreadCount(prev => prev + 1);
          }
        } catch {
          // ignore non-json
        }
      };

      eventSource.onerror = () => {
        // SSE auto-reconnects automatically
      };
    } catch (err) {
      console.warn('SSE connection initialization error:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [isAuthenticated]);

  const handleMarkAsRead = async (notif, e) => {
    e?.stopPropagation();
    if (notif.isRead) return;

    try {
      await fetchApi(`/notifications/${notif._id}/read`, { method: 'PUT' });
      setNotifications(prev =>
        prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetchApi('/notifications/mark-all-read', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleItemClick = (notif) => {
    handleMarkAsRead(notif);
    setIsOpen(false);
    if (notif.link && navigate) {
      const cleanLink = notif.link.replace(/^\//, '');
      navigate(cleanLink);
    } else if (notif.orderId && navigate) {
      if (role === 'admin') {
        navigate('admin-dashboard');
      } else {
        navigate(`tracking?id=${encodeURIComponent(notif.orderId)}`);
      }
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'delivery':
        return <Truck size={16} color="#2E8B57" />;
      case 'offer':
        return <Tag size={16} color="#C9A44C" />;
      case 'stock':
        return <AlertTriangle size={16} color="#EA580C" />;
      case 'support':
        return <MessageSquare size={16} color="#0284C7" />;
      case 'order':
      default:
        return <ShoppingBag size={16} color="#173D32" />;
    }
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return 'Just now';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        className="action-icon-btn"
        title="Notifications"
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)'
        }}
        id="notification-bell-btn"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              borderRadius: '9999px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              fontSize: '0.7rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 5px rgba(220, 38, 38, 0.4)',
              animation: 'pulse 1.8s infinite'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '340px',
            maxWidth: '90vw',
            backgroundColor: 'var(--bg-surface, #FFFFFF)',
            border: '1px solid var(--border-subtle, #E2E8F0)',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.12)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--border-subtle, #E2E8F0)',
              backgroundColor: 'var(--bg-secondary, #F8FAFC)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--nature-light, #E8F5EC)',
                    color: 'var(--nature-green, #2E8B57)',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '999px'
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--nature-green, #2E8B57)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List Body */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>No notifications yet</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Updates about orders, milling, and deliveries will appear here.</div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id || n.id}
                  onClick={() => handleItemClick(n)}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid var(--border-subtle, #E2E8F0)',
                    backgroundColor: n.isRead ? 'transparent' : 'var(--nature-light, rgba(232, 245, 236, 0.4))',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-card-hover, #F8FAFC)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = n.isRead ? 'transparent' : 'var(--nature-light, rgba(232, 245, 236, 0.4))'; }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-surface, #FFFFFF)',
                      border: '1px solid var(--border-subtle, #E2E8F0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    {getIcon(n.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                      <div style={{ fontWeight: n.isRead ? 600 : 800, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                        {n.title}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {formatRelativeTime(n.createdAt || n.timestamp)}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                      {n.message}
                    </div>

                    {n.orderId && (
                      <div style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.74rem', color: 'var(--nature-green)', fontWeight: 700 }}>
                        Order #{n.orderId} <ExternalLink size={11} />
                      </div>
                    )}
                  </div>

                  {!n.isRead && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#2E8B57',
                        flexShrink: 0,
                        alignSelf: 'center'
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
