import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateCablePathDto, MarkInstalledDto } from './dto/cable-path.dto';
import { TopologyService } from './topology.service';

@ApiTags('topology')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services/:serviceId/cable-paths')
export class TopologyController {
  constructor(private readonly svc: TopologyService) {}

  @Get()
  @ApiOperation({ summary: 'List cable paths for a service' })
  list(@Param('serviceId') serviceId: string) {
    return this.svc.listPathsForService(serviceId);
  }

  @Post()
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Plan a new cable path — reserves ports atomically' })
  create(
    @Param('serviceId') serviceId: string,
    @Body(new ZodValidationPipe(CreateCablePathDto)) dto: CreateCablePathDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.createCablePath(serviceId, dto, user.id);
  }

  @Get(':pathId')
  @ApiOperation({ summary: 'Get cable path with all segments and port details' })
  getOne(@Param('pathId') pathId: string) {
    return this.svc.getCablePath(pathId);
  }

  @Patch(':pathId/installed')
  @Roles('super_admin', 'ops_manager', 'ops_technician')
  @ApiOperation({ summary: 'Mark cable path as physically installed (planned -> installed)' })
  markInstalled(
    @Param('pathId') pathId: string,
    @Body(new ZodValidationPipe(MarkInstalledDto)) dto: MarkInstalledDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.markInstalled(pathId, dto, user.id, user.role);
  }

  @Patch(':pathId/activate')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Activate cable path — ports go in_use, service goes active' })
  activate(@Param('pathId') pathId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.activatePath(pathId, user.id, user.role);
  }

  @Patch(':pathId/rerouting')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Initiate reroute — mark active path as rerouting (new planned path must exist first)' })
  initiateReroute(@Param('pathId') pathId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.initiateReroute(pathId, user.id, user.role);
  }

  @Patch(':pathId/decommission')
  @Roles('super_admin', 'ops_manager')
  @HttpCode(204)
  @ApiOperation({ summary: 'Decommission cable path — releases all port reservations' })
  decommission(@Param('pathId') pathId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.decommissionPath(pathId, user.id, user.role);
  }
}
