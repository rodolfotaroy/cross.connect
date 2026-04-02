import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './app-config.module';
import { AppConfig } from './app.config';
import { UserThrottlerGuard } from './common/guards/throttler.guard';

// Infrastructure
import { PrismaModule } from './infrastructure/database/prisma.module';
import { JobsModule } from './infrastructure/jobs/jobs.module';
import { StorageModule } from './infrastructure/storage/storage.module';

// Domain modules
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingEventsModule } from './modules/billing-events/billing-events.module';
import { CrossConnectsModule } from './modules/cross-connects/cross-connects.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LocationsModule } from './modules/locations/locations.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { TopologyModule } from './modules/topology/topology.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    AppConfigModule,

    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => [
        { ttl: config.throttleTtl * 1000, limit: config.throttleLimit },
      ],
    }),

    // Infrastructure
    PrismaModule,
    StorageModule,
    JobsModule,

    // Domain
    AuthModule,
    OrganizationsModule,
    LocationsModule,
    InventoryModule,
    TopologyModule,
    CrossConnectsModule,
    ReservationsModule,
    ApprovalsModule,
    WorkOrdersModule,
    DocumentsModule,
    BillingEventsModule,
    AuditModule,
  ],
  providers: [
    // Apply per-user throttler globally (respects @SkipThrottle / @Throttle overrides)
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
})
export class AppModule {}
