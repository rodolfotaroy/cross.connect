'use server';

import { cagesApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function updateCage(
  roomPath: string,
  cageId: string,
  dto: { name?: string; notes?: string },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) return { error: 'Not authenticated' };
  try {
    const result = await cagesApi.update(token, cageId, dto);
    revalidatePath(roomPath);
    return result;
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to update cage' };
  }
}

export async function deactivateCage(roomPath: string, cageId: string) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) return { error: 'Not authenticated' };
  try {
    await cagesApi.deactivate(token, cageId);
    revalidatePath(roomPath);
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to deactivate cage' };
  }
}
