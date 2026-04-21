import { PageHeader } from '@/components/ui/page-header';
import type { Metadata } from 'next';
import { NewCrossConnectForm } from './new-cross-connect-form';

export const metadata: Metadata = { title: 'New Cross Connect — SP Portal' };

export default function NewCrossConnectPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New Cross Connect"
        subtitle="Fill in the details and define circuit hops"
      />
      <NewCrossConnectForm />
    </div>
  );
}
