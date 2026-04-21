import { PageHeader } from '@/components/ui/page-header';
import type { Metadata } from 'next';
import { NewTicketForm } from './new-ticket-form';

export const metadata: Metadata = { title: 'New Ticket — SP Portal' };

export default function NewTicketPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Support Ticket"
        subtitle="Describe your issue and we'll get back to you"
      />
      <NewTicketForm />
    </div>
  );
}
