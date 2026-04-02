'use server';

import { panelsApi, portsApi } from '@/lib/api/locations';
import { auth } from '@/lib/auth/session';

export async function createRoomPanel(
  roomId: string,
  dto: {
    name: string;
    code: string;
    panelType: string;
    portCount: number;
    notes?: string;
    mediaType?: string;
    connectorType?: string;
    alternateTxRx?: boolean;
  },
) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  try {
    const panel = await panelsApi.createInRoom(token, roomId, {
      name: dto.name,
      code: dto.code,
      panelType: dto.panelType,
      portCount: dto.portCount,
    });
    if (dto.mediaType && dto.connectorType && dto.portCount > 0) {
      await portsApi.bulkCreate(token, panel.id, {
        count: dto.portCount,
        mediaType: dto.mediaType,
        connectorType: dto.connectorType,
        alternateTxRx: dto.alternateTxRx ?? false,
      });
    }
    return panel;
  } catch (err: any) {
    return { error: err?.message ?? 'Failed to create panel' };
  }
}
