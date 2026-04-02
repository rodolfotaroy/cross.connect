import { ConflictException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import type {
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

@Injectable()
export class LocationsService {
  constructor(private readonly prisma: PrismaService) {}

  // -- Sites -----------------------------------------------------------------

  async listSites() {
    return this.prisma.site.findMany({
      where: { isActive: true },
      include: { buildings: { select: { id: true, code: true, name: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async getSite(id: string) {
    return this.prisma.site.findUniqueOrThrow({
      where: { id },
      include: {
        buildings: {
          include: { rooms: { orderBy: { code: 'asc' } } },
          orderBy: { code: 'asc' },
        },
      },
    });
  }

  async createSite(dto: CreateSiteDto) {
    const exists = await this.prisma.site.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException(`Site code '${dto.code}' already in use`);
    return this.prisma.site.create({ data: dto });
  }

  async updateSite(id: string, dto: UpdateSiteDto) {
    await this.prisma.site.findUniqueOrThrow({ where: { id } });
    return this.prisma.site.update({ where: { id }, data: dto });
  }

  async deactivateSite(id: string) {
    const activeBuildings = await this.prisma.building.count({ where: { siteId: id, isActive: true } });
    if (activeBuildings > 0)
      throw new UnprocessableEntityException(
        `Cannot deactivate site: ${activeBuildings} active building(s) must be deactivated first`,
      );
    return this.prisma.site.update({ where: { id }, data: { isActive: false } });
  }

  // -- Buildings -------------------------------------------------------------

  async listBuildings(siteId: string) {
    return this.prisma.building.findMany({
      where: { siteId, isActive: true },
      include: { rooms: { select: { id: true, code: true, name: true, roomType: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async createBuilding(siteId: string, dto: CreateBuildingDto) {
    await this.prisma.site.findUniqueOrThrow({ where: { id: siteId } });
    const exists = await this.prisma.building.findUnique({
      where: { siteId_code: { siteId, code: dto.code } },
    });
    if (exists)
      throw new ConflictException(`Building code '${dto.code}' already exists in this site`);
    return this.prisma.building.create({ data: { ...dto, siteId } });
  }

  async updateBuilding(id: string, dto: UpdateBuildingDto) {
    await this.prisma.building.findUniqueOrThrow({ where: { id } });
    return this.prisma.building.update({ where: { id }, data: dto });
  }

  async deactivateBuilding(id: string) {
    const activeRooms = await this.prisma.room.count({ where: { buildingId: id, isActive: true } });
    if (activeRooms > 0)
      throw new UnprocessableEntityException(
        `Cannot deactivate building: ${activeRooms} active room(s) must be deactivated first`,
      );
    return this.prisma.building.update({ where: { id }, data: { isActive: false } });
  }

  // -- Rooms -----------------------------------------------------------------

  async listRooms(buildingId: string) {
    return this.prisma.room.findMany({
      where: { buildingId, isActive: true },
      include: { panels: { select: { id: true, code: true, name: true, panelType: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async getRoom(id: string) {
    return this.prisma.room.findUniqueOrThrow({
      where: { id },
      include: {
        panels: { include: { ports: { orderBy: { position: 'asc' } } } },
        demarcPoints: {
          include: { organization: { select: { id: true, name: true, code: true } } },
        },
      },
    });
  }

  async createRoom(buildingId: string, dto: CreateRoomDto) {
    await this.prisma.building.findUniqueOrThrow({ where: { id: buildingId } });
    const exists = await this.prisma.room.findUnique({
      where: { buildingId_code: { buildingId, code: dto.code } },
    });
    if (exists)
      throw new ConflictException(`Room code '${dto.code}' already exists in this building`);
    return this.prisma.room.create({ data: { ...dto, buildingId } });
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    await this.prisma.room.findUniqueOrThrow({ where: { id } });
    return this.prisma.room.update({ where: { id }, data: dto });
  }

  async deactivateRoom(id: string) {
    const [cages, panels, standaloneRacks] = await Promise.all([
      this.prisma.cage.count({ where: { roomId: id, isActive: true } }),
      this.prisma.panel.count({ where: { roomId: id, isActive: true } }),
      this.prisma.rack.count({ where: { roomId: id, cageId: null, isActive: true } }),
    ]);
    if (cages > 0 || panels > 0 || standaloneRacks > 0)
      throw new UnprocessableEntityException(
        `Cannot deactivate room: ${cages} cage(s), ${standaloneRacks} standalone rack(s), and ${panels} panel(s) must be deactivated first`,
      );
    return this.prisma.room.update({ where: { id }, data: { isActive: false } });
  }

  async getRoomTopology(roomId: string) {
    return this.prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      include: {
        cages: {
          include: {
            racks: {
              include: {
                panels: { include: { ports: { orderBy: { position: 'asc' } } } },
              },
              orderBy: { code: 'asc' },
            },
          },
          orderBy: { code: 'asc' },
        },
        panels: { include: { ports: { orderBy: { position: 'asc' } } } },
        demarcPoints: {
          include: {
            organization: { select: { id: true, name: true, code: true } },
            panel: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
  }

  // -- Cages -----------------------------------------------------------------

  async listCages(roomId: string) {
    return this.prisma.cage.findMany({
      where: { roomId, isActive: true },
      include: {
        racks: {
          where: { isActive: true },
          orderBy: { code: 'asc' },
          select: {
            id: true, code: true, name: true, uSize: true,
            panels: {
              where: { isActive: true },
              select: { id: true, code: true, name: true },
              orderBy: { code: 'asc' },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createCage(roomId: string, dto: CreateCageDto) {
    await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    return this.prisma.cage.create({ data: { ...dto, roomId } });
  }

  async updateCage(id: string, dto: UpdateCageDto) {
    await this.prisma.cage.findUniqueOrThrow({ where: { id } });
    return this.prisma.cage.update({ where: { id }, data: dto });
  }

  async deactivateCage(id: string) {
    const activeRacks = await this.prisma.rack.count({ where: { cageId: id, isActive: true } });
    if (activeRacks > 0)
      throw new UnprocessableEntityException(
        `Cannot deactivate cage: ${activeRacks} active rack(s) must be deactivated first`,
      );
    return this.prisma.cage.update({ where: { id }, data: { isActive: false } });
  }

  // -- Racks -----------------------------------------------------------------

  async listRacks(cageId: string) {
    return this.prisma.rack.findMany({
      where: { cageId, isActive: true },
      include: {
        panels: { orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createRack(cageId: string, dto: CreateRackDto) {
    await this.prisma.cage.findUniqueOrThrow({ where: { id: cageId } });
    return this.prisma.rack.create({ data: { ...dto, cageId } });
  }

  async listRoomRacks(roomId: string) {
    return this.prisma.rack.findMany({
      where: { roomId, cageId: null, isActive: true },
      include: {
        panels: { orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createRoomRack(roomId: string, dto: CreateRackDto) {
    await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    return this.prisma.rack.create({ data: { ...dto, roomId, cageId: null } });
  }

  async updateRack(id: string, dto: UpdateRackDto) {
    await this.prisma.rack.findUniqueOrThrow({ where: { id } });
    return this.prisma.rack.update({ where: { id }, data: dto });
  }

  async deactivateRack(id: string) {
    const activePanels = await this.prisma.panel.count({ where: { rackId: id, isActive: true } });
    if (activePanels > 0)
      throw new UnprocessableEntityException(
        `Cannot deactivate rack: ${activePanels} active panel(s) must be deactivated first`,
      );
    return this.prisma.rack.update({ where: { id }, data: { isActive: false } });
  }

  async listRackPanels(rackId: string) {
    return this.prisma.panel.findMany({
      where: { rackId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async listRoomPanels(roomId: string) {
    return this.prisma.panel.findMany({
      where: { roomId, isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  // -- Panels ----------------------------------------------------------------

  async getPanel(id: string) {
    return this.prisma.panel.findUniqueOrThrow({
      where: { id },
      include: {
        ports: { orderBy: { position: 'asc' } },
        rack: { select: { id: true, code: true } },
        room: { select: { id: true, code: true } },
      },
    });
  }

  async createPanelInRack(rackId: string, dto: CreatePanelInRackDto) {
    await this.prisma.rack.findUniqueOrThrow({ where: { id: rackId } });
    return this.prisma.panel.create({ data: { ...dto, rackId } });
  }

  async createPanelInRoom(roomId: string, dto: CreatePanelInRoomDto) {
    await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    return this.prisma.panel.create({ data: { ...dto, roomId } });
  }

  async updatePanel(id: string, dto: UpdatePanelDto) {
    await this.prisma.panel.findUniqueOrThrow({ where: { id } });
    return this.prisma.panel.update({ where: { id }, data: dto });
  }

  async deactivatePanel(id: string) {
    const blockedPorts = await this.prisma.port.count({
      where: { panelId: id, state: { in: ['in_use', 'reserved'] } },
    });
    if (blockedPorts > 0)
      throw new UnprocessableEntityException(
        `Cannot deactivate panel: ${blockedPorts} port(s) are in-use or reserved`,
      );
    return this.prisma.panel.update({ where: { id }, data: { isActive: false } });
  }

  // -- Ports -----------------------------------------------------------------

  async listPorts(panelId: string) {
    return this.prisma.port.findMany({
      where: { panelId },
      orderBy: { position: 'asc' },
    });
  }

  async createPort(panelId: string, dto: CreatePortDto) {
    const existing = await this.prisma.port.findUnique({
      where: { panelId_label: { panelId, label: dto.label } },
    });
    if (existing)
      throw new ConflictException(`Port label '${dto.label}' already exists on this panel`);
    return this.prisma.port.create({ data: { ...dto, panelId } });
  }

  async bulkCreatePorts(panelId: string, dto: BulkCreatePortsDto) {
    await this.prisma.panel.findUniqueOrThrow({ where: { id: panelId } });

    const prefix = dto.labelPrefix ?? '';
    const ports = Array.from({ length: dto.count }, (_, i) => {
      const position = dto.startPosition + i;
      const label = `${prefix}${String(position).padStart(2, '0')}`;
      const strandRole: 'tx' | 'rx' | 'unspecified' = dto.alternateTxRx
        ? position % 2 === 1
          ? 'tx'
          : 'rx'
        : 'unspecified';
      return {
        panelId,
        label,
        position,
        mediaType: dto.mediaType,
        connectorType: dto.connectorType,
        strandRole,
      };
    });

    await this.prisma.port.createMany({ data: ports, skipDuplicates: true });
    return this.prisma.port.findMany({ where: { panelId }, orderBy: { position: 'asc' } });
  }

  // -- DemarcPoints ----------------------------------------------------------

  async listDemarcPoints(siteId: string) {
    return this.prisma.demarcPoint.findMany({
      where: { room: { building: { siteId } } },
      include: {
        organization: { select: { id: true, name: true, code: true } },
        room: { select: { id: true, code: true, name: true } },
        panel: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDemarcPoint(roomId: string, dto: CreateDemarcPointDto) {
    await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    return this.prisma.demarcPoint.create({ data: { ...dto, roomId } });
  }
}
