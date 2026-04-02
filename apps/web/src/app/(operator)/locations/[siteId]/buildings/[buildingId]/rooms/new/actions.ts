'use server';

import { roomsApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';

export async function createRoom(
  buildingId: string,
  dto: { name: string; code: string; roomType: string; floor?: string; notes?: string },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    return await roomsApi.create(token, buildingId, dto);
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to create room' };
  }
}
