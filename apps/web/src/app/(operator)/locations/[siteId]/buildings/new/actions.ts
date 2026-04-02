'use server';

import { buildingsApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';

export async function createBuilding(
  siteId: string,
  dto: { name: string; code: string; floors?: number },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    return await buildingsApi.create(token, siteId, dto);
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to create building' };
  }
}
