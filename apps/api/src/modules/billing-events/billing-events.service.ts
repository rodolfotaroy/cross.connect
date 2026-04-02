import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class BillingEventsService {
  constructor(private readonly prisma: PrismaService) {}

  // Returns events not yet exported to the billing system.
  // Billing system polls this endpoint and then calls markExported.
  async listPending() {
    return this.prisma.billingTriggerEvent.findMany({
      where: { exportedAt: null },
      include: { service: { select: { id: true, serviceNumber: true } } },
      orderBy: { occurredAt: 'asc' },
    });
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
