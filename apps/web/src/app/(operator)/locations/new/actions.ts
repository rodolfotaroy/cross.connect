'use server';

import { sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';

export async function createSite(dto: {
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
}) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    return await sitesApi.create(token, dto);
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to create site' };
  }
}
