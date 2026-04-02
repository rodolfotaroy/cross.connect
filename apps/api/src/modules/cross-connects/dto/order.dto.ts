import {
    ApproveOrderSchema,
    CancelOrderSchema,
    ConfirmFeasibilitySchema,
    CreateOrderSchema,
    ListOrdersSchema,
    RejectOrderSchema,
    type ApproveOrderInput,
    type CancelOrderInput,
    type ConfirmFeasibilityInput,
    type CreateOrderInput,
    type ListOrdersInput,
    type RejectOrderInput,
} from '@xc/types';

export const CreateOrderDto = CreateOrderSchema;
export type CreateOrderDto = CreateOrderInput;

export const ListOrdersDto = ListOrdersSchema;
export type ListOrdersDto = ListOrdersInput;

export const RejectOrderDto = RejectOrderSchema;
export type RejectOrderDto = RejectOrderInput;

export const CancelOrderDto = CancelOrderSchema;
export type CancelOrderDto = CancelOrderInput;

export const ConfirmFeasibilityDto = ConfirmFeasibilitySchema;
export type ConfirmFeasibilityDto = ConfirmFeasibilityInput;

export const ApproveOrderDto = ApproveOrderSchema;
export type ApproveOrderDto = ApproveOrderInput;
