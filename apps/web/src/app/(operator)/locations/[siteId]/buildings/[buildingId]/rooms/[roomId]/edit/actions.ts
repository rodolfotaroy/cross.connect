'use server';

import { roomsApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function updateRoom(
  siteId: string,
  buildingId: string,
  roomId: string,
  dto: { name?: string; roomType?: string; floor?: string; notes?: string },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    const result = await roomsApi.update(token, roomId, dto);
    revalidatePath(`/locations/${siteId}/buildings/${buildingId}/rooms/${roomId}`);
    return result;
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to update room' };
  }
}

export async function deactivateRoom(siteId: string, buildingId: string, roomId: string) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    await roomsApi.deactivate(token, roomId);
    revalidatePath(`/locations/${siteId}/buildings/${buildingId}`);
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to deactivate room' };
  }
}
