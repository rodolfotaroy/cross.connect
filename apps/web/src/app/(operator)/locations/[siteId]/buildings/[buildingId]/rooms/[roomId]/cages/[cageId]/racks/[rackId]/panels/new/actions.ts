'use server';

import { panelsApi, portsApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

export async function createRackPanel(
  roomUrl: string,
  rackId: string,
  dto: {
    name: string;
    code: string;
    panelType: string;
    portCount: number;
    uPosition?: number;
    notes?: string;
    mediaType?: string;
    connectorType?: string;
    alternateTxRx?: boolean;
  },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) return { error: 'Not authenticated' };
  try {
    const panel = await panelsApi.createInRack(token, rackId, {
      name: dto.name,
      code: dto.code,
      panelType: dto.panelType,
      portCount: dto.portCount,
      uPosition: dto.uPosition,
    });
    if (dto.mediaType && dto.connectorType && dto.portCount > 0) {
      await portsApi.bulkCreate(token, panel.id, {
        count: dto.portCount,
        mediaType: dto.mediaType,
        connectorType: dto.connectorType,
        alternateTxRx: dto.alternateTxRx ?? false,
      });
    }
    revalidatePath(roomUrl);
    return panel;
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to create panel' };
  }
}
