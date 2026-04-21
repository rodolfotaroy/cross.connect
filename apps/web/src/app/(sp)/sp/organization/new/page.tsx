import { PageHeader } from '@/components/ui/page-header';
import type { Metadata } from 'next';
import { NewSpUserForm } from './new-sp-user-form';

export const metadata: Metadata = { title: 'Add Team Member — SP Portal' };

export default function NewSpUserPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Team Member"
        subtitle="Create a new SP portal user"
        breadcrumb={[{ label: 'Organization', href: '/sp/organization' }, { label: 'Add Member' }]}
      />
      <NewSpUserForm />
    </div>
  );
}
