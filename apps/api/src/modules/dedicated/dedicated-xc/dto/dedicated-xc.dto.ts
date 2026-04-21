import {
  AddDedicatedXcHopSchema,
  CreateDedicatedXcSchema,
  ListDedicatedXcSchema,
  UpdateDedicatedXcSchema,
} from '@xc/types/api';

export const CreateDedicatedXcDto = CreateDedicatedXcSchema;
export type CreateDedicatedXcDto = typeof CreateDedicatedXcSchema._type;

export const UpdateDedicatedXcDto = UpdateDedicatedXcSchema;
export type UpdateDedicatedXcDto = typeof UpdateDedicatedXcSchema._type;

export const ListDedicatedXcDto = ListDedicatedXcSchema;
export type ListDedicatedXcDto = typeof ListDedicatedXcSchema._type;

export const AddDedicatedXcHopDto = AddDedicatedXcHopSchema;
export type AddDedicatedXcHopDto = typeof AddDedicatedXcHopSchema._type;
