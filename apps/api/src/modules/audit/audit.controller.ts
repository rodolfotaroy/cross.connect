import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditService, type ListAuditInput } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'ops_manager')
@Controller('audit')
export class AuditController {
  constructor(private readonly svc: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated audit log with filters (admin/ops)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'actorId', required: false, type: String })
  @ApiQuery({ name: 'orderId', required: false, type: String })
  @ApiQuery({ name: 'serviceId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'ISO 8601 datetime — lower bound for occurredAt' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'ISO 8601 datetime — upper bound for occurredAt' })
  list(@Query() query: ListAuditInput) {
    return this.svc.listPaginated(query);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get audit trail for an order' })
  forOrder(@Param('orderId') orderId: string) {
    return this.svc.listForOrder(orderId);
  }

  @Get(':entityType/:entityId')
  @ApiOperation({ summary: 'Get audit trail for any entity by type and id' })
  forEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.svc.listForEntity(entityType, entityId);
  }
}
