import {
  DisconnectServiceSchema,
  ExtendTemporaryServiceSchema,
  ListServicesSchema,
  SuspendServiceSchema,
  type DisconnectServiceInput,
  type ExtendTemporaryServiceInput,
  type ListServicesInput,
  type SuspendServiceInput,
} from '@xc/types';
import { z } from 'zod';

export const ListServicesDto = ListServicesSchema;
export type ListServicesDto = ListServicesInput;

export const DisconnectServiceDto = DisconnectServiceSchema;
export type DisconnectServiceDto = DisconnectServiceInput;

export const SuspendServiceDto = SuspendServiceSchema;
export type SuspendServiceDto = SuspendServiceInput;

export const ExtendTemporaryServiceDto = ExtendTemporaryServiceSchema;
export type ExtendTemporaryServiceDto = ExtendTemporaryServiceInput;

export const AbortProvisioningDto = z.object({ reason: z.string().min(5).max(2000) });
export type AbortProvisioningDto = z.infer<typeof AbortProvisioningDto>;
