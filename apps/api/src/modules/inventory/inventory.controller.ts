import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PortState } from '@xc/types';
import { ListAvailablePortsSchema } from '@xc/types';
import { z } from 'zod';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SetPortStateDto } from './dto/port.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  // -- Panel-level queries ---------------------------------------------------

  @Get('panels/:panelId/availability')
  @ApiOperation({ summary: 'Port availability summary for a panel (counts by state)' })
  getAvailability(@Param('panelId') panelId: string) {
    return this.svc.getPortAvailability(panelId);
  }

  @Get('panels/:panelId/ports')
  @ApiOperation({ summary: 'List all ports on a panel with full state detail' })
  listPorts(
    @Param('panelId') panelId: string,
    @Query(new ZodValidationPipe(ListAvailablePortsSchema))
    query: z.infer<typeof ListAvailablePortsSchema>,
  ) {
    return this.svc.listPanelPorts(panelId, query);
  }

  @Get('panels/:panelId/ports/available')
  @ApiOperation({ summary: 'List only available ports on a panel (filtered)' })
  listAvailablePorts(
    @Param('panelId') panelId: string,
    @Query(new ZodValidationPipe(ListAvailablePortsSchema))
    query: z.infer<typeof ListAvailablePortsSchema>,
  ) {
    return this.svc.listAvailablePorts(panelId, query);
  }

  // -- Rack-level queries ----------------------------------------------------

  @Get('racks/:rackId/panels')
  @ApiOperation({ summary: 'List panels installed in a rack with availability summary' })
  listRackPanels(@Param('rackId') rackId: string) {
    return this.svc.listRackPanels(rackId);
  }

  // -- Room-level queries ----------------------------------------------------

  @Get('rooms/:roomId/panels')
  @ApiOperation({
    summary: 'List direct-mount panels in a room (MMR ODF frames, carrier demarc boards)',
  })
  listRoomPanels(@Param('roomId') roomId: string) {
    return this.svc.listRoomPanels(roomId);
  }

  @Get('rooms/:roomId/panels/all')
  @ApiOperation({
    summary: 'List all panels in a room — direct-mount, standalone-rack, and cage-rack panels',
  })
  listAllRoomPanels(@Param('roomId') roomId: string) {
    return this.svc.listAllPanelsInRoom(roomId);
  }

  // -- Site-level queries ----------------------------------------------------

  @Get('sites/:siteId/availability')
  @ApiOperation({
    summary: 'Available port summary aggregated by site — useful for capacity planning',
  })
  getSiteAvailability(@Param('siteId') siteId: string) {
    return this.svc.getSitePortAvailability(siteId);
  }

  // -- Port state management -------------------------------------------------

  @Patch('ports/:portId/state')
  @Roles('super_admin', 'ops_manager', 'ops_technician')
  @ApiOperation({
    summary: 'Manually transition a port state (fault/maintenance/decommission actions)',
  })
  setPortState(
    @Param('portId') portId: string,
    @Body(new ZodValidationPipe(SetPortStateDto)) body: { state: PortState; reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.transitionPortState(portId, body.state, user.id, user.role, body.reason);
  }
}
