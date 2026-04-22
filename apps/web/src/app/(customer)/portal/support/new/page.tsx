import { PageHeader } from '@/components/ui/page-header';
import type { Metadata } from 'next';
import Link from 'next/link';
import { NewCustomerTicketForm } from './new-ticket-form';

export const metadata: Metadata = { title: 'New Support Ticket — Customer Portal' };

export default function NewCustomerTicketPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/portal/support"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tickets
        </Link>
      </div>
      <PageHeader
        title="New Support Ticket"
        subtitle="Describe your issue and we will get back to you"
      />
      <NewCustomerTicketForm />
    </div>
  );
}
