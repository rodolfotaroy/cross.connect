// Approvals is extracted as its own module because the approval workflow
// will grow to support multi-step approvals, approval delegation, and
// SLA timers in Phase 2. For MVP it wraps the order approval logic.

import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CrossConnectsModule } from '../cross-connects/cross-connects.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

@Module({
  imports: [AuditModule, CrossConnectsModule],
  providers: [ApprovalsService],
  controllers: [ApprovalsController],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
