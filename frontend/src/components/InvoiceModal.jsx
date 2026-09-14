import React, { useRef } from 'react';
import { Printer, X, CheckCircle2, Key, ShieldCheck } from 'lucide-react';

export default function InvoiceModal({ order, onClose }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : new Date().toLocaleDateString('en-IN');

  return (
    <div
      className="invoice-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 25, 21, 0.75)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        className="invoice-card-container"
        style={{
          backgroundColor: '#FFFFFF',
          color: '#111827',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Action Header (hidden during print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={18} color="#2E8B57" />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#173D32' }}>
              Tax Invoice & Delivery Receipt
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handlePrint}
              style={{
                backgroundColor: '#2E8B57',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div id="printable-invoice" style={{ padding: '2rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #2E8B57', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.6rem' }}>🌾</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#173D32', letterSpacing: '-0.5px' }}>
                  BPS FRESH MILLS
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#2E8B57', fontWeight: 700, fontStyle: 'italic', marginTop: '2px' }}>
                Freshly Milled. Naturally Good.
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                Stone Ground Chakki Atta • Premium Whole Grains • Local 15 KM Delivery
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#173D32' }}>
                INVOICE
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginTop: '2px' }}>
                #{order.orderId || order._id}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                Date: {invoiceDate}
              </div>
              <div style={{ display: 'inline-block', marginTop: '6px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#D97706', fontWeight: 800, fontSize: '0.72rem' }}>
                Cash on Delivery (COD)
              </div>
            </div>
          </div>

          {/* Customer & Delivery Information */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 800, color: '#173D32', marginBottom: '0.4rem', textTransform: 'uppercase', fontSize: '0.78rem' }}>
                Delivering To:
              </div>
              <div style={{ fontWeight: 700, color: '#111827' }}>
                {order.shippingAddress?.name || order.customerName || 'Valued Customer'}
              </div>
              <div style={{ color: '#475569', marginTop: '2px' }}>
                {order.shippingAddress?.houseFlat}, {order.shippingAddress?.streetArea}
              </div>
              {order.shippingAddress?.landmark && (
                <div style={{ color: '#475569' }}>Landmark: {order.shippingAddress?.landmark}</div>
              )}
              <div style={{ color: '#475569' }}>
                {order.shippingAddress?.city} - {order.shippingAddress?.pincode}
              </div>
              <div style={{ fontWeight: 600, color: '#111827', marginTop: '4px' }}>
                Phone: {order.shippingAddress?.mobile || order.customerPhone}
              </div>
            </div>

            <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#173D32', marginBottom: '0.4rem', textTransform: 'uppercase', fontSize: '0.78rem' }}>
                  Delivery Verification:
                </div>
                <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                  Status: <strong style={{ color: '#2E8B57' }}>{order.orderStatus}</strong>
                </div>
                {order.millingSlot && (
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '3px' }}>
                    Batch: <strong style={{ color: '#173D32' }}>{order.millingSlot}</strong>
                  </div>
                )}
                {order.assignedDeliveryBoy && (
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '3px' }}>
                    Agent: <strong>{order.assignedDeliveryBoy.name}</strong> ({order.assignedDeliveryBoy.phone})
                  </div>
                )}
              </div>

              {order.deliveryOtp && (
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#E8F5EC', borderRadius: '6px', border: '1px dashed #2E8B57', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#173D32', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Key size={14} /> CUSTOMER OTP:
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.1rem', color: '#2E8B57', letterSpacing: '2px' }}>
                    {order.deliveryOtp}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#173D32', color: '#FFFFFF', textAlign: 'left' }}>
                <th style={{ padding: '0.65rem 0.75rem', borderRadius: '6px 0 0 0' }}>#</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Item Description</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Weight</th>
                <th style={{ padding: '0.65rem 0.75rem' }}>Milling Texture</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', borderRadius: '0 6px 0 0' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items && order.items.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <td style={{ padding: '0.65rem 0.75rem', color: '#64748B' }}>{idx + 1}</td>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#111827' }}>
                    {item.name}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>{item.weight}</td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#E8F5EC', color: '#2E8B57', fontWeight: 700, fontSize: '0.78rem' }}>
                      {item.texture === 'Fine' ? 'Fine (बारीक)' : item.texture === 'Coarse' ? 'Coarse (मोटा)' : 'Medium (रेगुलर)'}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700 }}>
                    ₹{item.subtotal || item.price * item.quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pricing Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>₹{order.subtotal}</span>
              </div>
              {order.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2E8B57' }}>
                  <span>Coupon Discount ({order.couponCode}):</span>
                  <span style={{ fontWeight: 700 }}>-₹{order.discount}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                <span>Delivery Charges:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  {order.deliveryCharge === 0 ? 'FREE' : `₹${order.deliveryCharge}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #173D32', paddingTop: '0.5rem', marginTop: '0.25rem', fontSize: '1.1rem', fontWeight: 900, color: '#173D32' }}>
                <span>Total Payable:</span>
                <span style={{ color: '#2E8B57' }}>₹{order.totalAmount}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', textAlign: 'right' }}>
                (Inclusive of all fresh milling charges)
              </div>
            </div>
          </div>

          {/* Quality Seal / Footer */}
          <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2E8B57', fontWeight: 700 }}>
              <ShieldCheck size={16} /> 100% Traditional Stone-Ground • Freshly Milled on Order
            </div>
            <div>
              Thank you for supporting fresh, preservative-free milling!
            </div>
          </div>
        </div>
      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-invoice, #printable-invoice * {
            visibility: visible !important;
          }
          #printable-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
