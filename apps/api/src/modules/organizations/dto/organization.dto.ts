import {
  CreateOrganizationSchema,
  CreateUserSchema,
  ListOrganizationsSchema,
  UpdateOrganizationSchema,
  UpdateUserRoleSchema,
  type CreateOrganizationInput,
  type CreateUserInput,
  type ListOrganizationsInput,
  type UpdateOrganizationInput,
  type UpdateUserRoleInput,
} from '@xc/types';

export const CreateOrganizationDto = CreateOrganizationSchema;
export type CreateOrganizationDto = CreateOrganizationInput;

export const UpdateOrganizationDto = UpdateOrganizationSchema;
export type UpdateOrganizationDto = UpdateOrganizationInput;

export const ListOrganizationsDto = ListOrganizationsSchema;
export type ListOrganizationsDto = ListOrganizationsInput;

export const CreateUserDto = CreateUserSchema;
export type CreateUserDto = CreateUserInput;

export const UpdateUserRoleDto = UpdateUserRoleSchema;
export type UpdateUserRoleDto = UpdateUserRoleInput;
