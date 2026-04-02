import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  AbortProvisioningDto,
  DisconnectServiceDto,
  ExtendTemporaryServiceDto,
  ListServicesDto,
  SuspendServiceDto,
} from './dto/service.dto';
import { ServicesService } from './services.service';

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly svc: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List cross-connect services (paginated)' })
  list(
    @Query(new ZodValidationPipe(ListServicesDto)) query: ListServicesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.listServices(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service with cable paths and endpoints' })
  getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.getService(id, user);
  }

  @Patch(':id/disconnect')
  @Roles('super_admin', 'ops_manager', 'customer_admin', 'customer_orderer')
  @ApiOperation({
    summary: 'Request disconnection of an active service (active -> pending_disconnect)',
  })
  disconnect(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(DisconnectServiceDto)) dto: DisconnectServiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.disconnect(id, dto, user);
  }

  @Patch(':id/abort-provisioning')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({
    summary: 'Abort provisioning before field work starts (provisioning -> disconnected)',
  })
  abortProvisioning(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AbortProvisioningDto)) dto: AbortProvisioningDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.abortProvisioning(id, dto, user);
  }

  @Patch(':id/suspend')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Suspend an active service (active -> suspended)' })
  suspend(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SuspendServiceDto)) dto: SuspendServiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.suspend(id, dto, user);
  }

  @Patch(':id/resume')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Resume a suspended service (suspended -> active)' })
  resume(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.resume(id, user);
  }

  @Patch(':id/extend')
  @Roles('super_admin', 'ops_manager', 'customer_admin', 'customer_orderer')
  @ApiOperation({ summary: 'Extend the expiry date of a temporary service' })
  extend(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ExtendTemporaryServiceDto)) dto: ExtendTemporaryServiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.extend(id, dto, user);
  }
}
