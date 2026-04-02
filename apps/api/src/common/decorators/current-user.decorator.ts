import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@xc/types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  orgId: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
