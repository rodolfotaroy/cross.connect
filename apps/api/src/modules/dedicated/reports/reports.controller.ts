import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListReportsSchema } from '@xc/types/api';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ReportsService } from './reports.service';

@ApiTags('sp/reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'sp_admin', 'sp_report')
@Controller('sp/reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Aggregated totals: count by status, total NRC/MRC, by quarter' })
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.getSummary(user.orgId);
  }

  @Get('cross-connects')
  @ApiOperation({ summary: 'Filterable list of all cross connects for report generation' })
  list(
    @Query(new ZodValidationPipe(ListReportsSchema)) query: typeof ListReportsSchema._type,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.listForReport(user.orgId, query);
  }

  @Get('cross-connects/export')
  @ApiOperation({ summary: 'CSV export of filtered cross connects' })
  async export(
    @Query(new ZodValidationPipe(ListReportsSchema)) query: typeof ListReportsSchema._type,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const csv = await this.svc.exportCsv(user.orgId, query);
    const filename = `cross-connects-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
