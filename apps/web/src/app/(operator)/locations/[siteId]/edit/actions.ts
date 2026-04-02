'use server';

import { sitesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function updateSite(
  siteId: string,
  dto: { name?: string; address?: string; city?: string; state?: string; country?: string; timezone?: string; notes?: string },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    const result = await sitesApi.update(token, siteId, dto);
    revalidatePath(`/locations/${siteId}`);
    return result;
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to update site' };
  }
}

export async function deactivateSite(siteId: string) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    await sitesApi.deactivate(token, siteId);
    revalidatePath('/locations');
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to deactivate site' };
  }
}
