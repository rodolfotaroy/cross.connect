import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
    BulkCreatePortsDto,
    CreateBuildingDto,
    CreateCageDto,
    CreateDemarcPointDto,
    CreatePanelInRackDto,
    CreatePanelInRoomDto,
    CreatePortDto,
    CreateRackDto,
    CreateRoomDto,
    CreateSiteDto,
    UpdateBuildingDto,
    UpdateCageDto,
    UpdatePanelDto,
    UpdateRackDto,
    UpdateRoomDto,
    UpdateSiteDto,
} from './dto/location.dto';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('locations')
@SkipThrottle()
export class LocationsController {
  constructor(private readonly svc: LocationsService) {}

  // -- Sites -----------------------------------------------------------------

  @Get('sites')
  @ApiOperation({ summary: 'List all sites' })
  listSites() { return this.svc.listSites(); }

  @Get('sites/:siteId')
  @ApiOperation({ summary: 'Get site detail' })
  getSite(@Param('siteId') siteId: string) { return this.svc.getSite(siteId); }

  @Post('sites')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Create a new site' })
  createSite(
    @Body(new ZodValidationPipe(CreateSiteDto)) dto: CreateSiteDto,
  ) { return this.svc.createSite(dto); }

  @Patch('sites/:siteId')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Update site metadata' })
  updateSite(
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(UpdateSiteDto)) dto: UpdateSiteDto,
  ) { return this.svc.updateSite(siteId, dto); }

  @Delete('sites/:siteId')
  @Roles('super_admin', 'ops_manager')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deactivate a site (soft-delete; requires all buildings deactivated first)' })
  deactivateSite(@Param('siteId') siteId: string) {
    return this.svc.deactivateSite(siteId);
  }

  // -- Buildings -------------------------------------------------------------

  @Get('sites/:siteId/buildings')
  @ApiOperation({ summary: 'List buildings within a site' })
  listBuildings(@Param('siteId') siteId: string) {
    return this.svc.listBuildings(siteId);
  }

  @Post('sites/:siteId/buildings')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Add a building to a site' })
  createBuilding(
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(CreateBuildingDto)) dto: CreateBuildingDto,
  ) { return this.svc.createBuilding(siteId, dto); }

  @Patch('buildings/:buildingId')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Update building metadata' })
  updateBuilding(
    @Param('buildingId') buildingId: string,
    @Body(new ZodValidationPipe(UpdateBuildingDto)) dto: UpdateBuildingDto,
  ) { return this.svc.updateBuilding(buildingId, dto); }

  @Delete('buildings/:buildingId')
  @Roles('super_admin', 'ops_manager')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deactivate a building (soft-delete; requires all rooms deactivated first)' })
  deactivateBuilding(@Param('buildingId') buildingId: string) {
    return this.svc.deactivateBuilding(buildingId);
  }

  // -- Rooms -----------------------------------------------------------------

  @Get('buildings/:buildingId/rooms')
  @ApiOperation({ summary: 'List rooms in a building' })
  listRooms(@Param('buildingId') buildingId: string) {
    return this.svc.listRooms(buildingId);
  }

  @Get('rooms/:roomId')
  @ApiOperation({ summary: 'Get room detail (includes panels and demarc points)' })
  getRoom(@Param('roomId') roomId: string) { return this.svc.getRoom(roomId); }

  @Post('buildings/:buildingId/rooms')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Create a room (MMR, telco closet, standard, etc.)' })
  createRoom(
    @Param('buildingId') buildingId: string,
    @Body(new ZodValidationPipe(CreateRoomDto)) dto: CreateRoomDto,
  ) { return this.svc.createRoom(buildingId, dto); }

  @Patch('rooms/:roomId')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Update room metadata' })
  updateRoom(
    @Param('roomId') roomId: string,
    @Body(new ZodValidationPipe(UpdateRoomDto)) dto: UpdateRoomDto,
  ) { return this.svc.updateRoom(roomId, dto); }

  @Delete('rooms/:roomId')
  @Roles('super_admin', 'ops_manager')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deactivate a room (soft-delete; requires no active cages or panels)' })
  deactivateRoom(@Param('roomId') roomId: string) {
    return this.svc.deactivateRoom(roomId);
  }

  @Get('rooms/:roomId/topology')
  @ApiOperation({ summary: 'Full panel + port + demarc topology tree for a room (MMR view)' })
  getRoomTopology(@Param('roomId') roomId: string) {
    return this.svc.getRoomTopology(roomId);
  }

  // -- Cages -----------------------------------------------------------------

  @Get('rooms/:roomId/cages')
  @ApiOperation({ summary: 'List cages in a room' })
  listCages(@Param('roomId') roomId: string) { return this.svc.listCages(roomId); }

  @Post('rooms/:roomId/cages')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Create a cage in a room' })
  createCage(
    @Param('roomId') roomId: string,
    @Body(new ZodValidationPipe(CreateCageDto)) dto: CreateCageDto,
  ) { return this.svc.createCage(roomId, dto); }

  @Patch('cages/:cageId')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Update cage metadata' })
  updateCage(
    @Param('cageId') cageId: string,
    @Body(new ZodValidationPipe(UpdateCageDto)) dto: UpdateCageDto,
  ) { return this.svc.updateCage(cageId, dto); }

  @Delete('cages/:cageId')
  @Roles('super_admin', 'ops_manager')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deactivate a cage (soft-delete; requires all racks deactivated first)' })
  deactivateCage(@Param('cageId') cageId: string) {
    return this.svc.deactivateCage(cageId);
  }

  // -- Racks -----------------------------------------------------------------

  @Get('cages/:cageId/racks')
  @ApiOperation({ summary: 'List racks in a cage' })
  listRacks(@Param('cageId') cageId: string) { return this.svc.listRacks(cageId); }

  @Post('cages/:cageId/racks')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Create a rack in a cage' })
  createRack(
    @Param('cageId') cageId: string,
    @Body(new ZodValidationPipe(CreateRackDto)) dto: CreateRackDto,
  ) { return this.svc.createRack(cageId, dto); }

  @Get('rooms/:roomId/racks')
  @ApiOperation({ summary: 'List standalone racks in a room (not inside a cage)' })
  listRoomRacks(@Param('roomId') roomId: string) { return this.svc.listRoomRacks(roomId); }

  @Post('rooms/:roomId/racks')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Create a standalone rack in a room (not inside a cage)' })
  createRoomRack(
    @Param('roomId') roomId: string,
    @Body(new ZodValidationPipe(CreateRackDto)) dto: CreateRackDto,
  ) { return this.svc.createRoomRack(roomId, dto); }

  @Patch('racks/:rackId')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Update rack metadata' })
  updateRack(
    @Param('rackId') rackId: string,
    @Body(new ZodValidationPipe(UpdateRackDto)) dto: UpdateRackDto,
  ) { return this.svc.updateRack(rackId, dto); }

  @Delete('racks/:rackId')
  @Roles('super_admin', 'ops_manager')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deactivate a rack (soft-delete; requires all panels deactivated first)' })
  deactivateRack(@Param('rackId') rackId: string) {
    return this.svc.deactivateRack(rackId);
  }

  // -- Panels ----------------------------------------------------------------

  @Get('panels/:id')
  @ApiOperation({ summary: 'Get panel detail with port summary' })
  getPanel(@Param('id') id: string) { return this.svc.getPanel(id); }

  @Patch('panels/:id')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Update panel metadata (name, type, u-position, notes)' })
  updatePanel(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePanelDto)) dto: UpdatePanelDto,
  ) { return this.svc.updatePanel(id, dto); }

  @Delete('panels/:id')
  @Roles('super_admin', 'ops_manager')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deactivate a panel (soft-delete; blocked if ports are in-use or reserved)' })
  deactivatePanel(@Param('id') id: string) {
    return this.svc.deactivatePanel(id);
  }

  @Get('racks/:rackId/panels')
  @ApiOperation({ summary: 'List all panels mounted in a rack' })
  listRackPanels(@Param('rackId') rackId: string) { return this.svc.listRackPanels(rackId); }

  @Get('rooms/:roomId/panels')
  @ApiOperation({ summary: 'List all panels directly in a room (non-rack)' })
  listRoomPanels(@Param('roomId') roomId: string) { return this.svc.listRoomPanels(roomId); }

  @Post('racks/:rackId/panels')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Create a panel mounted in a rack (patch panel, ODF, etc.)' })
  createPanelInRack(
    @Param('rackId') rackId: string,
    @Body(new ZodValidationPipe(CreatePanelInRackDto)) dto: CreatePanelInRackDto,
  ) { return this.svc.createPanelInRack(rackId, dto); }

  @Post('rooms/:roomId/panels')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Create a wall/floor-mount panel directly in a room (MMR ODF frames, demarc boards)' })
  createPanelInRoom(
    @Param('roomId') roomId: string,
    @Body(new ZodValidationPipe(CreatePanelInRoomDto)) dto: CreatePanelInRoomDto,
  ) { return this.svc.createPanelInRoom(roomId, dto); }

  // -- Ports -----------------------------------------------------------------

  @Get('panels/:panelId/ports')
  @ApiOperation({ summary: 'List all ports on a panel with their state' })
  listPorts(@Param('panelId') panelId: string) { return this.svc.listPorts(panelId); }

  @Post('panels/:panelId/ports')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Create a single port on a panel' })
  createPort(
    @Param('panelId') panelId: string,
    @Body(new ZodValidationPipe(CreatePortDto)) dto: CreatePortDto,
  ) { return this.svc.createPort(panelId, dto); }

  @Post('panels/:panelId/ports/bulk')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Bulk-create sequential ports on a panel (e.g. ports 1-48 of a new 48-port ODF)' })
  bulkCreatePorts(
    @Param('panelId') panelId: string,
    @Body(new ZodValidationPipe(BulkCreatePortsDto)) dto: BulkCreatePortsDto,
  ) { return this.svc.bulkCreatePorts(panelId, dto); }

  // -- DemarcPoints ----------------------------------------------------------

  @Get('sites/:siteId/demarc-points')
  @ApiOperation({ summary: 'List all demarc points registered at a site' })
  listDemarcPoints(@Param('siteId') siteId: string) {
    return this.svc.listDemarcPoints(siteId);
  }

  @Post('rooms/:roomId/demarc-points')
  @Roles('super_admin', 'ops_manager')
  @ApiOperation({ summary: 'Register a demarc point in a room (carrier handoff, cloud ONR, etc.)' })
  createDemarcPoint(
    @Param('roomId') roomId: string,
    @Body(new ZodValidationPipe(CreateDemarcPointDto)) dto: CreateDemarcPointDto,
  ) { return this.svc.createDemarcPoint(roomId, dto); }
}
