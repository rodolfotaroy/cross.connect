'use server';

import { panelsApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function updatePanel(
  roomPath: string,
  panelId: string,
  dto: { name?: string; panelType?: string; uPosition?: number | null; notes?: string },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    const result = await panelsApi.update(token, panelId, dto);
    revalidatePath(roomPath);
    return result;
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to update panel' };
  }
}

export async function deactivatePanel(roomPath: string, panelId: string) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    await panelsApi.deactivate(token, panelId);
    revalidatePath(roomPath);
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to deactivate panel' };
  }
}
