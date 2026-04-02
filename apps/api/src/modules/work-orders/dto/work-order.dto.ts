import {
    AssignWorkOrderSchema,
    CancelWorkOrderSchema,
    CompleteWorkOrderSchema,
    CreateWorkOrderSchema,
    ListWorkOrdersSchema,
    ProgressWorkOrderSchema,
    type AssignWorkOrderInput,
    type CancelWorkOrderInput,
    type CompleteWorkOrderInput,
    type CreateWorkOrderInput,
    type ListWorkOrdersInput,
    type ProgressWorkOrderInput,
} from '@xc/types';

export const CreateWorkOrderDto = CreateWorkOrderSchema;
export type CreateWorkOrderDto = CreateWorkOrderInput;

export const AssignWorkOrderDto = AssignWorkOrderSchema;
export type AssignWorkOrderDto = AssignWorkOrderInput;

export const ProgressWorkOrderDto = ProgressWorkOrderSchema;
export type ProgressWorkOrderDto = ProgressWorkOrderInput;

export const CompleteWorkOrderDto = CompleteWorkOrderSchema;
export type CompleteWorkOrderDto = CompleteWorkOrderInput;

export const CancelWorkOrderDto = CancelWorkOrderSchema;
export type CancelWorkOrderDto = CancelWorkOrderInput;

export const ListWorkOrdersDto = ListWorkOrdersSchema;
export type ListWorkOrdersDto = ListWorkOrdersInput;
