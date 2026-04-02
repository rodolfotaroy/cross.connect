import { PageHeader } from '@/components/ui/page-header';
import { NewSiteForm } from './new-site-form';

export default function NewSitePage() {
  return (
    <div>
      <PageHeader
        title="New Site"
        subtitle="Add a datacenter site to manage physical infrastructure."
        breadcrumb={[{ label: 'Locations', href: '/locations' }, { label: 'New Site' }]}
      />
      <NewSiteForm />
    </div>
  );
}
