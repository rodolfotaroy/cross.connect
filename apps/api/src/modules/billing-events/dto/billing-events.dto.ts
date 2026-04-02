import { z } from 'zod';

export const MarkExportedDto = z.object({ ids: z.array(z.string()).min(1) });
export type MarkExportedDto = z.infer<typeof MarkExportedDto>;
