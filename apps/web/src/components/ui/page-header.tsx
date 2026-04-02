import Link from 'next/link';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}

export function PageHeader({ title, subtitle, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="mb-3 flex text-sm text-gray-500" aria-label="Breadcrumb">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && <span className="mx-1.5 text-gray-300">/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-gray-700 hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-gray-700">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 break-words">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
