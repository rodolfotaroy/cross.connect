import { PageHeader } from '@/components/ui/page-header';
import { orgsApi } from '@/lib/api/organizations';
import { auth } from '@/lib/auth/session';
import { NewOrderForm } from './new-order-form';

export default async function NewOrderPage() {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const result = await orgsApi
    .list(token, { limit: 100 })
    .catch(() => ({ data: [], total: 0, page: 1, limit: 100 }));

  return (
    <div>
      <PageHeader
        title="New Cross-Connect Request"
        subtitle="Create a draft order for review and approval"
        breadcrumb={[
          { label: 'Orders', href: '/orders' },
          { label: 'New Request' },
        ]}
      />
      <NewOrderForm organizations={result.data} />
    </div>
  );
}
