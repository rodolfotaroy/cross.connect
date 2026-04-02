import type { UserRole } from '@xc/types';

// Payload embedded in JWT access tokens.
// Keep minimal — this is in every request header.
export interface JwtPayload {
  sub: string; // User.id
  email: string;
  role: UserRole;
  orgId: string;
  iat?: number;
  exp?: number;
}
