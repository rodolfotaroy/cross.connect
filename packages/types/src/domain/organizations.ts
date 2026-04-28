import type { OrgType, UserRole } from '../enums';

export interface DedicatedConfig {
  freeNrc?: boolean;
  freeMrc?: boolean;
  notificationsEmail?: string;
  [key: string]: unknown;
}

export interface OrganizationDto {
  id: string;
  name: string;
  code: string;
  orgType: OrgType;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  isDedicated: boolean;
  dedicatedConfig: DedicatedConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  orgId: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}
