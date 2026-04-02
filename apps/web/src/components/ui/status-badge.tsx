import type { OrderState, PortState, ServiceState, WorkOrderState } from '@xc/types';

// ── Generic helper ──────────────────────────────────────────────────────────

const cls = (base: string) =>
  `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${base}`;

// ── Order state ─────────────────────────────────────────────────────────────

const ORDER_STATE_STYLES: Record<OrderState, string> = {
  draft: 'bg-gray-100 text-gray-600',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-orange-100 text-orange-700',
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
};

export function OrderStateBadge({ state }: { state: OrderState }) {
  return (
    <span className={cls(ORDER_STATE_STYLES[state] ?? 'bg-gray-100 text-gray-600')}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

// ── Service state ────────────────────────────────────────────────────────────

const SERVICE_STATE_STYLES: Record<ServiceState, string> = {
  provisioning: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-800',
  pending_disconnect: 'bg-orange-100 text-orange-700',
  disconnected: 'bg-gray-100 text-gray-400',
};

export function ServiceStateBadge({ state }: { state: ServiceState }) {
  return (
    <span className={cls(SERVICE_STATE_STYLES[state] ?? 'bg-gray-100 text-gray-600')}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

// ── Port state ───────────────────────────────────────────────────────────────

const PORT_STATE_STYLES: Record<PortState, string> = {
  available: 'bg-green-100 text-green-700',
  reserved: 'bg-yellow-100 text-yellow-800',
  in_use: 'bg-blue-100 text-blue-700',
  faulty: 'bg-red-100 text-red-700',
  maintenance: 'bg-orange-100 text-orange-700',
  decommissioned: 'bg-gray-200 text-gray-500',
};

export function PortStateBadge({ state }: { state: PortState }) {
  return (
    <span className={cls(PORT_STATE_STYLES[state] ?? 'bg-gray-100 text-gray-600')}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

// ── Work-order state ─────────────────────────────────────────────────────────

const WORK_ORDER_STATE_STYLES: Record<WorkOrderState, string> = {
  created: 'bg-gray-100 text-gray-600',
  assigned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-800',
  pending_test: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-400',
};

export function WorkOrderStateBadge({ state }: { state: WorkOrderState }) {
  return (
    <span className={cls(WORK_ORDER_STATE_STYLES[state] ?? 'bg-gray-100 text-gray-600')}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

// ── Generic string badge (e.g. orgType, roomType) ───────────────────────────

export function Badge({
  label,
  variant = 'neutral',
}: {
  label: string;
  variant?: 'neutral' | 'info' | 'success' | 'warn' | 'danger';
}) {
  const variants = {
    neutral: 'bg-gray-100 text-gray-600',
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warn: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-700',
  };
  return <span className={cls(variants[variant])}>{label.replace(/_/g, ' ')}</span>;
}

// ── Room type badge ──────────────────────────────────────────────────────────

const ROOM_TYPE_STYLES: Record<string, string> = {
  mmr: 'bg-purple-100 text-purple-700',
  telco_closet: 'bg-blue-100 text-blue-700',
};

export function RoomTypeBadge({ roomType }: { roomType: string }) {
  return (
    <span className={cls(ROOM_TYPE_STYLES[roomType] ?? 'bg-gray-100 text-gray-600')}>
      {roomType.replace(/_/g, ' ')}
    </span>
  );
}
