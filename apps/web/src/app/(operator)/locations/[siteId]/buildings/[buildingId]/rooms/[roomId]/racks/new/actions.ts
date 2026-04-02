'use server';

import { racksApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';

export async function createRoomRack(
  roomId: string,
  dto: { name: string; code: string; uSize?: number; notes?: string },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) return { error: 'Not authenticated' };
  try {
    return await racksApi.createInRoom(token, roomId, dto);
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to create rack' };
  }
}
