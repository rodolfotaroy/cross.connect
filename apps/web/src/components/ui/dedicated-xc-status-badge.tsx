import type { DedicatedXcStatus } from '@xc/types';

const CONFIG: Record<DedicatedXcStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', className: 'bg-orange-100 text-orange-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  disconnected: { label: 'Disconnected', className: 'bg-gray-100 text-gray-400' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
};

export function DedicatedXcStatusBadge({ status }: { status: DedicatedXcStatus }) {
  const cfg = CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}
