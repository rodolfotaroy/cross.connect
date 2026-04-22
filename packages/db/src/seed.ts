/**
 * packages/db/src/seed.ts — Comprehensive CrossConnect MVP demo seed
 *
 * Topology:
 *   Site: DC1-IAD (Ashburn, VA)
 *   └─ Building: MAIN
 *      ├─ Room: MMR-1   (mmr)          – carrier ODF + demarc panels
 *      ├─ Room: TC-B1   (telco_closet) – backbone patch panels
 *      ├─ Room: SUITE-4 (standard)     – Acme Corp cage
 *      └─ Room: SUITE-7 (standard)     – Globex Industries cage
 *
 * Orgs:  DC-OPS (operator), ACME, GLOBEX (customers), ATTNET, EQFAB (carriers), AWSONRAMP (cloud)
 * Users: admin, ops-manager, ops-tech, alice (acme admin), bob (acme viewer), carol (globex admin)
 * Orders: XCO-DEMO-001 (draft) … XCO-DEMO-006 (cancelled) covering all states
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

// ─── helpers ────────────────────────────────────────────────────────────────

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
  console.log('🌱  Seeding CrossConnect MVP demo data…');

  const HASH = await bcrypt.hash('changeme123!', 12);

  // ── Organizations ────────────────────────────────────────────────────────

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

  console.log('  ✓ Organizations (6)');

  // ── Users ────────────────────────────────────────────────────────────────

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
  console.log('  ? Users (8)');

  // ── Site + Building ──────────────────────────────────────────────────────

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

  console.log('  ✓ Site + Building');

  // ── Rooms ────────────────────────────────────────────────────────────────

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
      name: 'Suite 4 – Acme Corp',
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
      name: 'Suite 7 – Globex Industries',
      code: 'SUITE-7',
      roomType: RoomType.standard,
      floor: '2',
    },
  });

  console.log('  ✓ Rooms (4)');

  // ── MMR panels (carrier ODFs + demarc strips) ────────────────────────────

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

  console.log('  ✓ MMR Panels + Ports');

  // ── Suite 4 – Acme Corp: cage → rack → panels ───────────────────────────

  const acmeCage = await prisma.cage.upsert({
    where: { roomId_code: { roomId: suite4.id, code: 'CAGE-4A' } },
    update: {},
    create: {
      roomId: suite4.id,
      name: 'Cage 4A – Acme Corp',
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

  console.log('  ✓ Acme Corp Cage / Racks / Panels');

  // ── Suite 7 – Globex Industries: cage → rack → panels ───────────────────

  const globexCage = await prisma.cage.upsert({
    where: { roomId_code: { roomId: suite7.id, code: 'CAGE-7B' } },
    update: {},
    create: {
      roomId: suite7.id,
      name: 'Cage 7B – Globex Industries',
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

  console.log('  ✓ Globex Industries Cage / Racks / Panels');

  // ── DemarcPoints (carrier handoffs in the MMR) ───────────────────────────

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
      name: 'AT&T Primary Demarc – MMR-1',
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
      name: 'Equinix Fabric Demarc – MMR-1',
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
      name: 'AWS Direct Connect Demarc – MMR-1',
      demarcType: DemarcType.cloud_onramp,
      organizationId: awsOrg.id,
      roomId: mmrRoom.id,
      panelId: mmrOdf2.id,
      loaReference: 'LOA-AWS-DX-2024-003',
    },
  });

  console.log('  ✓ DemarcPoints (4)');

  // ── Cross-Connect Orders ─────────────────────────────────────────────────

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
      notes: 'Primary internet transit – 10G SMF handoff to AT&T at IAD-1 MMR',
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
      cancelledReason: 'Backup path no longer required – primary circuit restored.',
    },
  });

  console.log('  ✓ Cross-Connect Orders (6 demo orders)');

  // ── OrderEndpoints ───────────────────────────────────────────────────────

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

  console.log('  ✓ Order Endpoints');

  // ── Active service for approved order (XCO-DEMO-004) ─────────────────────

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
    console.log('  ✓ CrossConnectService XCS-DEMO-0001 (provisioning)');
  }
  // -- Additional completed orders ? active/suspended services ---------------

  // Order 007: Acme ? AT&T carrier (active, 100G)
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
    console.log('  ? CrossConnectService XCS-DEMO-0002 (active, Acme ? AT&T 100G)');
  }

  // Order 008: Globex ? AWS cloud onramp (active, 10G)
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
    console.log('  ? CrossConnectService XCS-DEMO-0003 (active, Globex ? AWS 10G)');
  }

  // Order 009: Acme ? Equinix Fabric (active, 1G)
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
    console.log('  ? CrossConnectService XCS-DEMO-0004 (active, Acme ? Equinix 1G)');
  }

  // Order 010: Acme ? Globex (temporary, suspended)
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
    console.log('  ? CrossConnectService XCS-DEMO-0005 (suspended, Acme ? Globex temp 10G)');
  }

  // -- Dedicated Partner Portal (SP) seed ------------------------------------

  const spOrg = await prisma.organization.upsert({
    where: { code: 'SP-DEMO' },
    update: {},
    create: {
      name: 'Demo Service Partner',
      code: 'SP-DEMO',
      orgType: OrgType.customer,
      isDedicated: true,
      dedicatedConfig: { notificationsEmail: 'sp-noc@sp-demo.example.com' },
      contactEmail: 'admin@sp-demo.example.com',
    },
  });
  console.log('  ? SP org SP-DEMO');

  const spAdminUser = await prisma.user.upsert({
    where: { email: 'sp-admin@sp-demo.example.com' },
    update: {},
    create: {
      firstName: 'SP',
      lastName: 'Admin',
      email: 'sp-admin@sp-demo.example.com',
      passwordHash: HASH,
      role: UserRole.sp_admin,
      orgId: spOrg.id,
    },
  });
  await prisma.user.upsert({
    where: { email: 'sp-ops@sp-demo.example.com' },
    update: {},
    create: {
      firstName: 'SP',
      lastName: 'Operations',
      email: 'sp-ops@sp-demo.example.com',
      passwordHash: HASH,
      role: UserRole.sp_ops,
      orgId: spOrg.id,
    },
  });
  await prisma.user.upsert({
    where: { email: 'sp-viewer@sp-demo.example.com' },
    update: {},
    create: {
      firstName: 'SP',
      lastName: 'Viewer',
      email: 'sp-viewer@sp-demo.example.com',
      passwordHash: HASH,
      role: UserRole.sp_viewer,
      orgId: spOrg.id,
    },
  });
  await prisma.user.upsert({
    where: { email: 'sp-report@sp-demo.example.com' },
    update: {},
    create: {
      firstName: 'SP',
      lastName: 'Reports',
      email: 'sp-report@sp-demo.example.com',
      passwordHash: HASH,
      role: UserRole.sp_report,
      orgId: spOrg.id,
    },
  });
  console.log('  ? SP users (sp_admin, sp_ops, sp_viewer, sp_report)');

  // Look up DC1-IAD site for hop references
  const spDemoSite = await prisma.site.findFirst({ where: { code: 'DC1-IAD' } });

  const xcStatuses = [
    {
      status: 'completed',
      mrc: 450,
      nrc: 500,
      dateCompleted: new Date('2024-03-15'),
      year: 2024,
      quarter: 1,
    },
    {
      status: 'completed',
      mrc: 320,
      nrc: 200,
      dateCompleted: new Date('2024-06-20'),
      year: 2024,
      quarter: 2,
    },
    { status: 'in_progress', mrc: 600, nrc: 750, year: 2024, quarter: 4 },
    { status: 'in_progress', mrc: 280, nrc: 300, year: 2025, quarter: 1 },
    { status: 'draft', mrc: null, nrc: null, year: 2025, quarter: 2 },
    { status: 'submitted', mrc: 500, nrc: 400, year: 2025, quarter: 2 },
    { status: 'cancelled', mrc: 150, nrc: 100, year: 2024, quarter: 3 },
    {
      status: 'disconnected',
      mrc: 200,
      nrc: 250,
      dateCompleted: new Date('2023-10-01'),
      dateDisconnected: new Date('2024-01-01'),
      year: 2023,
      quarter: 4,
    },
  ] as const;

  for (let i = 0; i < xcStatuses.length; i++) {
    const s = xcStatuses[i];
    const xcId = `SP-DEMO-XC-${String(i + 1).padStart(4, '0')}`;
    const existing = await prisma.dedicatedCrossConnect.findFirst({
      where: { crossConnectId: xcId },
    });
    if (!existing) {
      await prisma.dedicatedCrossConnect.create({
        data: {
          crossConnectId: xcId,
          organizationId: spOrg.id,
          createdById: spAdminUser.id,
          status: s.status as any,
          orderingCompany: `Carrier ${i + 1}`,
          circuitId: `CKT-${100 + i}`,
          cableType: i % 2 === 0 ? 'SMF' : 'MMF',
          customerType: i % 3 === 0 ? 'enterprise' : 'carrier',
          mrc: s.mrc ? new Prisma.Decimal(s.mrc) : null,
          nrc: s.nrc ? new Prisma.Decimal(s.nrc) : null,
          year: s.year,
          quarter: s.quarter,
          siteId: spDemoSite?.id ?? null,
          dateCompleted: (s as any).dateCompleted ?? null,
          disconnectionDate: (s as any).dateDisconnected ?? null,
          hops: {
            create: [
              {
                hopNumber: 1,
                room: `MMR`,
                rack: `A${i + 1}`,
                device: `PATCH-A${i + 1}`,
                port: `01`,
              },
              {
                hopNumber: 2,
                room: `TC-B1`,
                rack: `B${i + 1}`,
                device: `PATCH-B${i + 1}`,
                port: `01`,
              },
            ],
          },
        },
      });
    }
  }
  console.log('  ✓ 8 DedicatedCrossConnect records');

  // ── Bulk 500 SP cross-connects (load test data) ──────────────────────────
  const bulkStatuses = ['draft', 'submitted', 'in_progress', 'completed', 'disconnected', 'cancelled'] as const;
  const bulkCompanies = [
    'NTT Communications', 'SoftBank', 'KDDI', 'Internet Initiative Japan',
    'Equinix Japan', 'Digital Realty Tokyo', 'Nexcenter', 'Colt Technology Japan',
    'Zayo Japan', 'NEC Networks', 'Fujitsu Network', 'Tata Communications JP',
    'PCCW Global JP', 'Telstra Japan', 'BT Japan',
  ];
  const bulkCustomerTypes = ['enterprise', 'carrier', 'cloud'];
  const bulkCableTypes = ['SMF', 'MMF'];

  const bulkXcs: Prisma.DedicatedCrossConnectCreateManyInput[] = [];
  for (let i = 0; i < 500; i++) {
    const status = bulkStatuses[i % bulkStatuses.length];
    const year = 2022 + (i % 4);
    const quarter = (i % 4) + 1;
    const hasMrc = status !== 'draft';
    const mrc = hasMrc ? 50000 + (i % 20) * 25000 : null;
    const nrc = hasMrc ? 100000 + (i % 15) * 50000 : null;
    const isComplete = status === 'completed' || status === 'disconnected';
    const month = String(Math.min(quarter * 3, 12)).padStart(2, '0');
    bulkXcs.push({
      crossConnectId: `SP-BULK-XC-${String(i + 1).padStart(4, '0')}`,
      organizationId: spOrg.id,
      createdById: spAdminUser.id,
      status: status as any,
      orderingCompany: bulkCompanies[i % bulkCompanies.length],
      circuitId: `CKT-BULK-${1000 + i}`,
      cableType: bulkCableTypes[i % bulkCableTypes.length],
      customerType: bulkCustomerTypes[i % bulkCustomerTypes.length],
      mrc: mrc ? new Prisma.Decimal(mrc) : null,
      nrc: nrc ? new Prisma.Decimal(nrc) : null,
      year,
      quarter,
      siteId: spDemoSite?.id ?? null,
      dateCompleted: isComplete ? new Date(`${year}-${month}-15`) : null,
      disconnectionDate: status === 'disconnected' ? new Date(`${year}-${month}-28`) : null,
    });
  }
  await prisma.dedicatedCrossConnect.createMany({ data: bulkXcs, skipDuplicates: true });
  console.log('  ✓ 500 bulk DedicatedCrossConnect records (load test)');

  // Support tickets
  const ticketData = [
    {
      subject: 'Circuit CKT-100 intermittent loss',
      category: 'issue',
      priority: 'high',
      status: 'open',
    },
    {
      subject: 'Request additional 10G port',
      category: 'suggestion',
      priority: 'medium',
      status: 'in_progress',
    },
    { subject: 'Invoice discrepancy Q1', category: 'billing', priority: 'low', status: 'resolved' },
  ];
  for (const t of ticketData) {
    const exists = await prisma.supportTicket.findFirst({
      where: { subject: t.subject, organizationId: spOrg.id },
    });
    if (!exists) {
      await prisma.supportTicket.create({
        data: {
          organizationId: spOrg.id,
          createdById: spAdminUser.id,
          subject: t.subject,
          description: `Demo ticket: ${t.subject}`,
          category: t.category as any,
          priority: t.priority as any,
          status: t.status as any,
        },
      });
    }
  }
  console.log('  ? 3 SupportTicket records');

  console.log(`
✅  Seed complete!

Demo credentials  (password: changeme123!)
  admin@crossconnect.local      super_admin
  ops@crossconnect.local        ops_manager
  tech@crossconnect.local       ops_technician
  alice@acme.example.com        customer_admin  (Acme Corp)
  bob@acme.example.com          customer_orderer (Acme Corp)
  dave@acme.example.com         customer_viewer (Acme Corp)
  carol@globex.example.com      customer_admin  (Globex Industries)
  customer@acme.example         customer_admin  (legacy alias)
  sp-admin@sp-demo.example.com  sp_admin        (Demo Service Partner)
  sp-ops@sp-demo.example.com    sp_ops          (Demo Service Partner)
  sp-viewer@sp-demo.example.com sp_viewer       (Demo Service Partner)
  sp-report@sp-demo.example.com sp_report       (Demo Service Partner)

Orders:
  XCO-DEMO-001  draft
  XCO-DEMO-002  submitted
  XCO-DEMO-003  under_review
  XCO-DEMO-004  approved → service XCS-DEMO-0001 (provisioning)
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
