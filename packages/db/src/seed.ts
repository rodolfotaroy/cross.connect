/**
 * packages/db/src/seed.ts â€” Comprehensive CrossConnect MVP demo seed
 *
 * Topology:
 *   Site: DC1-IAD (Ashburn, VA)
 *   â””â”€ Building: MAIN
 *      â”œâ”€ Room: MMR-1   (mmr)          â€“ carrier ODF + demarc panels
 *      â”œâ”€ Room: TC-B1   (telco_closet) â€“ backbone patch panels
 *      â”œâ”€ Room: SUITE-4 (standard)     â€“ Acme Corp cage
 *      â””â”€ Room: SUITE-7 (standard)     â€“ Globex Industries cage
 *
 * Orgs:  DC-OPS (operator), ACME, GLOBEX (customers), ATTNET, EQFAB (carriers), AWSONRAMP (cloud)
 * Users: admin, ops-manager, ops-tech, alice (acme admin), bob (acme viewer), carol (globex admin)
 * Orders: XCO-DEMO-001 (draft) â€¦ XCO-DEMO-006 (cancelled) covering all states
 */

import * as bcrypt from 'bcryptjs';
import {
  ConnectorType,
  DemarcType,
  EndpointSide,
  EndpointType,
  MediaType,
  OrderState,
  OrgType,
  PanelType,
  PortState,
  Prisma,
  PrismaClient,
  RoomType,
  ServiceState,
  ServiceType,
  UserRole,
} from './generated/client';

const prisma = new PrismaClient();

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function mkPorts(
  panelId: string,
  count: number,
  media: MediaType,
  connector: ConnectorType,
  prefix = '',
  start = 1,
): Prisma.PortCreateManyInput[] {
  return Array.from({ length: count }, (_, i) => ({
    panelId,
    label: `${prefix}${String(start + i).padStart(2, '0')}`,
    position: start + i,
    mediaType: media,
    connectorType: connector,
    strandRole: (i % 2 === 0 ? 'tx' : 'rx') as any,
    state:
      i < Math.floor(count * 0.6)
        ? PortState.available
        : i < Math.floor(count * 0.85)
          ? PortState.in_use
          : PortState.reserved,
  }));
}

async function main() {
  console.log('ðŸŒ±  Seeding CrossConnect MVP demo dataâ€¦');

  const HASH = await bcrypt.hash('changeme123!', 12);

  // â”€â”€ Organizations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const operatorOrg = await prisma.organization.upsert({
    where: { code: 'DC-OPS' },
    update: {},
    create: {
      name: 'CrossConnect DC Operations',
      code: 'DC-OPS',
      orgType: OrgType.operator,
      contactEmail: 'ops@crossconnect.local',
    },
  });

  const acmeOrg = await prisma.organization.upsert({
    where: { code: 'ACME' },
    update: {},
    create: {
      name: 'Acme Corporation',
      code: 'ACME',
      orgType: OrgType.customer,
      contactEmail: 'noc@acme.example.com',
      contactPhone: '+1-800-555-0100',
    },
  });

  const globexOrg = await prisma.organization.upsert({
    where: { code: 'GLOBEX' },
    update: {},
    create: {
      name: 'Globex Industries',
      code: 'GLOBEX',
      orgType: OrgType.customer,
      contactEmail: 'it@globex.example.com',
      contactPhone: '+1-800-555-0200',
    },
  });

  const attOrg = await prisma.organization.upsert({
    where: { code: 'ATTNET' },
    update: {},
    create: {
      name: 'AT&T Network Services',
      code: 'ATTNET',
      orgType: OrgType.carrier,
      contactEmail: 'cfa-orders@att.example.com',
    },
  });

  const equinixOrg = await prisma.organization.upsert({
    where: { code: 'EQFAB' },
    update: {},
    create: {
      name: 'Equinix Fabric',
      code: 'EQFAB',
      orgType: OrgType.carrier,
      contactEmail: 'orders@equinix.example.com',
    },
  });

  const awsOrg = await prisma.organization.upsert({
    where: { code: 'AWSONRAMP' },
    update: {},
    create: {
      name: 'AWS Direct Connect',
      code: 'AWSONRAMP',
      orgType: OrgType.cloud_provider,
      contactEmail: 'dx-colocation@amazon.example.com',
    },
  });

  console.log('  âœ“ Organizations (6)');

  // â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@crossconnect.local' },
    update: {},
    create: {
      email: 'admin@crossconnect.local',
      passwordHash: HASH,
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.super_admin,
      orgId: operatorOrg.id,
    },
  });

  const opsManager = await prisma.user.upsert({
    where: { email: 'ops@crossconnect.local' },
    update: {},
    create: {
      email: 'ops@crossconnect.local',
      passwordHash: HASH,
      firstName: 'Jordan',
      lastName: 'Rivera',
      role: UserRole.ops_manager,
      orgId: operatorOrg.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'tech@crossconnect.local' },
    update: { role: UserRole.ops_technician },
    create: {
      email: 'tech@crossconnect.local',
      passwordHash: HASH,
      firstName: 'Sam',
      lastName: 'Chen',
      role: UserRole.ops_technician,
      orgId: operatorOrg.id,
    },
  });

  const acmeAdmin = await prisma.user.upsert({
    where: { email: 'alice@acme.example.com' },
    update: { role: UserRole.customer_admin },
    create: {
      email: 'alice@acme.example.com',
      passwordHash: HASH,
      firstName: 'Alice',
      lastName: 'Thompson',
      role: UserRole.customer_admin,
      orgId: acmeOrg.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'bob@acme.example.com' },
    update: { role: UserRole.customer_orderer },
    create: {
      email: 'bob@acme.example.com',
      passwordHash: HASH,
      firstName: 'Bob',
      lastName: 'Nguyen',
      role: UserRole.customer_orderer,
      orgId: acmeOrg.id,
    },
  });

  // Keep legacy email for backwards compat
  await prisma.user.upsert({
    where: { email: 'customer@acme.example' },
    update: { role: UserRole.customer_admin },
    create: {
      email: 'customer@acme.example',
      passwordHash: HASH,
      firstName: 'Alice',
      lastName: 'Customer',
      role: UserRole.customer_admin,
      orgId: acmeOrg.id,
    },
  });

  const globexAdmin = await prisma.user.upsert({
    where: { email: 'carol@globex.example.com' },
    update: { role: UserRole.customer_admin },
    create: {
      email: 'carol@globex.example.com',
      passwordHash: HASH,
      firstName: 'Carol',
      lastName: 'Martinez',
      role: UserRole.customer_admin,
      orgId: globexOrg.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'dave@acme.example.com' },
    update: { role: UserRole.customer_viewer },
    create: {
      email: 'dave@acme.example.com',
      passwordHash: HASH,
      firstName: 'Dave',
      lastName: 'Lee',
      role: UserRole.customer_viewer,
      orgId: acmeOrg.id,
    },
  });
  console.log('  ✓ Users (8)');

  // â”€â”€ Site + Building â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const site = await prisma.site.upsert({
    where: { code: 'DC1-IAD' },
    update: {},
    create: {
      name: 'Ashburn Data Center 1',
      code: 'DC1-IAD',
      address: '44760 Salvation Army Rd',
      city: 'Ashburn',
      state: 'VA',
      country: 'US',
      timezone: 'America/New_York',
      notes: 'Primary flagship campus. Tier III certified.',
    },
  });

  // Keep old DC1 code for any existing references
  await prisma.site.upsert({
    where: { code: 'DC1' },
    update: {},
    create: {
      name: 'Primary Datacenter (legacy)',
      code: 'DC1',
      address: '100 Main St',
      city: 'Ashburn',
      state: 'VA',
      country: 'US',
      timezone: 'America/New_York',
    },
  });

  const mainBuilding = await prisma.building.upsert({
    where: { siteId_code: { siteId: site.id, code: 'MAIN' } },
    update: {},
    create: {
      siteId: site.id,
      name: 'Main Building',
      code: 'MAIN',
      notes: '4-story, 250,000 sqft raised floor.',
    },
  });

  console.log('  âœ“ Site + Building');

  // â”€â”€ Rooms â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const mmrRoom = await prisma.room.upsert({
    where: { buildingId_code: { buildingId: mainBuilding.id, code: 'MMR-1' } },
    update: {},
    create: {
      buildingId: mainBuilding.id,
      name: 'Meet-Me Room 1',
      code: 'MMR-1',
      roomType: RoomType.mmr,
      floor: '1',
      notes: 'Primary carrier handoff room. 180 ODF frames.',
    },
  });

  const tcRoom = await prisma.room.upsert({
    where: { buildingId_code: { buildingId: mainBuilding.id, code: 'TC-B1' } },
    update: {},
    create: {
      buildingId: mainBuilding.id,
      name: 'Telco Closet B1',
      code: 'TC-B1',
      roomType: RoomType.telco_closet,
      floor: '1',
    },
  });

  const suite4 = await prisma.room.upsert({
    where: { buildingId_code: { buildingId: mainBuilding.id, code: 'SUITE-4' } },
    update: {},
    create: {
      buildingId: mainBuilding.id,
      name: 'Suite 4 â€“ Acme Corp',
      code: 'SUITE-4',
      roomType: RoomType.standard,
      floor: '2',
    },
  });

  const suite7 = await prisma.room.upsert({
    where: { buildingId_code: { buildingId: mainBuilding.id, code: 'SUITE-7' } },
    update: {},
    create: {
      buildingId: mainBuilding.id,
      name: 'Suite 7 â€“ Globex Industries',
      code: 'SUITE-7',
      roomType: RoomType.standard,
      floor: '2',
    },
  });

  console.log('  âœ“ Rooms (4)');

  // â”€â”€ MMR panels (carrier ODFs + demarc strips) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const mmrOdf1 = await prisma.panel.upsert({
    where: { id: 'seed-mmr-odf-01' },
    update: {},
    create: {
      id: 'seed-mmr-odf-01',
      roomId: mmrRoom.id,
      name: 'MMR-1 ODF Frame 01',
      code: 'MMR1-ODF-01',
      panelType: PanelType.odf,
      portCount: 24,
    },
  });
  if (!(await prisma.port.findFirst({ where: { panelId: mmrOdf1.id } }))) {
    await prisma.port.createMany({
      data: mkPorts(mmrOdf1.id, 24, MediaType.smf, ConnectorType.lc, 'P'),
    });
  }

  const mmrOdf2 = await prisma.panel.upsert({
    where: { id: 'seed-mmr-odf-02' },
    update: {},
    create: {
      id: 'seed-mmr-odf-02',
      roomId: mmrRoom.id,
      name: 'MMR-1 ODF Frame 02',
      code: 'MMR1-ODF-02',
      panelType: PanelType.odf,
      portCount: 24,
    },
  });
  if (!(await prisma.port.findFirst({ where: { panelId: mmrOdf2.id } }))) {
    await prisma.port.createMany({
      data: mkPorts(mmrOdf2.id, 24, MediaType.smf, ConnectorType.lc, 'P'),
    });
  }

  const mmrDemarkAtt = await prisma.panel.upsert({
    where: { id: 'seed-mmr-demarc-att' },
    update: {},
    create: {
      id: 'seed-mmr-demarc-att',
      roomId: mmrRoom.id,
      name: 'AT&T Demarc Strip',
      code: 'MMR1-DEMARC-ATT',
      panelType: PanelType.demarc,
      portCount: 48,
    },
  });
  if (!(await prisma.port.findFirst({ where: { panelId: mmrDemarkAtt.id } }))) {
    await prisma.port.createMany({
      data: mkPorts(mmrDemarkAtt.id, 48, MediaType.smf, ConnectorType.lc, 'D'),
    });
  }

  // legacy panel kept for backwards compat
  const carrierDemarcPanel = await prisma.panel.upsert({
    where: { id: 'seed-panel-carrier-demarc' },
    update: {},
    create: {
      id: 'seed-panel-carrier-demarc',
      roomId: mmrRoom.id,
      name: 'Carrier Alpha Demarc Panel',
      code: 'DEMARC-CA-01',
      panelType: PanelType.demarc,
      portCount: 48,
    },
  });

  const mmrDemarkEq = await prisma.panel.upsert({
    where: { id: 'seed-mmr-demarc-eq' },
    update: {},
    create: {
      id: 'seed-mmr-demarc-eq',
      roomId: mmrRoom.id,
      name: 'Equinix Demarc Strip',
      code: 'MMR1-DEMARC-EQ',
      panelType: PanelType.demarc,
      portCount: 24,
    },
  });
  if (!(await prisma.port.findFirst({ where: { panelId: mmrDemarkEq.id } }))) {
    await prisma.port.createMany({
      data: mkPorts(mmrDemarkEq.id, 24, MediaType.smf, ConnectorType.lc, 'D'),
    });
  }

  // ODF-07 for backwards compat
  const odf07 = await prisma.panel.upsert({
    where: { id: 'seed-panel-odf07' },
    update: {},
    create: {
      id: 'seed-panel-odf07',
      roomId: mmrRoom.id,
      name: 'ODF Frame 07',
      code: 'ODF-07',
      panelType: PanelType.odf,
      portCount: 48,
    },
  });
  if (!(await prisma.port.findFirst({ where: { panelId: odf07.id } }))) {
    for (let i = 1; i <= 48; i++) {
      const label = String(i).padStart(2, '0');
      await prisma.port.upsert({
        where: { panelId_label: { panelId: odf07.id, label } },
        update: {},
        create: {
          panelId: odf07.id,
          label,
          position: i,
          mediaType: MediaType.smf,
          connectorType: ConnectorType.lc,
          strandRole: i % 2 === 1 ? 'tx' : 'rx',
        },
      });
    }
  }

  console.log('  âœ“ MMR Panels + Ports');

  // â”€â”€ Suite 4 â€“ Acme Corp: cage â†’ rack â†’ panels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const acmeCage = await prisma.cage.upsert({
    where: { roomId_code: { roomId: suite4.id, code: 'CAGE-4A' } },
    update: {},
    create: {
      roomId: suite4.id,
      name: 'Cage 4A â€“ Acme Corp',
      code: 'CAGE-4A',
      ownerOrgId: acmeOrg.id,
    },
  });

  const acmeRack1 = await prisma.rack.upsert({
    where: { cageId_code: { cageId: acmeCage.id, code: 'RACK-4A-01' } },
    update: {},
    create: { cageId: acmeCage.id, name: 'Rack 4A-01', code: 'RACK-4A-01', uSize: 42 },
  });

  const acmePP1 = await prisma.panel.upsert({
    where: { id: 'seed-acme-pp1' },
    update: {},
    create: {
      id: 'seed-acme-pp1',
      rackId: acmeRack1.id,
      name: 'Patch Panel 4A01-01',
      code: 'PP-4A01-01',
      panelType: PanelType.patch_panel,
      portCount: 48,
      uPosition: 1,
    },
  });
  if (!(await prisma.port.findFirst({ where: { panelId: acmePP1.id } }))) {
    await prisma.port.createMany({
      data: mkPorts(acmePP1.id, 48, MediaType.smf, ConnectorType.lc),
    });
  }

  const acmePP2 = await prisma.panel.upsert({
    where: { id: 'seed-acme-pp2' },
    update: {},
    create: {
      id: 'seed-acme-pp2',
      rackId: acmeRack1.id,
      name: 'Patch Panel 4A01-02',
      code: 'PP-4A01-02',
      panelType: PanelType.patch_panel,
      portCount: 48,
      uPosition: 2,
    },
  });
  if (!(await prisma.port.findFirst({ where: { panelId: acmePP2.id } }))) {
    await prisma.port.createMany({
      data: mkPorts(acmePP2.id, 48, MediaType.smf, ConnectorType.lc),
    });
  }

  const acmeRack2 = await prisma.rack.upsert({
    where: { cageId_code: { cageId: acmeCage.id, code: 'RACK-4A-02' } },
    update: {},
    create: { cageId: acmeCage.id, name: 'Rack 4A-02', code: 'RACK-4A-02', uSize: 42 },
  });

  const acmePP3 = await prisma.panel.upsert({
    where: { id: 'seed-acme-pp3' },
    update: {},
    create: {
      id: 'seed-acme-pp3',
      rackId: acmeRack2.id,
      name: 'Patch Panel 4A02-01',
      code: 'PP-4A02-01',
      panelType: PanelType.patch_panel,
      portCount: 48,
      uPosition: 1,
    },
  });
  if (!(await prisma.port.findFirst({ where: { panelId: acmePP3.id } }))) {
    await prisma.port.createMany({
      data: mkPorts(acmePP3.id, 48, MediaType.cat6, ConnectorType.rj45),
    });
  }

  // Legacy cage for backwards compat
  const cageA12 = await prisma.cage.upsert({
    where: { roomId_code: { roomId: suite4.id, code: 'A12' } },
    update: {},
    create: { roomId: suite4.id, name: 'Cage A12', code: 'A12' },
  });

  const rack07 = await prisma.rack.upsert({
    where: { cageId_code: { cageId: cageA12.id, code: 'R07' } },
    update: {},
    create: { cageId: cageA12.id, name: 'Rack 07', code: 'R07', uSize: 42 },
  });

  const pp04 = await prisma.panel.upsert({
    where: { id: 'seed-panel-pp04' },
    update: {},
    create: {
      id: 'seed-panel-pp04',
      rackId: rack07.id,
      name: 'Patch Panel PP-04',
      code: 'PP-04',
      panelType: PanelType.patch_panel,
      portCount: 24,
      uPosition: 1,
    },
  });
  if (!(await prisma.port.findFirst({ where: { panelId: pp04.id } }))) {
    for (let i = 1; i <= 24; i++) {
      const label = String(i).padStart(2, '0');
      await prisma.port.upsert({
        where: { panelId_label: { panelId: pp04.id, label } },
        update: {},
        create: {
          panelId: pp04.id,
          label,
          position: i,
          mediaType: MediaType.smf,
          connectorType: ConnectorType.lc,
          strandRole: i % 2 === 1 ? 'tx' : 'rx',
        },
      });
    }
  }

  console.log('  âœ“ Acme Corp Cage / Racks / Panels');

  // â”€â”€ Suite 7 â€“ Globex Industries: cage â†’ rack â†’ panels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const globexCage = await prisma.cage.upsert({
    where: { roomId_code: { roomId: suite7.id, code: 'CAGE-7B' } },
    update: {},
    create: {
      roomId: suite7.id,
      name: 'Cage 7B â€“ Globex Industries',
      code: 'CAGE-7B',
      ownerOrgId: globexOrg.id,
    },
  });

  const globexRack1 = await prisma.rack.upsert({
    where: { cageId_code: { cageId: globexCage.id, code: 'RACK-7B-01' } },
    update: {},
    create: { cageId: globexCage.id, name: 'Rack 7B-01', code: 'RACK-7B-01', uSize: 42 },
  });

  const globexPP1 = await prisma.panel.upsert({
    where: { id: 'seed-globex-pp1' },
    update: {},
    create: {
      id: 'seed-globex-pp1',
      rackId: globexRack1.id,
      name: 'Patch Panel 7B01-01',
      code: 'PP-7B01-01',
      panelType: PanelType.patch_panel,
      portCount: 48,
      uPosition: 1,
    },
  });
  if (!(await prisma.port.findFirst({ where: { panelId: globexPP1.id } }))) {
    await prisma.port.createMany({
      data: mkPorts(globexPP1.id, 48, MediaType.smf, ConnectorType.lc),
    });
  }

  console.log('  âœ“ Globex Industries Cage / Racks / Panels');

  // â”€â”€ DemarcPoints (carrier handoffs in the MMR) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  await prisma.demarcPoint.upsert({
    where: { id: 'seed-demarc-carrier-a' },
    update: {},
    create: {
      id: 'seed-demarc-carrier-a',
      name: 'Carrier Alpha MMR-1 Demarc',
      demarcType: DemarcType.carrier,
      organizationId: attOrg.id,
      roomId: mmrRoom.id,
      panelId: carrierDemarcPanel.id,
    },
  });

  await prisma.demarcPoint.upsert({
    where: { id: 'seed-demarc-att-primary' },
    update: {},
    create: {
      id: 'seed-demarc-att-primary',
      name: 'AT&T Primary Demarc â€“ MMR-1',
      demarcType: DemarcType.carrier,
      organizationId: attOrg.id,
      roomId: mmrRoom.id,
      panelId: mmrDemarkAtt.id,
      loaReference: 'LOA-ATT-2024-001',
      cfaReference: 'CFA-ATT-IAD-0042',
    },
  });

  await prisma.demarcPoint.upsert({
    where: { id: 'seed-demarc-eq-primary' },
    update: {},
    create: {
      id: 'seed-demarc-eq-primary',
      name: 'Equinix Fabric Demarc â€“ MMR-1',
      demarcType: DemarcType.carrier,
      organizationId: equinixOrg.id,
      roomId: mmrRoom.id,
      panelId: mmrDemarkEq.id,
      loaReference: 'LOA-EQ-2024-007',
    },
  });

  await prisma.demarcPoint.upsert({
    where: { id: 'seed-demarc-aws-primary' },
    update: {},
    create: {
      id: 'seed-demarc-aws-primary',
      name: 'AWS Direct Connect Demarc â€“ MMR-1',
      demarcType: DemarcType.cloud_onramp,
      organizationId: awsOrg.id,
      roomId: mmrRoom.id,
      panelId: mmrOdf2.id,
      loaReference: 'LOA-AWS-DX-2024-003',
    },
  });

  console.log('  âœ“ DemarcPoints (4)');

  // â”€â”€ Cross-Connect Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const order001 = await prisma.crossConnectOrder.upsert({
    where: { orderNumber: 'XCO-DEMO-001' },
    update: {},
    create: {
      orderNumber: 'XCO-DEMO-001',
      requestingOrgId: acmeOrg.id,
      submittedById: acmeAdmin.id,
      serviceType: ServiceType.customer_to_carrier,
      mediaType: MediaType.smf,
      speedGbps: new Prisma.Decimal('10'),
      customerReference: 'ACME-PO-2024-001',
      notes: 'Primary internet transit â€“ 10G SMF handoff to AT&T at IAD-1 MMR',
      state: OrderState.draft,
    },
  });

  const order002 = await prisma.crossConnectOrder.upsert({
    where: { orderNumber: 'XCO-DEMO-002' },
    update: {},
    create: {
      orderNumber: 'XCO-DEMO-002',
      requestingOrgId: acmeOrg.id,
      submittedById: acmeAdmin.id,
      serviceType: ServiceType.customer_to_carrier,
      mediaType: MediaType.smf,
      speedGbps: new Prisma.Decimal('100'),
      customerReference: 'ACME-PO-2024-002',
      notes: 'Equinix Fabric port for cloud connectivity',
      state: OrderState.submitted,
      submittedAt: new Date(Date.now() - 2 * 86400_000),
    },
  });

  const order003 = await prisma.crossConnectOrder.upsert({
    where: { orderNumber: 'XCO-DEMO-003' },
    update: {},
    create: {
      orderNumber: 'XCO-DEMO-003',
      requestingOrgId: globexOrg.id,
      submittedById: globexAdmin.id,
      serviceType: ServiceType.customer_to_cloud,
      mediaType: MediaType.smf,
      speedGbps: new Prisma.Decimal('10'),
      customerReference: 'GLOBEX-TICKET-4412',
      notes: 'AWS Direct Connect 10G for data migration project',
      state: OrderState.under_review,
      submittedAt: new Date(Date.now() - 5 * 86400_000),
    },
  });

  const order004 = await prisma.crossConnectOrder.upsert({
    where: { orderNumber: 'XCO-DEMO-004' },
    update: {},
    create: {
      orderNumber: 'XCO-DEMO-004',
      requestingOrgId: acmeOrg.id,
      submittedById: acmeAdmin.id,
      serviceType: ServiceType.customer_to_customer,
      mediaType: MediaType.smf,
      speedGbps: new Prisma.Decimal('1'),
      customerReference: 'ACME-PO-2024-003',
      notes: 'Private interconnect between Acme and Globex suites',
      state: OrderState.approved,
      submittedAt: new Date(Date.now() - 10 * 86400_000),
      approvedById: opsManager.id,
      approvedAt: new Date(Date.now() - 7 * 86400_000),
    },
  });

  const order005 = await prisma.crossConnectOrder.upsert({
    where: { orderNumber: 'XCO-DEMO-005' },
    update: {},
    create: {
      orderNumber: 'XCO-DEMO-005',
      requestingOrgId: globexOrg.id,
      submittedById: globexAdmin.id,
      serviceType: ServiceType.exchange,
      mediaType: MediaType.mmf,
      speedGbps: new Prisma.Decimal('40'),
      customerReference: 'GLOBEX-TICKET-4398',
      notes: 'Exchange port for financial data feed',
      state: OrderState.rejected,
      submittedAt: new Date(Date.now() - 15 * 86400_000),
      rejectionReason:
        'No available MMF capacity in MMR-1 at this time. Resubmit when 80% port threshold is cleared.',
    },
  });

  const order006 = await prisma.crossConnectOrder.upsert({
    where: { orderNumber: 'XCO-DEMO-006' },
    update: {},
    create: {
      orderNumber: 'XCO-DEMO-006',
      requestingOrgId: acmeOrg.id,
      submittedById: acmeAdmin.id,
      serviceType: ServiceType.customer_to_carrier,
      mediaType: MediaType.smf,
      speedGbps: new Prisma.Decimal('1'),
      isTemporary: true,
      requestedExpiresAt: new Date(Date.now() + 30 * 86400_000),
      customerReference: 'ACME-TEMP-2024-001',
      notes: 'Temporary backup path during maintenance window',
      state: OrderState.cancelled,
      submittedAt: new Date(Date.now() - 20 * 86400_000),
      cancelledAt: new Date(Date.now() - 18 * 86400_000),
      cancelledReason: 'Backup path no longer required â€“ primary circuit restored.',
    },
  });

  console.log('  âœ“ Cross-Connect Orders (6 demo orders)');

  // â”€â”€ OrderEndpoints â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function seedEndpoints(
    orderId: string,
    aSide: Omit<Prisma.OrderEndpointCreateManyInput, 'orderId' | 'side'>,
    zSide: Omit<Prisma.OrderEndpointCreateManyInput, 'orderId' | 'side'>,
  ) {
    const existing = await prisma.orderEndpoint.count({ where: { orderId } });
    if (existing === 0) {
      await prisma.orderEndpoint.createMany({
        data: [
          { orderId, ...aSide, side: EndpointSide.a_side },
          { orderId, ...zSide, side: EndpointSide.z_side },
        ],
      });
    }
  }

  await seedEndpoints(
    order001.id,
    { endpointType: EndpointType.customer, organizationId: acmeOrg.id, desiredPanelId: acmePP1.id },
    {
      endpointType: EndpointType.carrier,
      organizationId: attOrg.id,
      demarcDescription: 'AT&T MMR-1 ODF-01 Port 01',
    },
  );
  await seedEndpoints(
    order002.id,
    { endpointType: EndpointType.customer, organizationId: acmeOrg.id, desiredPanelId: acmePP1.id },
    {
      endpointType: EndpointType.carrier,
      organizationId: equinixOrg.id,
      demarcDescription: 'Equinix Fabric MMR-1 D01',
    },
  );
  await seedEndpoints(
    order003.id,
    {
      endpointType: EndpointType.customer,
      organizationId: globexOrg.id,
      desiredPanelId: globexPP1.id,
    },
    {
      endpointType: EndpointType.cloud_onramp,
      organizationId: awsOrg.id,
      demarcDescription: 'AWS DX IAD-1 Port B-03',
    },
  );
  await seedEndpoints(
    order004.id,
    { endpointType: EndpointType.customer, organizationId: acmeOrg.id, desiredPanelId: acmePP2.id },
    {
      endpointType: EndpointType.customer,
      organizationId: globexOrg.id,
      desiredPanelId: globexPP1.id,
    },
  );
  await seedEndpoints(
    order005.id,
    {
      endpointType: EndpointType.customer,
      organizationId: globexOrg.id,
      desiredPanelId: globexPP1.id,
    },
    { endpointType: EndpointType.exchange },
  );
  await seedEndpoints(
    order006.id,
    { endpointType: EndpointType.customer, organizationId: acmeOrg.id, desiredPanelId: acmePP3.id },
    {
      endpointType: EndpointType.carrier,
      organizationId: attOrg.id,
      demarcDescription: 'AT&T backup demarc',
    },
  );

  console.log('  âœ“ Order Endpoints');

  // â”€â”€ Active service for approved order (XCO-DEMO-004) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (!(await prisma.crossConnectService.findFirst({ where: { orderId: order004.id } }))) {
    const svc = await prisma.crossConnectService.create({
      data: {
        orderId: order004.id,
        serviceNumber: 'XCS-DEMO-0001',
        state: ServiceState.provisioning,
        serviceType: ServiceType.customer_to_customer,
        mediaType: MediaType.smf,
        isTemporary: false,
      },
    });
    await prisma.serviceEndpoint.createMany({
      data: [
        {
          serviceId: svc.id,
          side: EndpointSide.a_side,
          endpointType: EndpointType.customer,
          organizationId: acmeOrg.id,
          assignedPanelId: acmePP2.id,
          demarcDescription: 'Cage 4A, Rack 4A-01, PP-4A01-02 Port 01',
        },
        {
          serviceId: svc.id,
          side: EndpointSide.z_side,
          endpointType: EndpointType.customer,
          organizationId: globexOrg.id,
          assignedPanelId: globexPP1.id,
          demarcDescription: 'Cage 7B, Rack 7B-01, PP-7B01-01 Port 01',
        },
      ],
    });
    console.log('  âœ“ CrossConnectService XCS-DEMO-0001 (provisioning)');
  }
  // ── Additional completed orders → active/suspended services ───────────────

  // Order 007: Acme → AT&T carrier (active, 100G)
  const order007 = await prisma.crossConnectOrder.upsert({
    where: { orderNumber: 'XCO-DEMO-007' },
    update: {},
    create: {
      orderNumber: 'XCO-DEMO-007',
      requestingOrgId: acmeOrg.id,
      submittedById: acmeAdmin.id,
      serviceType: ServiceType.customer_to_carrier,
      mediaType: MediaType.smf,
      speedGbps: new Prisma.Decimal('100'),
      customerReference: 'ACME-PO-2024-007',
      notes: 'Primary internet transit 100G to AT&T',
      state: OrderState.approved,
      submittedAt: new Date(Date.now() - 60 * 86400_000),
      approvedById: opsManager.id,
      approvedAt: new Date(Date.now() - 55 * 86400_000),
    },
  });

  if (!(await prisma.crossConnectService.findFirst({ where: { orderId: order007.id } }))) {
    const svc007 = await prisma.crossConnectService.create({
      data: {
        orderId: order007.id,
        serviceNumber: 'XCS-DEMO-0002',
        state: ServiceState.active,
        serviceType: ServiceType.customer_to_carrier,
        mediaType: MediaType.smf,
        speedGbps: new Prisma.Decimal('100'),
        isTemporary: false,
        activatedAt: new Date(Date.now() - 50 * 86400_000),
      },
    });
    await prisma.serviceEndpoint.createMany({
      data: [
        {
          serviceId: svc007.id,
          side: EndpointSide.a_side,
          endpointType: EndpointType.customer,
          organizationId: acmeOrg.id,
          assignedPanelId: acmePP1.id,
          demarcDescription: 'Cage 4A, Rack 4A-01, PP-4A01-01 Port 01',
        },
        {
          serviceId: svc007.id,
          side: EndpointSide.z_side,
          endpointType: EndpointType.carrier,
          organizationId: attOrg.id,
          assignedPanelId: mmrDemarkAtt.id,
          demarcDescription: 'MMR-1, AT&T Demarc Panel, Port 01',
        },
      ],
    });
    console.log('  ✔ CrossConnectService XCS-DEMO-0002 (active, Acme → AT&T 100G)');
  }

  // Order 008: Globex → AWS cloud onramp (active, 10G)
  const order008 = await prisma.crossConnectOrder.upsert({
    where: { orderNumber: 'XCO-DEMO-008' },
    update: {},
    create: {
      orderNumber: 'XCO-DEMO-008',
      requestingOrgId: globexOrg.id,
      submittedById: globexAdmin.id,
      serviceType: ServiceType.customer_to_cloud,
      mediaType: MediaType.smf,
      speedGbps: new Prisma.Decimal('10'),
      customerReference: 'GLOBEX-TICKET-5500',
      notes: 'AWS Direct Connect 10G for production workloads',
      state: OrderState.approved,
      submittedAt: new Date(Date.now() - 45 * 86400_000),
      approvedById: opsManager.id,
      approvedAt: new Date(Date.now() - 40 * 86400_000),
    },
  });

  if (!(await prisma.crossConnectService.findFirst({ where: { orderId: order008.id } }))) {
    const svc008 = await prisma.crossConnectService.create({
      data: {
        orderId: order008.id,
        serviceNumber: 'XCS-DEMO-0003',
        state: ServiceState.active,
        serviceType: ServiceType.customer_to_cloud,
        mediaType: MediaType.smf,
        speedGbps: new Prisma.Decimal('10'),
        isTemporary: false,
        activatedAt: new Date(Date.now() - 35 * 86400_000),
      },
    });
    await prisma.serviceEndpoint.createMany({
      data: [
        {
          serviceId: svc008.id,
          side: EndpointSide.a_side,
          endpointType: EndpointType.customer,
          organizationId: globexOrg.id,
          assignedPanelId: globexPP1.id,
          demarcDescription: 'Cage 7B, Rack 7B-01, PP-7B01-01 Port 05',
        },
        {
          serviceId: svc008.id,
          side: EndpointSide.z_side,
          endpointType: EndpointType.cloud_onramp,
          organizationId: awsOrg.id,
          assignedPanelId: mmrOdf2.id,
          demarcDescription: 'MMR-1, AWS DX ODF-2 Port 03',
        },
      ],
    });
    console.log('  ✔ CrossConnectService XCS-DEMO-0003 (active, Globex → AWS 10G)');
  }

  // Order 009: Acme → Equinix Fabric (active, 1G)
  const order009 = await prisma.crossConnectOrder.upsert({
    where: { orderNumber: 'XCO-DEMO-009' },
    update: {},
    create: {
      orderNumber: 'XCO-DEMO-009',
      requestingOrgId: acmeOrg.id,
      submittedById: acmeAdmin.id,
      serviceType: ServiceType.customer_to_carrier,
      mediaType: MediaType.smf,
      speedGbps: new Prisma.Decimal('1'),
      customerReference: 'ACME-PO-2024-009',
      notes: 'Equinix Fabric 1G backup path',
      state: OrderState.approved,
      submittedAt: new Date(Date.now() - 30 * 86400_000),
      approvedById: opsManager.id,
      approvedAt: new Date(Date.now() - 25 * 86400_000),
    },
  });

  if (!(await prisma.crossConnectService.findFirst({ where: { orderId: order009.id } }))) {
    const svc009 = await prisma.crossConnectService.create({
      data: {
        orderId: order009.id,
        serviceNumber: 'XCS-DEMO-0004',
        state: ServiceState.active,
        serviceType: ServiceType.customer_to_carrier,
        mediaType: MediaType.smf,
        speedGbps: new Prisma.Decimal('1'),
        isTemporary: false,
        activatedAt: new Date(Date.now() - 20 * 86400_000),
      },
    });
    await prisma.serviceEndpoint.createMany({
      data: [
        {
          serviceId: svc009.id,
          side: EndpointSide.a_side,
          endpointType: EndpointType.customer,
          organizationId: acmeOrg.id,
          assignedPanelId: acmePP2.id,
          demarcDescription: 'Cage 4A, Rack 4A-01, PP-4A01-02 Port 10',
        },
        {
          serviceId: svc009.id,
          side: EndpointSide.z_side,
          endpointType: EndpointType.carrier,
          organizationId: equinixOrg.id,
          assignedPanelId: mmrDemarkEq.id,
          demarcDescription: 'MMR-1, Equinix Demarc Panel, Port 02',
        },
      ],
    });
    console.log('  ✔ CrossConnectService XCS-DEMO-0004 (active, Acme → Equinix 1G)');
  }

  // Order 010: Acme → Globex (temporary, suspended)
  const order010 = await prisma.crossConnectOrder.upsert({
    where: { orderNumber: 'XCO-DEMO-010' },
    update: {},
    create: {
      orderNumber: 'XCO-DEMO-010',
      requestingOrgId: acmeOrg.id,
      submittedById: acmeAdmin.id,
      serviceType: ServiceType.customer_to_customer,
      mediaType: MediaType.smf,
      speedGbps: new Prisma.Decimal('10'),
      customerReference: 'ACME-PO-2024-010',
      notes: 'Temporary cross-connect for migration project',
      isTemporary: true,
      requestedExpiresAt: new Date(Date.now() + 30 * 86400_000),
      state: OrderState.approved,
      submittedAt: new Date(Date.now() - 20 * 86400_000),
      approvedById: opsManager.id,
      approvedAt: new Date(Date.now() - 15 * 86400_000),
    },
  });

  if (!(await prisma.crossConnectService.findFirst({ where: { orderId: order010.id } }))) {
    const svc010 = await prisma.crossConnectService.create({
      data: {
        orderId: order010.id,
        serviceNumber: 'XCS-DEMO-0005',
        state: ServiceState.suspended,
        serviceType: ServiceType.customer_to_customer,
        mediaType: MediaType.smf,
        speedGbps: new Prisma.Decimal('10'),
        isTemporary: true,
        activatedAt: new Date(Date.now() - 10 * 86400_000),
        expiresAt: new Date(Date.now() + 30 * 86400_000),
      },
    });
    await prisma.serviceEndpoint.createMany({
      data: [
        {
          serviceId: svc010.id,
          side: EndpointSide.a_side,
          endpointType: EndpointType.customer,
          organizationId: acmeOrg.id,
          assignedPanelId: acmePP3.id,
          demarcDescription: 'Cage 4A, Rack 4A-02, PP-4A02-01 Port 01',
        },
        {
          serviceId: svc010.id,
          side: EndpointSide.z_side,
          endpointType: EndpointType.customer,
          organizationId: globexOrg.id,
          assignedPanelId: globexPP1.id,
          demarcDescription: 'Cage 7B, Rack 7B-01, PP-7B01-01 Port 12',
        },
      ],
    });
    console.log('  ✔ CrossConnectService XCS-DEMO-0005 (suspended, Acme → Globex temp 10G)');
  }
  console.log(`
âœ…  Seed complete!

Demo credentials  (password: changeme123!)
  admin@crossconnect.local      super_admin
  ops@crossconnect.local        ops_manager
  tech@crossconnect.local       ops_technician
  alice@acme.example.com        customer_admin  (Acme Corp)
  bob@acme.example.com          customer_orderer (Acme Corp)
  dave@acme.example.com         customer_viewer (Acme Corp)
  carol@globex.example.com      customer_admin  (Globex Industries)
  customer@acme.example         customer_admin  (legacy alias)

Orders:
  XCO-DEMO-001  draft
  XCO-DEMO-002  submitted
  XCO-DEMO-003  under_review
  XCO-DEMO-004  approved â†’ service XCS-DEMO-0001 (provisioning)
  XCO-DEMO-005  rejected
  XCO-DEMO-006  cancelled
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
