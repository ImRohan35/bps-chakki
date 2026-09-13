import React from 'react';
import { Check, Clock, Package, Truck, CheckCircle2, XCircle } from 'lucide-react';

const ORDER_STAGES = [
  { key: 'Order Placed', aliases: ['Order Placed'], label: 'Order Placed', icon: Clock },
  { key: 'Confirmed', aliases: ['Confirmed'], label: 'Order Confirmed', icon: Check },
  { key: 'Processing', aliases: ['Processing', 'Preparing'], label: 'Processing', icon: Package },
  { key: 'Shipped', aliases: ['Shipped', 'Ready for Delivery'], label: 'Shipped', icon: Truck },
  { key: 'Out for Delivery', aliases: ['Out for Delivery'], label: 'Out for Delivery', icon: Truck },
  { key: 'Delivered', aliases: ['Delivered'], label: 'Delivered', icon: CheckCircle2 }
];

export default function OrderTimeline({ currentStatus, timeline = [] }) {
  if (currentStatus === 'Cancelled') {
    return (
      <div style={{ padding: '1.25rem', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)', color: 'var(--danger-rust)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <XCircle size={24} />
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Order Cancelled</div>
          <div style={{ fontSize: '0.85rem' }}>This order has been cancelled and items have been returned to stock.</div>
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STAGES.findIndex(s => s.aliases.includes(currentStatus));

  return (
    <div className="timeline-container">
      {ORDER_STAGES.map((stage, idx) => {
        const isCompleted = currentIndex >= idx;
        const isActive = currentIndex === idx;
        const StageIcon = stage.icon;

        // Find timeline entry matching any stage alias
        const historyEntry = timeline.find(t => stage.aliases.includes(t.status));

        return (
          <div
            key={stage.key}
            className={`timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
          >
            <div className="timeline-step-dot">
              <StageIcon size={11} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="timeline-title" style={{ color: isActive ? 'var(--wheat-gold)' : isCompleted ? 'var(--nature-green)' : 'var(--text-muted)' }}>
                  {stage.label}
                </span>
                {isCompleted && !isActive && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--nature-green)', fontWeight: 700 }}>✓</span>
                )}
                {isActive && (
                  <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>In Progress</span>
                )}
              </div>

              {historyEntry && historyEntry.timestamp && (
                <span className="timeline-date">
                  {new Date(historyEntry.timestamp).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              )}

              {historyEntry && historyEntry.note && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {historyEntry.note}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
