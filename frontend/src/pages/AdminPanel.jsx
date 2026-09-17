import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, ShoppingBag, Package, Users, Tag, RotateCcw,
  DollarSign, Settings, Plus, Edit2, Trash2, CheckCircle2, AlertCircle,
  Clock, Truck, ShieldCheck, Search, Check, X, Layers, Boxes,
  FileText, Star, Bell, Phone, TrendingUp, BarChart2, Eye, EyeOff,
  LogOut, User, RefreshCw, ChevronDown, ChevronUp, Image, Upload,
  MessageSquare, Globe, Archive, Activity, List, Download,
  Lock, Key, Camera, MapPin, Calendar, Mail, Menu, ChevronRight, CheckCircle, Sparkles, Printer
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import NotificationBell from '../components/NotificationBell';
import InvoiceModal from '../components/InvoiceModal';
import InstallPwaButton from '../components/InstallPwaButton';
import { fetchApi } from '../utils/api';

const API = (path, opts) => fetchApi(path, opts);

// ── Tiny helpers ─────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const STATUS_COLORS = {
  'Pending Admin Confirmation': '#d97706', 'Order Placed': '#d97706', 'Confirmed': '#2E8B57', 'Processing': '#173D32', 'Preparing': '#173D32',
  'Shipped': '#247346', 'Ready for Delivery': '#247346', 'Out for Delivery': '#ea580c',
  'Delivered': '#16a34a', 'Cancelled': '#dc2626', 'Return Requested': '#9333ea', 'Returned': '#6b7280'
};

function StatusBadge({ status }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem',
      fontWeight: 700, color: '#fff', backgroundColor: STATUS_COLORS[status] || '#6b7280'
    }}>{status || 'Unknown'}</span>
  );
}

function Loader() {
  return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '1rem' }}>Loading…</div>;
}

function EmptyState({ icon: Icon = Package, message = 'No data found' }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
      <Icon size={40} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
      <div>{message}</div>
    </div>
  );
}

function StatCard({ label, value, sub, color = '#2E8B57', icon: Icon = TrendingUp }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px',
      padding: '1.25rem 1.5rem', boxShadow: 'var(--shadow-sm)', borderTop: `3px solid ${color}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>{label}</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#173D32', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{sub}</div>}
        </div>
        <div style={{ background: color + '22', borderRadius: '10px', padding: '0.6rem' }}>
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, maxWidth = '600px' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#173D32', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FieldRow({ label, children, required }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
        {label}{required && <span style={{ color: 'var(--danger-rust)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid var(--border-subtle)',
  borderRadius: '8px', fontSize: '0.9rem', background: 'var(--bg-surface)', color: 'var(--text-primary)',
  outline: 'none', boxSizing: 'border-box'
};
const selectStyle = { ...inputStyle };
const textareaStyle = { ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' };

// ── Spline helper for smooth chart curves ────────────────────────
function getSplinePath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

// ── Smooth Sales Overview Curve Chart (Reference Image) ────────
function SalesOverviewChart({ data, height = 180 }) {
  const [hoverPoint, setHoverPoint] = useState(null);

  const hasRealData = Array.isArray(data) && data.length > 0 && data.some(d => (d.revenue || 0) > 0);
  if (!hasRealData) {
    return (
      <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '0.88rem', gap: '6px' }}>
        <span style={{ fontSize: '1.8rem' }}>📊</span>
        <span style={{ fontWeight: 700, color: '#374151' }}>No sales data yet</span>
        <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Real-time sales curves will appear automatically once customer orders are placed.</span>
      </div>
    );
  }

  const chartData = data;

  const width = 600;
  const paddingX = 45;
  const paddingY = 25;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  const maxVal = Math.max(...chartData.map(d => d.revenue || 0), 1000);
  const ceiling = Math.ceil(maxVal / 10000) * 10000 || 40000;

  const points = chartData.map((d, i) => {
    const x = paddingX + (i / (chartData.length - 1)) * plotWidth;
    const y = paddingY + plotHeight - ((d.revenue || 0) / ceiling) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = getSplinePath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingY + plotHeight} L ${points[0].x} ${paddingY + plotHeight} Z`;

  return (
    <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }}>
      <svg width="100%" viewBox={`0 0 ${width} ${height + 25}`} style={{ minWidth: '420px', overflow: 'visible' }}>
        <defs>
          <linearGradient id="salesOverviewGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16A34A" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#16A34A" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#16A34A" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines & Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingY + plotHeight * (1 - ratio);
          const labelVal = Math.round(ceiling * ratio);
          const displayLabel = labelVal >= 1000 ? `${Math.round(labelVal / 1000)}K` : labelVal;
          return (
            <g key={idx}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#F1F5F3" strokeDasharray="3 3" />
              <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#9CA3AF" fontWeight="600">
                {displayLabel}
              </text>
            </g>
          );
        })}

        {/* Gradient fill */}
        <path d={areaPath} fill="url(#salesOverviewGrad)" />

        {/* Smooth green spline curve */}
        <path d={linePath} fill="none" stroke="#16A34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {points.map((p, i) => (
          <g
            key={i}
            onMouseEnter={() => setHoverPoint(p)}
            onMouseLeave={() => setHoverPoint(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={p.x} cy={p.y} r="5" fill="#FFFFFF" stroke="#16A34A" strokeWidth="2.5" />
            <text x={p.x} y={height + 15} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#6B7280">
              {p.day || p.date?.slice(5)}
            </text>
          </g>
        ))}
      </svg>

      {/* Interactive hover tooltip */}
      {hoverPoint && (
        <div style={{
          position: 'absolute',
          top: Math.max(0, hoverPoint.y - 45),
          left: `clamp(60px, ${hoverPoint.x}px, calc(100% - 100px))`,
          transform: 'translateX(-50%)',
          background: '#133E2B',
          color: '#FFFFFF',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: 700,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
          zIndex: 10
        }}>
          {fmt(hoverPoint.revenue)} {hoverPoint.orders ? `(${hoverPoint.orders} orders)` : ''}
        </div>
      )}
    </div>
  );
}

// ── Sales by Product Donut Chart (Reference Image) ───────────────
function SalesByProductDonut({ data, totalSales = 0 }) {
  const hasRealData = Array.isArray(data) && data.length > 0 && totalSales > 0;
  if (!hasRealData) {
    return (
      <div style={{ height: '175px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: '0.88rem', gap: '6px' }}>
        <span style={{ fontSize: '1.8rem' }}>🌾</span>
        <span style={{ fontWeight: 700, color: '#374151' }}>No product sales recorded yet</span>
        <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Category distribution activates when orders are received.</span>
      </div>
    );
  }

  const items = data;

  const radius = 46;
  const strokeWidth = 19;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.25rem', height: '175px' }}>
      {/* SVG Donut */}
      <div style={{ position: 'relative', width: '135px', height: '135px', flexShrink: 0 }}>
        <svg viewBox="0 0 120 120" width="100%" height="100%" style={{ transform: 'rotate(-90deg)' }}>
          {items.map((item, idx) => {
            const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -(accumulatedPercent / 100) * circumference;
            accumulatedPercent += item.percent;
            return (
              <circle
                key={idx}
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        {/* Center label */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#133E2B', lineHeight: 1 }}>
            {fmt(totalSales)}
          </div>
          <div style={{ fontSize: '0.66rem', color: '#667085', fontWeight: 600, marginTop: '3px' }}>
            Total Sales
          </div>
        </div>
      </div>

      {/* Legend list */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', maxHeight: '160px', paddingRight: '4px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }}></span>
              <span style={{ color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
            </div>
            <span style={{ fontWeight: 800, color: '#111827', marginLeft: '6px' }}>{item.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Inventory Alert Card Component ───────────────────────────────
function InventoryAlertList({ items = [] }) {
  const displayItems = (items && items.length > 0) ? items.slice(0, 3) : [
    { name: 'Jowar Atta', weight: '5 KG', stock: 4, image: '/products/chakki-atta-bag.jpg' },
    { name: 'Bajra Atta', weight: '5 KG', stock: 6, image: '/products/chakki-atta-bag.jpg' },
    { name: 'Besan', weight: '1 KG', stock: 8, image: '/products/chakki-atta-bag.jpg' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, justifyContent: 'center' }}>
      {displayItems.map((item, idx) => (
        <div key={idx} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.55rem 0.75rem',
          borderRadius: '10px',
          background: '#FDFBF7',
          border: '1px solid #F1ECE3'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            <img
              src={item.image || '/products/chakki-atta-bag.jpg'}
              alt={item.name}
              style={{ width: 34, height: 34, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#133E2B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name} {item.weight ? `(${item.weight})` : ''}
              </div>
            </div>
          </div>
          <span style={{
            background: item.stock <= 0 ? '#FEE2E2' : '#FFF1F2',
            color: '#DC2626',
            fontSize: '0.74rem',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '999px',
            border: '1px solid #FECDD3',
            whiteSpace: 'nowrap'
          }}>
            {item.stock <= 0 ? 'Out of stock' : `Only ${item.stock} left`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Recent Orders Table Component ────────────────────────────────
function RecentOrdersTable({ orders = [], onSelectOrder }) {
  if (!orders || orders.length === 0) {
    return (
      <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#6B7280' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
        <div style={{ fontWeight: 700, color: '#374151', fontSize: '0.95rem' }}>No orders yet</div>
        <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '4px' }}>Real customer orders will be listed here automatically.</div>
      </div>
    );
  }

  const list = orders.slice(0, 5);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Delivered':
        return <span style={{ background: '#DCFCE7', color: '#15803D', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Delivered</span>;
      case 'Out for Delivery':
        return <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Out for Delivery</span>;
      case 'Processing':
      case 'Preparing':
      case 'Confirmed':
      case 'Order Placed':
        return <span style={{ background: '#FEF3C7', color: '#B45309', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Processing</span>;
      case 'Cancelled':
        return <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>Cancelled</span>;
      default:
        return <span style={{ background: '#F3F4F6', color: '#374151', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>{status}</span>;
    }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E5EBE6', color: '#6B7280', fontSize: '0.78rem', textTransform: 'uppercase' }}>
            <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', fontWeight: 700 }}>#</th>
            <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', fontWeight: 700 }}>Customer</th>
            <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', fontWeight: 700 }}>Product</th>
            <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', fontWeight: 700 }}>Amount</th>
            <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', fontWeight: 700 }}>Payment</th>
            <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', fontWeight: 700 }}>Status</th>
            <th style={{ textAlign: 'left', padding: '0.65rem 0.5rem', fontWeight: 700 }}>Date</th>
            <th style={{ textAlign: 'center', padding: '0.65rem 0.5rem', fontWeight: 700 }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {list.map((o, i) => {
            const prodName = o.items && o.items.length > 0
              ? (o.items[0].name + (o.items.length > 1 ? ` +${o.items.length - 1}` : ''))
              : 'Chakki Atta';
            const dateStr = o.createdAt
              ? new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : '16 Sep 2026';
            const initials = (o.customerName || 'Customer').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

            return (
              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800, color: '#133E2B' }}>#{o.orderId || o._id?.slice(-4)}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#DEF7EC', color: '#166534', fontWeight: 800, fontSize: '0.68rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {initials}
                    </div>
                    <span style={{ fontWeight: 600, color: '#1F2933' }}>{o.customerName || 'Customer'}</span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#4B5563', fontWeight: 500 }}>{prodName}</td>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 800, color: '#133E2B' }}>{fmt(o.totalAmount)}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#6B7280', fontWeight: 600 }}>{o.paymentMethod || 'COD'}</td>
                <td style={{ padding: '0.75rem 0.5rem' }}>{getStatusBadge(o.orderStatus)}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: '#6B7280', fontSize: '0.8rem' }}>{dateStr}</td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                  <button
                    onClick={() => onSelectOrder && onSelectOrder(o)}
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #E5EBE6',
                      background: '#FFFFFF',
                      color: '#133E2B',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Quick Action Button Component ────────────────────────────────
function QuickActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.45rem',
        padding: '0.85rem 0.5rem',
        borderRadius: '10px',
        border: '1px solid #E5EBE6',
        background: '#FFFFFF',
        color: '#133E2B',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#16A34A';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#E5EBE6';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <Icon size={19} color="#16A34A" />
      <span style={{ fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.2 }}>{label}</span>
    </button>
  );
}

// ── Today's Tasks List Component ─────────────────────────────────
function TodaysTasksList({ tasks, onToggleTask, onTaskClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {tasks.map(t => (
        <div
          key={t.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.45rem 0.6rem',
            borderRadius: '8px',
            background: t.checked ? '#F0FDF4' : 'transparent',
            cursor: 'pointer'
          }}
          onClick={() => onToggleTask(t.id)}
        >
          <input
            type="checkbox"
            checked={t.checked}
            onChange={() => onToggleTask(t.id)}
            style={{ accentColor: '#16A34A', width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: t.checked ? '#166534' : '#374151',
            textDecoration: t.checked ? 'line-through' : 'none',
            flex: 1
          }}>
            {t.text} {t.count ? `(${t.count})` : ''}
          </span>
          {t.actionTab && (
            <button
              onClick={(e) => { e.stopPropagation(); onTaskClick(t.actionTab); }}
              style={{ background: 'none', border: 'none', color: '#16A34A', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Go →
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Stat Card Item Component ─────────────────────────────────────
function StatCardItem({ icon: Icon, label, value, trend, isRating, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5EBE6',
        borderRadius: '14px',
        padding: '1.15rem 1.25rem',
        boxShadow: '0 2px 8px rgba(19, 62, 43, 0.02)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#2E8B57';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(46,139,87,0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#E5EBE6';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(19, 62, 43, 0.02)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#133E2B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
          <Icon size={18} />
        </div>
        <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748B' }}>{label}</span>
      </div>

      <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#111827', lineHeight: 1.1, marginBottom: '0.5rem' }}>
        {value}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isRating ? (
          <div style={{ color: '#F59E0B', fontSize: '0.82rem', letterSpacing: '2px' }}>{trend}</div>
        ) : (
          <div style={{
            fontSize: '0.75rem',
            color: trend?.includes('↑') || trend?.includes('↗') ? '#16A34A' : '#64748B',
            fontWeight: 700
          }}>
            {trend}
          </div>
        )}
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '0.75rem' }}>
          <ChevronRight size={14} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ── 1. DASHBOARD (Reference Image Matching) ───────────────────────
function Dashboard({ navigate, setActiveTab }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salesPeriod, setSalesPeriod] = useState('7d');
  const [productSalesPeriod, setProductSalesPeriod] = useState('week');
  const [selectedOrderModal, setSelectedOrderModal] = useState(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Today's task list with interactive toggle
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('bps_admin_tasks');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return [
      { id: 't1', text: 'Check pending orders', count: 5, checked: false, actionTab: 'orders' },
      { id: 't2', text: 'Update stock for Besan', count: null, checked: false, actionTab: 'inventory' },
      { id: 't3', text: 'Approve new customer reviews', count: null, checked: true, actionTab: 'reviews' },
      { id: 't4', text: 'Plan weekend offers', count: null, checked: false, actionTab: 'offers' },
      { id: 't5', text: 'Verify COD cash settlement', count: null, checked: false, actionTab: 'delivery' }
    ];
  });

  const handleToggleTask = (id) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, checked: !t.checked } : t);
      localStorage.setItem('bps_admin_tasks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAskAi = async (q) => {
    if (!q || !q.trim()) return;
    setAiQuestion(q);
    setAiLoading(true);
    setAiAnswer('');
    try {
      const res = await API('/admin/ai-assistant/query', {
        method: 'POST',
        body: JSON.stringify({ query: q.trim() })
      });
      if (res.success && res.response) {
        setAiAnswer(res.response.text || res.response.summary || JSON.stringify(res.response));
      } else {
        setAiAnswer(res.message || 'Could not retrieve AI analysis.');
      }
    } catch (err) {
      setAiAnswer(err.message || 'AI Assistant server unreachable.');
    } finally {
      setAiLoading(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    API('/admin/dashboard').then(r => {
      if (r.success) {
        setData(r.stats);
        if (r.stats.pendingOrders) {
          setTasks(prev => prev.map(t => t.id === 't1' ? { ...t, count: r.stats.pendingOrders } : t));
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    let es;
    try {
      const apiBase = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
      es = new EventSource(`${apiBase}/notifications/stream`);
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload && payload.type !== 'PING') {
            load();
          }
        } catch (_) {}
      };
    } catch (_) {}
    return () => { if (es) es.close(); };
  }, [load]);

  if (loading && !data) return <Loader />;
  if (!data) return <EmptyState message="Failed to load dashboard" />;

  const actionRequired = data.actionRequired || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── 1. WELCOME HERO BANNER & DATE CARD ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(260px, 1fr)', gap: '1.25rem', alignItems: 'stretch' }}>
        {/* Welcome Hero Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #EDF7F1 0%, #E3F0E8 50%, #F5F1E8 100%)',
          border: '1px solid #D6E8DC',
          borderRadius: '18px',
          padding: '1.6rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(19, 62, 43, 0.04)'
        }}>
          <div style={{ maxWidth: '55%', zIndex: 2 }}>
            <h1 style={{ fontSize: 'clamp(1.5rem, 2.3vw, 1.95rem)', fontWeight: 800, color: '#133E2B', margin: 0, lineHeight: 1.2 }}>
              Welcome Back, {user?.name?.split(' ')[0] || 'Rohan'}! 👋
            </h1>
            <p style={{ color: '#4E685B', fontSize: '0.94rem', marginTop: '6px', marginBottom: 0, fontWeight: 500 }}>
              Here's what's happening with BPS Fresh Mills today.
            </p>
          </div>

          {/* Callout script & Image */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', zIndex: 2 }}>
            <div style={{
              fontFamily: '"Playfair Display", Georgia, "Brush Script MT", cursive',
              fontStyle: 'italic',
              fontSize: '1.3rem',
              fontWeight: 700,
              color: '#1F5A3D',
              textAlign: 'right',
              lineHeight: 1.2
            }}>
              “Pure Food<br/>Brighter Tomorrows”
            </div>
            <img
              src="/admin-banner-flour.jpg"
              alt="Fresh Stone Ground Flour & Wheat"
              style={{
                width: '160px',
                height: '98px',
                objectFit: 'cover',
                borderRadius: '12px',
                boxShadow: '0 6px 16px rgba(19,62,43,0.15)',
                border: '2px solid #FFFFFF'
              }}
            />
          </div>
        </div>

        {/* Today's Date & Inspiration Card */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E5EBE6',
          borderRadius: '18px',
          padding: '1.35rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(19, 62, 43, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#DEF7EC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
              <Calendar size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Today</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#133E2B' }}>
                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'long' })}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #F1F5F3', paddingTop: '0.75rem', fontSize: '0.84rem', fontStyle: 'italic', color: '#556960', lineHeight: 1.4 }}>
            “Good management grows great businesses.”
          </div>
        </div>
      </div>

      {/* ── 2. 6 STAT CARDS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
        {/* 1. Total Orders */}
        <StatCardItem
          icon={ShoppingBag}
          label="Total Orders"
          value={data.totalOrders || 0}
          trend={`↑ ${data.ordersTrendPercent || 12}% vs. last week`}
          onClick={() => setActiveTab('orders')}
        />
        {/* 2. Total Sales */}
        <StatCardItem
          icon={DollarSign}
          label="Total Sales"
          value={fmt(data.totalSales || 0)}
          trend={`↑ ${data.salesTrendPercent || 18}% vs. last week`}
          onClick={() => setActiveTab('reports')}
        />
        {/* 3. Total Customers */}
        <StatCardItem
          icon={Users}
          label="Total Customers"
          value={(data.totalCustomers || 0).toLocaleString('en-IN')}
          trend={`↑ ${data.customersTrendPercent || 10}% vs. last week`}
          onClick={() => setActiveTab('customers')}
        />
        {/* 4. Total Products */}
        <StatCardItem
          icon={Package}
          label="Total Products"
          value={data.totalProducts || 0}
          trend={`${data.activeProductsCount || data.totalProducts || 0} Active Products`}
          onClick={() => setActiveTab('products')}
        />
        {/* 5. Out for Delivery */}
        <StatCardItem
          icon={Truck}
          label="Out for Delivery"
          value={data.outForDelivery || 0}
          trend="↗ On the way"
          onClick={() => setActiveTab('delivery')}
        />
        {/* 6. Avg. Rating */}
        <StatCardItem
          icon={Star}
          label="Avg. Rating"
          value={data.avgRating || '4.8'}
          trend="★★★★★"
          isRating
          onClick={() => setActiveTab('reviews')}
        />
      </div>

      {/* ── 3. MIDDLE ROW (3 COLUMNS) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1.25fr) minmax(0, 1.15fr)', gap: '1.25rem' }}>
        {/* Sales Overview */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', color: '#133E2B' }}>
              <TrendingUp size={18} color="#16A34A" /> Sales Overview
            </div>
            <select
              value={salesPeriod}
              onChange={e => setSalesPeriod(e.target.value)}
              style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #E5EBE6', fontSize: '0.8rem', background: '#F8FAFC', color: '#4B5563', outline: 'none', fontWeight: 600 }}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <SalesOverviewChart data={salesPeriod === '30d' ? data.last30Days : data.salesTrends} height={165} />
        </div>

        {/* Sales by Product (Donut Chart) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', color: '#133E2B' }}>
              <Users size={18} color="#16A34A" /> Sales by Product
            </div>
            <select
              value={productSalesPeriod}
              onChange={e => setProductSalesPeriod(e.target.value)}
              style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid #E5EBE6', fontSize: '0.8rem', background: '#F8FAFC', color: '#4B5563', outline: 'none', fontWeight: 600 }}
            >
              <option value="week">This Week</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <SalesByProductDonut data={data.salesByProduct} totalSales={data.totalSales || 62430} />
        </div>

        {/* Inventory Alert */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', color: '#133E2B' }}>
              <Boxes size={18} color="#16A34A" /> Inventory Alert
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              style={{ background: 'none', border: 'none', color: '#16A34A', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              View All
            </button>
          </div>
          <InventoryAlertList items={data.lowStockProducts} />
        </div>
      </div>

      {/* ── 4. BOTTOM ROW (RECENT ORDERS TABLE + QUICK ACTIONS & TASKS) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '1.25rem' }}>
        {/* Recent Orders Table */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '16px', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.05rem', color: '#133E2B' }}>
              <FileText size={18} color="#16A34A" /> Recent Orders
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              style={{ background: 'none', border: 'none', color: '#16A34A', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
            >
              View All
            </button>
          </div>
          <RecentOrdersTable orders={data.recentOrders} onSelectOrder={setSelectedOrderModal} />
        </div>

        {/* Right Stack: Quick Actions & Today's Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick Actions */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.02rem', color: '#133E2B', marginBottom: '0.9rem' }}>
              <Activity size={18} color="#16A34A" /> Quick Actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
              <QuickActionButton icon={Package} label="Add Product" onClick={() => setActiveTab('products')} />
              <QuickActionButton icon={List} label="Manage Orders" onClick={() => setActiveTab('orders')} />
              <QuickActionButton icon={Tag} label="Add Offer" onClick={() => setActiveTab('offers')} />
              <QuickActionButton icon={Truck} label="Manage Delivery Boys" onClick={() => setActiveTab('delivery')} />
              <QuickActionButton icon={Bell} label="Send Notification" onClick={() => setActiveTab('notifications')} />
              <QuickActionButton icon={BarChart2} label="View Reports" onClick={() => setActiveTab('reports')} />
            </div>
          </div>

          {/* Today's Tasks */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '1.02rem', color: '#133E2B' }}>
                <CheckCircle size={18} color="#16A34A" /> Today's Tasks
              </div>
              <button
                onClick={() => setActiveTab('orders')}
                style={{ background: 'none', border: 'none', color: '#16A34A', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                View All
              </button>
            </div>
            <TodaysTasksList tasks={tasks} onToggleTask={handleToggleTask} onTaskClick={tab => tab && setActiveTab(tab)} />
          </div>
        </div>
      </div>

      {/* ── 5. AI BUSINESS ASSISTANT CARD ── */}
      <div style={{
        background: 'linear-gradient(135deg, #133E2B 0%, #194433 100%)',
        color: '#FFFFFF',
        borderRadius: '16px',
        padding: '1.5rem 1.75rem',
        boxShadow: '0 6px 20px rgba(19, 62, 43, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A44C' }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>AI Business Assistant</div>
              <div style={{ fontSize: '0.78rem', color: '#A3B8B0' }}>Ask questions in Hindi or English using real database records</div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('ai-assistant')}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFFFFF', padding: '0.4rem 0.9rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Full AI Console →
          </button>
        </div>

        {/* Quick Question Chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {[
            'Aaj kitni sale hui?',
            'Kaunsa product sabse zyada bik raha hai?',
            'Kaunsa stock jaldi khatam hoga?',
            'Kitna COD pending hai?',
            'Is month ka profit kitna hai?'
          ].map(q => (
            <button
              key={q}
              onClick={() => handleAskAi(q)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#D1E7DD',
                borderRadius: '999px',
                padding: '0.3rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s'
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* AI Input Form */}
        <form onSubmit={(e) => { e.preventDefault(); handleAskAi(aiQuestion); }} style={{ display: 'flex', gap: '0.6rem' }}>
          <input
            value={aiQuestion}
            onChange={e => setAiQuestion(e.target.value)}
            placeholder="Ask any question about sales, stock, orders, profit, or COD..."
            style={{
              flex: 1,
              padding: '0.7rem 1.1rem',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.1)',
              color: '#FFFFFF',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
          <button
            type="submit"
            disabled={aiLoading}
            style={{
              padding: '0.7rem 1.4rem',
              borderRadius: '10px',
              border: 'none',
              background: '#2E8B57',
              color: '#FFFFFF',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {aiLoading ? 'Thinking…' : 'Ask AI'}
          </button>
        </form>

        {/* AI Answer Display */}
        {aiAnswer && (
          <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.9rem', lineHeight: 1.5, color: '#F0FDF4' }}>
            <div style={{ fontWeight: 800, color: '#C9A44C', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '4px' }}>AI Answer:</div>
            {aiAnswer}
          </div>
        )}
      </div>

      {/* ── 6. MANAGEMENT BY EXCEPTION (ACTION REQUIRED) ── */}
      {actionRequired.length > 0 && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #FECACA',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          boxShadow: '0 4px 14px rgba(220,38,38,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: '#DC2626',
                color: '#FFFFFF',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: 800
              }}>
                {actionRequired.length} {actionRequired.length === 1 ? 'Action' : 'Actions'} Required
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#173D32' }}>
                Management by Exception Center
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#667085' }}>
              Items requiring immediate owner/admin intervention
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {actionRequired.map(item => {
              const isCrit = item.severity === 'critical';
              const isWarn = item.severity === 'warning';
              const borderColor = isCrit ? '#FCA5A5' : isWarn ? '#FCD34D' : '#BFDBFE';
              const bgHeader = isCrit ? '#FEF2F2' : isWarn ? '#FFFBEB' : '#EFF6FF';
              const badgeBg = isCrit ? '#DC2626' : isWarn ? '#D97706' : '#2563EB';

              return (
                <div
                  key={item.id}
                  style={{
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    background: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ padding: '0.75rem 1rem', background: bgHeader, borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#FFFFFF', background: badgeBg, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      {item.badge || item.type}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#667085', fontWeight: 600 }}>Needs Review</span>
                  </div>

                  <div style={{ padding: '0.85rem 1rem', flex: 1 }}>
                    <div style={{ fontWeight: 800, color: '#173D32', fontSize: '0.92rem', marginBottom: '0.3rem' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.4 }}>
                      {item.description}
                    </div>
                  </div>

                  <div style={{ padding: '0.65rem 1rem', background: '#F8FAFC', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        const tabTarget = item.targetTab === 'delivery-boys' ? 'delivery' : item.targetTab;
                        if (setActiveTab) setActiveTab(tabTarget);
                      }}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: isCrit ? '#DC2626' : '#2E8B57',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {item.actionLabel || 'Take Action'} →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 7. BOTTOM BRAND BANNER ── */}
      <div style={{
        background: '#F0F7F2',
        border: '1px solid #D6E8DC',
        borderRadius: '16px',
        padding: '1.25rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img src="/logo.png" alt="BPS" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <div>
            <div style={{ fontWeight: 800, color: '#133E2B', fontSize: '1.1rem' }}>Quality Food Stronger India</div>
            <div style={{ fontSize: '0.82rem', color: '#5A6E63' }}>Pure Stone-Ground Chakki Atta • No Chemicals • No Warehouse Aging</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#133E2B' }}>
            <ShieldCheck size={18} color="#16A34A" /> 100% Natural
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#133E2B' }}>
            <Boxes size={18} color="#16A34A" /> Stone Ground
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#133E2B' }}>
            <CheckCircle2 size={18} color="#16A34A" /> No Preservatives
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#133E2B' }}>
            <Users size={18} color="#16A34A" /> Healthy Families
          </div>
          <div style={{
            background: '#133E2B',
            color: '#FFFFFF',
            padding: '0.55rem 1.1rem',
            borderRadius: '10px',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            From Our Chakki to Your Home — BPS Fresh Mills
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrderModal && (
        <Modal title={`Order #${selectedOrderModal.orderId || selectedOrderModal._id?.slice(-6)} Details`} onClose={() => setSelectedOrderModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '1rem', borderRadius: '8px' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#133E2B' }}>{selectedOrderModal.customerName}</div>
                <div style={{ fontSize: '0.85rem', color: '#667085' }}>Phone: {selectedOrderModal.customerPhone || selectedOrderModal.shippingAddress?.mobile || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#133E2B' }}>{fmt(selectedOrderModal.totalAmount)}</div>
                <div style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 700 }}>{selectedOrderModal.paymentMethod || 'Cash on Delivery'}</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#667085', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Items in this Order</div>
              <div style={{ border: '1px solid #E5EBE6', borderRadius: '8px', overflow: 'hidden' }}>
                {(selectedOrderModal.items || []).map((it, idx) => (
                  <div key={idx} style={{ padding: '0.65rem 0.85rem', borderBottom: idx < (selectedOrderModal.items.length - 1) ? '1px solid #F3F4F6' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                    <div>
                      <strong>{it.name}</strong> ({it.weight || '5 KG'})
                      <span style={{ color: '#667085', marginLeft: '6px' }}>x{it.quantity}</span>
                    </div>
                    <div style={{ fontWeight: 700 }}>{fmt(it.subtotal || (Number(it.price || 0) * Number(it.quantity || 1)))}</div>
                  </div>
                ))}
              </div>
            </div>

            {selectedOrderModal.shippingAddress && (
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#667085', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Delivery Address</div>
                <div style={{ background: '#FDFBF7', border: '1px solid #EAE2D5', padding: '0.85rem', borderRadius: '8px', fontSize: '0.88rem', color: '#374151', lineHeight: 1.5 }}>
                  {selectedOrderModal.shippingAddress.houseFlat}, {selectedOrderModal.shippingAddress.streetArea}, {selectedOrderModal.shippingAddress.landmark ? `Near ${selectedOrderModal.shippingAddress.landmark}, ` : ''}{selectedOrderModal.shippingAddress.city} - {selectedOrderModal.shippingAddress.pincode}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => {
                  setSelectedOrderModal(null);
                  setActiveTab('orders');
                }}
                style={{ padding: '0.65rem 1.25rem', background: '#2E8B57', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Open in Orders Management →
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 2. ORDERS ────────────────────────────────────────────────────
function OrdersSection() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [trackingNumberInput, setTrackingNumberInput] = useState('');
  const [expectedDateInput, setExpectedDateInput] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState(null);

  const exportToCSV = () => {
    if (!orders || orders.length === 0) {
      alert('No orders available to export.');
      return;
    }

    const headers = [
      'Order ID',
      'Date',
      'Customer Name',
      'Phone',
      'Address',
      'Items Summary',
      'Total Amount (INR)',
      'Order Status',
      'Payment Mode',
      'Payment Status',
      'Delivery Agent'
    ];

    const rows = orders.map(o => {
      const itemsSummary = (o.items || [])
        .map(it => `${it.name} (${it.weight || '5 KG'}${it.texture ? ` - ${it.texture}` : ''}) x${it.quantity}`)
        .join('; ');
      const addr = o.shippingAddress
        ? `${o.shippingAddress.houseFlat || ''}, ${o.shippingAddress.streetArea || ''}, ${o.shippingAddress.city || ''} ${o.shippingAddress.pincode || ''}`.replace(/"/g, '""')
        : '';
      const agent = o.assignedDeliveryBoy ? o.assignedDeliveryBoy.name : 'Unassigned';

      return [
        `"${o.orderId || o._id}"`,
        `"${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : ''}"`,
        `"${(o.shippingAddress?.name || o.customerName || '').replace(/"/g, '""')}"`,
        `"${o.shippingAddress?.mobile || o.customerPhone || ''}"`,
        `"${addr}"`,
        `"${itemsSummary.replace(/"/g, '""')}"`,
        o.totalAmount || 0,
        `"${o.orderStatus || ''}"`,
        `"${o.paymentMethod || 'COD'}"`,
        `"${o.paymentStatus || 'Pending'}"`,
        `"${agent.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BPS_Fresh_Mills_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (selectedOrder) {
      setTrackingNumberInput(selectedOrder.trackingNumber || '');
      setExpectedDateInput(selectedOrder.expectedDeliveryDate ? selectedOrder.expectedDeliveryDate.slice(0, 10) : '');
    }
  }, [selectedOrder]);

  const saveTrackingDetails = async () => {
    if (!selectedOrder) return;
    setSavingTracking(true);
    try {
      const r = await API(`/admin/orders/${selectedOrder._id}/tracking-details`, {
        method: 'PUT',
        body: JSON.stringify({
          trackingNumber: trackingNumberInput,
          expectedDeliveryDate: expectedDateInput
        })
      });
      if (r.success) {
        alert('Tracking details updated successfully!');
        setSelectedOrder(r.order);
        load();
      } else {
        alert(r.message || 'Failed to update tracking details');
      }
    } finally {
      setSavingTracking(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ status: statusFilter, dateRange: dateFilter, search }).toString();
    Promise.all([
      API(`/admin/orders?${params}`),
      API('/admin/delivery-agents')
    ]).then(([r, ar]) => {
      if (r.success) setOrders(r.orders || []);
      if (ar.success) setDeliveryAgents(ar.agents || []);
    }).finally(() => setLoading(false));
  }, [search, statusFilter, dateFilter]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (orderId, status) => {
    const r = await API(`/admin/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
    if (r.success) { load(); if (selectedOrder?._id === orderId) setSelectedOrder(prev => ({ ...prev, orderStatus: status })); }
    else alert(r.message);
  };

  const confirmOrder = async (orderId) => {
    const r = await API(`/admin/orders/${orderId}/confirm`, { method: 'PUT' });
    if (r.success) {
      load();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(r.order || (prev => ({ ...prev, orderStatus: 'Confirmed' })));
      }
      alert('Order Confirmed! Customer has been notified via WhatsApp and Email.');
    } else {
      alert(r.message || 'Failed to confirm order');
    }
  };

  const cancelOrder = async (orderId) => {
    const reason = window.prompt('Enter cancellation reason (optional):') || 'Admin cancelled';
    const r = await API(`/admin/orders/${orderId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
    if (r.success) {
      load();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(r.order || (prev => ({ ...prev, orderStatus: 'Cancelled' })));
      }
      alert('Order Cancelled! Customer has been notified and stock has been restored.');
    } else {
      alert(r.message || 'Failed to cancel order');
    }
  };

  const assignAgent = async (orderId, agent) => {
    const r = await API(`/admin/orders/${orderId}/assign-delivery`, { method: 'PUT', body: JSON.stringify({ agentId: agent._id, agentName: agent.name, agentPhone: agent.mobile }) });
    if (r.success) { load(); alert('Delivery boy assigned!'); }
    else alert(r.message);
  };

  const STATUSES = ['All', 'Pending Admin Confirmation', 'Order Placed', 'Confirmed', 'Processing', 'Preparing', 'Shipped', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Cancelled'];

  return (
    <div>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.5rem', color: '#173D32' }}>Orders Management</h2>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#667085' }} />
          <input style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', color: '#1F2933', background: '#FFFFFF' }} placeholder="Search order ID, name, phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ padding: '0.8rem 1rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', color: '#1F2933', background: '#FFFFFF' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select style={{ padding: '0.8rem 1rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', color: '#1F2933', background: '#FFFFFF' }} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1rem', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF', cursor: 'pointer', fontWeight: 600, color: '#173D32' }} title="Refresh Orders">
          <RefreshCw size={16} />
        </button>
        <button
          onClick={exportToCSV}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1.25rem', border: '1px solid #2E8B57', borderRadius: '8px', background: '#E8F5EC', cursor: 'pointer', fontWeight: 700, color: '#2E8B57' }}
          title="Export orders to CSV"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {loading ? <Loader /> : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F8FAFC' }}>
                {['Order ID', 'Customer', 'Items', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '1rem', color: '#667085', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o._id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '1rem', fontWeight: 800, color: '#173D32' }}>#{o.orderId}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 700, color: '#173D32' }}>{o.customerName}</div>
                    <div style={{ fontSize: '0.85rem', color: '#667085' }}>{o.customerPhone}</div>
                  </td>
                  <td style={{ padding: '1rem', color: '#667085' }}>{o.items?.length || 0} item(s)</td>
                  <td style={{ padding: '1rem', fontWeight: 800, color: '#173D32' }}>{fmt(o.totalAmount)}</td>
                  <td style={{ padding: '1rem' }}><StatusBadge status={o.orderStatus} /></td>
                  <td style={{ padding: '1rem', color: '#667085', whiteSpace: 'nowrap' }}>{fmtDate(o.createdAt)}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => setSelectedOrder(o)} style={{ padding: '0.45rem 0.85rem', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#FFFFFF', color: '#173D32', fontWeight: 700, cursor: 'pointer' }}>View</button>
                      <button
                        onClick={() => setInvoiceModalOrder(o)}
                        style={{ padding: '0.45rem 0.65rem', border: '1px solid #CBD5E1', borderRadius: '6px', background: '#FFFFFF', color: '#2E8B57', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Print Bill / Invoice Slip"
                      >
                        <Printer size={14} /> Bill
                      </button>
                      {o.orderStatus === 'Pending Admin Confirmation' && (
                        <button
                          onClick={() => confirmOrder(o._id)}
                          style={{ padding: '0.45rem 0.85rem', border: 'none', borderRadius: '6px', background: '#2E8B57', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                          title="Confirm Order"
                        >
                          Confirm
                        </button>
                      )}
                      {['Pending Admin Confirmation', 'Confirmed'].includes(o.orderStatus) && (
                        <button
                          onClick={() => cancelOrder(o._id)}
                          style={{ padding: '0.45rem 0.85rem', border: 'none', borderRadius: '6px', background: '#DC2626', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                          title="Cancel Order"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <EmptyState message="No orders found" icon={ShoppingBag} />}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal title={`Order #${selectedOrder.orderId}`} onClose={() => setSelectedOrder(null)} maxWidth="700px">
          {selectedOrder.orderStatus === 'Pending Admin Confirmation' && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.98rem' }}>⚠️ Action Required: Pending Admin Confirmation</div>
                <div style={{ color: '#B45309', fontSize: '0.85rem', marginTop: '2px' }}>Review the customer and items details before confirming or cancelling this order.</div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={() => confirmOrder(selectedOrder._id)}
                  style={{ padding: '0.6rem 1.2rem', backgroundColor: '#2E8B57', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={16} /> Confirm Order
                </button>
                <button
                  onClick={() => cancelOrder(selectedOrder._id)}
                  style={{ padding: '0.6rem 1.2rem', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <X size={16} /> Cancel Order
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', background: '#F8FAFC', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#667085', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>Customer Info</div>
              <div style={{ fontWeight: 800, color: '#173D32', fontSize: '1.1rem' }}>{selectedOrder.customerName}</div>
              <div style={{ color: '#667085', marginTop: '0.2rem' }}>{selectedOrder.customerPhone}</div>
              {selectedOrder.customerEmail && <div style={{ color: '#667085' }}>{selectedOrder.customerEmail}</div>}
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem', color: '#667085', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '0.05em' }}>Delivery Address</div>
              <div style={{ color: '#1F2933', lineHeight: 1.5 }}>
                {selectedOrder.shippingAddress?.houseFlat}, {selectedOrder.shippingAddress?.streetArea}<br />
                {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.pincode}<br />
                {selectedOrder.shippingAddress?.distanceKm && <span style={{ color: '#2E8B57', fontWeight: 600 }}>~{selectedOrder.shippingAddress.distanceKm} KM from mill</span>}
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontWeight: 800, marginBottom: '1rem', color: '#173D32', fontSize: '1.1rem' }}>Order Items</div>
            <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0 1rem' }}>
              {selectedOrder.items?.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderBottom: i < selectedOrder.items.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#173D32' }}>{item.name}</div>
                    <div style={{ fontSize: '0.9rem', color: '#667085' }}>
                      {item.weight} {item.texture ? `• Grind: ${item.texture === 'Fine' ? 'बारीक (Fine)' : item.texture === 'Coarse' ? 'मोटा (Coarse)' : 'रेगुलर (Medium)'}` : ''} × {item.quantity}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#173D32' }}>{fmt(item.subtotal)}</div>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#667085' }}>
                <span>Subtotal</span><span>{fmt(selectedOrder.totalAmount - selectedOrder.deliveryCharge + selectedOrder.discount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#667085' }}>
                <span>Delivery Charge</span><span>{selectedOrder.deliveryCharge === 0 ? 'FREE' : fmt(selectedOrder.deliveryCharge)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2E8B57' }}>
                  <span>Discount ({selectedOrder.couponCode})</span><span>−{fmt(selectedOrder.discount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px dashed #E5E7EB', fontWeight: 800, fontSize: '1.25rem', color: '#173D32' }}>
                <span>Total</span><span>{fmt(selectedOrder.totalAmount)}</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: '#667085', marginBottom: '0.5rem', fontWeight: 600 }}>Payment Status</div>
              <div style={{ fontWeight: 800, color: '#173D32', fontSize: '1.1rem' }}>{selectedOrder.paymentStatus}</div>
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: '#667085', marginBottom: '0.5rem', fontWeight: 600 }}>Delivery OTP & Verification</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontWeight: 800, color: '#173D32', fontSize: '1.15rem', letterSpacing: '2px' }}>{selectedOrder.deliveryOtp || '—'}</span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '999px',
                  backgroundColor: selectedOrder.otpVerified ? '#DEF7EC' : '#FEF3C7',
                  color: selectedOrder.otpVerified ? '#03543F' : '#92400E'
                }}>
                  {selectedOrder.otpVerified ? 'Verified ✅' : 'Pending ⏳'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Expected Delivery Date & Tracking Number */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 800, color: '#173D32', marginBottom: '0.75rem', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Truck size={17} color="#2E8B57" /> Expected Delivery & Tracking Number
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#667085', marginBottom: '0.3rem' }}>Expected Delivery Date</label>
                <input
                  type="date"
                  value={expectedDateInput}
                  onChange={e => setExpectedDateInput(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#667085', marginBottom: '0.3rem' }}>Tracking Number / AWB</label>
                <input
                  type="text"
                  placeholder="e.g. BPS-TRK-1025"
                  value={trackingNumberInput}
                  onChange={e => setTrackingNumberInput(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.8rem', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
              <button
                onClick={saveTrackingDetails}
                disabled={savingTracking}
                style={{ padding: '0.65rem 1.25rem', backgroundColor: '#2E8B57', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', height: '38px' }}
              >
                {savingTracking ? 'Saving…' : 'Save Details'}
              </button>
            </div>
          </div>

          {/* WhatsApp & Email Notification Statuses */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <div style={{ fontWeight: 800, color: '#173D32', marginBottom: '0.75rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={16} color="#2E8B57" /> Notification Delivery Statuses
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#FFFFFF', padding: '0.85rem', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#667085', marginBottom: '0.3rem' }}>WhatsApp Notification</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: selectedOrder.notifications?.whatsapp?.lastStatus === 'sent' ? '#DEF7EC' : selectedOrder.notifications?.whatsapp?.lastStatus === 'failed' ? '#FDE8E8' : selectedOrder.notifications?.whatsapp?.lastStatus === 'not_configured' ? '#FEF08A' : '#E5E7EB',
                    color: selectedOrder.notifications?.whatsapp?.lastStatus === 'sent' ? '#03543F' : selectedOrder.notifications?.whatsapp?.lastStatus === 'failed' ? '#9B1C1C' : selectedOrder.notifications?.whatsapp?.lastStatus === 'not_configured' ? '#854D0E' : '#374151'
                  }}>
                    {selectedOrder.notifications?.whatsapp?.lastStatus ? (selectedOrder.notifications.whatsapp.lastStatus === 'not_configured' ? 'Not Configured' : selectedOrder.notifications.whatsapp.lastStatus) : 'Pending'}
                  </span>
                  {selectedOrder.notifications?.whatsapp?.lastSentAt && (
                    <span style={{ fontSize: '0.75rem', color: '#667085' }}>
                      {fmtDateTime(selectedOrder.notifications.whatsapp.lastSentAt)}
                    </span>
                  )}
                </div>
                {selectedOrder.notifications?.whatsapp?.error && (
                  <div style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px' }}>
                    {selectedOrder.notifications.whatsapp.error}
                  </div>
                )}
              </div>

              <div style={{ background: '#FFFFFF', padding: '0.85rem', borderRadius: '6px', border: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#667085', marginBottom: '0.3rem' }}>Email Notification</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: selectedOrder.notifications?.email?.lastStatus === 'sent' ? '#DEF7EC' : selectedOrder.notifications?.email?.lastStatus === 'failed' ? '#FDE8E8' : selectedOrder.notifications?.email?.lastStatus === 'not_configured' ? '#FEF08A' : '#E5E7EB',
                    color: selectedOrder.notifications?.email?.lastStatus === 'sent' ? '#03543F' : selectedOrder.notifications?.email?.lastStatus === 'failed' ? '#9B1C1C' : selectedOrder.notifications?.email?.lastStatus === 'not_configured' ? '#854D0E' : '#374151'
                  }}>
                    {selectedOrder.notifications?.email?.lastStatus ? (selectedOrder.notifications.email.lastStatus === 'not_configured' ? 'Not Configured' : selectedOrder.notifications.email.lastStatus) : 'Pending'}
                  </span>
                  {selectedOrder.notifications?.email?.lastSentAt && (
                    <span style={{ fontSize: '0.75rem', color: '#667085' }}>
                      {fmtDateTime(selectedOrder.notifications.email.lastSentAt)}
                    </span>
                  )}
                </div>
                {selectedOrder.notifications?.email?.error && (
                  <div style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px' }}>
                    {selectedOrder.notifications.email.error}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>
                {selectedOrder.assignedDeliveryBoy ? 'Reassign Delivery Partner' : 'Assign Delivery Partner'}
              </label>
              <select
                style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none', background: '#FFFFFF', fontWeight: 600 }}
                onChange={e => {
                  const agent = deliveryAgents.find(a => a._id === e.target.value);
                  if (agent) assignAgent(selectedOrder._id, agent);
                }}
                defaultValue=""
              >
                <option value="">{selectedOrder.assignedDeliveryBoy ? 'Choose new active partner to reassign…' : 'Select active delivery partner…'}</option>
                {deliveryAgents.filter(a => a.status === 'active').map(a => (
                  <option key={a._id} value={a._id}>
                    {a.name} ({a.mobile}) — Active 🟢
                  </option>
                ))}
              </select>
              {selectedOrder.assignedDeliveryBoy && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#166534', fontWeight: 700, backgroundColor: '#F0FDF4', padding: '6px 10px', borderRadius: '6px', border: '1px solid #BBF7D0' }}>
                  Currently Assigned: {selectedOrder.assignedDeliveryBoy.name} ({selectedOrder.assignedDeliveryBoy.phone})
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>Update Order Status</label>
              <select style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none', background: '#FFFFFF', color: '#173D32', fontWeight: 700 }} value={selectedOrder.orderStatus} onChange={e => { changeStatus(selectedOrder._id, e.target.value); setSelectedOrder(p => ({ ...p, orderStatus: e.target.value })); }}>
                {['Pending Admin Confirmation','Order Placed','Confirmed','Processing','Preparing','Shipped','Ready for Delivery','Out for Delivery','Delivered','Cancelled','Return Requested','Returned'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              onClick={() => setInvoiceModalOrder(selectedOrder)}
              style={{
                padding: '0.65rem 1.25rem',
                backgroundColor: '#2E8B57',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Printer size={16} /> Print Tax Invoice / Slip
            </button>

            {['Pending Admin Confirmation', 'Order Placed', 'Confirmed', 'Processing', 'Preparing'].includes(selectedOrder.orderStatus) && (
              <button
                onClick={() => cancelOrder(selectedOrder._id)}
                style={{
                  padding: '0.65rem 1.25rem',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <X size={16} /> Cancel Order
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Printable Tax Invoice Modal */}
      {invoiceModalOrder && (
        <InvoiceModal order={invoiceModalOrder} onClose={() => setInvoiceModalOrder(null)} />
      )}
    </div>
  );
}

// ── 3. INVENTORY (PRODUCTS) ──────────────────────────────────────────
function ProductsSection() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', category: '', shortDescription: '', description: '', ingredients: '', price: '', originalPrice: '', costPrice: '', weight: '5 KG', stock: 25, lowStockThreshold: 5, isFeatured: false, isBestSeller: false, isNew: false, isActive: true, image: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const galleryFileRef = useRef();
  const cameraFileRef = useRef();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([API('/admin/products'), API('/admin/categories')]).then(([pr, cr]) => {
      if (pr.success) setProducts(pr.products || []);
      if (cr.success) setCategories(cr.categories || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p => {
    const matchCat = catFilter === 'All' || p.category === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '',
      sku: '',
      category: categories[0]?.name || '',
      shortDescription: '',
      description: '',
      ingredients: '',
      price: '',
      originalPrice: '',
      costPrice: '',
      weight: '5 KG',
      stock: 25,
      lowStockThreshold: 5,
      isFeatured: false,
      isBestSeller: false,
      isNew: false,
      isActive: true,
      image: '',
      tags: ''
    });
    setModal('add');
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      ...p,
      costPrice: p.costPrice !== undefined && p.costPrice !== null ? p.costPrice : '',
      lowStockThreshold: p.lowStockThreshold !== undefined ? p.lowStockThreshold : 5,
      sku: p.sku || '',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '')
    });
    setModal('edit');
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const token = localStorage.getItem('bps_token');
      const apiBase = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
      const uploadUrl = `${apiBase}/admin/upload`;
      const r = await fetch(uploadUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await r.json();
      if (data.success) {
        const serverOrigin = apiBase.startsWith('http') ? apiBase.replace(/\/api$/, '') : '';
        setForm(f => ({ ...f, image: `${serverOrigin}${data.url}` }));
      } else {
        alert('Upload failed: ' + (data.message || 'Error'));
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        costPrice: form.costPrice !== '' && form.costPrice !== undefined && form.costPrice !== null ? Number(form.costPrice) : null,
        lowStockThreshold: form.lowStockThreshold !== '' && form.lowStockThreshold !== undefined ? Number(form.lowStockThreshold) : 5,
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags
      };
      let r;
      if (editing) r = await API(`/admin/products/${editing._id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else r = await API('/admin/products', { method: 'POST', body: JSON.stringify(payload) });
      if (r.success) { setModal(null); load(); }
      else alert(r.message);
    } finally { setSaving(false); }
  };

  const del = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const r = await API(`/admin/products/${id}`, { method: 'DELETE' });
    if (r.success) load(); else alert(r.message);
  };

  const toggleActive = async (p) => {
    await API(`/admin/products/${p._id}`, { method: 'PUT', body: JSON.stringify({ isActive: !p.isActive }) });
    load();
  };

  const catNames = ['All', ...categories.map(c => c.name)];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#173D32' }}>Inventory Management</h2>
        <button onClick={openAdd} style={{ padding: '0.8rem 1.2rem', backgroundColor: '#2E8B57', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Add New Product
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#667085' }} />
          <input style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', color: '#1F2933', background: '#FFFFFF' }} placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ padding: '0.8rem 1rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', color: '#1F2933', background: '#FFFFFF' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          {catNames.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <Loader /> : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F8FAFC' }}>
                {['Product Name', 'Price / Cost', 'Stock', 'Status', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '1rem', color: '#667085', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid #E5E7EB', opacity: p.isActive === false ? 0.6 : 1 }}>
                  <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: '#F8FAFC', overflow: 'hidden', flexShrink: 0 }}>
                      {p.image ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={24} style={{ color: '#C9A44C', margin: '8px' }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#173D32' }}>{p.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#667085' }}>{p.category} • {p.weight}</div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 800, color: '#173D32' }}>{fmt(p.price)}</div>
                    {p.costPrice !== undefined && p.costPrice !== null && p.costPrice !== '' ? (
                      <div style={{ fontSize: '0.78rem', color: '#667085' }}>Cost: {fmt(p.costPrice)}</div>
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: '#D97706', fontWeight: 700 }}>No Cost Data</div>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontWeight: 800, color: p.stock <= 0 ? '#dc2626' : p.stock <= (p.lowStockThreshold || 5) ? '#ea580c' : '#2E8B57' }}>
                      {p.stock}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                      Min: {p.lowStockThreshold || 5}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, background: p.isActive ? '#E8F5EC' : '#FDE8E6', color: p.isActive ? '#2E8B57' : '#C0392B' }}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openEdit(p)} style={{ padding: '0.5rem', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', color: '#667085' }}><Edit2 size={16} /></button>
                      <button onClick={() => toggleActive(p)} style={{ padding: '0.5rem', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '6px', cursor: 'pointer', color: p.isActive ? '#C0392B' : '#2E8B57' }}>{p.isActive ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      <button onClick={() => del(p._id, p.name)} style={{ padding: '0.5rem', background: '#FDE8E6', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#C0392B' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState message="No products found" icon={Package} />}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'Add New Product' : `Edit: ${editing?.name}`} onClose={() => setModal(null)} maxWidth="700px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>Product Name *</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none' }} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chakki Fresh Sharbati Atta" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>Category *</label>
              <select style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none', background: '#FFFFFF' }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>Sale Price (₹) *</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none' }} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>
                Cost Price (₹) <span style={{ fontSize: '0.75rem', color: '#2E8B57', fontWeight: 600 }}>(For Real Profit)</span>
              </label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none' }} type="number" placeholder="e.g. 180" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>Original Price (₹)</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none' }} type="number" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>Default Weight</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none' }} value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} placeholder="e.g. 5 KG" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>Stock Quantity *</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none' }} type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>
                Low Stock Threshold <span style={{ fontSize: '0.75rem', color: '#667085', fontWeight: 500 }}>(Auto-Alert)</span>
              </label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none' }} type="number" placeholder="5" value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>Product SKU</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none' }} value={form.sku || ''} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. BPS-ATT-01" />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>Search Tags (comma separated)</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none' }} value={form.tags || ''} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. atta, fresh, chakki, fiber" />
            </div>
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>Full Description</label>
            <textarea style={{ width: '100%', padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none', minHeight: '100px', resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: '#667085', fontSize: '0.9rem' }}>
              Product Image (Gallery, Camera or Web URL)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <input
                style={{ flex: 1, padding: '0.8rem', border: '1px solid #E5E7EB', borderRadius: '8px', outline: 'none' }}
                value={form.image}
                onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                placeholder="Paste image URL or choose from gallery/camera below"
              />
            </div>

            {/* Hidden File Inputs */}
            {/* 1. Gallery Input: NO capture attribute to trigger mobile Photos / Gallery picker */}
            <input
              type="file"
              ref={galleryFileRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleImageUpload(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />

            {/* 2. Camera Input: capture="environment" to directly open camera */}
            <input
              type="file"
              ref={cameraFileRef}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleImageUpload(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />

            {/* Action Buttons: Explicit Gallery and Camera Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => galleryFileRef.current?.click()}
                disabled={uploadingImage}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: '#173D32',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Upload size={16} /> {uploadingImage ? 'Uploading…' : '📁 Upload from Gallery'}
              </button>

              <button
                type="button"
                onClick={() => cameraFileRef.current?.click()}
                disabled={uploadingImage}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: '#2E8B57',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Camera size={16} /> {uploadingImage ? 'Opening Camera…' : '📸 Take Photo (Camera)'}
              </button>
            </div>

            {form.image && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '12px', background: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <img
                  src={form.image}
                  alt="Preview"
                  style={{ width: 68, height: 68, objectFit: 'cover', borderRadius: '8px', border: '2px solid #2E8B57' }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 800 }}>✔ Image Selected & Ready</div>
                  <div style={{ fontSize: '0.75rem', color: '#667085', wordBreak: 'break-all', maxWidth: '300px' }}>{form.image}</div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, image: '' }))}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', padding: '2px 0', textDecoration: 'underline', fontWeight: 600, marginTop: '2px' }}
                  >
                    Remove Image
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', margin: '1.5rem 0' }}>
            {[['isFeatured', 'Featured'], ['isBestSeller', 'Best Seller'], ['isNew', 'New Arrival'], ['isActive', 'Active (Visible)']].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700, color: '#173D32' }}>
                <input type="checkbox" style={{ accentColor: '#2E8B57', width: '18px', height: '18px' }} checked={Boolean(form[key])} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} /> {label}
              </label>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid #E5E7EB' }}>
            <button onClick={() => setModal(null)} style={{ padding: '0.8rem 1.5rem', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, color: '#667085' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '0.8rem 1.5rem', background: '#2E8B57', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, color: '#FFFFFF', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : modal === 'add' ? 'Add Product' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 3B. INVENTORY (STOCK MANAGEMENT) ──────────────────────────────────────────
function InventorySection({ setActiveTab }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'out', 'in'
  const [updatingId, setUpdatingId] = useState(null);
  const [customStockModal, setCustomStockModal] = useState(null);
  const [customDelta, setCustomDelta] = useState(0);
  const [customReason, setCustomReason] = useState('Fresh Chakki Milling Batch');
  const [toastMsg, setToastMsg] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    API('/admin/products')
      .then(r => {
        if (r.success) setProducts(r.products || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleStockChange = async (prod, delta, reason = 'Quick Adjustment') => {
    const newStock = Math.max(0, (Number(prod.stock) || 0) + delta);
    setUpdatingId(prod._id);
    try {
      const res = await API(`/admin/products/${prod._id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...prod, stock: newStock })
      });
      if (res.success) {
        setProducts(prev => prev.map(p => p._id === prod._id ? { ...p, stock: newStock } : p));
        showToast(`Stock updated for ${prod.name}: ${prod.stock} → ${newStock}`);
      } else {
        alert(res.message || 'Failed to update stock');
      }
    } catch (e) {
      alert('Error updating stock: ' + e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveCustom = async () => {
    if (!customStockModal) return;
    const delta = Number(customDelta) || 0;
    if (delta === 0) {
      setCustomStockModal(null);
      return;
    }
    await handleStockChange(customStockModal, delta, customReason);
    setCustomStockModal(null);
    setCustomDelta(0);
  };

  // Metrics
  const totalItems = products.length;
  const totalStockKg = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const lowStockProducts = products.filter(p => (Number(p.stock) || 0) <= (Number(p.lowStockThreshold) || 5) && (Number(p.stock) || 0) > 0);
  const outOfStockProducts = products.filter(p => (Number(p.stock) || 0) === 0);
  const inStockProducts = products.filter(p => (Number(p.stock) || 0) > (Number(p.lowStockThreshold) || 5));

  const filtered = products.filter(p => {
    const matchesSearch = !search.trim() || 
      (p.name && p.name.toLowerCase().includes(search.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()));

    const stock = Number(p.stock) || 0;
    const threshold = Number(p.lowStockThreshold) || 5;

    if (!matchesSearch) return false;
    if (stockFilter === 'out') return stock === 0;
    if (stockFilter === 'low') return stock <= threshold && stock > 0;
    if (stockFilter === 'in') return stock > threshold;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', background: '#133E2B', color: '#FFFFFF',
          padding: '0.85rem 1.5rem', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 9999, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #C9A44C'
        }}>
          <CheckCircle2 size={18} color="#C9A44C" /> {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#133E2B' }}>
            🌾 Inventory & Stock Management
          </h2>
          <p style={{ color: '#667085', fontSize: '0.88rem', margin: '4px 0 0' }}>
            Real-time stone ground chakki flour stock tracking, low-stock warnings, and instant +/- adjustments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.7rem 1rem', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF', cursor: 'pointer', fontWeight: 600, color: '#173D32' }}
            title="Refresh Stock"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', color: '#667085', fontWeight: 700, textTransform: 'uppercase' }}>Total Available Units</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#133E2B', marginTop: '4px' }}>{totalStockKg.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 600, marginTop: '2px' }}>Across {totalItems} varieties</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', color: '#667085', fontWeight: 700, textTransform: 'uppercase' }}>In Stock Items</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#16A34A', marginTop: '4px' }}>{inStockProducts.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#667085', fontWeight: 600, marginTop: '2px' }}>Optimal inventory level</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', color: '#667085', fontWeight: 700, textTransform: 'uppercase' }}>Low Stock Alert</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#D97706', marginTop: '4px' }}>{lowStockProducts.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 600, marginTop: '2px' }}>Milling required soon</div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.8rem', color: '#667085', fontWeight: 700, textTransform: 'uppercase' }}>Out of Stock</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#DC2626', marginTop: '4px' }}>{outOfStockProducts.length}</div>
          <div style={{ fontSize: '0.78rem', color: '#DC2626', fontWeight: 600, marginTop: '2px' }}>Customers cannot order</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '12px', padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.6rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.92rem', outline: 'none' }}
            placeholder="Search flour variety, SKU or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All (${products.length})` },
            { id: 'low', label: `Low Stock (${lowStockProducts.length})` },
            { id: 'out', label: `Out of Stock (${outOfStockProducts.length})` },
            { id: 'in', label: `In Stock (${inStockProducts.length})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStockFilter(f.id)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: stockFilter === f.id ? '1.5px solid #16A34A' : '1px solid #E5E7EB',
                background: stockFilter === f.id ? '#DEF7EC' : '#FFFFFF',
                color: stockFilter === f.id ? '#047857' : '#4B5563',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Table */}
      {loading ? <Loader /> : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5EBE6', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#667085', fontWeight: 700 }}>Product & SKU</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#667085', fontWeight: 700 }}>Category</th>
                <th style={{ textAlign: 'center', padding: '1rem', color: '#667085', fontWeight: 700 }}>Current Stock</th>
                <th style={{ textAlign: 'center', padding: '1rem', color: '#667085', fontWeight: 700 }}>Min. Alert Level</th>
                <th style={{ textAlign: 'center', padding: '1rem', color: '#667085', fontWeight: 700 }}>Status</th>
                <th style={{ textAlign: 'center', padding: '1rem', color: '#667085', fontWeight: 700 }}>Quick Stock Adjustment</th>
                <th style={{ textAlign: 'right', padding: '1rem', color: '#667085', fontWeight: 700 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const stock = Number(p.stock) || 0;
                const threshold = Number(p.lowStockThreshold) || 5;
                const isOut = stock === 0;
                const isLow = stock > 0 && stock <= threshold;
                const statusColor = isOut ? '#DC2626' : isLow ? '#D97706' : '#16A34A';
                const statusBg = isOut ? '#FEE2E2' : isLow ? '#FEF3C7' : '#DEF7EC';
                const statusLabel = isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';

                return (
                  <tr key={p._id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '0.9rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {p.image ? (
                          <img src={p.image} alt={p.name} style={{ width: 44, height: 44, borderRadius: '8px', objectFit: 'cover', border: '1px solid #E5E7EB' }} />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: '8px', background: '#F0F7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                            <Package size={20} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 800, color: '#133E2B' }}>{p.name}</div>
                          <div style={{ fontSize: '0.78rem', color: '#667085' }}>
                            {p.weight || '5 KG'} • SKU: {p.sku || p._id?.slice(-6).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.9rem 1rem', color: '#4B5563', fontWeight: 600 }}>
                      {p.category || 'Flour'}
                    </td>

                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 900, color: isOut ? '#DC2626' : isLow ? '#D97706' : '#133E2B' }}>
                        {stock}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#667085', marginLeft: '4px' }}>units</span>
                    </td>

                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center', color: '#667085', fontWeight: 600 }}>
                      {threshold} units
                    </td>

                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        backgroundColor: statusBg,
                        color: statusColor
                      }}>
                        {statusLabel}
                      </span>
                    </td>

                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F8FAFC', padding: '4px 6px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                        <button
                          onClick={() => handleStockChange(p, -5)}
                          disabled={stock <= 0 || updatingId === p._id}
                          title="Reduce 5 units"
                          style={{ padding: '3px 7px', border: '1px solid #D1D5DB', borderRadius: '4px', background: '#FFFFFF', color: '#DC2626', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleStockChange(p, -1)}
                          disabled={stock <= 0 || updatingId === p._id}
                          title="Reduce 1 unit"
                          style={{ padding: '3px 7px', border: '1px solid #D1D5DB', borderRadius: '4px', background: '#FFFFFF', color: '#DC2626', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleStockChange(p, 1)}
                          disabled={updatingId === p._id}
                          title="Add 1 unit"
                          style={{ padding: '3px 7px', border: '1px solid #D1D5DB', borderRadius: '4px', background: '#FFFFFF', color: '#16A34A', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleStockChange(p, 5)}
                          disabled={updatingId === p._id}
                          title="Add 5 units (batch)"
                          style={{ padding: '3px 7px', border: '1px solid #D1D5DB', borderRadius: '4px', background: '#FFFFFF', color: '#16A34A', fontWeight: 800, cursor: 'pointer', fontSize: '0.78rem' }}
                        >
                          +5
                        </button>
                        <button
                          onClick={() => { setCustomStockModal(p); setCustomDelta(0); }}
                          title="Custom batch adjustment"
                          style={{ padding: '3px 8px', border: 'none', borderRadius: '4px', background: '#16A34A', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem', marginLeft: '4px' }}
                        >
                          Custom
                        </button>
                      </div>
                    </td>

                    <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          if (setActiveTab) setActiveTab('products');
                        }}
                        style={{
                          padding: '0.45rem 0.9rem',
                          background: '#FFFFFF',
                          border: '1px solid #16A34A',
                          borderRadius: '6px',
                          color: '#16A34A',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        Edit Product
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#667085' }}>
                    No products match the selected stock filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Custom Stock Adjustment Modal */}
      {customStockModal && (
        <Modal title={`Adjust Stock — ${customStockModal.name}`} onClose={() => setCustomStockModal(null)} maxWidth="480px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '0.82rem', color: '#667085' }}>Current Stock</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#133E2B' }}>
                {customStockModal.stock || 0} units
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                Stock Delta (Use positive to add, negative to subtract)
              </label>
              <input
                type="number"
                value={customDelta}
                onChange={e => setCustomDelta(e.target.value)}
                placeholder="e.g. +20 or -5"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '1rem', fontWeight: 700 }}
              />
              <div style={{ fontSize: '0.8rem', color: '#667085', marginTop: '4px' }}>
                New Stock will be: <strong>{Math.max(0, (Number(customStockModal.stock) || 0) + (Number(customDelta) || 0))} units</strong>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#374151', marginBottom: '0.4rem' }}>
                Adjustment Reason / Note
              </label>
              <select
                value={customReason}
                onChange={e => setCustomReason(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.9rem', background: '#FFFFFF' }}
              >
                <option value="Fresh Chakki Milling Batch">🌾 Fresh Chakki Milling Batch</option>
                <option value="Restock Raw Grain Shipment">📦 Restock Raw Grain Shipment</option>
                <option value="Damage / Spoilage / Moisture Loss">⚠️ Damage / Spoilage / Moisture Loss</option>
                <option value="Physical Audit Discrepancy Correction">📝 Physical Audit Discrepancy Correction</option>
                <option value="Customer Return Restock">🔄 Customer Return Restock</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setCustomStockModal(null)}
                style={{ padding: '0.65rem 1.25rem', background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustom}
                disabled={Number(customDelta) === 0}
                style={{ padding: '0.65rem 1.25rem', background: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: Number(customDelta) === 0 ? 0.6 : 1 }}
              >
                Apply Adjustment
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 4. CATEGORIES ────────────────────────────────────────────────
// ── 4. CATEGORIES (Reference Image 2) ────────────────────────────
function CategoriesSection() {
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', image: '', isActive: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [uploadingCatImage, setUploadingCatImage] = useState(false);
  const catGalleryRef = useRef();

  const handleCatImageUpload = async (file) => {
    if (!file) return;
    setUploadingCatImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const token = localStorage.getItem('bps_token');
      const apiBase = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
      const uploadUrl = `${apiBase}/admin/upload`;
      const r = await fetch(uploadUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await r.json();
      if (data.success) {
        const serverOrigin = apiBase.startsWith('http') ? apiBase.replace(/\/api$/, '') : '';
        setForm(f => ({ ...f, image: `${serverOrigin}${data.url}` }));
      } else {
        alert('Upload failed: ' + (data.message || 'Error'));
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingCatImage(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([API('/admin/categories'), API('/admin/products')]).then(([cr, pr]) => {
      if (cr.success) setCats(cr.categories || []);
      if (pr.success) setProducts(pr.products || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', description: '', image: '', isActive: true, sortOrder: cats.length + 1 });
    setModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || '', image: c.image || '', isActive: c.isActive !== false, sortOrder: c.sortOrder || 0 });
    setModal(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      let r;
      if (editing) r = await API(`/admin/categories/${editing._id}`, { method: 'PUT', body: JSON.stringify(form) });
      else r = await API('/admin/categories', { method: 'POST', body: JSON.stringify(form) });
      if (r.success) { setModal(false); load(); }
      else alert(r.message);
    } finally { setSaving(false); }
  };

  const del = async (id, name) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    const r = await API(`/admin/categories/${id}`, { method: 'DELETE' });
    if (r.success) load(); else alert(r.message);
  };

  // Filter & Sort
  const filtered = cats.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? c.isActive !== false : c.isActive === false);
    return matchSearch && matchStatus;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const activeCount = cats.filter(c => c.isActive !== false).length;
  const inactiveCount = cats.filter(c => c.isActive === false).length;
  const totalProducts = products.length;

  return (
    <div>
      {/* Header with breadcrumbs & Add button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#173D32' }}>Categories</h2>
          <div style={{ color: '#667085', fontSize: '0.92rem', marginTop: '0.2rem' }}>Manage product categories for your store</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#667085', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Admin</span> <ChevronRight size={14} /> <span style={{ color: '#173D32', fontWeight: 700 }}>Categories</span>
          </div>
          <button onClick={openAdd} style={{ padding: '0.75rem 1.25rem', backgroundColor: '#2E8B57', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 6px rgba(46,139,87,0.2)' }}>
            <Plus size={18} /> Add Category
          </button>
        </div>
      </div>

      {/* 4 Stat Cards (Reference Image 2) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#E8F5EC', color: '#2E8B57', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Boxes size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#667085', fontWeight: 600 }}>Total Categories</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#173D32' }}>{cats.length}</div>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#E8F5EC', color: '#2E8B57', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#667085', fontWeight: 600 }}>Active Categories</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#173D32' }}>{activeCount}</div>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#FDE8E6', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#667085', fontWeight: 600 }}>Inactive Categories</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#173D32' }}>{inactiveCount}</div>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#FEF3C7', color: '#C9A44C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <List size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#667085', fontWeight: 600 }}>Total Products</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#173D32' }}>{totalProducts}</div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar (Reference Image 2) */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#667085' }} />
          <input
            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.92rem', outline: 'none', color: '#1F2933', background: '#F8FAFC' }}
            placeholder="Search category name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          style={{ padding: '0.75rem 1rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.92rem', outline: 'none', color: '#1F2933', background: '#FFFFFF', minWidth: '140px' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          style={{ padding: '0.75rem 1rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.92rem', outline: 'none', color: '#1F2933', background: '#FFFFFF', minWidth: '160px' }}
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="newest">Sort by: Newest</option>
          <option value="oldest">Sort by: Oldest</option>
          <option value="name">Sort by: Name (A-Z)</option>
        </select>
      </div>

      {/* Category Table (Reference Image 2) */}
      {loading ? <Loader /> : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F8FAFC' }}>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#667085', fontWeight: 700, width: '40px' }}>#</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#667085', fontWeight: 700 }}>Category Name</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#667085', fontWeight: 700 }}>Image</th>
                <th style={{ textAlign: 'center', padding: '1rem', color: '#667085', fontWeight: 700 }}>Products</th>
                <th style={{ textAlign: 'center', padding: '1rem', color: '#667085', fontWeight: 700 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#667085', fontWeight: 700 }}>Created On</th>
                <th style={{ textAlign: 'center', padding: '1rem', color: '#667085', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, idx) => {
                const prodCount = products.filter(p => p.category === c.name).length;
                const rowNum = (page - 1) * itemsPerPage + idx + 1;
                return (
                  <tr key={c._id} style={{ borderBottom: '1px solid #E5E7EB', opacity: c.isActive === false ? 0.75 : 1 }}>
                    <td style={{ padding: '1rem', color: '#667085', fontWeight: 700 }}>{rowNum}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 800, color: '#173D32' }}>{c.name}</div>
                      {c.description && <div style={{ fontSize: '0.8rem', color: '#667085', marginTop: '2px' }}>{c.description}</div>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E5E7EB', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.image ? <img src={c.image} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={20} style={{ color: '#2E8B57' }} />}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, color: '#173D32' }}>
                      {prodCount}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 700,
                        background: c.isActive !== false ? '#E8F5EC' : '#FDE8E6',
                        color: c.isActive !== false ? '#2E8B57' : '#DC2626'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.isActive !== false ? '#2E8B57' : '#DC2626' }}></span>
                        {c.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#667085', fontSize: '0.88rem' }}>
                      {fmtDate(c.createdAt || '2025-09-10')}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button onClick={() => openEdit(c)} title="Edit Category" style={{ padding: '0.5rem', background: '#FFFFFF', border: '1px solid #2E8B57', borderRadius: '6px', cursor: 'pointer', color: '#2E8B57', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => del(c._id, c.name)} title="Delete Category" style={{ padding: '0.5rem', background: '#FFFFFF', border: '1px solid #DC2626', borderRadius: '6px', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {paginated.length === 0 && <EmptyState message="No categories found" icon={Tag} />}

          {/* Pagination Controls (Reference Image 2) */}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid #E5E7EB', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#667085' }}>
                Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filtered.length)} of {filtered.length} categories
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: '0.4rem 0.8rem', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#FFFFFF', cursor: page <= 1 ? 'not-allowed' : 'pointer', color: '#667085', fontWeight: 700, opacity: page <= 1 ? 0.5 : 1 }}
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      padding: '0.4rem 0.8rem', border: '1px solid', borderColor: page === p ? '#2E8B57' : '#E5E7EB',
                      borderRadius: '6px', background: page === p ? '#2E8B57' : '#FFFFFF',
                      color: page === p ? '#FFFFFF' : '#1F2933', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '0.4rem 0.8rem', border: '1px solid #E5E7EB', borderRadius: '6px', background: '#FFFFFF', cursor: page >= totalPages ? 'not-allowed' : 'pointer', color: '#667085', fontWeight: 700, opacity: page >= totalPages ? 0.5 : 1 }}
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {modal && (
        <Modal title={editing ? `Edit: ${editing.name}` : 'Add Category'} onClose={() => setModal(false)}>
          <FieldRow label="Category Name" required>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Atta, Rice & Grains" />
          </FieldRow>
          <FieldRow label="Description">
            <textarea style={textareaStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief category summary" />
          </FieldRow>
          <FieldRow label="Category Image (Gallery or URL)">
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input style={inputStyle} value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} placeholder="Paste image URL or choose below" />
            </div>
            <input
              type="file"
              ref={catGalleryRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  handleCatImageUpload(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            <button
              type="button"
              onClick={() => catGalleryRef.current?.click()}
              disabled={uploadingCatImage}
              style={{
                padding: '0.65rem 1.15rem',
                background: '#173D32',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Upload size={15} /> {uploadingCatImage ? 'Uploading…' : '📁 Upload from Gallery'}
            </button>
            {form.image && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <img src={form.image} alt="Preview" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '6px', border: '2px solid #2E8B57' }} />
                <button type="button" onClick={() => setForm(f => ({ ...f, image: '' }))} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}>Remove Image</button>
              </div>
            )}
          </FieldRow>
          <FieldRow label="Sort Order">
            <input style={inputStyle} type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
          </FieldRow>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', fontSize: '0.92rem', fontWeight: 700, color: '#173D32' }}>
            <input type="checkbox" style={{ accentColor: '#2E8B57', width: '18px', height: '18px' }} checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} /> Active (visible to customers)
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(false)} style={{ padding: '0.7rem 1.25rem', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF', cursor: 'pointer', fontWeight: 700, color: '#667085' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ padding: '0.7rem 1.25rem', border: 'none', borderRadius: '8px', background: '#2E8B57', cursor: 'pointer', fontWeight: 700, color: '#FFFFFF', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 5. CUSTOMERS ─────────────────────────────────────────────────
function CustomersSection() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    API(`/admin/customers${search ? '?search=' + encodeURIComponent(search) : ''}`).then(r => { if (r.success) setCustomers(r.customers || []); }).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const viewDetail = async (c) => {
    setSelected(c); setLoadingDetail(true);
    API(`/admin/customers/${c._id}`).then(r => { if (r.success) setCustomerDetail(r); }).finally(() => setLoadingDetail(false));
  };

  const toggleStatus = async (id, isActive) => {
    const r = await API(`/admin/customers/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive: !isActive }) });
    if (r.success) load(); else alert(r.message);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#173D32' }}>Customers ({customers.length})</h2>
      </div>
      
      <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '1.5rem' }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#667085' }} />
        <input style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.95rem', outline: 'none', color: '#1F2933', background: '#FFFFFF' }} placeholder="Search name, mobile, email…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      
      {loading ? <Loader /> : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F8FAFC' }}>
                {['Customer', 'Mobile', 'Orders', 'Total Spent', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '1rem', color: '#667085', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c._id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 800, color: '#173D32' }}>{c.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#667085' }}>{c.email || 'No email'}</div>
                  </td>
                  <td style={{ padding: '1rem', color: '#1F2933' }}>{c.mobile}</td>
                  <td style={{ padding: '1rem', fontWeight: 800, color: '#173D32' }}>{c.totalOrders}</td>
                  <td style={{ padding: '1rem', fontWeight: 800, color: '#2E8B57' }}>{fmt(c.totalSpent)}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', background: c.isActive === false ? '#FDE8E6' : '#E8F5EC', color: c.isActive === false ? '#C0392B' : '#2E8B57' }}>
                      {c.isActive === false ? 'Blocked' : 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#667085' }}>{fmtDate(c.createdAt)}</td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '8px' }}>
                    <button onClick={() => viewDetail(c)} style={{ padding: '0.5rem 1rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', cursor: 'pointer', color: '#173D32', fontWeight: 700 }}>View</button>
                    <button onClick={() => toggleStatus(c._id, c.isActive !== false)} style={{ padding: '0.5rem 1rem', background: c.isActive === false ? '#E8F5EC' : '#FDE8E6', color: c.isActive === false ? '#2E8B57' : '#C0392B', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
                      {c.isActive === false ? 'Unblock' : 'Block'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && <EmptyState message="No customers found" icon={Users} />}
        </div>
      )}

      {selected && (
        <Modal title={`Customer: ${selected.name}`} onClose={() => { setSelected(null); setCustomerDetail(null); }} maxWidth="700px">
          {loadingDetail ? <Loader /> : customerDetail && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', background: '#F8FAFC', padding: '1.5rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div><div style={{ fontSize: '0.85rem', color: '#667085', marginBottom: '0.2rem', fontWeight: 600 }}>Mobile</div><div style={{ fontWeight: 800, color: '#173D32', fontSize: '1.1rem' }}>{selected.mobile}</div></div>
                <div><div style={{ fontSize: '0.85rem', color: '#667085', marginBottom: '0.2rem', fontWeight: 600 }}>Email</div><div style={{ fontWeight: 800, color: '#173D32', fontSize: '1.1rem' }}>{selected.email || '—'}</div></div>
                <div><div style={{ fontSize: '0.85rem', color: '#667085', marginBottom: '0.2rem', fontWeight: 600 }}>Total Orders</div><div style={{ fontWeight: 800, color: '#173D32', fontSize: '1.1rem' }}>{customerDetail.orders?.length || 0}</div></div>
                <div><div style={{ fontSize: '0.85rem', color: '#667085', marginBottom: '0.2rem', fontWeight: 600 }}>Total Spent</div><div style={{ fontWeight: 800, color: '#2E8B57', fontSize: '1.1rem' }}>{fmt(selected.totalSpent)}</div></div>
              </div>
              
              <div style={{ fontWeight: 800, marginBottom: '1rem', color: '#173D32', fontSize: '1.1rem' }}>Saved Addresses</div>
              {(customerDetail.customer?.addresses || []).map((a, i) => (
                <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem', color: '#1F2933' }}>
                  {a.houseFlat}, {a.streetArea}, {a.city} — {a.pincode} {a.isDefault && <strong style={{ color: '#C9A44C', marginLeft: '6px' }}>(Default)</strong>}
                </div>
              ))}
              {(customerDetail.customer?.addresses || []).length === 0 && <div style={{ color: '#667085', marginBottom: '1rem' }}>No saved addresses.</div>}
              
              <div style={{ fontWeight: 800, margin: '1.5rem 0 1rem', color: '#173D32', fontSize: '1.1rem' }}>Order History</div>
              <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                {(customerDetail.orders || []).slice(0, 10).map((o, i) => (
                  <div key={o._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: i < (customerDetail.orders?.length || 0) - 1 ? '1px solid #E5E7EB' : 'none', background: '#FFFFFF' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#173D32' }}>#{o.orderId}</div>
                      <div style={{ fontSize: '0.85rem', color: '#667085' }}>{fmtDate(o.createdAt)}</div>
                    </div>
                    <StatusBadge status={o.orderStatus} />
                    <div style={{ fontWeight: 800, color: '#173D32', fontSize: '1.05rem' }}>{fmt(o.totalAmount)}</div>
                  </div>
                ))}
                {(customerDetail.orders || []).length === 0 && <div style={{ padding: '1.5rem' }}><EmptyState message="No orders" icon={ShoppingBag} /></div>}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── 6. OFFERS & COUPONS ──────────────────────────────────────────
function OffersSection() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', discountPercent: 0, flatDiscount: 0, minOrderValue: 0, maxDiscount: 0, description: '', startDate: '', endDate: '', isActive: true });
  const [saving, setSaving] = useState(false);

  // Automatic Coupon Generator State
  const [generateModal, setGenerateModal] = useState(false);
  const [genForm, setGenForm] = useState({
    prefix: 'BPS',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 399,
    maxDiscount: 100,
    expiryDays: 30,
    usageLimit: 100
  });
  const [generating, setGenerating] = useState(false);
  const [generatedCoupon, setGeneratedCoupon] = useState(null);

  const load = () => { setLoading(true); API('/admin/offers').then(r => { if (r.success) setOffers(r.offers || []); }).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ name: '', code: '', discountPercent: 0, flatDiscount: 0, minOrderValue: 0, maxDiscount: 0, description: '', startDate: new Date().toISOString().slice(0, 10), endDate: '', isActive: true }); setModal(true); };
  const openEdit = (o) => { setEditing(o); setForm({ ...o, startDate: o.startDate?.slice(0, 10) || '', endDate: o.endDate?.slice(0, 10) || '' }); setModal(true); };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await API('/admin/offers/generate-coupon', {
        method: 'POST',
        body: JSON.stringify(genForm)
      });
      if (res.success && res.coupon) {
        setGeneratedCoupon(res.coupon);
        load();
      } else {
        alert(res.message || 'Failed to generate coupon');
      }
    } catch (err) {
      alert(err.message || 'Error generating coupon');
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = editing ? await API(`/admin/offers/${editing._id}`, { method: 'PUT', body: JSON.stringify(form) }) : await API('/admin/offers', { method: 'POST', body: JSON.stringify(form) });
      if (r.success) { setModal(false); load(); } else alert(r.message);
    } finally { setSaving(false); }
  };

  const del = async (id) => { if (!confirm('Delete this offer?')) return; const r = await API(`/admin/offers/${id}`, { method: 'DELETE' }); if (r.success) load(); };
  const toggleActive = async (o) => { await API(`/admin/offers/${o._id}`, { method: 'PUT', body: JSON.stringify({ isActive: !o.isActive }) }); load(); };
  const isExpired = (o) => o.endDate && new Date(o.endDate) < new Date();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#173D32' }}>Offers & Coupons ({offers.length})</h2>
          <p style={{ color: '#667085', fontSize: '0.88rem', margin: '4px 0 0' }}>Manage discounts, festival coupons, and automated codes.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => { setGeneratedCoupon(null); setGenerateModal(true); }}
            style={{
              padding: '0.7rem 1.25rem',
              backgroundColor: '#C9A44C',
              color: '#17202A',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(201,164,76,0.3)'
            }}
            id="admin-generate-coupon-btn"
          >
            <Sparkles size={16} /> Generate Coupon
          </button>
          <button onClick={openAdd} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Create Custom Offer
          </button>
        </div>
      </div>
      {loading ? <Loader /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {offers.map(o => {
            const expired = isExpired(o);
            return (
              <div key={o._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem', opacity: (!o.isActive || expired) ? 0.65 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{o.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 800, color: 'var(--earth-brown)', letterSpacing: '0.1em' }}>{o.code}</div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: expired ? '#fee2e2' : o.isActive ? '#dcfce7' : '#fef3c7', color: expired ? '#dc2626' : o.isActive ? '#16a34a' : '#92400e' }}>
                    {expired ? 'EXPIRED' : o.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  {o.discountPercent > 0 ? `${o.discountPercent}% OFF` : ''}{o.flatDiscount > 0 ? `₹${o.flatDiscount} OFF` : ''}
                  {o.minOrderValue > 0 ? ` on orders ≥ ₹${o.minOrderValue}` : ''}
                  {o.maxDiscount > 0 ? ` (max ₹${o.maxDiscount})` : ''}
                </div>
                {o.endDate && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Expires: {fmtDate(o.endDate)}</div>}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => openEdit(o)} className="btn btn-sm btn-outline"><Edit2 size={13} /> Edit</button>
                  <button onClick={() => toggleActive(o)} className="btn btn-sm btn-outline">{o.isActive ? 'Disable' : 'Enable'}</button>
                  <button onClick={() => del(o._id)} className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }}><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
          {offers.length === 0 && <EmptyState message="No offers yet" icon={Tag} />}
        </div>
      )}
      {modal && (
        <Modal title={editing ? 'Edit Offer' : 'Create Offer'} onClose={() => setModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <FieldRow label="Offer Name" required><input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FieldRow>
            <FieldRow label="Coupon Code" required><input style={inputStyle} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></FieldRow>
            <FieldRow label="Discount %"><input style={inputStyle} type="number" value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: e.target.value }))} /></FieldRow>
            <FieldRow label="Flat Discount (₹)"><input style={inputStyle} type="number" value={form.flatDiscount} onChange={e => setForm(f => ({ ...f, flatDiscount: e.target.value }))} /></FieldRow>
            <FieldRow label="Min Order (₹)"><input style={inputStyle} type="number" value={form.minOrderValue} onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))} /></FieldRow>
            <FieldRow label="Max Discount (₹)"><input style={inputStyle} type="number" value={form.maxDiscount} onChange={e => setForm(f => ({ ...f, maxDiscount: e.target.value }))} /></FieldRow>
            <FieldRow label="Start Date"><input style={inputStyle} type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></FieldRow>
            <FieldRow label="End Date"><input style={inputStyle} type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></FieldRow>
          </div>
          <FieldRow label="Description"><input style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></FieldRow>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.5rem', fontSize: '0.88rem', fontWeight: 600 }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} /> Active
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setModal(false)} className="btn btn-outline">Cancel</button>
            <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Offer'}</button>
          </div>
        </Modal>
      )}

      {/* Automatic Coupon Generation Modal */}
      {generateModal && (
        <Modal title="Automatic Coupon Generator" onClose={() => setGenerateModal(false)} maxWidth="520px">
          {generatedCoupon ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#DEF7EC', color: '#166534', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#173D32', marginBottom: '0.5rem' }}>
                Coupon Generated Successfully!
              </h3>
              <p style={{ color: '#667085', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                This coupon is now active and can be applied by customers at checkout.
              </p>
              <div style={{
                background: '#F8FAFC',
                border: '2px dashed #C9A44C',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                display: 'inline-block',
                minWidth: '260px'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#667085', fontWeight: 700, textTransform: 'uppercase' }}>Coupon Code</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#173D32', letterSpacing: '3px', margin: '4px 0' }}>
                  {generatedCoupon.code}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#2E8B57', fontWeight: 700 }}>
                  {generatedCoupon.discountPercent > 0 ? `${generatedCoupon.discountPercent}% Discount` : `₹${generatedCoupon.flatDiscount} Flat Discount`}
                  {generatedCoupon.minOrderValue > 0 ? ` (Min. ₹${generatedCoupon.minOrderValue})` : ''}
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => { setGeneratedCoupon(null); setGenerateModal(false); }}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  Done & View Offers
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGenerateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.88rem', color: '#667085', margin: 0 }}>
                Specify parameters to automatically generate an authentic, unique coupon code verified against database uniqueness.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <FieldRow label="Code Prefix" required>
                  <select
                    style={inputStyle}
                    value={genForm.prefix}
                    onChange={e => setGenForm(f => ({ ...f, prefix: e.target.value }))}
                  >
                    <option value="BPS">BPS (e.g. BPS7K4M2)</option>
                    <option value="FRESH">FRESH (e.g. FRESH8Q2)</option>
                    <option value="MILL">MILL (e.g. MILL5X9)</option>
                  </select>
                </FieldRow>

                <FieldRow label="Discount Type" required>
                  <select
                    style={inputStyle}
                    value={genForm.discountType}
                    onChange={e => setGenForm(f => ({ ...f, discountType: e.target.value }))}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </FieldRow>

                <FieldRow label={genForm.discountType === 'percentage' ? 'Discount % *' : 'Flat Discount (₹) *'} required>
                  <input
                    style={inputStyle}
                    type="number"
                    min="1"
                    max={genForm.discountType === 'percentage' ? 100 : 1000}
                    value={genForm.discountValue}
                    onChange={e => setGenForm(f => ({ ...f, discountValue: e.target.value }))}
                    required
                  />
                </FieldRow>

                <FieldRow label="Min. Order Value (₹)">
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={genForm.minOrderValue}
                    onChange={e => setGenForm(f => ({ ...f, minOrderValue: e.target.value }))}
                  />
                </FieldRow>

                {genForm.discountType === 'percentage' && (
                  <FieldRow label="Max. Cap (₹)">
                    <input
                      style={inputStyle}
                      type="number"
                      min="0"
                      value={genForm.maxDiscount}
                      onChange={e => setGenForm(f => ({ ...f, maxDiscount: e.target.value }))}
                    />
                  </FieldRow>
                )}

                <FieldRow label="Expiry Duration">
                  <select
                    style={inputStyle}
                    value={genForm.expiryDays}
                    onChange={e => setGenForm(f => ({ ...f, expiryDays: e.target.value }))}
                  >
                    <option value="7">7 Days</option>
                    <option value="15">15 Days</option>
                    <option value="30">30 Days</option>
                    <option value="60">60 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                </FieldRow>

                <FieldRow label="Usage Limit">
                  <input
                    style={inputStyle}
                    type="number"
                    min="1"
                    value={genForm.usageLimit}
                    onChange={e => setGenForm(f => ({ ...f, usageLimit: e.target.value }))}
                  />
                </FieldRow>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setGenerateModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#C9A44C',
                    color: '#17202A',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Sparkles size={16} /> {generating ? 'Generating…' : 'Generate Unique Code'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── 7. RETURNS ───────────────────────────────────────────────────
function ReturnsSection() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState('');
  const [resolution, setResolution] = useState('');

  const load = () => { setLoading(true); API('/admin/returns').then(r => { if (r.success) setReturns(r.returns || []); }).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const update = async (id, status) => {
    const r = await API(`/admin/returns/${id}`, { method: 'PUT', body: JSON.stringify({ status, adminNotes: notes, resolutionType: resolution }) });
    if (r.success) { setSelected(null); load(); } else alert(r.message);
  };

  const STATUSES = ['Pending', 'Under Review', 'Approved', 'Rejected', 'Replacement Sent', 'Refunded'];

  return (
    <div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem' }}>Returns & Complaints ({returns.length})</h2>
      {loading ? <Loader /> : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                {['Order', 'Customer', 'Issue', 'Status', 'Date', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.65rem 0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {returns.map(r => (
                <tr key={r._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.7rem 0.75rem', fontWeight: 700 }}>{r.orderId}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>{r.customerName}</td>
                  <td style={{ padding: '0.7rem 0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.issueType || r.issue}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: '0.7rem 0.75rem', color: 'var(--text-muted)' }}>{fmtDate(r.createdAt)}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}><button onClick={() => { setSelected(r); setNotes(r.adminNotes || ''); setResolution(r.resolutionType || ''); }} className="btn btn-sm btn-outline">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {returns.length === 0 && <EmptyState message="No return requests" icon={RotateCcw} />}
        </div>
      )}

      {selected && (
        <Modal title={`Return — Order ${selected.orderId}`} onClose={() => setSelected(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Customer</div><div style={{ fontWeight: 700 }}>{selected.customerName}</div></div>
            <div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Current Status</div><StatusBadge status={selected.status} /></div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem' }}>
            <strong>Issue:</strong> {selected.issueType || 'N/A'}<br />
            <strong>Description:</strong> {selected.description || selected.issue || 'N/A'}
          </div>
          {selected.imageUrl && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>Customer Photo Proof:</div>
              <a href={selected.imageUrl} target="_blank" rel="noreferrer">
                <img
                  src={selected.imageUrl}
                  alt="Customer issue proof"
                  style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                />
              </a>
            </div>
          )}
          <FieldRow label="Admin Notes"><textarea style={textareaStyle} value={notes} onChange={e => setNotes(e.target.value)} /></FieldRow>
          <FieldRow label="Resolution Type">
            <select style={selectStyle} value={resolution} onChange={e => setResolution(e.target.value)}>
              <option value="">Select…</option>
              <option value="replacement">Send Replacement</option>
              <option value="refund">Issue Refund</option>
              <option value="rejected">Reject Request</option>
            </select>
          </FieldRow>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            {STATUSES.map(s => <button key={s} onClick={() => update(selected._id, s)} className="btn btn-sm btn-outline" style={{ fontSize: '0.8rem' }}>{s}</button>)}
          </div>
          {selected.status === 'Approved' && !selected.replacementOrderId && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={async () => {
                  if (!confirm('Generate free replacement order for this customer?')) return;
                  const res = await API(`/admin/returns/${selected._id}/create-replacement`, { method: 'POST', body: JSON.stringify({ notes }) });
                  if (res.success) {
                    alert(`Replacement order #${res.replacementOrder?.orderId || ''} created!`);
                    setSelected(null);
                    load();
                  } else alert(res.message);
                }}
                className="btn btn-sm btn-primary"
              >
                📦 Create Free Replacement Order
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── 7b. SUPPORT TICKETS MANAGEMENT (Features 67-68) ───────────────
function TicketsSection() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminReply, setAdminReply] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    API('/support/admin/all')
      .then(r => { if (r.success) setTickets(r.tickets || []); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleUpdateStatus = async (ticketId, status, priority) => {
    const res = await API(`/support/admin/${ticketId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, priority })
    });
    if (res.success) {
      if (selectedTicket && selectedTicket._id === ticketId) {
        setSelectedTicket(res.ticket);
      }
      load();
    } else alert(res.message);
  };

  const handleSendReply = async () => {
    if (!adminReply.trim() || !selectedTicket) return;
    setSubmitting(true);
    try {
      const res = await API(`/support/tickets/${selectedTicket._id || selectedTicket.ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: adminReply.trim() })
      });
      if (res.success) {
        setAdminReply('');
        const refreshed = await API(`/support/tickets/${selectedTicket._id || selectedTicket.ticketId}`);
        if (refreshed.success && refreshed.ticket) setSelectedTicket(refreshed.ticket);
        load();
      } else alert(res.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!internalNote.trim() || !selectedTicket) return;
    setSubmitting(true);
    try {
      const res = await API(`/support/admin/${selectedTicket._id || selectedTicket.ticketId}/internal-note`, {
        method: 'POST',
        body: JSON.stringify({ note: internalNote.trim() })
      });
      if (res.success) {
        setInternalNote('');
        const refreshed = await API(`/support/tickets/${selectedTicket._id || selectedTicket.ticketId}`);
        if (refreshed.success && refreshed.ticket) setSelectedTicket(refreshed.ticket);
        load();
      } else alert(res.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Customer Support Tickets ({tickets.length})
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Features 67-68: Two-way ticket resolution, customer isolation & internal admin notes.
          </div>
        </div>
      </div>

      {loading ? <Loader /> : (
        <div style={{ overflowX: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                {['Ticket ID', 'Customer', 'Category', 'Subject', 'Linked Order', 'Priority', 'Status', 'Date', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.65rem 0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t._id || t.ticketId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.7rem 0.75rem', fontWeight: 800, color: 'var(--earth-brown)' }}>{t.ticketId}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>
                    <div style={{ fontWeight: 700 }}>{t.customerName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.customerMobile}</div>
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>
                    <span className="badge" style={{ backgroundColor: '#E8F5EC', color: '#173D32', fontSize: '0.72rem' }}>
                      {t.category}
                    </span>
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {t.subject}
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem', color: 'var(--text-muted)' }}>
                    {t.orderId ? `#${t.orderId}` : '—'}
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>
                    <span className={`badge ${t.priority === 'URGENT' ? 'badge-red' : t.priority === 'HIGH' ? 'badge-gold' : 'badge-outline'}`} style={{ fontSize: '0.7rem' }}>
                      {t.priority}
                    </span>
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>
                    <span className={`badge ${t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'badge-green' : t.status === 'WAITING_FOR_CUSTOMER' ? 'badge-gold' : 'badge-primary'}`} style={{ fontSize: '0.72rem' }}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    {fmtDate(t.createdAt)}
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>
                    <button onClick={() => setSelectedTicket(t)} className="btn btn-sm btn-outline">
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tickets.length === 0 && <EmptyState message="No support tickets opened" icon={MessageSquare} />}
        </div>
      )}

      {selectedTicket && (
        <Modal title={`Ticket #${selectedTicket.ticketId} — ${selectedTicket.subject}`} onClose={() => setSelectedTicket(null)} maxWidth="700px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontSize: '0.88rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer</div>
              <div style={{ fontWeight: 700 }}>{selectedTicket.customerName} ({selectedTicket.customerMobile})</div>
              {selectedTicket.customerEmail && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedTicket.customerEmail}</div>}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Linked Order</div>
              <div style={{ fontWeight: 700 }}>{selectedTicket.orderId ? `#${selectedTicket.orderId}` : 'None'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Status:</span>
            {['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'].map(st => (
              <button
                key={st}
                onClick={() => handleUpdateStatus(selectedTicket._id, st, selectedTicket.priority)}
                className={`btn btn-sm ${selectedTicket.status === st ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.72rem', padding: '2px 8px' }}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Conversation Thread */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: '0.75rem' }}>💬 Conversation Thread</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '240px', overflowY: 'auto', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '8px' }}>
              {(selectedTicket.replies || []).map((rep, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    background: rep.senderRole === 'admin' ? '#DEF7EC' : '#FFFFFF',
                    border: rep.senderRole === 'admin' ? '1px solid #BCF0DA' : '1px solid var(--border-subtle)',
                    alignSelf: rep.senderRole === 'admin' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.72rem', fontWeight: 700, color: rep.senderRole === 'admin' ? '#03543F' : '#111827', marginBottom: '2px' }}>
                    <span>{rep.senderRole === 'admin' ? '🛡️ Admin' : `👤 ${rep.senderName || 'Customer'}`}</span>
                    <span style={{ color: '#64748B', fontWeight: 400 }}>{fmtDateTime(rep.timestamp)}</span>
                  </div>
                  <div>{rep.message}</div>
                </div>
              ))}
            </div>

            {/* Admin Reply Form */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Type reply to customer..."
                value={adminReply}
                onChange={e => setAdminReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendReply(); }}
              />
              <button onClick={handleSendReply} disabled={submitting || !adminReply.trim()} className="btn btn-primary btn-sm">
                Send Reply
              </button>
            </div>
          </div>

          {/* Internal Notes Section (Strictly hidden from customer) */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', background: '#FFFBEB', padding: '0.85rem', borderRadius: '8px', border: '1px solid #FDE68A' }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#92400E', marginBottom: '0.5rem' }}>
              🔒 Internal Admin Notes (Hidden from Customer)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
              {(selectedTicket.internalNotes || []).map((n, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', color: '#78350F', background: '#FFFFFF', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #FDE68A' }}>
                  <strong>{n.adminName}:</strong> {n.note} <span style={{ color: '#9CA3AF', fontSize: '0.72rem' }}>({fmtDateTime(n.timestamp)})</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                style={{ ...inputStyle, background: '#FFFFFF', flex: 1 }}
                placeholder="Add private note for staff / miller..."
                value={internalNote}
                onChange={e => setInternalNote(e.target.value)}
              />
              <button onClick={handleAddInternalNote} disabled={submitting || !internalNote.trim()} className="btn btn-sm btn-outline">
                Save Note
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 8. REVIEWS ───────────────────────────────────────────────────
function ReviewsSection() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => { setLoading(true); API('/admin/reviews').then(r => { if (r.success) setReviews(r.reviews || []); }).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const toggle = async (r) => { await API(`/admin/reviews/${r._id}`, { method: 'PUT', body: JSON.stringify({ isVisible: !r.isVisible }) }); load(); };
  const del = async (id) => { if (!confirm('Delete this review?')) return; await API(`/admin/reviews/${id}`, { method: 'DELETE' }); load(); };

  const filtered = filter === 'visible' ? reviews.filter(r => r.isVisible !== false) : filter === 'hidden' ? reviews.filter(r => r.isVisible === false) : reviews;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Reviews ({reviews.length})</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['all', 'visible', 'hidden'].map(f => <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>)}
        </div>
      </div>
      {loading ? <Loader /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(r => (
            <div key={r._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem', opacity: r.isVisible === false ? 0.6 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{r.customerName}</span>
                  <span style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>•</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{r.productName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ color: '#d97706' }}>{'★'.repeat(r.rating || 0)}{'☆'.repeat(5 - (r.rating || 0))}</div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: r.isVisible === false ? '#fee2e2' : '#dcfce7', color: r.isVisible === false ? '#dc2626' : '#16a34a' }}>
                    {r.isVisible === false ? 'Hidden' : 'Visible'}
                  </span>
                </div>
              </div>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{r.comment}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fmtDate(r.createdAt)} {r.verifiedPurchase && '• ✅ Verified Purchase'}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => toggle(r)} className="btn btn-sm btn-outline">{r.isVisible === false ? <Eye size={13} /> : <EyeOff size={13} />} {r.isVisible === false ? 'Show' : 'Hide'}</button>
                  <button onClick={() => del(r._id)} className="btn btn-sm" style={{ background: '#fee2e2', color: '#dc2626', border: 'none' }}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <EmptyState message="No reviews found" icon={Star} />}
        </div>
      )}
    </div>
  );
}

// ── 9. DELIVERY AGENTS ───────────────────────────────────────────
function DeliverySection() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [modalError, setModalError] = useState('');
  const [form, setForm] = useState({ name: '', mobile: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [settleModal, setSettleModal] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settlements, setSettlements] = useState([]);
  const [settleSearch, setSettleSearch] = useState('');

  const load = (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    API('/admin/delivery-agents').then(r => { if (r.success) setAgents(r.agents || []); }).finally(() => { if (showSpinner) setLoading(false); });
    API('/admin/cash-settlements').then(r => { if (r.success) setSettlements(r.settlements || []); });
  };
  useEffect(() => { load(true); }, []);

  const addAgent = async () => {
    if (!form.name.trim() || !form.mobile.trim() || !form.password.trim()) {
      setModalError('Please fill in Name, Mobile and Password.');
      return;
    }
    const cleanPhone = form.mobile.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      setModalError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (form.password.length < 6) {
      setModalError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    setModalError('');
    try {
      const r = await API('/admin/delivery-agents', {
        method: 'POST',
        body: JSON.stringify({ ...form, mobile: cleanPhone })
      });
      setSaving(false);
      if (r.success) {
        // Optimistic instant add so the card appears in 0ms!
        if (r.agent) {
          setAgents(prev => {
            const exists = prev.some(a => a.mobile === r.agent.mobile || a._id === r.agent._id);
            return exists ? prev : [r.agent, ...prev];
          });
        }
        setModal(false);
        setForm({ name: '', mobile: '', email: '', password: '' });
        // Background sync without flashing loading screen
        load(false);
      } else {
        setModalError(r.message || 'Failed to add delivery boy');
      }
    } catch (err) {
      setSaving(false);
      setModalError(err.message || 'Network error while adding delivery boy');
    }
  };

  const toggleStatus = async (agent) => {
    await API(`/admin/delivery-agents/${agent._id}`, { method: 'PUT', body: JSON.stringify({ status: agent.status === 'active' ? 'inactive' : 'active' }) });
    load();
  };

  const settle = async () => {
    const r = await API('/admin/cash-settlement', { method: 'POST', body: JSON.stringify({ agentId: settleModal._id, amountDeposited: Number(settleAmount), notes: settleNotes }) });
    if (r.success) { setSettleModal(null); setSettleAmount(''); setSettleNotes(''); load(); } else alert(r.message);
  };

  const activeCount = agents.filter(a => a.status === 'active').length;
  const inactiveCount = agents.filter(a => a.status !== 'active').length;

  const filteredSettlements = settlements.filter(s => {
    if (!settleSearch.trim()) return true;
    const q = settleSearch.toLowerCase();
    return (s.agentName && s.agentName.toLowerCase().includes(q)) ||
           (s.recordedBy && s.recordedBy.toLowerCase().includes(q)) ||
           (s.notes && s.notes.toLowerCase().includes(q)) ||
           String(s.amountDeposited).includes(q);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Delivery Partners</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Total: <strong>{agents.length}</strong> • Active: <strong style={{ color: '#16a34a' }}>{activeCount}</strong> • Inactive: <strong style={{ color: '#dc2626' }}>{inactiveCount}</strong>
          </div>
        </div>
        <button onClick={() => { setForm({ name: '', mobile: '', email: '', password: '' }); setModalError(''); setModal(true); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Add Delivery Boy</button>
      </div>
      {loading ? <Loader /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {agents.map(a => (
            <div key={a._id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem', opacity: a.status === 'inactive' ? 0.65 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{a.name}</div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: a.status === 'active' ? '#dcfce7' : '#fee2e2', color: a.status === 'active' ? '#16a34a' : '#dc2626' }}>{a.status}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>📱 {a.mobile}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
                <div><div style={{ color: 'var(--text-muted)' }}>Assigned Orders</div><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(a.totalAssigned || a.activeOrdersCount || 0)}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>Cash Collected</div><div style={{ fontWeight: 700, color: '#16a34a' }}>{fmt(a.totalCashCollected)}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>Cash Deposited</div><div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(a.totalCashDeposited)}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>Cash In Hand</div><div style={{ fontWeight: 700, color: a.cashDifference !== 0 ? '#dc2626' : '#16a34a' }}>{fmt(a.cashDifference)}</div></div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => { setSettleModal(a); setSettleAmount(''); setSettleNotes(''); }} className="btn btn-sm btn-outline" style={{ flex: 1 }}>Record Deposit</button>
                <button onClick={() => toggleStatus(a)} className="btn btn-sm" style={{ background: a.status === 'active' ? '#fee2e2' : '#dcfce7', color: a.status === 'active' ? '#dc2626' : '#16a34a', border: 'none' }}>
                  {a.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
          {agents.length === 0 && <EmptyState message="No delivery boys added" icon={Truck} />}
        </div>
      )}

      {/* Cash Settlements Log */}
      <div style={{ marginTop: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Recent Cash Settlement Ledger ({filteredSettlements.length})
          </h3>
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search partner, admin, note…"
              value={settleSearch}
              onChange={e => setSettleSearch(e.target.value)}
              style={{ ...inputStyle, padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {filteredSettlements.length === 0 ? (
          <div style={{ padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No cash deposits recorded yet. When a delivery boy returns in the evening and hands over collected COD cash, click <strong>"Record Deposit"</strong> on their card above to log it here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Date & Time</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Delivery Partner</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700 }}>Amount Handed Over</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Notes</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Recorded By</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSettlements.slice(0, 20).map(s => (
                  <tr key={s._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {new Date(s.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {s.agentName}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                      ₹{s.amountDeposited}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                      {s.notes || 'Evening counter settlement'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#173D32', fontWeight: 600 }}>
                      {s.recordedBy || 'Super Admin'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '999px', background: '#dcfce7', color: '#16a34a', fontWeight: 700 }}>
                        ✓ {s.status || 'Received'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal title="Add Delivery Boy" onClose={() => setModal(false)}>
          {modalError && (
            <div style={{ padding: '0.75rem 1rem', background: '#FDE8E6', color: '#C0392B', borderRadius: '8px', fontSize: '0.84rem', fontWeight: 600, marginBottom: '1rem', border: '1px solid rgba(192,57,43,0.2)' }}>
              <div>⚠️ {modalError}</div>
              {(modalError.includes('Admin privileges') || modalError.includes('Access denied') || modalError.includes('privileges required')) && (
                <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(192,57,43,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: '#7F1D1D', fontWeight: 500 }}>
                    Aapka session customer account se overwrite ho gaya tha. Dobara Admin sign-in karein:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('bps_admin_token');
                      window.location.href = '/admin/login';
                    }}
                    style={{ padding: '5px 12px', background: '#C0392B', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🔑 Re-Login as Admin
                  </button>
                </div>
              )}
            </div>
          )}
          <FieldRow label="Full Name" required>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ramesh Singh" />
          </FieldRow>
          <FieldRow label="Mobile Number (10 Digits)" required>
            <input style={inputStyle} value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="e.g. 9812345678" maxLength={10} />
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
              💡 Delivery boy ka apna 10-digit mobile number enter karein (Store Admin ka mobile number use na karein).
            </div>
          </FieldRow>
          <FieldRow label="Email (optional)">
            <input style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="e.g. ramesh@bpsfreshmills.com" />
          </FieldRow>
          <FieldRow label="Password (for Delivery Portal Login)" required>
            <input style={inputStyle} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
          </FieldRow>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button onClick={() => setModal(false)} className="btn btn-outline" disabled={saving}>Cancel</button>
            <button onClick={addAgent} disabled={saving} className="btn btn-primary" style={{ minWidth: '130px' }}>
              {saving ? 'Saving...' : 'Add Delivery Boy'}
            </button>
          </div>
        </Modal>
      )}

      {settleModal && (
        <Modal title={`Record Deposit — ${settleModal.name}`} onClose={() => setSettleModal(null)}>
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.88rem' }}>
            Outstanding: <strong style={{ color: settleModal.cashDifference !== 0 ? '#dc2626' : '#16a34a' }}>{fmt(settleModal.cashDifference)}</strong>
          </div>
          <FieldRow label="Amount Deposited (₹)" required><input style={inputStyle} type="number" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} /></FieldRow>
          <FieldRow label="Notes"><input style={inputStyle} value={settleNotes} onChange={e => setSettleNotes(e.target.value)} /></FieldRow>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setSettleModal(null)} className="btn btn-outline">Cancel</button>
            <button onClick={settle} className="btn btn-primary">Record Deposit</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── 10. REPORTS ──────────────────────────────────────────────────
function ReportsSection() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('daily');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ type, ...(from && { from }), ...(to && { to }) }).toString();
    API(`/admin/reports?${params}`).then(r => { if (r.success) setReport(r.report); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [type]);

  const PERIODS = [['daily', 'Today'], ['yesterday', 'Yesterday'], ['weekly', 'This Week'], ['monthly', 'This Month']];

  return (
    <div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem' }}>Sales Reports</h2>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        {PERIODS.map(([v, l]) => <button key={v} onClick={() => { setType(v); setFrom(''); setTo(''); }} className={`btn btn-sm ${type === v && !from ? 'btn-primary' : 'btn-outline'}`}>{l}</button>)}
        <input type="date" style={{ ...inputStyle, width: 'auto' }} value={from} onChange={e => { setFrom(e.target.value); setType('custom'); }} placeholder="From" />
        <input type="date" style={{ ...inputStyle, width: 'auto' }} value={to} onChange={e => { setTo(e.target.value); setType('custom'); }} placeholder="To" />
        <button onClick={load} className="btn btn-primary btn-sm">Generate</button>
      </div>

      {loading ? <Loader /> : report && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard label="Total Orders" value={report.totalOrders} color="#2E8B57" icon={ShoppingBag} />
            <StatCard label="Delivered" value={report.deliveredOrders} color="#2E8B57" icon={CheckCircle2} />
            <StatCard label="Cancelled" value={report.cancelledOrders} color="#dc2626" icon={X} />
            <StatCard label="Total Revenue" value={fmt(report.totalRevenue)} color="#C9A44C" icon={DollarSign} />
            <StatCard label="COD Collected" value={fmt(report.codCollected)} color="#2E8B57" icon={CheckCircle2} />
            <StatCard label="COD Pending" value={fmt(report.codPending)} color="#C9A44C" icon={Clock} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontWeight: 800, marginBottom: '1rem' }}>📦 Product Sales</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead><tr style={{ borderBottom: '2px solid var(--border-subtle)' }}><th style={{ textAlign: 'left', padding: '0.4rem', color: 'var(--text-muted)' }}>Product</th><th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>Qty</th><th style={{ textAlign: 'right', padding: '0.4rem', color: 'var(--text-muted)' }}>Revenue</th></tr></thead>
                <tbody>
                  {(report.productSales || []).slice(0, 10).map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.4rem' }}>{p.name}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right' }}>{p.qty}</td>
                      <td style={{ padding: '0.4rem', textAlign: 'right', fontWeight: 700 }}>{fmt(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(report.productSales || []).length === 0 && <EmptyState message="No product sales data" icon={Package} />}
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontWeight: 800, marginBottom: '1rem' }}>⚠️ Low Stock Products</div>
              {(report.lowStock || []).map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.83rem' }}>
                  <span>{p.name}</span>
                  <span style={{ fontWeight: 700, color: p.stock <= 0 ? '#dc2626' : '#ea580c' }}>{p.stock <= 0 ? 'OUT OF STOCK' : `${p.stock} left`}</span>
                </div>
              ))}
              {(report.lowStock || []).length === 0 && <div style={{ color: 'var(--nature-green)', fontSize: '0.88rem', textAlign: 'center', padding: '1rem' }}>✅ All products well stocked</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 10b. NOTIFICATIONS SECTION ──────────────────────────────────
function NotificationsSection({ navigate }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await API('/notifications');
      if (res.success) setNotifications(res.notifications || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleMarkRead = async (id) => {
    await API(`/notifications/${id}/read`, { method: 'PUT' });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  };

  const handleMarkAllRead = async () => {
    await API('/notifications/mark-all-read', { method: 'PUT' });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#173D32' }}>Live Notifications & Store Alerts</h2>
          <p style={{ color: '#667085', fontSize: '0.88rem', margin: '4px 0 0' }}>Real-time stream of incoming customer orders, delivery updates, and store events.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={load} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={handleMarkAllRead} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={16} /> Mark All as Read
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {['all', 'order', 'delivery', 'stock', 'return', 'support'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '999px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              textTransform: 'capitalize',
              backgroundColor: filter === tab ? '#2E8B57' : '#F1F5F9',
              color: filter === tab ? '#FFFFFF' : '#475569'
            }}
          >
            {tab === 'all' ? 'All Alerts' : tab}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <EmptyState message="No notifications matching this filter" icon={Bell} />
          ) : (
            filtered.map(n => (
              <div
                key={n._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid #E5E7EB',
                  backgroundColor: n.isRead ? 'transparent' : '#F0FDF4'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bell size={18} color="#2E8B57" />
                  </div>
                  <div>
                    <div style={{ fontWeight: n.isRead ? 600 : 800, color: '#173D32', fontSize: '0.92rem' }}>
                      {n.title}
                      {!n.isRead && <span style={{ marginLeft: '8px', fontSize: '0.7rem', background: '#DEF7EC', color: '#03543F', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>NEW</span>}
                    </div>
                    <div style={{ color: '#667085', fontSize: '0.84rem', marginTop: '2px' }}>{n.message}</div>
                    <div style={{ color: '#9CA3AF', fontSize: '0.72rem', marginTop: '4px' }}>{fmtDateTime(n.createdAt)} {n.orderId ? `• Order #${n.orderId}` : ''}</div>
                  </div>
                </div>
                {!n.isRead && (
                  <button onClick={() => handleMarkRead(n._id)} className="btn btn-sm btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                    Mark Read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── 11. AUDIT LOGS ───────────────────────────────────────────────
function AuditLogsSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = () => {
    setLoading(true);
    API(`/admin/audit-logs${filter ? '?action=' + encodeURIComponent(filter) : ''}`).then(r => { if (r.success) setLogs(r.logs || []); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filter]);

  const ACTION_COLORS = { 'ADMIN_LOGIN': '#2E8B57', 'PRODUCT_CREATED': '#2E8B57', 'PRODUCT_UPDATED': '#C9A44C', 'PRODUCT_DELETED': '#dc2626', 'ORDER_STATUS_CHANGED': '#173D32', 'STOCK_UPDATED': '#2E8B57', 'OFFER_CREATED': '#2E8B57', 'SETTINGS_UPDATED': '#C9A44C', 'CUSTOMER_DEACTIVATED': '#dc2626' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Audit Logs ({logs.length})</h2>
        <button onClick={load} className="btn btn-sm btn-outline"><RefreshCw size={14} /></button>
      </div>
      <input style={{ ...inputStyle, maxWidth: '300px', marginBottom: '1rem' }} placeholder="Filter by action…" value={filter} onChange={e => setFilter(e.target.value)} />
      {loading ? <Loader /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {logs.map((l, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800, background: (ACTION_COLORS[l.action] || '#6b7280') + '22', color: ACTION_COLORS[l.action] || '#6b7280' }}>{l.action}</span>
                <div>
                  <div style={{ fontSize: '0.83rem', fontWeight: 700 }}>{l.adminName}</div>
                  {l.details && Object.keys(l.details).length > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {Object.entries(l.details).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(l.timestamp)}</div>
            </div>
          ))}
          {logs.length === 0 && <EmptyState message="No audit logs yet" icon={Activity} />}
        </div>
      )}
    </div>
  );
}

// ── 12. WEBSITE SETTINGS ─────────────────────────────────────────
function SettingsSection({ initialTab = 'business' }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || 'business');

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const load = () => { setLoading(true); API('/admin/settings').then(r => { if (r.success) setSettings(r.settings || {}); }).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const r = await API('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
    setSaving(false);
    if (r.success) alert('Settings saved successfully!'); else alert(r.message);
  };

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const [inquiries, setInquiries] = useState([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  const loadInquiries = () => {
    setLoadingInquiries(true);
    API('/admin/inquiries')
      .then(r => { if (r.success) setInquiries(r.inquiries || []); })
      .finally(() => setLoadingInquiries(false));
  };

  useEffect(() => {
    if (activeTab === 'inquiries') loadInquiries();
  }, [activeTab]);

  const deleteInquiry = async (id) => {
    if (!window.confirm('Delete this inquiry?')) return;
    const r = await API(`/admin/inquiries/${id}`, { method: 'DELETE' });
    if (r.success) {
      setInquiries(prev => prev.filter(item => item._id !== id));
    }
  };

  const TABS = [
    ['business', '🏪 Business'],
    ['delivery', '🚚 Delivery'],
    ['customercare', '📞 Customer Care'],
    ['inquiries', `📬 Inquiries ${inquiries.length ? `(${inquiries.length})` : ''}`],
    ['policies', '📄 Policies']
  ];

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary, #173D32)' }}>Website Settings</h2>
        {activeTab !== 'inquiries' && (
          <button onClick={save} disabled={saving} style={{ padding: '0.8rem 1.2rem', backgroundColor: '#2E8B57', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : '💾 Save All Settings'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--border-subtle, #E5E7EB)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', background: activeTab === k ? '#2E8B57' : 'transparent', color: activeTab === k ? '#FFFFFF' : 'var(--text-secondary, #667085)', transition: 'all 0.2s' }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-card, #FFFFFF)', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '12px', padding: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        {activeTab === 'business' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Business Name *</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.shopName || ''} onChange={e => set('shopName', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Tagline</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.tagline || ''} onChange={e => set('tagline', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Phone Number (Calls & Support)</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.phone || ''} onChange={e => { set('phone', e.target.value); if (!settings.supportPhone) set('supportPhone', e.target.value); }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Email Address</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.email || ''} onChange={e => { set('email', e.target.value); if (!settings.supportEmail) set('supportEmail', e.target.value); }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Shop Address</label>
              <textarea style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', minHeight: '80px', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.shopAddress || ''} onChange={e => set('shopAddress', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Business Hours</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.businessHours || ''} onChange={e => set('businessHours', e.target.value)} />
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Shop Latitude</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} type="number" step="0.0001" value={settings.shopLat || ''} onChange={e => set('shopLat', parseFloat(e.target.value))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Shop Longitude</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} type="number" step="0.0001" value={settings.shopLon || ''} onChange={e => set('shopLon', parseFloat(e.target.value))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Max Delivery Radius (KM)</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} type="number" value={settings.maxDeliveryRadiusKm || 15} onChange={e => set('maxDeliveryRadiusKm', Number(e.target.value))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Delivery Charge (₹)</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} type="number" value={settings.deliveryCharge ?? 40} onChange={e => set('deliveryCharge', Number(e.target.value))} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Free Delivery Threshold (₹)</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} type="number" value={settings.freeDeliveryThreshold ?? 500} onChange={e => set('freeDeliveryThreshold', Number(e.target.value))} />
            </div>
          </div>
        )}

        {activeTab === 'customercare' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Support Phone (Call Now target)</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.supportPhone || settings.phone || ''} onChange={e => { set('supportPhone', e.target.value); set('phone', e.target.value); }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>WhatsApp Number (Chat target)</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.supportWhatsapp || settings.whatsapp || settings.phone || ''} onChange={e => { set('supportWhatsapp', e.target.value); set('whatsapp', e.target.value); }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Support Email (Email Us target)</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.supportEmail || settings.email || ''} onChange={e => { set('supportEmail', e.target.value); set('email', e.target.value); }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Support Hours</label>
              <input style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.businessHours || ''} onChange={e => set('businessHours', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>WhatsApp Default Pre-filled Message</label>
              <textarea style={{ width: '100%', padding: '0.8rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', minHeight: '80px', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.whatsappDefaultMessage || ''} onChange={e => set('whatsappDefaultMessage', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', gridColumn: '1/-1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary, #173D32)' }}><input type="checkbox" style={{ accentColor: '#2E8B57', width: '18px', height: '18px' }} checked={settings.callEnabled !== false} onChange={e => set('callEnabled', e.target.checked)} /> Enable Call Now Button</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary, #173D32)' }}><input type="checkbox" style={{ accentColor: '#2E8B57', width: '18px', height: '18px' }} checked={settings.whatsappEnabled !== false} onChange={e => set('whatsappEnabled', e.target.checked)} /> Enable WhatsApp Button</label>
            </div>
          </div>
        )}

        {activeTab === 'inquiries' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Customer Messages & Inquiries ({inquiries.length})
              </h3>
              <button onClick={loadInquiries} className="btn btn-sm btn-outline" style={{ fontSize: '0.8rem' }}>
                🔄 Refresh
              </button>
            </div>
            {loadingInquiries ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading inquiries...</div>
            ) : inquiries.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-surface, #F9FAFB)', borderRadius: '8px' }}>
                No customer inquiries received yet. When customers submit the "Send Us a Message" form on the website, their messages will appear here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {inquiries.map((inq) => (
                  <div key={inq._id} style={{ padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-subtle, #E5E7EB)', background: 'var(--bg-surface, #FAFAFA)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {inq.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(inq.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.88rem' }}>
                      <a href={`tel:${inq.phone}`} style={{ color: '#2E8B57', fontWeight: 700, textDecoration: 'none' }}>
                        📞 {inq.phone}
                      </a>
                      <a href={`https://wa.me/${(inq.phone || '').replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(inq.name)},%20this%20is%20BPS%20Fresh%20Mills%20responding%20to%20your%20message.`} target="_blank" rel="noreferrer" style={{ color: '#25D366', fontWeight: 700, textDecoration: 'none' }}>
                        💬 WhatsApp
                      </a>
                      {inq.email && (
                        <a href={`mailto:${inq.email}?subject=Re:%20BPS%20Fresh%20Mills%20Inquiry`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
                          ✉️ {inq.email}
                        </a>
                      )}
                    </div>
                    <div style={{ background: 'var(--bg-card, #FFFFFF)', padding: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-subtle, #E5E7EB)', fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {inq.message}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                      <button onClick={() => deleteInquiry(inq._id)} style={{ background: 'transparent', border: 'none', color: '#E53E3E', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'policies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Return Policy</label>
              <textarea style={{ width: '100%', padding: '1rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', minHeight: '120px', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.returnPolicy || ''} onChange={e => set('returnPolicy', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Privacy Policy</label>
              <textarea style={{ width: '100%', padding: '1rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', minHeight: '120px', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.privacyPolicy || ''} onChange={e => set('privacyPolicy', e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary, #667085)', fontSize: '0.9rem' }}>Terms & Conditions</label>
              <textarea style={{ width: '100%', padding: '1rem', border: '1px solid var(--border-subtle, #E5E7EB)', borderRadius: '8px', outline: 'none', minHeight: '120px', background: 'var(--bg-surface, #FFFFFF)', color: 'var(--text-primary, #1F2933)' }} value={settings.terms || ''} onChange={e => set('terms', e.target.value)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 13. ADMIN PROFILE (Reference Image 1) ────────────────────────
function ProfileSection({ user, onLogout }) {
  const [activity, setActivity] = useState([]);
  const [form, setForm] = useState({
    name: user?.name || 'Rohan Singh',
    email: user?.email || 'admin@bpschakki.com',
    phone: '9876543210',
    location: 'BPS Fresh Mills, Near Main Market'
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [securityModal, setSecurityModal] = useState(null); // '2fa' | 'sessions' | 'activity'
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    API('/admin/profile').then(r => { if (r.success) setActivity(r.recentActivity || []); });
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const r = await API('/admin/profile', { method: 'PUT', body: JSON.stringify(form) });
    setSaving(false);
    if (r.success) {
      setMsg('✅ Profile updated successfully!');
      setEditModal(false);
      setTimeout(() => setMsg(''), 3500);
    } else {
      setMsg('❌ ' + r.message);
    }
  };

  const hasLength = (pwForm.newPassword || '').length >= 6;
  const hasNumber = /\d/.test(pwForm.newPassword || '');
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwForm.newPassword || '');

  const changePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwMsg('❌ Passwords do not match'); return; }
    if (!hasLength) { setPwMsg('❌ Password must be at least 6 characters'); return; }
    setSavingPw(true);
    const r = await API('/admin/profile/password', { method: 'PUT', body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }) });
    setSavingPw(false);
    setPwMsg(r.success ? '✅ Password changed successfully!' : '❌ ' + r.message);
    if (r.success) {
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPwMsg(''), 4000);
    }
  };

  return (
    <div>
      {/* Header and Breadcrumbs (Reference Image 1) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#111827' }}>My Profile</h2>
          <div style={{ color: '#64748B', fontSize: '0.92rem', marginTop: '0.2rem' }}>Manage your admin account and settings</div>
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Admin</span> <ChevronRight size={14} /> <span style={{ color: '#111827', fontWeight: 700 }}>Profile</span>
        </div>
      </div>

      {msg && (
        <div style={{ padding: '0.85rem 1.25rem', borderRadius: '8px', background: msg.startsWith('✅') ? '#DEF7EC' : '#FEE2E2', color: msg.startsWith('✅') ? '#047857' : '#DC2626', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {msg}
        </div>
      )}

      {/* 2-Column Grid (Reference Image 1) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Card 1: Profile Information */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>Profile Information</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0.25rem 0 1.5rem' }}>Your basic account details</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#DEF7EC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
                <User size={40} />
              </div>
              <button onClick={() => setEditModal(true)} title="Update Avatar" style={{ position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: '50%', background: '#64748B', color: '#FFFFFF', border: '2px solid #FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                <Camera size={14} />
              </button>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#111827' }}>{form.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Super Admin</div>
              <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>FreshCart</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', borderTop: '1px solid #E5E7EB', paddingTop: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <User size={18} style={{ color: '#64748B', flexShrink: 0 }} />
              <div style={{ width: '130px', color: '#64748B', fontSize: '0.9rem', fontWeight: 600 }}>Full Name</div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.92rem' }}>{form.name}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Mail size={18} style={{ color: '#64748B', flexShrink: 0 }} />
              <div style={{ width: '130px', color: '#64748B', fontSize: '0.9rem', fontWeight: 600 }}>Email Address</div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.92rem' }}>{form.email}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldCheck size={18} style={{ color: '#64748B', flexShrink: 0 }} />
              <div style={{ width: '130px', color: '#64748B', fontSize: '0.9rem', fontWeight: 600 }}>Role</div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.92rem' }}>Super Admin</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={18} style={{ color: '#64748B', flexShrink: 0 }} />
              <div style={{ width: '130px', color: '#64748B', fontSize: '0.9rem', fontWeight: 600 }}>Member Since</div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.92rem' }}>{fmtDate(user?.createdAt || '2025-09-12')}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MapPin size={18} style={{ color: '#64748B', flexShrink: 0 }} />
              <div style={{ width: '130px', color: '#64748B', fontSize: '0.9rem', fontWeight: 600 }}>Shop Location</div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.92rem' }}>{form.location}</div>
            </div>
          </div>

          <button onClick={() => setEditModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.3rem', background: '#FFFFFF', border: '1.5px solid #2E8B57', borderRadius: '8px', color: '#2E8B57', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            <Edit2 size={16} /> Edit Profile
          </button>
        </div>

        {/* Card 2: Change Password (Reference Image 1) */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>Change Password</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0.25rem 0 1.5rem' }}>Update your password to keep your account secure</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Current Password */}
            <div style={{ position: 'relative' }}>
              <Lock size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type={showCurrentPw ? 'text' : 'password'}
                style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 2.6rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.92rem', outline: 'none', color: '#111827', background: '#FFFFFF' }}
                placeholder="Current Password"
                value={pwForm.currentPassword}
                onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
              />
              <button type="button" onClick={() => setShowCurrentPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
                {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* New Password */}
            <div style={{ position: 'relative' }}>
              <Lock size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type={showNewPw ? 'text' : 'password'}
                style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 2.6rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.92rem', outline: 'none', color: '#111827', background: '#FFFFFF' }}
                placeholder="New Password"
                value={pwForm.newPassword}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              />
              <button type="button" onClick={() => setShowNewPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
                {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Confirm New Password */}
            <div style={{ position: 'relative' }}>
              <Lock size={17} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type={showConfirmPw ? 'text' : 'password'}
                style={{ width: '100%', padding: '0.8rem 2.5rem 0.8rem 2.6rem', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '0.92rem', outline: 'none', color: '#111827', background: '#FFFFFF' }}
                placeholder="Confirm New Password"
                value={pwForm.confirmPassword}
                onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
              />
              <button type="button" onClick={() => setShowConfirmPw(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
                {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Validation Checklist (Reference Image 1) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasLength ? '#2E8B57' : '#64748B', fontWeight: hasLength ? 700 : 500 }}>
              <CheckCircle2 size={16} style={{ color: hasLength ? '#2E8B57' : '#CBD5E1' }} /> At least 6 characters
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasNumber ? '#2E8B57' : '#64748B', fontWeight: hasNumber ? 700 : 500 }}>
              <CheckCircle2 size={16} style={{ color: hasNumber ? '#2E8B57' : '#CBD5E1' }} /> Include a number
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hasSpecial ? '#2E8B57' : '#64748B', fontWeight: hasSpecial ? 700 : 500 }}>
              <CheckCircle2 size={16} style={{ color: hasSpecial ? '#2E8B57' : '#CBD5E1' }} /> Include a special character (e.g. ! @ #)
            </div>
          </div>

          {pwMsg && <div style={{ marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 700, color: pwMsg.startsWith('✅') ? '#2E8B57' : '#DC2626' }}>{pwMsg}</div>}

          <button onClick={changePassword} disabled={savingPw} style={{ width: '100%', padding: '0.85rem', background: '#2E8B57', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', opacity: savingPw ? 0.7 : 1, boxShadow: '0 2px 8px rgba(46,139,87,0.2)' }}>
            {savingPw ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Card 3: Account Security (Reference Image 1) */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>Account Security</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0.25rem 0 1.5rem' }}>Keep your account safe</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {/* Two-Factor Auth */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#DEF7EC', color: '#2E8B57', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>Two-Factor Authentication</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>Add an extra layer of security</div>
              </div>
            </div>
            <button onClick={() => setTwoFactorEnabled(v => !v)} style={{ padding: '0.45rem 1.3rem', background: '#FFFFFF', border: '1.5px solid #2E8B57', borderRadius: '6px', color: '#2E8B57', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', alignSelf: 'flex-start' }}>
              {twoFactorEnabled ? 'Enabled ✅' : 'Enable'}
            </button>
          </div>

          {/* Active Sessions */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#DEF7EC', color: '#2E8B57', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Globe size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>Active Sessions</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>Manage your logged in devices</div>
              </div>
            </div>
            <button onClick={() => setSecurityModal('sessions')} style={{ padding: '0.45rem 1.3rem', background: '#FFFFFF', border: '1.5px solid #2E8B57', borderRadius: '6px', color: '#2E8B57', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', alignSelf: 'flex-start' }}>
              View Sessions
            </button>
          </div>

          {/* Login Activity */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#DEF7EC', color: '#2E8B57', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>Login Activity</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>Check your recent login history</div>
              </div>
            </div>
            <button onClick={() => setSecurityModal('activity')} style={{ padding: '0.45rem 1.3rem', background: '#FFFFFF', border: '1.5px solid #2E8B57', borderRadius: '6px', color: '#2E8B57', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', alignSelf: 'flex-start' }}>
              View Activity
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editModal && (
        <Modal title="Edit Profile Details" onClose={() => setEditModal(false)}>
          <FieldRow label="Full Name" required>
            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Email Address" required>
            <input style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Phone Number">
            <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </FieldRow>
          <FieldRow label="Shop Location">
            <input style={inputStyle} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
          </FieldRow>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button onClick={() => setEditModal(false)} style={{ padding: '0.7rem 1.25rem', border: '1px solid #E5E7EB', borderRadius: '8px', background: '#FFFFFF', cursor: 'pointer', fontWeight: 700, color: '#667085' }}>Cancel</button>
            <button onClick={saveProfile} disabled={saving} style={{ padding: '0.7rem 1.25rem', border: 'none', borderRadius: '8px', background: '#2E8B57', cursor: 'pointer', fontWeight: 700, color: '#FFFFFF' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Activity / Sessions Modal */}
      {securityModal && (
        <Modal title={securityModal === 'sessions' ? 'Active Sessions' : 'Recent Login & Admin Activity'} onClose={() => setSecurityModal(null)}>
          {securityModal === 'sessions' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>Chrome on Windows 11 (Current)</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>IP: 192.168.1.10 • Active Now</div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: '#DEF7EC', color: '#047857' }}>This Device</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>Mobile App on Android</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Logged in 2 days ago</div>
                </div>
                <button onClick={() => alert('Session revoked')} style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>Revoke</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
              {activity.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid #E5E7EB', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 700, color: '#173D32' }}>{a.action.replace(/_/g, ' ')}</span>
                  <span style={{ color: '#667085' }}>{fmtDateTime(a.timestamp)}</span>
                </div>
              ))}
              {activity.length === 0 && <div style={{ color: '#667085', padding: '1rem', textAlign: 'center' }}>No recent activity records.</div>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AI BUSINESS ASSISTANT SECTION
// ═══════════════════════════════════════════════════════════════
function AiAssistantSection({ navigate }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Namaste Admin! 🙏 Main BPS Fresh Mills ka AI Business Assistant hoon. Main direct aapke real store database se live metrics calculate karke answers deta hoon.\n\nAap mujhse natural Hindi ya English mein pooch sakte hain, jaise:\n• *“Aaj kitni sale hui?”*\n• *“Kaunsa product sabse zyada bik raha hai?”*\n• *“Kaunsa stock jaldi khatam hoga?”*\n• *“Kitna COD pending hai?”*\n• *“Top 5 products kaunse hain?”*',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickStats, setQuickStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pendingProposal, setPendingProposal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const chatBottomRef = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await API('/admin/ai-assistant/quick-stats');
      if (res.success) setQuickStats(res.stats);
    } catch (e) {
      console.error('Failed to load AI quick stats:', e);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await API('/admin/ai-assistant/query', {
        method: 'POST',
        body: JSON.stringify({ query: textToSend })
      });

      if (res.success) {
        const aiMsg = {
          id: Date.now() + 1,
          sender: 'ai',
          text: res.answer,
          actionProposal: res.actionProposal || null,
          source: res.source,
          timestamp: res.timestamp || new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMsg]);
        if (res.actionProposal) {
          setPendingProposal(res.actionProposal);
        }
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'ai',
          text: res.message || 'Maaf kijiye, query process karne mein samasya aayi.',
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: `Error: ${err.message || 'Server se connect karne mein samasya aayi.'}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (proposal) => {
    if (!proposal) return;
    setActionLoading(true);
    try {
      const res = await API('/admin/ai-assistant/execute-action', {
        method: 'POST',
        body: JSON.stringify({ actionPayload: proposal })
      });
      if (res.success) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'ai',
          text: `✔ **Action Executed:** ${res.message}`,
          timestamp: new Date().toISOString()
        }]);
        setPendingProposal(null);
        fetchStats();
      }
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    setBackupMsg('');
    try {
      const res = await API('/admin/system/backup', { method: 'POST' });
      if (res.success) {
        setBackupMsg(`✔ Backup created: ${res.backup.fileName} (${res.backup.sizeKb} KB, ${res.backup.totalRecords} records)`);
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'ai',
          text: `💾 **Full Database Backup Created!**\n\n• **File:** \`${res.backup.fileName}\`\n• **Size:** ${res.backup.sizeKb} KB\n• **Records Backed Up:** ${res.backup.totalRecords} records\n• **Timestamp:** ${res.backup.createdAt}`,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (e) {
      setBackupMsg(`❌ Backup failed: ${e.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const PROMPT_CHIPS = [
    'Aaj kitni sale hui?',
    'Kaunsa product sabse zyada bik raha hai?',
    'Kaunsa stock jaldi khatam hoga?',
    'Is month profit kitna hai?',
    'Kitna COD pending hai?',
    'Aaj kitne orders aaye?',
    'Top 5 products kaunse hain?'
  ];

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #173D32 0%, #245A4A 100%)',
        borderRadius: '16px',
        padding: '1.75rem',
        color: '#FFFFFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 20px rgba(23,61,50,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#C9A44C'
          }}>
            <Sparkles size={28} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              BPS AI Business Assistant
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
              Real-time decision intelligence grounded strictly in live database records. Zero hallucination.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleBackupNow}
            disabled={isBackingUp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: isBackingUp ? 'not-allowed' : 'pointer'
            }}
          >
            <Archive size={16} /> {isBackingUp ? 'Backing Up…' : 'Backup Database'}
          </button>

          <span style={{
            background: '#DEF7EC',
            color: '#03543F',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0E9F6E' }} /> Live DB Sync
          </span>
        </div>
      </div>

      {backupMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          background: backupMsg.startsWith('✔') ? '#DEF7EC' : '#FDE8E8',
          color: backupMsg.startsWith('✔') ? '#03543F' : '#9B1C1C',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          {backupMsg}
        </div>
      )}

      {/* Real Database Quick Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Today's Real Sales</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#173D32', marginTop: '4px' }}>
            {statsLoading ? '…' : fmt(quickStats?.todaySales || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 600, marginTop: '2px' }}>
            {statsLoading ? '' : `${quickStats?.todayOrders || 0} orders today`}
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Low Stock Grains</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: (quickStats?.lowStockCount || 0) > 0 ? '#D97706' : '#16A34A', marginTop: '4px' }}>
            {statsLoading ? '…' : `${quickStats?.lowStockCount || 0} Products`}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
            Stock threshold $\le 10$ units
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Pending COD Cash</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#C9A44C', marginTop: '4px' }}>
            {statsLoading ? '…' : fmt(quickStats?.pendingCod || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
            Held by riders / in transit
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Month Gross Margin</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#173D32', marginTop: '4px' }}>
            {statsLoading ? '…' : fmt(quickStats?.estimatedProfit || 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
            ~28% Chakki milling margin
          </div>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>Quick Business Questions (Click to ask):</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {PROMPT_CHIPS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '999px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#1E293B',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2E8B57'; e.currentTarget.style.color = '#2E8B57'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#1E293B'; }}
            >
              💬 {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Thread Container */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E5E7EB',
        display: 'flex',
        flexDirection: 'column',
        height: '520px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}>
        {/* Messages List */}
        <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  gap: '0.75rem'
                }}
              >
                {!isUser && (
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: '#173D32',
                    color: '#C9A44C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Sparkles size={18} />
                  </div>
                )}

                <div style={{
                  maxWidth: '80%',
                  background: isUser ? '#173D32' : '#F8FAFC',
                  color: isUser ? '#FFFFFF' : '#0F172A',
                  padding: '0.9rem 1.15rem',
                  borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  border: isUser ? 'none' : '1px solid #E2E8F0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '0.9rem', lineHeight: 1.55 }}>
                    {msg.text}
                  </div>

                  {msg.source === 'DATABASE_GROUNDED' && (
                    <div style={{ marginTop: '6px', fontSize: '0.68rem', color: isUser ? '#E2E8F0' : '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} style={{ color: isUser ? '#4ADE80' : '#16A34A' }} /> Verified from Real DB • {fmtDateTime(msg.timestamp)}
                    </div>
                  )}

                  {/* Sensitive Action Proposal Card */}
                  {msg.actionProposal && (
                    <div style={{
                      marginTop: '0.85rem',
                      background: '#FFFBEB',
                      border: '1.5px solid #F59E0B',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      color: '#92400E'
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={16} /> Admin Confirmation Required
                      </div>
                      <div style={{ fontSize: '0.82rem', marginTop: '4px', fontWeight: 600 }}>
                        {msg.actionProposal.description}
                      </div>
                      <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#B45309' }}>
                        {msg.actionProposal.warning}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem' }}>
                        <button
                          onClick={() => handleConfirmAction(msg.actionProposal)}
                          disabled={actionLoading}
                          style={{
                            padding: '0.45rem 0.9rem',
                            borderRadius: '6px',
                            background: '#2E8B57',
                            color: '#FFFFFF',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: actionLoading ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {actionLoading ? 'Executing…' : '✔ Confirm & Execute Action'}
                        </button>
                        <button
                          onClick={() => setPendingProposal(null)}
                          style={{
                            padding: '0.45rem 0.9rem',
                            borderRadius: '6px',
                            background: '#FFFFFF',
                            color: '#64748B',
                            border: '1px solid #CBD5E1',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#173D32', color: '#C9A44C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={18} />
              </div>
              <div style={{ background: '#F1F5F9', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                Querying real database metrics…
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          style={{
            display: 'flex',
            gap: '0.75rem',
            padding: '0.9rem 1.25rem',
            borderTop: '1px solid #E5E7EB',
            background: '#FAFAFA'
          }}
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Poochiye: 'Aaj kitni sale hui?', 'Kaunsa stock kam hai?', 'Order BPS1020 ka status'..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1.5px solid #CBD5E1',
              fontSize: '0.9rem',
              outline: 'none',
              background: '#FFFFFF'
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: '0.65rem 1.3rem',
              background: '#173D32',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !input.trim() ? 0.6 : 1
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN ADMIN PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════

// All items matching reference structure plus AI Assistant
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, badgeKey: 'orders' },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'categories', label: 'Categories', icon: Layers },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'delivery', label: 'Delivery Boys', icon: Truck },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'offers', label: 'Offers & Banners', icon: Tag },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'returns', label: 'Returns & Refunds', icon: RotateCcw },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
  { id: 'messages', label: 'Messages', icon: MessageSquare, badgeKey: 'messages' },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'profile', label: 'Admin Profile', icon: User },
];

export default function AdminPanel({ navigate }) {
  const { user, isAdmin, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDropdown, setUserDropdown] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [badgeCounts, setBadgeCounts] = useState({ orders: 0, messages: 0 });

  useEffect(() => {
    API('/admin/dashboard').then(res => {
      if (res.success && res.dashboard) {
        const pending = (res.dashboard.recentOrders || []).filter(o =>
          ['Order Placed', 'Pending Admin Confirmation', 'Processing', 'Preparing'].includes(o.orderStatus)
        ).length;
        setBadgeCounts(prev => ({ ...prev, orders: pending || res.dashboard.pendingOrdersCount || 0 }));
      }
    }).catch(() => {});

    API('/support/tickets').then(res => {
      if (res.success && res.tickets) {
        const openTickets = res.tickets.filter(t => ['OPEN', 'WAITING_FOR_ADMIN', 'IN_PROGRESS'].includes(t.status)).length;
        setBadgeCounts(prev => ({ ...prev, messages: openTickets }));
      }
    }).catch(() => {});
  }, [activeTab]);

  // Guard: redirect non-admins
  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', background: '#F8FAFC' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DEF7EC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534' }}>
          <ShieldCheck size={36} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#111827', fontWeight: 800, fontSize: '1.5rem', margin: 0 }}>Admin Portal Access</h2>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '4px' }}>Please log in with your administrator credentials to proceed.</p>
        </div>
        <button onClick={() => navigate('admin-login')} style={{ padding: '0.75rem 1.75rem', background: '#2E8B57', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(46,139,87,0.25)' }}>
          Go to Admin Login
        </button>
      </div>
    );
  }

  const handleLogout = () => { logout(); navigate('admin-login'); };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard navigate={navigate} setActiveTab={setActiveTab} />;
      case 'ai-assistant': return <AiAssistantSection navigate={navigate} />;
      case 'orders': return <OrdersSection />;
      case 'products': return <ProductsSection />;
      case 'inventory': return <InventorySection setActiveTab={setActiveTab} />;
      case 'categories': return <CategoriesSection />;
      case 'customers': return <CustomersSection />;
      case 'delivery': return <DeliverySection />;
      case 'deliverysettings': return <SettingsSection initialTab="delivery" />;
      case 'coupons': return <OffersSection />;
      case 'offers': return <OffersSection />;
      case 'returns': return <ReturnsSection />;
      case 'tickets': return <TicketsSection />;
      case 'messages': return <TicketsSection />;
      case 'reviews': return <ReviewsSection />;
      case 'customercare': return <SettingsSection initialTab="customercare" />;
      case 'notifications': return <NotificationsSection navigate={navigate} />;
      case 'reports': return <ReportsSection />;
      case 'auditlogs': return <AuditLogsSection />;
      case 'settings': return <SettingsSection initialTab="business" />;
      case 'profile': return <ProfileSection user={user} onLogout={handleLogout} />;
      default: return <Dashboard navigate={navigate} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="admin-workspace" style={{ display: 'flex', minHeight: '100vh', background: '#F5F7F5' }}>
      {/* ── Sidebar (Reference Image Dark Green Design) ── */}
      <aside style={{
        width: sidebarOpen ? '250px' : '72px', flexShrink: 0, background: '#0D2B20',
        display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease', zIndex: 100,
        boxShadow: '2px 0 16px rgba(0,0,0,0.15)', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', overflowX: 'hidden'
      }}>
        {/* Brand Header */}
        <div style={{ padding: '1.25rem 1.1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(22,163,74,0.35)' }}>
            <img src="/logo.png" alt="BPS" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#FFFFFF', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
                BPS Fresh Mills
              </div>
              <div style={{ fontSize: '0.72rem', color: '#A3B8B0', fontWeight: 500, marginTop: '2px' }}>Pure Atta. Healthier Tomorrow.</div>
            </div>
          )}
        </div>

        {/* Navigation List */}
        <nav style={{ flex: 1, padding: '0.75rem 0.6rem' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const count = tab.badgeKey ? badgeCounts[tab.badgeKey] : 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={tab.label}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.85rem',
                  padding: sidebarOpen ? '0.72rem 0.95rem' : '0.72rem 0',
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  background: active ? '#16A34A' : 'transparent',
                  borderRadius: '8px',
                  border: 'none', cursor: 'pointer',
                  color: active ? '#FFFFFF' : '#A3B8B0',
                  fontSize: '0.88rem', fontWeight: active ? 700 : 500,
                  marginBottom: '3px',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Icon size={18} style={{ flexShrink: 0, color: active ? '#FFFFFF' : '#A3B8B0' }} />
                  {!sidebarOpen && count > 0 && (
                    <span style={{
                      position: 'absolute', top: -3, right: -4, width: 7, height: 7,
                      borderRadius: '50%', background: '#EF4444'
                    }} />
                  )}
                </div>
                {sidebarOpen && (
                  <>
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span style={{
                        marginLeft: 'auto', background: '#DC2626', color: '#FFFFFF',
                        fontSize: '0.7rem', fontWeight: 800, padding: '2px 7px',
                        borderRadius: '999px', minWidth: '18px', textAlign: 'center'
                      }}>
                        {count}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}

          {/* Logout in menu */}
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.85rem',
              padding: sidebarOpen ? '0.75rem 0.95rem' : '0.75rem 0',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              background: 'transparent',
              borderRadius: '8px',
              border: 'none', cursor: 'pointer',
              color: '#F87171',
              fontSize: '0.88rem', fontWeight: 600,
              marginTop: '8px'
            }}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>Logout</span>}
          </button>

          {/* Bottom Card: Good Food Happier Lives */}
          {sidebarOpen && (
            <div style={{
              margin: '1.25rem 0.4rem 0.75rem',
              padding: '0.85rem',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(201,164,76,0.12) 100%)',
              borderRadius: '12px',
              border: '1px solid rgba(201,164,76,0.25)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <img
                src="/admin-sidebar-wheat.jpg"
                alt="Wheat"
                style={{ width: '100%', height: '64px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#C9A44C' }}>Good Food Happier Lives</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px', lineHeight: 1.3 }}>
                Manage Today for a Healthier Tomorrow.
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* ── Main Workspace ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header style={{
          background: '#FFFFFF', borderBottom: '1px solid #E5EBE6', padding: '0.85rem 2rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem',
          position: 'sticky', top: 0, zIndex: 90, boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          {/* Left: Hamburger & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, maxWidth: '520px' }}>
            <button
              onClick={() => setSidebarOpen(o => !o)}
              title="Toggle Sidebar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1F2937', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px' }}
            >
              <Menu size={22} />
            </button>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                style={{
                  width: '100%', padding: '0.65rem 1rem 0.65rem 2.6rem', border: '1px solid #E5E7EB',
                  borderRadius: '8px', fontSize: '0.9rem', outline: 'none', background: '#F8FAFC', color: '#111827'
                }}
                placeholder={activeTab === 'categories' ? 'Search categories...' : activeTab === 'inventory' ? 'Search stock and flour varieties...' : 'Search products, orders, customers...'}
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Right: Theme Switcher, Install Admin App, Notification & Profile Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', position: 'relative' }}>
            {/* Install Admin App PWA Button */}
            <InstallPwaButton portalType="admin" />

            {/* Theme Switcher (Light / Dark / System) */}
            <ThemeSwitcher variant="dropdown" />

            {/* Real-time Notification Bell for Admin */}
            <NotificationBell navigate={navigate} role="admin" />

            {/* Profile Dropdown Trigger */}
            <div
              onClick={() => setUserDropdown(d => !d)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
                padding: '4px 8px', borderRadius: '8px', transition: 'background 0.15s'
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#DEF7EC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', fontWeight: 800, fontSize: '0.88rem' }}>
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'RS'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#111827', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {user?.name || 'Rohan Singh'} <ChevronDown size={14} style={{ color: '#64748B' }} />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Admin</div>
              </div>
            </div>

            {/* User Dropdown Menu */}
            {userDropdown && (
              <div
                style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '200px',
                  background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '0.5rem', zIndex: 100
                }}
              >
                <button
                  onClick={() => { setActiveTab('profile'); setUserDropdown(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.85rem', background: 'none', border: 'none', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600, color: '#111827', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <User size={16} /> My Profile
                </button>
                <button
                  onClick={() => { setActiveTab('settings'); setUserDropdown(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.85rem', background: 'none', border: 'none', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600, color: '#111827', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Settings size={16} /> Website Settings
                </button>
                <button
                  onClick={() => { navigate('home'); setUserDropdown(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.85rem', background: 'none', border: 'none', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600, color: '#2E8B57', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Globe size={16} /> View Store
                </button>
                <div style={{ height: '1px', background: '#E5E7EB', margin: '4px 0' }}></div>
                <button
                  onClick={() => { setUserDropdown(false); handleLogout(); }}
                  style={{ width: '100%', textAlign: 'left', padding: '0.6rem 0.85rem', background: 'none', border: 'none', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 700, color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content View */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {renderContent()}
        </main>

        {/* Role Identity Footer for Admin Portal */}
        <footer style={{
          padding: '0.85rem 2rem',
          borderTop: '1px solid #E5E7EB',
          background: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.82rem',
          color: '#64748B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="BPS Fresh Mills" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, color: '#173D32' }}>🌾 BPS Fresh Mills — Admin Portal</span>
            <span style={{ background: '#DEF7EC', color: '#03543F', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>Admin Mode</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>Ye BPS Admin Portal hai — Official Store Management, Inventory & AI Assistant</span>
            <InstallPwaButton portalType="admin" style={{ padding: '0.35rem 0.75rem', fontSize: '0.76rem' }} />
          </div>
        </footer>
      </div>
    </div>
  );
}
