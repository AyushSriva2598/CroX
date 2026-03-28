'use client';

export default function StateBadge({ state }) {
  const stateConfig = {
    draft: { label: 'Draft', class: 'badge-draft' },
    pending_acceptance: { label: 'Pending', class: 'badge-pending' },
    active: { label: 'Active', class: 'badge-active' },
    funds_locked: { label: 'Escrowed', class: 'badge-locked' },
    work_submitted: { label: 'Review', class: 'badge-submitted' },
    completed: { label: 'Completed', class: 'badge-completed' },
    cancelled: { label: 'Cancelled', class: 'badge-cancelled' },
    disputed: { label: 'Dispute', class: 'badge-disputed' },
    resolved: { label: 'Resolved', class: 'badge-resolved' },
    refunded: { label: 'Refunded', class: 'badge-refunded' },
  };

  const config = stateConfig[state] || { label: state, class: 'badge-draft' };

  return <span className={`badge ${config.class}`}>{config.label}</span>;
}
