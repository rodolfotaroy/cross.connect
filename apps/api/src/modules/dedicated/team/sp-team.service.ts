import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateSpUserInput, UpdateSpUserInput } from '@xc/types/api';
import * as bcrypt from 'bcryptjs';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

// sp_admin may only assign these roles to users within their org
const SP_ASSIGNABLE_ROLES = new Set(['sp_admin', 'sp_ops', 'sp_viewer', 'sp_report']);

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  orgId: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  organization: { select: { id: true, name: true } },
} as const;

@Injectable()
export class SpTeamService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(user: AuthenticatedUser) {
    // super_admin has no orgId — show all SP users across all orgs
    const where = user.orgId
      ? { orgId: user.orgId }
      : { orgId: { not: null as any }, role: { in: ['sp_admin', 'sp_ops', 'sp_viewer', 'sp_report'] as any } };
    return this.prisma.user.findMany({
      where,
      select: USER_SELECT,
      orderBy: { lastName: 'asc' },
    });
  }

  async getUser(userId: string, actor: AuthenticatedUser) {
    const where = actor.orgId ? { id: userId, orgId: actor.orgId } : { id: userId };
    const found = await this.prisma.user.findFirst({
      where,
      select: USER_SELECT,
    });
    if (!found) throw new NotFoundException('User not found');
    return found;
  }

  async createUser(dto: CreateSpUserInput, actor: AuthenticatedUser) {
    if (!SP_ASSIGNABLE_ROLES.has(dto.role)) {
      throw new ForbiddenException(`Cannot assign role '${dto.role}'`);
    }
    // super_admin must supply an orgId in the DTO (cast via any since schema doesn't include it yet)
    const orgId = actor.orgId ?? (dto as any).orgId;
    if (!orgId) {
      throw new ForbiddenException('An orgId is required when creating SP users as super_admin');
    }
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role as any,
        orgId,
      },
      select: USER_SELECT,
    });
  }

  async updateUser(userId: string, dto: UpdateSpUserInput, actor: AuthenticatedUser) {
    // sp_admin cannot change their own role
    if (dto.role && userId === actor.id) {
      throw new ForbiddenException('Cannot change your own role');
    }
    const target = await this.getUser(userId, actor);

    if (dto.role && !SP_ASSIGNABLE_ROLES.has(dto.role)) {
      throw new ForbiddenException(`Cannot assign role '${dto.role}'`);
    }

    return this.prisma.user.update({
      where: { id: target.id },
      data: {
        ...(dto.role ? { role: dto.role as any } : {}),
        ...(dto.firstName ? { firstName: dto.firstName } : {}),
        ...(dto.lastName ? { lastName: dto.lastName } : {}),
      },
      select: USER_SELECT,
    });
  }

  async deactivateUser(userId: string, actor: AuthenticatedUser) {
    if (userId === actor.id) {
      throw new ForbiddenException('Cannot deactivate yourself');
    }
    const target = await this.getUser(userId, actor);
    return this.prisma.user.update({
      where: { id: target.id },
      data: { isActive: false },
      select: USER_SELECT,
    });
  }

  async reactivateUser(userId: string, actor: AuthenticatedUser) {
    const target = await this.getUser(userId, actor);
    return this.prisma.user.update({
      where: { id: target.id },
      data: { isActive: true },
      select: USER_SELECT,
    });
  }
}
