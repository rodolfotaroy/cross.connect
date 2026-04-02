'use server';

import { racksApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';

export async function createRack(
  cageId: string,
  dto: { name: string; code: string; uSize?: number; notes?: string },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    return await racksApi.create(token, cageId, {
      name: dto.name,
      code: dto.code,
      uSize: dto.uSize,
    });
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to create rack' };
  }
}
