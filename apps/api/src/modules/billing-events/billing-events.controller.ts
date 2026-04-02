import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { BillingEventsService } from './billing-events.service';
import { MarkExportedDto } from './dto/billing-events.dto';

@ApiTags('billing-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'ops_manager')
@Controller('billing-events')
export class BillingEventsController {
  constructor(private readonly svc: BillingEventsService) {}

  @Get('pending')
  @ApiOperation({ summary: 'List billing events not yet exported (for billing system polling)' })
  listPending() {
    return this.svc.listPending();
  }

  @Get('services/:serviceId')
  listForService(@Param('serviceId') serviceId: string) {
    return this.svc.listForService(serviceId);
  }

  @Post('mark-exported')
  @ApiOperation({ summary: 'Mark billing events as exported (called by billing system)' })
  markExported(@Body(new ZodValidationPipe(MarkExportedDto)) body: { ids: string[] }) {
    return this.svc.markExported(body.ids);
  }
}
