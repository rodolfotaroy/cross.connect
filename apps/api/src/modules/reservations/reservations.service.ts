import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';

// Reservation service owns the canonical port-reservation contract.
// Topology module delegates port reservation to this service.
@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getReservationsForService(serviceId: string) {
    // Return all ports currently reserved or in_use for a service's cable paths
    const paths = await this.prisma.cablePath.findMany({
      where: { serviceId, state: { not: 'decommissioned' } },
      include: {
        segments: {
          include: {
            fromPort: { include: { panel: true } },
            toPort: { include: { panel: true } },
          },
        },
      },
    });

    return paths.flatMap((path) =>
      path.segments.flatMap((seg) => [
        { port: seg.fromPort, pathRole: path.pathRole, segmentSeq: seg.sequence, side: 'from' },
        { port: seg.toPort, pathRole: path.pathRole, segmentSeq: seg.sequence, side: 'to' },
      ]),
    );
  }
}
