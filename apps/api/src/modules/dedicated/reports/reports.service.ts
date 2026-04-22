import { Injectable } from '@nestjs/common';
import type { ListReportsInput } from '@xc/types/api';
import { buildPaginatedMeta } from '../../../common/pagination/paginate';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(orgId: string) {
    const where = { organizationId: orgId, deletedAt: null } as const;

    const [total, byStatus, financials] = await Promise.all([
      this.prisma.dedicatedCrossConnect.count({ where }),
      this.prisma.dedicatedCrossConnect.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.prisma.dedicatedCrossConnect.aggregate({
        where,
        _sum: { nrc: true, mrc: true },
      }),
      ,
    ]);

    const byQuarter = await this.prisma.dedicatedCrossConnect.groupBy({
      by: ['year', 'quarter'],
      where: { ...where, year: { not: null }, quarter: { not: null } },
      _count: { id: true },
      _sum: { mrc: true, nrc: true },
      orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
    });

    return {
      total,
      totalNrc: financials._sum.nrc ?? 0,
      totalMrc: financials._sum.mrc ?? 0,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byQuarter: byQuarter.map((q) => ({
        year: q.year,
        quarter: q.quarter,
        count: q._count.id,
        totalMrc: q._sum.mrc ?? 0,
        totalNrc: q._sum.nrc ?? 0,
      })),
    };
  }

  async listForReport(orgId: string, query: ListReportsInput) {
    const {
      page,
      limit,
      sortBy,
      sortDir,
      year,
      quarter,
      status,
      dateFrom,
      dateTo,
      orderingCompany,
      customerType,
    } = query;

    const where: Record<string, unknown> = { organizationId: orgId, deletedAt: null };
    if (year) where['year'] = year;
    if (quarter) where['quarter'] = quarter;
    if (status) where['status'] = status;
    if (orderingCompany)
      where['orderingCompany'] = { contains: orderingCompany, mode: 'insensitive' };
    if (customerType) where['customerType'] = { contains: customerType, mode: 'insensitive' };
    if (dateFrom || dateTo) {
      where['dateCompleted'] = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
      };
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

  async exportCsv(orgId: string, query: ListReportsInput): Promise<string> {
    // Fetch all matching records (no pagination for export)
    const { data } = await this.listForReport(orgId, {
      ...query,
      page: 1,
      limit: 10000,
    });

    const headers = [
      'Cross Connect ID',
      'Circuit ID',
      'Ticket Number',
      'Sales Source',
      'NRC',
      'MRC',
      'Service ID',
      'Status',
      'Test Report',
      'Site',
      'Date Completed',
      'Year',
      'Quarter',
      'Billable Date',
      'Disconnection Date',
      'Requested Disconnection Date',
      'Ordering Company',
      'A-End Campus',
      'A-End Building',
      'A-End Floor',
      'A-End Room',
      'A-End Rack',
      'A-End Device',
      'A-End Port',
      'Z-End Campus',
      'Z-End Building',
      'Z-End Floor',
      'Z-End Room',
      'Z-End Rack',
      'Z-End Device',
      'Z-End Port',
      'Customer Type',
      'Cable Type',
      'Notes',
      'Created By',
      'Created At',
    ];

    const escape = (v: unknown) => {
      if (v == null) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = data.map((r: any) =>
      [
        r.crossConnectId,
        r.circuitId,
        r.ticketNumber,
        r.salesSource,
        r.nrc,
        r.mrc,
        r.serviceId,
        r.status,
        r.testReport,
        r.site?.name ?? '',
        r.dateCompleted ? new Date(r.dateCompleted).toISOString().split('T')[0] : '',
        r.year,
        r.quarter,
        r.billableDate ? new Date(r.billableDate).toISOString().split('T')[0] : '',
        r.disconnectionDate ? new Date(r.disconnectionDate).toISOString().split('T')[0] : '',
        r.requestedDisconnectionDate
          ? new Date(r.requestedDisconnectionDate).toISOString().split('T')[0]
          : '',
        r.orderingCompany,
        r.aEndCampus,
        r.aEndBuilding,
        r.aEndFloor,
        r.aEndRoom,
        r.aEndRack,
        r.aEndDevice,
        r.aEndPort,
        r.zEndCampus,
        r.zEndBuilding,
        r.zEndFloor,
        r.zEndRoom,
        r.zEndRack,
        r.zEndDevice,
        r.zEndPort,
        r.customerType,
        r.cableType,
        r.notes,
        r.createdBy ? `${r.createdBy.firstName} ${r.createdBy.lastName}` : '',
        new Date(r.createdAt).toISOString().split('T')[0],
      ]
        .map(escape)
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
