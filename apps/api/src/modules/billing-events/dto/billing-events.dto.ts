import { z } from 'zod';

export const MarkExportedDto = z.object({ ids: z.array(z.string()).min(1) });
export type MarkExportedDto = z.infer<typeof MarkExportedDto>;

export const ListPendingDto = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  cursor: z.string().optional(), // last seen event id for keyset pagination
});
export type ListPendingDto = z.infer<typeof ListPendingDto>;
