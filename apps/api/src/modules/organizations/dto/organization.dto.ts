import {
  CreateOrganizationSchema,
  CreateUserSchema,
  ListOrganizationsSchema,
  UpdateOrganizationSchema,
  UpdateUserRoleSchema,
  UpdateUserSchema,
  type CreateOrganizationInput,
  type CreateUserInput,
  type ListOrganizationsInput,
  type UpdateOrganizationInput,
  type UpdateUserRoleInput,
  type UpdateUserInput,
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

export const UpdateUserDto = UpdateUserSchema;
export type UpdateUserDto = UpdateUserInput;
