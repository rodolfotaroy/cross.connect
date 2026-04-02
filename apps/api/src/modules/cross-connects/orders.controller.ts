import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  ApproveOrderDto,
  CancelOrderDto,
  ConfirmFeasibilityDto,
  CreateOrderDto,
  ListOrdersDto,
  RejectOrderDto,
} from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly svc: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders visible to the caller (paginated, filterable)' })
  list(
    @Query(new ZodValidationPipe(ListOrdersDto)) query: ListOrdersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.listOrders(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail with endpoints and service link' })
  getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.getOrder(id, user);
  }

  @Post()
  @Roles('customer_admin', 'customer_orderer')
  @ApiOperation({ summary: 'Create a new cross-connect order (state: draft)' })
  create(
    @Body(new ZodValidationPipe(CreateOrderDto)) dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.createOrder(dto, user);
  }

  @Patch(':id/submit')
  @Roles('customer_admin', 'customer_orderer')
  @ApiOperation({ summary: 'Submit order for ops intake (draft -> submitted)' })
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.submitOrder(id, user);
  }

  @Patch(':id/review')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Ops team picks up submitted order (submitted -> under_review)' })
  review(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.reviewOrder(id, user);
  }

  @Patch(':id/feasibility')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({
    summary:
      'Confirm technical feasibility and advance to approval (under_review -> pending_approval)',
  })
  confirmFeasibility(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ConfirmFeasibilityDto)) dto: ConfirmFeasibilityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.confirmFeasibility(id, dto, user);
  }

  @Patch(':id/approve')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({
    summary: 'Approve order and create CrossConnectService record (pending_approval -> approved)',
  })
  approve(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ApproveOrderDto)) dto: ApproveOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.approveOrder(id, dto, user);
  }

  @Patch(':id/reject')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Reject order with mandatory reason (pending_approval -> rejected)' })
  reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(RejectOrderDto)) dto: RejectOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.rejectOrder(id, dto, user);
  }

  @Patch(':id/cancel')
  @Roles('customer_admin', 'customer_orderer', 'super_admin', 'ops_manager')
  @ApiOperation({
    summary: 'Cancel an order (draft | submitted | under_review | pending_approval -> cancelled)',
  })
  cancel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CancelOrderDto)) dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.cancelOrder(id, dto, user);
  }
}
