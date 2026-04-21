// ══════════════════════════════════════════════════════════════════════════════
// SERVICE EXPIRY JOB
//
// Purpose:
//   Poll for temporary cross-connect services whose expiresAt has passed and
//   mark them as expired (active → expired).
//
// Schedule:
//   Runs every 5 minutes via a cron schedule in pg-boss.
//   The job is idempotent — services already in a terminal state are silently
//   skipped.
//
// Error handling:
//   Failures on individual services are logged and do NOT block processing
//   of remaining services in the same batch.
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { JobsService } from '../../infrastructure/jobs/jobs.service';
import { ServicesService } from './services.service';

export const SERVICE_EXPIRY_JOB = 'service-expiry-check';

@Injectable()
export class ServiceExpiryJob implements OnModuleInit {
  private readonly logger = new Logger(ServiceExpiryJob.name);

  constructor(
    private readonly jobs: JobsService,
    private readonly prisma: PrismaService,
    private readonly services: ServicesService,
  ) {}

  async onModuleInit() {
    // Register a cron-scheduled job that runs every 5 minutes.
    // pg-boss deduplicates schedule registrations, so re-running onModuleInit
    // after a restart is safe.
    await this.jobs.schedule(SERVICE_EXPIRY_JOB, '*/5 * * * *', {});
    await this.jobs.work<object>(SERVICE_EXPIRY_JOB, () => this.run());
    this.logger.log('Service expiry job registered (cron: */5 * * * *)');
  }

  private async run(): Promise<void> {
    const now = new Date();

    // Find all active temporary services whose expiry date has passed.
    const expired = await this.prisma.crossConnectService.findMany({
      where: {
        state: 'active',
        isTemporary: true,
        expiresAt: { lte: now },
      },
      select: { id: true, serviceNumber: true },
    });

    if (expired.length === 0) return;

    this.logger.log(`Found ${expired.length} service(s) to expire`);

    for (const svc of expired) {
      try {
        await this.services.expire(svc.id);
        this.logger.log(`Expired service ${svc.serviceNumber} (${svc.id})`);
      } catch (err) {
        this.logger.error(`Failed to expire service ${svc.serviceNumber} (${svc.id})`, err);
      }
    }
  }
}
