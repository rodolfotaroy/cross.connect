'use server';

import { buildingsApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function updateBuilding(
  siteId: string,
  buildingId: string,
  dto: { name?: string; notes?: string },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    const result = await buildingsApi.update(token, buildingId, dto);
    revalidatePath(`/locations/${siteId}/buildings/${buildingId}`);
    return result;
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to update building' };
  }
}

export async function deactivateBuilding(siteId: string, buildingId: string) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    await buildingsApi.deactivate(token, buildingId);
    revalidatePath(`/locations/${siteId}`);
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to deactivate building' };
  }
}
