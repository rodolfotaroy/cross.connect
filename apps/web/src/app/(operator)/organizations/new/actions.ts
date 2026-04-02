'use server';

import { orgsApi } from '@/lib/api/organizations';
import { auth } from '@/lib/auth/session';

export async function createOrganization(dto: {
  name: string;
  code: string;
  orgType: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    return await orgsApi.create(token, dto as any);
  } catch (err: any) {
    throw new Error(err?.message ?? 'Failed to create organization');
  }
}
