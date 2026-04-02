import { PageHeader } from '@/components/ui/page-header';
import { NewOrgForm } from './new-org-form';

export default function NewOrganizationPage() {
  return (
    <div>
      <PageHeader
        title="New Organization"
        subtitle="Create a customer, carrier, or other organization"
        breadcrumb={[
          { label: 'Organizations', href: '/organizations' },
          { label: 'New Organization' },
        ]}
      />
      <NewOrgForm />
    </div>
  );
}
