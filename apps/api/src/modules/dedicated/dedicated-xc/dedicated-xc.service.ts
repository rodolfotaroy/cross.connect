import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DedicatedXcStatus } from '@xc/types';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { buildPaginatedMeta } from '../../../common/pagination/paginate';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import type {
  AddDedicatedXcHopDto,
  CreateDedicatedXcDto,
  ListDedicatedXcDto,
  UpdateDedicatedXcDto,
} from './dto/dedicated-xc.dto';

// Valid status transitions (suggestion #12: enforce transition guard)
const VALID_TRANSITIONS: Record<DedicatedXcStatus, DedicatedXcStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['disconnected'],
  disconnected: [],
  cancelled: [],
};

// Roles that can access dedicated XC features
const SP_ROLES = new Set(['sp_admin', 'sp_ops', 'sp_viewer', 'sp_report']);

@Injectable()
export class DedicatedXcService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Generate next sequential XC ID for this organisation, e.g. ORG-XC-0001 */
  private async generateCrossConnectId(orgCode: string): Promise<string> {
    const count = await this.prisma.dedicatedCrossConnect.count({
      where: { organizationId: { not: undefined }, organization: { code: orgCode } },
    });
    return `${orgCode}-XC-${String(count + 1).padStart(4, '0')}`;
  }

  /** Auto-derive year and quarter from dateCompleted when not manually provided */
  private deriveYearQuarter(
    dateStr: string | null | undefined,
    yearOverride?: number | null,
    quarterOverride?: number | null,
  ): { year: number | null; quarter: number | null } {
    if (!dateStr) return { year: yearOverride ?? null, quarter: quarterOverride ?? null };
    const d = new Date(dateStr);
    const year = yearOverride ?? d.getFullYear();
    const quarter = quarterOverride ?? Math.ceil((d.getMonth() + 1) / 3);
    return { year, quarter };
  }

  async list(user: AuthenticatedUser, query: ListDedicatedXcDto) {
    const { page, limit, sortBy, sortDir, status, q, year, quarter } = query;
    const where: Record<string, unknown> = {
      organizationId: user.orgId,
      deletedAt: null,
    };
    if (status) where['status'] = status;
    if (year) where['year'] = year;
    if (quarter) where['quarter'] = quarter;
    if (q) {
      where['OR'] = [
        { crossConnectId: { contains: q, mode: 'insensitive' } },
        { circuitId: { contains: q, mode: 'insensitive' } },
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { orderingCompany: { contains: q, mode: 'insensitive' } },
      ];
    }
    const orderBy = { [sortBy ?? 'createdAt']: sortDir ?? 'desc' };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.dedicatedCrossConnect.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          hops: { orderBy: { hopNumber: 'asc' } },
          site: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.dedicatedCrossConnect.count({ where }),
    ]);
    return { data, meta: buildPaginatedMeta(total, page, limit) };
  }

  async getOne(id: string, user: AuthenticatedUser) {
    const record = await this.prisma.dedicatedCrossConnect.findFirst({
      where: { id, organizationId: user.orgId, deletedAt: null },
      include: {
        hops: { orderBy: { hopNumber: 'asc' } },
        site: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!record) throw new NotFoundException('Cross connect not found');
    return record;
  }

  async create(dto: CreateDedicatedXcDto, user: AuthenticatedUser) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: user.orgId },
      select: { code: true },
    });
    const crossConnectId = await this.generateCrossConnectId(org.code);
    const { hops, dateCompleted, year, quarter, nrc, mrc, ...rest } = dto;
    const derived = this.deriveYearQuarter(dateCompleted ?? undefined, year, quarter);

    const record = await this.prisma.dedicatedCrossConnect.create({
      data: {
        ...rest,
        crossConnectId,
        organizationId: user.orgId,
        createdById: user.id,
        nrc: nrc ? parseFloat(nrc) : undefined,
        mrc: mrc ? parseFloat(mrc) : undefined,
        dateCompleted: dateCompleted ? new Date(dateCompleted) : undefined,
        billableDate: rest.billableDate ? new Date(rest.billableDate) : undefined,
        disconnectionDate: rest.disconnectionDate ? new Date(rest.disconnectionDate) : undefined,
        requestedDisconnectionDate: rest.requestedDisconnectionDate
          ? new Date(rest.requestedDisconnectionDate)
          : undefined,
        year: derived.year,
        quarter: derived.quarter,
        hops: hops && hops.length > 0 ? { create: hops } : undefined,
      },
      include: { hops: { orderBy: { hopNumber: 'asc' } } },
    });

    await this.audit.log({
      actorId: user.id,
      entityType: 'DedicatedCrossConnect',
      entityId: record.id,
      action: 'dedicated_xc.created',
      diff: { crossConnectId, status: record.status },
    });

    return record;
  }

  async update(id: string, dto: UpdateDedicatedXcDto, user: AuthenticatedUser) {
    const existing = await this.getOne(id, user);

    // sp_ops can only edit their own draft records
    if (user.role === 'sp_ops') {
      if (existing.createdById !== user.id || existing.status !== 'draft') {
        throw new ForbiddenException('sp_ops may only edit their own draft cross connects');
      }
    }

    const { hops, dateCompleted, year, quarter, nrc, mrc, ...rest } = dto;
    const derived = this.deriveYearQuarter(
      dateCompleted ?? existing.dateCompleted?.toISOString(),
      year ?? existing.year,
      quarter ?? existing.quarter,
    );

    // Validate status transition if status is changing
    if (rest.status && rest.status !== existing.status) {
      const allowed = VALID_TRANSITIONS[existing.status as DedicatedXcStatus] ?? [];
      if (!allowed.includes(rest.status as DedicatedXcStatus)) {
        throw new BadRequestException(
          `Cannot transition from '${existing.status}' to '${rest.status}'`,
        );
      }
    }

    const record = await this.prisma.dedicatedCrossConnect.update({
      where: { id },
      data: {
        ...rest,
        nrc: nrc !== undefined ? (nrc ? parseFloat(nrc) : null) : undefined,
        mrc: mrc !== undefined ? (mrc ? parseFloat(mrc) : null) : undefined,
        dateCompleted:
          dateCompleted !== undefined
            ? dateCompleted
              ? new Date(dateCompleted)
              : null
            : undefined,
        billableDate:
          rest.billableDate !== undefined
            ? rest.billableDate
              ? new Date(rest.billableDate)
              : null
            : undefined,
        disconnectionDate:
          rest.disconnectionDate !== undefined
            ? rest.disconnectionDate
              ? new Date(rest.disconnectionDate)
              : null
            : undefined,
        requestedDisconnectionDate:
          rest.requestedDisconnectionDate !== undefined
            ? rest.requestedDisconnectionDate
              ? new Date(rest.requestedDisconnectionDate)
              : null
            : undefined,
        year: derived.year,
        quarter: derived.quarter,
      },
      include: { hops: { orderBy: { hopNumber: 'asc' } } },
    });

    await this.audit.log({
      actorId: user.id,
      entityType: 'DedicatedCrossConnect',
      entityId: record.id,
      action: 'dedicated_xc.updated',
      diff: rest as Record<string, unknown>,
    });

    return record;
  }

  async remove(id: string, user: AuthenticatedUser) {
    const existing = await this.getOne(id, user);

    if (user.role === 'sp_ops') {
      if (existing.createdById !== user.id || existing.status !== 'draft') {
        throw new ForbiddenException('sp_ops may only delete their own draft cross connects');
      }
    }

    // Soft delete (suggestion #13)
    await this.prisma.dedicatedCrossConnect.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      actorId: user.id,
      entityType: 'DedicatedCrossConnect',
      entityId: id,
      action: 'dedicated_xc.deleted',
    });
  }

  async addHop(xcId: string, dto: AddDedicatedXcHopDto, user: AuthenticatedUser) {
    const existing = await this.getOne(xcId, user);

    if (
      user.role === 'sp_ops' &&
      (existing.createdById !== user.id || existing.status !== 'draft')
    ) {
      throw new ForbiddenException('sp_ops may only modify their own draft cross connects');
    }

    // Determine next hop number
    const maxHop = await this.prisma.dedicatedXcHop.findFirst({
      where: { dedicatedCrossConnectId: xcId },
      orderBy: { hopNumber: 'desc' },
      select: { hopNumber: true },
    });
    const hopNumber = (maxHop?.hopNumber ?? 0) + 1;

    return this.prisma.dedicatedXcHop.create({
      data: { ...dto, dedicatedCrossConnectId: xcId, hopNumber },
    });
  }

  async removeHop(xcId: string, hopId: string, user: AuthenticatedUser) {
    const existing = await this.getOne(xcId, user);

    if (
      user.role === 'sp_ops' &&
      (existing.createdById !== user.id || existing.status !== 'draft')
    ) {
      throw new ForbiddenException('sp_ops may only modify their own draft cross connects');
    }

    const hop = await this.prisma.dedicatedXcHop.findFirst({
      where: { id: hopId, dedicatedCrossConnectId: xcId },
    });
    if (!hop) throw new NotFoundException('Hop not found');

    await this.prisma.dedicatedXcHop.delete({ where: { id: hopId } });

    // Renumber remaining hops to close any gap
    const remaining = await this.prisma.dedicatedXcHop.findMany({
      where: { dedicatedCrossConnectId: xcId },
      orderBy: { hopNumber: 'asc' },
    });
    await Promise.all(
      remaining.map((h, idx) =>
        this.prisma.dedicatedXcHop.update({
          where: { id: h.id },
          data: { hopNumber: idx + 1 },
        }),
      ),
    );
  }
}
