import {
    BulkCreatePortsSchema,
    CreateBuildingSchema,
    CreateCageSchema,
    CreateDemarcPointSchema,
    CreatePanelInRackSchema,
    CreatePanelInRoomSchema,
    CreatePortSchema,
    CreateRackSchema,
    CreateRoomSchema,
    CreateSiteSchema,
    UpdateBuildingSchema,
    UpdateCageSchema,
    UpdatePanelSchema,
    UpdateRackSchema,
    UpdateRoomSchema,
    UpdateSiteSchema,
    type BulkCreatePortsInput,
    type CreateBuildingInput,
    type CreateCageInput,
    type CreateDemarcPointInput,
    type CreatePanelInRackInput,
    type CreatePanelInRoomInput,
    type CreatePortInput,
    type CreateRackInput,
    type CreateRoomInput,
    type CreateSiteInput,
    type UpdateBuildingInput,
    type UpdateCageInput,
    type UpdatePanelInput,
    type UpdateRackInput,
    type UpdateRoomInput,
    type UpdateSiteInput,
} from '@xc/types';

export const CreateSiteDto = CreateSiteSchema;
export type CreateSiteDto = CreateSiteInput;

export const UpdateSiteDto = UpdateSiteSchema;
export type UpdateSiteDto = UpdateSiteInput;

export const UpdateBuildingDto = UpdateBuildingSchema;
export type UpdateBuildingDto = UpdateBuildingInput;

export const UpdateRoomDto = UpdateRoomSchema;
export type UpdateRoomDto = UpdateRoomInput;

export const UpdateCageDto = UpdateCageSchema;
export type UpdateCageDto = UpdateCageInput;

export const UpdateRackDto = UpdateRackSchema;
export type UpdateRackDto = UpdateRackInput;

export const UpdatePanelDto = UpdatePanelSchema;
export type UpdatePanelDto = UpdatePanelInput;

export const CreateBuildingDto = CreateBuildingSchema;
export type CreateBuildingDto = CreateBuildingInput;

export const CreateRoomDto = CreateRoomSchema;
export type CreateRoomDto = CreateRoomInput;

export const CreateCageDto = CreateCageSchema;
export type CreateCageDto = CreateCageInput;

export const CreateRackDto = CreateRackSchema;
export type CreateRackDto = CreateRackInput;

export const CreatePanelInRackDto = CreatePanelInRackSchema;
export type CreatePanelInRackDto = CreatePanelInRackInput;

export const CreatePanelInRoomDto = CreatePanelInRoomSchema;
export type CreatePanelInRoomDto = CreatePanelInRoomInput;

export const CreatePortDto = CreatePortSchema;
export type CreatePortDto = CreatePortInput;

export const BulkCreatePortsDto = BulkCreatePortsSchema;
export type BulkCreatePortsDto = BulkCreatePortsInput;

export const CreateDemarcPointDto = CreateDemarcPointSchema;
export type CreateDemarcPointDto = CreateDemarcPointInput;
