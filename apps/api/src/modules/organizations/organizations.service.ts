import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { buildPaginatedMeta } from '../../common/pagination/paginate';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type {
  CreateOrganizationDto,
  CreateUserDto,
  ListOrganizationsDto,
  UpdateOrganizationDto,
  UpdateUserRoleDto,
} from './dto/organization.dto';

// Roles that only super_admin may assign. customer_admin cannot promote to any
// operator or super_admin role.
const PRIVILEGED_ROLES = new Set(['super_admin', 'ops_manager', 'ops_technician']);

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListOrganizationsDto) {
    const { page, limit, sortBy, sortDir, orgType, isActive, q } = query;
    const where: Record<string, unknown> = {};
    if (orgType) where['orgType'] = orgType;
    if (isActive !== undefined) where['isActive'] = isActive;
    if (q)
      where['OR'] = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];

    const orderBy = { [sortBy ?? 'name']: sortDir ?? 'asc' };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.organization.count({ where }),
    ]);
    return { data, meta: buildPaginatedMeta(total, page, limit) };
  }

  async findOne(id: string) {
    return this.prisma.organization.findUniqueOrThrow({ where: { id } });
  }

  async create(dto: CreateOrganizationDto) {
    const exists = await this.prisma.organization.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`Organization code '${dto.code}' already in use`);
    return this.prisma.organization.create({ data: dto });
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.prisma.organization.findUniqueOrThrow({ where: { id } });
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async deactivate(id: string) {
    return this.prisma.organization.update({ where: { id }, data: { isActive: false } });
  }

  // -- Users -----------------------------------------------------------------

  async listUsers(orgId: string, actor: AuthenticatedUser) {
    // customer_admin may only list users within their own organisation.
    if (actor.role === 'customer_admin' && orgId !== actor.orgId) {
      throw new ForbiddenException('Access denied');
    }
    return this.prisma.user.findMany({
      where: { orgId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        orgId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { lastName: 'asc' },
    });
  }

  async getUser(userId: string, actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        orgId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    // customer_admin may only inspect users from their own organisation.
    if (actor.role === 'customer_admin' && user.orgId !== actor.orgId) {
      throw new ForbiddenException('Access denied');
    }
    return user;
  }

  async updateUserRole(userId: string, dto: UpdateUserRoleDto, actor: AuthenticatedUser) {
    const target = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Prevent privilege escalation: only super_admin may assign privileged roles.
    if (actor.role !== 'super_admin' && PRIVILEGED_ROLES.has(dto.role)) {
      throw new ForbiddenException('Only super_admin can assign operator or super_admin roles');
    }

    // customer_admin may only update users within their own organisation.
    if (actor.role === 'customer_admin' && target.orgId !== actor.orgId) {
      throw new ForbiddenException('Access denied');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        orgId: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async createUser(orgId: string, dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException(`Email '${dto.email}' already registered`);

    await this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } });

    const { password, ...rest } = dto;
    const passwordHash = await bcrypt.hash(password, 12);

    return this.prisma.user.create({
      data: { ...rest, orgId, passwordHash },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        orgId: true,
        createdAt: true,
      },
    });
  }

  async deactivateUser(userId: string, actor: AuthenticatedUser) {
    const target = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // customer_admin may only deactivate users within their own organisation.
    if (actor.role === 'customer_admin' && target.orgId !== actor.orgId) {
      throw new ForbiddenException('Access denied');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, email: true, isActive: true },
    });
  }

  async reactivateUser(userId: string, actor: AuthenticatedUser) {
    const target = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // customer_admin may only reactivate users within their own organisation.
    if (actor.role === 'customer_admin' && target.orgId !== actor.orgId) {
      throw new ForbiddenException('Access denied');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: { id: true, email: true, isActive: true },
    });
  }
}
