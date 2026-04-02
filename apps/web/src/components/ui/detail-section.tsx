import type { ReactNode } from 'react';

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 text-sm sm:grid-cols-3 sm:gap-4">
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="col-span-2 min-w-0 break-words text-gray-900">
        {value ?? <span className="text-gray-400">—</span>}
      </dd>
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  rows: DetailRowProps[];
  className?: string;
}

export function DetailSection({ title, rows, className = '' }: DetailSectionProps) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <dl className="divide-y divide-gray-100 px-6">
        {rows.map((row) => (
          <DetailRow key={row.label} {...row} />
        ))}
      </dl>
    </div>
  );
}

// Re-export for single use
export { DetailRow };
