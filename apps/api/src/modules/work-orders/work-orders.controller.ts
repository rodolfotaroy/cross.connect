import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  AssignWorkOrderDto,
  CancelWorkOrderDto,
  CompleteWorkOrderDto,
  CreateWorkOrderDto,
  ListWorkOrdersDto,
  ProgressWorkOrderDto,
} from './dto/work-order.dto';
import { WorkOrdersService } from './work-orders.service';

@ApiTags('work-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly svc: WorkOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List work orders (paginated, filterable)' })
  list(
    @Query(new ZodValidationPipe(ListWorkOrdersDto)) query: ListWorkOrdersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.listWorkOrders(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get work order detail with tasks' })
  getOne(@Param('id') id: string) { return this.svc.getWorkOrder(id); }

  @Post()
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Create a work order for a service (e.g. install, disconnect)' })
  create(
    @Body(new ZodValidationPipe(CreateWorkOrderDto)) dto: CreateWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.createWorkOrder(dto, user.id);
  }

  @Patch(':id/assign')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Assign work order to a technician (open -> assigned)' })
  assign(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AssignWorkOrderDto)) dto: AssignWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.assign(id, dto, user.id);
  }

  @Patch(':id/start')
  @Roles('super_admin', 'ops_manager', 'ops_technician')
  @ApiOperation({ summary: 'Technician starts work (assigned -> in_progress)' })
  start(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.startWork(id, user.id);
  }

  @Patch(':id/pending-test')
  @Roles('super_admin', 'ops_manager', 'ops_technician')
  @ApiOperation({ summary: 'Mark physical work done, awaiting test (in_progress -> pending_test)' })
  pendingTest(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ProgressWorkOrderDto)) dto: ProgressWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.pendingTest(id, dto, user.id);
  }

  @Patch(':id/test-failed')
  @Roles('super_admin', 'ops_manager', 'ops_technician')
  @ApiOperation({ summary: 'Test failed — return to in_progress for remediation (pending_test -> in_progress)' })
  testFailed(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ProgressWorkOrderDto)) dto: ProgressWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.testFailed(id, dto, user.id);
  }

  @Patch(':id/complete')
  @Roles('super_admin', 'ops_manager', 'ops_technician')
  @ApiOperation({ summary: 'Complete work order — triggers service activation for install WOs' })
  complete(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CompleteWorkOrderDto)) dto: CompleteWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.complete(id, dto, user.id);
  }

  @Patch(':id/cancel')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Cancel a work order (open | assigned -> cancelled)' })
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CancelWorkOrderDto)) dto: CancelWorkOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.cancel(id, dto, user.id);
  }
}
