import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type { ListPendingDto } from './dto/billing-events.dto';

@Injectable()
export class BillingEventsService {
  constructor(private readonly prisma: PrismaService) {}

  // Returns events not yet exported to the billing system.
  // Keyset pagination: pass the last received event id as `cursor` to get the
  // next page, ensuring consistent results even if new events are written during
  // a multi-page poll cycle.
  async listPending(query: ListPendingDto) {
    const { limit, cursor } = query;

    const where: { exportedAt: null; id?: { gt: string } } = { exportedAt: null };

    // Apply cursor: return events with id > cursor (lexicographic ordering on cuid2
    // is stable when combined with occurredAt ordering below)
    if (cursor) {
      where.id = { gt: cursor };
    }

    const data = await this.prisma.billingTriggerEvent.findMany({
      where,
      include: { service: { select: { id: true, serviceNumber: true } } },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });

    return {
      data,
      nextCursor: data.length === limit ? data[data.length - 1].id : null,
    };
  }

  async listForService(serviceId: string) {
    return this.prisma.billingTriggerEvent.findMany({
      where: { serviceId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  // Called by the billing system after it consumes an event
  async markExported(ids: string[]) {
    const result = await this.prisma.billingTriggerEvent.updateMany({
      where: { id: { in: ids }, exportedAt: null },
      data: { exportedAt: new Date() },
    });
    return { marked: result.count };
  }
}
