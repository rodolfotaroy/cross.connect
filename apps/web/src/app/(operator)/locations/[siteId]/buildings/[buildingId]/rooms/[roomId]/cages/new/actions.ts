'use server';

import { cagesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';

export async function createCage(
  roomId: string,
  dto: { name: string; code: string; notes?: string },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    return await cagesApi.create(token, roomId, dto);
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to create cage' };
  }
}
