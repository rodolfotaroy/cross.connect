import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DedicatedXcController } from './dedicated-xc/dedicated-xc.controller';
import { DedicatedXcService } from './dedicated-xc/dedicated-xc.service';
import { ReportsController } from './reports/reports.controller';
import { ReportsService } from './reports/reports.service';
import { SupportController } from './support/support.controller';
import { SupportService } from './support/support.service';
import { SpTeamController } from './team/sp-team.controller';
import { SpTeamService } from './team/sp-team.service';

@Module({
  imports: [AuditModule],
  providers: [DedicatedXcService, ReportsService, SupportService, SpTeamService],
  controllers: [DedicatedXcController, ReportsController, SupportController, SpTeamController],
})
export class DedicatedModule {}
