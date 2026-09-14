import React from 'react';
import { Check, Clock, Package, Truck, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const ORDER_STAGES = [
  { key: 'Order Placed', aliases: ['Order Placed'], label: 'Order Placed', icon: Clock },
  { key: 'Admin Confirmation', aliases: ['Confirmed', 'Admin Confirmation'], label: 'Confirmed', icon: Check },
  { key: 'Processing', aliases: ['Processing', 'Preparing'], label: 'Processing & Milling', icon: Package },
  { key: 'Delivery Assigned', aliases: ['Delivery Assigned', 'Shipped', 'Ready for Delivery'], label: 'Delivery Assigned', icon: Truck },
  { key: 'Out for Delivery', aliases: ['Out for Delivery'], label: 'Out for Delivery', icon: Truck },
  { key: 'Arrived', aliases: ['Arrived'], label: 'Arrived at Doorstep', icon: Truck },
  { key: 'Delivered', aliases: ['Delivered'], label: 'Delivered', icon: CheckCircle2 }
];

export default function OrderTimeline({ currentStatus, timeline = [] }) {
  if (currentStatus === 'Cancelled') {
    const placedEntry = timeline.find(t => t.status === 'Order Placed');
    const cancelledEntry = timeline.find(t => t.status === 'Cancelled');

    return (
      <div>
        <div className="timeline-container" style={{ marginBottom: '1.5rem' }}>
          {/* Step 1: Order Placed */}
          <div className="timeline-step completed">
            <div className="timeline-step-dot">
              <Clock size={11} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="timeline-title" style={{ color: 'var(--nature-green)' }}>
                  Order Placed
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--nature-green)', fontWeight: 700 }}>✓</span>
              </div>
              {placedEntry?.timestamp && (
                <span className="timeline-date">
                  {new Date(placedEntry.timestamp).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Step 2: Order Cancelled */}
          <div className="timeline-step completed">
            <div className="timeline-step-dot" style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}>
              <XCircle size={11} color="#FFFFFF" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="timeline-title" style={{ color: '#DC2626', fontWeight: 800 }}>
                  Order Cancelled
                </span>
                <span style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 700 }}>✓</span>
              </div>
              {cancelledEntry?.timestamp && (
                <span className="timeline-date">
                  {new Date(cancelledEntry.timestamp).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              )}
              {cancelledEntry?.note && (
                <span style={{ fontSize: '0.82rem', color: '#DC2626', marginTop: '2px' }}>
                  {cancelledEntry.note}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-md)', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={20} />
          <div style={{ fontSize: '0.9rem' }}>
            This order has been cancelled and stock has been restored.
          </div>
        </div>
      </div>
    );
  }

  // Determine stage index
  let currentIndex = 0;
  if (currentStatus === 'Pending Admin Confirmation') {
    currentIndex = 0; // Placed is completed, Admin Confirmation is active
  } else {
    const found = ORDER_STAGES.findIndex(s => s.aliases.includes(currentStatus));
    currentIndex = found >= 0 ? found : 0;
  }

  const isPendingAdmin = currentStatus === 'Pending Admin Confirmation';

  return (
    <div>
      <div className="timeline-container">
      {ORDER_STAGES.map((stage, idx) => {
        let isCompleted = false;
        let isActive = false;

        if (isPendingAdmin) {
          if (idx === 0) isCompleted = true;
          if (idx === 1) isActive = true;
        } else {
          isCompleted = currentIndex >= idx;
          isActive = currentIndex === idx;
        }

        const StageIcon = stage.icon;

        // Find timeline entry matching any stage alias
        const historyEntry = timeline.find(t => stage.aliases.includes(t.status) || (idx === 0 && t.status === 'Order Placed'));

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
                  <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                    {isPendingAdmin && stage.key === 'Admin Confirmation' ? 'Pending Admin Approval' : 'In Progress'}
                  </span>
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

    {currentStatus === 'Arrived' && (
      <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', backgroundColor: '#E8F5EC', border: '1.5px solid #2E8B57', borderRadius: 'var(--radius-md)', color: '#173D32', display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'pulse 2s infinite' }}>
        <Truck size={22} color="#2E8B57" />
        <div style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>
          <strong>Rider Has Arrived!</strong> Your delivery partner is waiting outside your location. Please share your 4-digit Delivery OTP and keep cash ready for COD payment.
        </div>
      </div>
    )}
  </div>
);
}
