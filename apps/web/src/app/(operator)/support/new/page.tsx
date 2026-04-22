import { PageHeader } from '@/components/ui/page-header';
import { orgsApi } from '@/lib/api/organizations';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import { NewOpTicketForm } from './new-ticket-form';

export const metadata: Metadata = { title: 'New Ticket — Operator Portal' };

export default async function NewOpTicketPage() {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const orgsResult = await orgsApi.list(token, { limit: 200 }).catch(() => ({ data: [] }));
  const orgs = (orgsResult.data ?? []).map((o: any) => ({
    id: o.id,
    name: o.name,
    code: o.code,
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="New Support Ticket"
        subtitle="Create a support ticket on behalf of an organization"
        breadcrumb={[{ label: 'Support', href: '/support' }, { label: 'New Ticket' }]}
      />
      <NewOpTicketForm orgs={orgs} />
    </div>
  );
}
