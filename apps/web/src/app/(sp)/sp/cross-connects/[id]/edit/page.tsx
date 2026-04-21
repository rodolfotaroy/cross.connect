import { PageHeader } from '@/components/ui/page-header';
import { dedicatedXcApi } from '@/lib/api/dedicated-xc';
import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { EditCrossConnectForm } from './edit-form';

export const metadata: Metadata = { title: 'Edit Cross Connect — SP Portal' };

export default async function EditXcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;

  const xc = await dedicatedXcApi.getOne(token, id).catch(() => null);
  if (!xc) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${xc.crossConnectId}`} subtitle="Update cross connect details" />
      <EditCrossConnectForm xc={xc} />
    </div>
  );
}
