import { z } from 'zod';

export const SetPortStateDto = z.object({
  state: z.enum(['available', 'reserved', 'in_use', 'faulty', 'maintenance', 'decommissioned']),
  reason: z.string().max(500).optional(),
});
export type SetPortStateDto = z.infer<typeof SetPortStateDto>;
