'use server';

import { ordersApi } from '@/lib/api/cross-connects';
import { auth } from '@/lib/auth/session';
import type { CreateOrderInput } from '@xc/types/api';

export async function createDraftOrder(payload: CreateOrderInput) {
  const session = await auth();
  const token = (session?.user as any)?.accessToken as string;
  if (!token) throw new Error('Not authenticated');
  return ordersApi.create(token, payload);
}
