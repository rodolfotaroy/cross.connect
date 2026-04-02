import {
    CreateCablePathSchema,
    MarkInstalledSchema,
    type CreateCablePathInput,
    type MarkInstalledInput,
} from '@xc/types';

export const CreateCablePathDto = CreateCablePathSchema;
export type CreateCablePathDto = CreateCablePathInput;

export const MarkInstalledDto = MarkInstalledSchema;
export type MarkInstalledDto = MarkInstalledInput;
