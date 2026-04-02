import { auth } from '@/lib/auth/session';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { InviteTeamMemberForm } from './invite-form';

export const metadata: Metadata = { title: 'Invite Team Member' };

export default async function InviteTeamMemberPage() {
  const session = await auth();
  const role = (session?.user as any)?.role as string;
  const orgId = (session?.user as any)?.orgId as string;
  const token = (session?.user as any)?.accessToken as string;

  // Only customer_admin may access this page
  if (role !== 'customer_admin') redirect('/portal/team');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invite Team Member</h1>
        <p className="mt-0.5 text-sm text-gray-500">Add a new member to your organisation.</p>
      </div>
      <InviteTeamMemberForm orgId={orgId} token={token} />
    </div>
  );
}
