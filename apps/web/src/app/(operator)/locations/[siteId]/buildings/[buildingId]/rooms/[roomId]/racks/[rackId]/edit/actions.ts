'use server';

import { racksApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function updateRoomRack(
  roomPath: string,
  rackId: string,
  dto: { name?: string; uSize?: number; notes?: string },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) return { error: 'Not authenticated' };
  try {
    const result = await racksApi.update(token, rackId, dto);
    revalidatePath(roomPath);
    return result;
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to update rack' };
  }
}

export async function deactivateRoomRack(roomPath: string, rackId: string) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) return { error: 'Not authenticated' };
  try {
    await racksApi.deactivate(token, rackId);
    revalidatePath(roomPath);
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to deactivate rack' };
  }
}
