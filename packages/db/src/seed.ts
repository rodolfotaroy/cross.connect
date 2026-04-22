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
  const bulkStatuses = [
    'draft',
    'submitted',
    'in_progress',
    'completed',
    'disconnected',
    'cancelled',
  ] as const;
  const bulkCompanies = [
    'NTT Communications',
    'SoftBank',
    'KDDI',
    'Internet Initiative Japan',
    'Equinix Japan',
    'Digital Realty Tokyo',
    'Nexcenter',
    'Colt Technology Japan',
    'Zayo Japan',
    'NEC Networks',
    'Fujitsu Network',
    'Tata Communications JP',
    'PCCW Global JP',
    'Telstra Japan',
    'BT Japan',
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

  // ── Support tickets (130 sample tickets: 65 SP + 65 OP) ─────────────────

  // Ensure counter row exists (migration normally creates it, but guard for fresh runs)
  await prisma.ticketCounter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastUsed: 0 },
  });

  type TicketSeed = {
    subject: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    portal: 'sp' | 'op';
    orgKey: 'sp' | 'acme' | 'globex';
    creatorKey: 'spAdmin' | 'admin';
    resolutionNote?: string;
  };

  const ticketSeeds: TicketSeed[] = [
    // ── SP Portal tickets ─────────────────────────────────────────────────
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-100 intermittent signal loss',
      description:
        'Our circuit CKT-100 is experiencing periodic signal drops, approximately 3–4 times per hour. Impact is 30–60 seconds each time. Began after last nights maintenance window.',
      category: 'issue',
      priority: 'high',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Request additional 10G port in MMR-1',
      description:
        'We are planning to expand our cross-connect footprint and would like to request availability of 10G LC duplex SM ports in MMR-1. Please advise on lead time and cost.',
      category: 'suggestion',
      priority: 'medium',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Invoice discrepancy for Q1 2026',
      description:
        'The Q1 invoice shows MRC of ¥1,200,000 but our records indicate ¥980,000. The difference appears to relate to two circuits that were disconnected in February but are still being billed.',
      category: 'billing',
      priority: 'low',
      status: 'resolved',
      resolutionNote:
        'Credit note CN-2026-0031 issued for ¥220,000 covering February and March. Applied to next invoice.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-210 complete outage — critical',
      description:
        'CKT-210 is completely down as of 08:42 JST. This is a production circuit carrying live customer traffic. Require immediate escalation and technician dispatch.',
      category: 'issue',
      priority: 'critical',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'OTDR test results for CKT-055',
      description:
        'Requesting OTDR test documentation for circuit CKT-055 installed last month. Needed for our internal compliance audit.',
      category: 'access',
      priority: 'low',
      status: 'closed',
      resolutionNote:
        'OTDR results document attached to ticket. Circuit shows <0.5 dB loss end to end.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Scheduled maintenance — 2026-05-10 window',
      description:
        'Can you confirm whether the 2026-05-10 02:00–06:00 JST maintenance window will affect circuits CKT-300 through CKT-315? We need to notify our customers in advance.',
      category: 'other',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'LOA required for new cross-connect',
      description:
        'Requesting a Letter of Authorization (LOA) for a new 1G cross-connect from our cage SUITE-4 to carrier ATTNET panel A-ODF-01 port 14.',
      category: 'access',
      priority: 'medium',
      status: 'resolved',
      resolutionNote: 'LOA issued and uploaded to document portal. Reference LOA-2026-0072.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'High BER on CKT-178 since firmware update',
      description:
        'Since the carrier edge router firmware update on 2026-04-15, we are seeing elevated bit error rates on CKT-178. BER is currently 1e-7, threshold is 1e-9.',
      category: 'issue',
      priority: 'high',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Billing account contact update',
      description:
        'Please update our billing contact email from finance-old@sp-demo.example.com to finance@sp-demo.example.com and include CFO on CC.',
      category: 'billing',
      priority: 'low',
      status: 'closed',
      resolutionNote: 'Billing contact updated in CRM. Change effective from next billing cycle.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-042 latency spike investigation',
      description:
        'Our monitoring shows RTT on CKT-042 increased from 1.2ms to 4.8ms starting at 14:00 JST today. No config changes were made on our side. Please investigate.',
      category: 'issue',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Request for cage access during maintenance',
      description:
        'Our engineer needs badged access to SUITE-4 between 01:00–03:00 JST on 2026-04-28 for hardware replacement. Please confirm access procedure.',
      category: 'access',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Port utilization report Q1 2026',
      description:
        'Requesting a full port utilization report for all our cross-connects for Q1 2026, including uptime statistics and any noted anomalies.',
      category: 'suggestion',
      priority: 'low',
      status: 'resolved',
      resolutionNote:
        'Q1 utilization report emailed to sp-admin@sp-demo.example.com. Average utilization 78%.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-099 flap alarm — need root cause',
      description:
        'CKT-099 has generated 23 flap alarms in the past 48 hours. Each flap lasts under 2 seconds. We need a root cause analysis and remediation plan.',
      category: 'issue',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Incorrect NRC on new circuit invoice',
      description:
        'Invoice INV-2026-0312 shows NRC of ¥150,000 for CKT-305 but the agreed price per our contract is ¥100,000. Please review and reissue.',
      category: 'billing',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Fiber bend radius concern in SUITE-4',
      description:
        'During a routine visual inspection we noticed what appears to be a tight fiber bend on three cross-connect cables near the top of our rack. Can a technician assess?',
      category: 'issue',
      priority: 'medium',
      status: 'resolved',
      resolutionNote:
        'Technician inspected and replaced cable guides. No signal loss measured. Cables rerouted.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Request 100G DWDM wavelength availability',
      description:
        'We are evaluating a future upgrade to 100G DWDM. Can you confirm available wavelengths on the MMR-1 to TC-B1 backbone and required lead time?',
      category: 'suggestion',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Emergency: CKT-001 down — all services affected',
      description:
        'CKT-001, our primary uplink circuit, has been completely unavailable since 22:15 JST. All downstream customer services are down. Require immediate dispatch.',
      category: 'issue',
      priority: 'critical',
      status: 'resolved',
      resolutionNote:
        'Physical fiber break located in TC-B1 tray. Repaired and circuit restored 00:47 JST. Total outage 2h 32min.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Add second engineer to portal access',
      description:
        'Please add engineer Kenji Nakamura (kenji@sp-demo.example.com) as sp_ops user to our portal. Provide same permissions as existing ops users.',
      category: 'access',
      priority: 'low',
      status: 'closed',
      resolutionNote: 'User account created. Welcome email sent to kenji@sp-demo.example.com.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-250 power level degradation',
      description:
        'Optical receive power on CKT-250 has dropped from -5 dBm to -12 dBm over the past two weeks. Currently within threshold but trending toward alarm.',
      category: 'issue',
      priority: 'medium',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'SLA compliance report for March 2026',
      description:
        'Requesting the March 2026 SLA compliance report for all circuits under our agreement. Specifically interested in availability percentage and any SLA credits due.',
      category: 'other',
      priority: 'low',
      status: 'resolved',
      resolutionNote:
        'March 2026 SLA report attached. Overall availability: 99.97%. No credits triggered.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Incorrectly labeled port on panel A-ODF-02',
      description:
        'Port 18 on panel A-ODF-02 is labeled as cross-connect to our circuit but our patch is actually on port 19. Please update records to match physical configuration.',
      category: 'issue',
      priority: 'low',
      status: 'closed',
      resolutionNote:
        'Physical verification completed. Panel label corrected and inventory updated.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Quote request for additional rack space',
      description:
        'We are projecting significant growth in H2 2026 and would like a formal quote for an additional half-rack in SUITE-4 or nearby space.',
      category: 'suggestion',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-175 CRC error storm',
      description:
        'CKT-175 has been generating CRC errors at a rate of ~10,000/minute for the past 4 hours. Downstream services impacted. Urgent investigation required.',
      category: 'issue',
      priority: 'critical',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Annual billing review meeting request',
      description:
        'We would like to schedule our annual contract and billing review with your accounts team. Please suggest available dates in May 2026.',
      category: 'billing',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-088 wavelength mismatch after grooming',
      description:
        'After the network grooming event on 2026-04-10, CKT-088 appears to be on the wrong wavelength. Our transponder is showing RX power but unable to lock.',
      category: 'issue',
      priority: 'high',
      status: 'resolved',
      resolutionNote:
        'Wavelength reassigned to original channel 32 (1551.72nm). Circuit verified error-free.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Bulk cross-connect order — 20 new circuits',
      description:
        'We are planning a bulk order for 20 new 1G SM cross-connects between SUITE-4 and carrier EQFAB panels. Requesting pre-order feasibility and estimated provisioning timeline.',
      category: 'suggestion',
      priority: 'medium',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Missing test documentation for CKT-322',
      description:
        'CKT-322 was provisioned 2 weeks ago but we have not received the OTDR and optical power test documents. Required for customer sign-off.',
      category: 'other',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Duplicate billing for CKT-155 in February',
      description:
        'February invoice shows CKT-155 billed twice under line items 14 and 28. Total overcharge ¥80,000. Please issue credit note.',
      category: 'billing',
      priority: 'medium',
      status: 'resolved',
      resolutionNote:
        'Duplicate billing confirmed. Credit CN-2026-0044 for ¥80,000 raised and applied.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-190 noise floor elevated post-maintenance',
      description:
        'Following the 2026-04-20 maintenance window, noise floor on CKT-190 has increased by 3 dB. While not yet at alarm threshold, proactive investigation is requested.',
      category: 'issue',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Request diversity path for CKT-001',
      description:
        'Following last months CKT-001 outage, we wish to implement a diverse path for resilience. Please provide options and costs for a fully diverse secondary route.',
      category: 'suggestion',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Portal export feature request — CSV download',
      description:
        'The reports section would be greatly improved with a CSV export option for the cross-connect list and financial summary. Can this be added?',
      category: 'suggestion',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-333 newly provisioned — power too high',
      description:
        'The launch power on newly provisioned CKT-333 appears to be set too high (+5 dBm). Our specification calls for 0 dBm ±1. Please adjust at your ODF.',
      category: 'issue',
      priority: 'medium',
      status: 'resolved',
      resolutionNote: 'Attenuator adjusted. Launch power verified at -0.2 dBm. Circuit cleared.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Carrier LOA expiry notification',
      description:
        'Received notification that our LOA for ATTNET cross-connects expires in 30 days. Please advise on renewal process and required documents.',
      category: 'other',
      priority: 'medium',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-410 down — hardware replacement request',
      description:
        'Optical transceiver on our end of CKT-410 has failed. Need technician access for hardware swap. Can you arrange escort to SUITE-4 for 2026-04-25?',
      category: 'issue',
      priority: 'high',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Contract renewal terms inquiry',
      description:
        'Our current MSA expires 2026-12-31. We would like to begin renewal discussions and understand pricing for the next contract period.',
      category: 'billing',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-077 degraded performance — urgent',
      description:
        'CKT-077 throughput has dropped to 40% of contracted capacity since 09:00 JST. Revenue-impacting. Need immediate diagnosis.',
      category: 'issue',
      priority: 'critical',
      status: 'resolved',
      resolutionNote:
        'Congestion event traced to upstream trunk. Capacity expanded. CKT-077 restored to full throughput.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Update billing address for new fiscal year',
      description:
        'Please update our billing address to: SP Demo Partner Ltd, 3-1-1 Marunouchi, Chiyoda-ku, Tokyo 100-0005, Japan — effective 2026-04-01.',
      category: 'billing',
      priority: 'low',
      status: 'closed',
      resolutionNote: 'Billing address updated. Confirmed with finance team via email.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-202 and CKT-203 asymmetric latency',
      description:
        'Unusual asymmetric latency observed: CKT-202 eastbound 2ms / westbound 8ms; CKT-203 the reverse. These circuits share the same physical route. Investigation needed.',
      category: 'issue',
      priority: 'medium',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Add IP prefix to BGP community documentation',
      description:
        'Requesting that our new IP prefix 203.0.113.0/24 be added to the NOC reference sheet for our cross-connect BGP sessions.',
      category: 'other',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-500 loop-back test coordination',
      description:
        'We need to arrange a loop-back test on CKT-500 to validate a circuit before go-live for a major customer. Please confirm available test windows.',
      category: 'other',
      priority: 'medium',
      status: 'resolved',
      resolutionNote:
        'Loop-back test completed 2026-04-18 03:00–04:00 JST. Results: PASS. BER < 1e-12.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-044 panel label discrepancy with invoice',
      description:
        'The panel label on CKT-044 cross-connect shows port C-14 but our invoice references port C-16. Please verify physical and billing records are aligned.',
      category: 'billing',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Escalation: CKT-288 third outage this month',
      description:
        'CKT-288 has now experienced its third unplanned outage this month. Each time with no clear root cause. Requesting executive-level escalation and 30-day RCA.',
      category: 'issue',
      priority: 'critical',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Request for advance topology diagram',
      description:
        'For an upcoming DR drill we need an up-to-date physical topology diagram of our cage SUITE-4 and all associated cross-connects. PDF format preferred.',
      category: 'other',
      priority: 'medium',
      status: 'resolved',
      resolutionNote:
        'Physical topology diagram generated and emailed. File: DC1-SUITE4-topology-20260419.pdf',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-066 power calibration request after splice',
      description:
        'CKT-066 was recently re-spliced by your team. We request a full optical calibration including launch and receive power measurements at both ends.',
      category: 'issue',
      priority: 'medium',
      status: 'closed',
      resolutionNote:
        'Calibration completed. Launch -1 dBm, receive -8.5 dBm. Both within spec. Docs uploaded.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'NRC waiver request for early renewal circuits',
      description:
        'We are renewing 15 circuits 6 months ahead of term. Per section 4.2 of our agreement, we request NRC waiver for early renewals. Please confirm applicable credits.',
      category: 'billing',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Alert threshold misconfigured on monitoring portal',
      description:
        'The monitoring portal alert threshold for CKT-150 is set to -20 dBm but should be -14 dBm per our specification. Please correct to avoid missed alarms.',
      category: 'issue',
      priority: 'low',
      status: 'resolved',
      resolutionNote:
        'Alert threshold updated to -14 dBm for CKT-150. Tested and confirmed alarm triggers correctly.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Request for emergency after-hours contact list',
      description:
        'Please provide the updated after-hours NOC escalation list with mobile numbers and escalation SLAs for P1 incidents.',
      category: 'other',
      priority: 'medium',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-399 chromatic dispersion compensation needed',
      description:
        'CKT-399 100G circuit shows excessive chromatic dispersion post-amplifier. Pre-compensation module may be required. Requesting feasibility assessment.',
      category: 'issue',
      priority: 'high',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'January billing — three circuits not billed',
      description:
        'Review of January invoice shows circuits CKT-501, CKT-502, and CKT-503 are not listed despite being active for the full month. Please reissue corrected invoice.',
      category: 'billing',
      priority: 'medium',
      status: 'closed',
      resolutionNote:
        'Omission confirmed. Corrected invoice INV-2026-0298C issued. Circuits added at contracted MRC.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Equipment delivery coordination for cage expansion',
      description:
        'We are shipping new ODF equipment arriving 2026-04-30. Need loading dock reservation, security escort, and delivery window confirmation.',
      category: 'access',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-127 jitter exceeds SLA threshold',
      description:
        'CKT-127 jitter has been averaging 8ms over the past 3 days. Our SLA specifies ≤2ms. This is triggering SLA breach. Please investigate urgently.',
      category: 'issue',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Confirm VLAN tagging on new handoff circuits',
      description:
        'Newly provisioned circuits CKT-600, CKT-601, CKT-602 need VLAN 100 tagged at the demarc. Please confirm this was configured during provisioning.',
      category: 'other',
      priority: 'medium',
      status: 'resolved',
      resolutionNote:
        'VLAN 100 tagging confirmed on all three circuits. Configuration verified by network team.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Request formal capacity planning meeting',
      description:
        'As we approach 80% utilization on several circuits, we would like a formal capacity planning session with your engineering team for the next 12 months.',
      category: 'suggestion',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-777 — wrong fiber type patched',
      description:
        'Investigation revealed CKT-777 was patched with OM3 multimode fiber when the specification calls for OS2 single-mode. Distance is 220m — currently marginal. Needs immediate correction.',
      category: 'issue',
      priority: 'critical',
      status: 'resolved',
      resolutionNote:
        'Fiber replaced with OS2 SM. Loss measured at 0.3 dB. Circuit fully operational.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Feedback on new portal interface',
      description:
        'The recently redesigned portal is generally much better. One suggestion: the cross-connect list could benefit from a column for current signal strength to aid quick diagnosis.',
      category: 'suggestion',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-089 scheduled decommission notification',
      description:
        'We plan to decommission CKT-089 on 2026-05-01. Please confirm the required notice period, return port procedure, and whether any credits apply for early termination.',
      category: 'other',
      priority: 'low',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Disaster recovery test — circuit failover validation',
      description:
        'Requesting a coordinated DR test on 2026-05-15 to validate failover from CKT-001 to CKT-002 (diversity path). Need NOC support during the 2-hour test window.',
      category: 'other',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Billing portal login failure',
      description:
        'Our finance team is unable to log into the billing portal since the password reset last week. They are receiving "account locked" error. Please unlock and reset credentials.',
      category: 'access',
      priority: 'medium',
      status: 'closed',
      resolutionNote:
        'Account unlocked and temporary password issued to finance@sp-demo.example.com.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-340 downstream packet loss 2%',
      description:
        'Seeing consistent 2% downstream packet loss on CKT-340 for the past 6 hours. Upstream appears clean. Need investigation at your ODF/amplifier stage.',
      category: 'issue',
      priority: 'high',
      status: 'open',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Q4 2025 annual utilization report',
      description:
        'Requesting Q4 2025 full utilization and availability statistics for all circuits in our portfolio. Format: Excel spreadsheet preferred, by circuit and monthly.',
      category: 'other',
      priority: 'low',
      status: 'resolved',
      resolutionNote: 'Q4 2025 report emailed. 48 circuits reported. Average availability 99.95%.',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'CKT-211 label swap after panel replacement',
      description:
        'Following replacement of panel ODF-B4 last week, CKT-211 and CKT-212 appear to have been swapped. Our monitoring confirms cross-patching. Please correct physically.',
      category: 'issue',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'sp',
      orgKey: 'sp',
      creatorKey: 'spAdmin',
      subject: 'Pre-approval for planned works in cage',
      description:
        'Requesting pre-approval for planned works in SUITE-4 from 2026-05-20 to 2026-05-22. Work involves ODF rearrangement, no circuit outages anticipated.',
      category: 'access',
      priority: 'medium',
      status: 'open',
    },

    // ── OP Portal tickets (Acme Corp) ────────────────────────────────────
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — billing discrepancy January invoice',
      description:
        'Acme Corp disputes line item 7 on January invoice. Circuit XCS-ACME-001 listed at ¥250,000 MRC; contracted rate is ¥200,000. Please review and issue credit.',
      category: 'billing',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — connectivity issue SUITE-4 cage port',
      description:
        'Acme Corp reports no signal on port 04 of their rack top-of-rack. May be a cross-connect patching error. Engineer onsite available for coordination.',
      category: 'issue',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — request LOA for carrier extension',
      description:
        'Acme Corp needs a new LOA to extend their ATTNET cross-connect from patch panel A-ODF-01 to the newly installed carrier extension. Needed within 5 days.',
      category: 'access',
      priority: 'medium',
      status: 'resolved',
      resolutionNote: 'LOA issued reference LOA-2026-0091. Delivered to alice@acme.example.com.',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — complete outage on primary circuit',
      description:
        'Acme primary cross-connect to internet exchange went completely down at 03:22 JST. All customer-facing services impacted. Immediate escalation required.',
      category: 'issue',
      priority: 'critical',
      status: 'resolved',
      resolutionNote:
        'Physical connector issue at patch panel. Re-terminated and circuit restored 04:05 JST. Outage 43 minutes.',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — new cross-connect order feasibility',
      description:
        'Acme Corp is requesting feasibility for 3 new 10G cross-connects between SUITE-4 and carrier EQFAB in Q3 2026. Please advise timeline and pricing.',
      category: 'suggestion',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — SLA breach Q1 — credit claim',
      description:
        'Acme Corp reports availability of 99.87% in Q1 against contractual 99.95% SLA. Submitting formal SLA credit claim per Section 8.3 of their agreement.',
      category: 'billing',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — scheduled maintenance notification',
      description:
        'Acme Corp requests notification of any planned maintenance affecting their cage in May 2026. They require 10 business days advance notice per their agreement.',
      category: 'other',
      priority: 'medium',
      status: 'closed',
      resolutionNote:
        'May 2026 maintenance calendar emailed. Three windows scheduled: 5/3, 5/17, 5/24 all 02:00–05:00 JST.',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — cage access for new staff onboarding',
      description:
        'Acme Corp requests building access and biometric enrollment for two new engineers: Tom Hanson and Maya Patel. Target access date: 2026-05-01.',
      category: 'access',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — mislabeled circuit in portal',
      description:
        'Portal shows circuit XCS-ACME-003 connecting to SUITE-4 rack B port 12, but physically it is rack B port 14. Inventory records need correction.',
      category: 'issue',
      priority: 'low',
      status: 'resolved',
      resolutionNote:
        'Port assignment corrected in inventory. XCS-ACME-003 now correctly maps to rack B port 14.',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — power usage report Q1 2026',
      description:
        'Acme Corp facility manager requesting total power consumption for SUITE-4 cage for Q1 2026 for internal ESG reporting.',
      category: 'other',
      priority: 'low',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — packet drops detected since fiber splice',
      description:
        'Since the emergency fiber splice on 2026-04-12, Acme is seeing ~0.1% random packet drops on XCS-ACME-002. Likely related to splice quality. Needs investigation.',
      category: 'issue',
      priority: 'high',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — request for remote hands service',
      description:
        'Acme Corp requires remote hands support to replace a failed SFP module in rack B. Module is pre-staged in their cage. Estimated 30 minutes of work.',
      category: 'other',
      priority: 'medium',
      status: 'resolved',
      resolutionNote:
        'Remote hands completed. SFP replaced and circuit brought back up. 25 minutes total. Confirmation sent.',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — contract amendment for additional circuits',
      description:
        'Acme Corp wishes to amend their master agreement to add 5 additional cross-connect entitlements at current contracted rates. Please initiate the amendment process.',
      category: 'billing',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — latency spike to cloud gateway',
      description:
        'Acme Corp is reporting 15ms RTT spikes on their AWS OnRamp cross-connect starting at 07:30 JST. Normal RTT is 2ms. Customer impact confirmed.',
      category: 'issue',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — physical security audit documentation',
      description:
        'Acme Corp security team requires datacenter physical security documentation for their annual ISO 27001 audit. Please provide relevant certification and controls documentation.',
      category: 'other',
      priority: 'medium',
      status: 'closed',
      resolutionNote:
        'ISO 27001 certificate and physical security summary document emailed to alice@acme.example.com.',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — incorrect termination type on new install',
      description:
        'New cross-connect XCS-ACME-011 was installed with LC connectors but Acme specified SC. Need re-termination with correct connector type. Minor service impact expected.',
      category: 'issue',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — escalation: repeated billing errors',
      description:
        'Acme Corp has received incorrect invoices for 3 consecutive months. Each time credits were required. They are requesting an executive-level review and systematic fix.',
      category: 'billing',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — new user portal access request',
      description:
        'Acme Corp requests customer portal access for their new network manager: james.wong@acme.example.com. Role: customer_viewer.',
      category: 'access',
      priority: 'low',
      status: 'resolved',
      resolutionNote:
        'User account created for james.wong@acme.example.com with customer_viewer role. Welcome email sent.',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — circuit inventory reconciliation needed',
      description:
        'Acme Corp has identified 4 circuits in their local inventory that do not appear in the CrossConnect portal. They need these cross-referenced and either added or clarified.',
      category: 'other',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — OTDR test request for 3 new circuits',
      description:
        'Acme Corp requests formal OTDR test reports for XCS-ACME-008, XCS-ACME-009, XCS-ACME-010 installed this quarter. Required for their internal acceptance testing protocol.',
      category: 'issue',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'acme',
      creatorKey: 'admin',
      subject: 'Acme — emergency: fire suppression test impact',
      description:
        'Acme Corp reports that the fire suppression test scheduled for next week may require their cage to be powered down. Requesting advance notice and impact assessment for all circuits.',
      category: 'other',
      priority: 'high',
      status: 'in_progress',
    },

    // ── OP Portal tickets (Globex Industries) ────────────────────────────
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — Q4 reconciliation billing dispute',
      description:
        'Globex Industries disputes ¥340,000 in Q4 charges. Three circuits were listed as active but Globex records show disconnect orders were processed. Requesting itemized breakdown.',
      category: 'billing',
      priority: 'high',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — critical: all circuits down SUITE-7',
      description:
        'Complete loss of all cross-connects at SUITE-7 as of 11:17 JST. Globex has confirmed their equipment is operational. Problem appears to be at patch panel level. Immediate dispatch needed.',
      category: 'issue',
      priority: 'critical',
      status: 'resolved',
      resolutionNote:
        'Power surge tripped circuit breaker on patch panel row 3. Breaker reset, all circuits restored 11:49 JST. RCA in progress.',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — new cage expansion request',
      description:
        'Globex Industries is planning significant expansion and requires an additional full rack adjacent to their current SUITE-7 allocation. Quote and timeline requested.',
      category: 'suggestion',
      priority: 'medium',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — latency SLA breach notification',
      description:
        'Globex is formally notifying of a latency SLA breach on circuit XCS-GLOBEX-005. 99th percentile RTT was 18ms for 3 consecutive days against the 5ms SLA. Credit claim attached.',
      category: 'billing',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — access control update',
      description:
        'Globex requires badge access deactivation for former employee Robert Chen (emp ID: GBX-1142) and activation for new hire Priya Sharma (priya@globex.example.com) effective immediately.',
      category: 'access',
      priority: 'medium',
      status: 'resolved',
      resolutionNote:
        'Robert Chen access deactivated. Priya Sharma enrolled and access activated. Confirmation sent.',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — intermittent loss on XCS-GLOBEX-003',
      description:
        'XCS-GLOBEX-003 has been flapping approximately once every 4 hours for the past 5 days. Each event lasts 2–15 minutes. Investigation and root cause needed urgently.',
      category: 'issue',
      priority: 'high',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — planned circuit decommission batch',
      description:
        'Globex Industries plans to decommission 8 circuits by end of Q2 2026. List attached. Requesting confirmation of notice period requirements and any early termination fees.',
      category: 'other',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — invoice currency error',
      description:
        'The March 2026 invoice for Globex was issued in USD rather than JPY as per their contract. All amounts are correct but currency conversion is introducing discrepancy. Please reissue in JPY.',
      category: 'billing',
      priority: 'medium',
      status: 'resolved',
      resolutionNote:
        'Invoice reissued in JPY. Original USD invoice voided. New invoice INV-2026-0341-JPY sent.',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — remote hands: equipment installation',
      description:
        'Globex requires remote hands to install a 2RU switch shipped to their SUITE-7 cage. Equipment has arrived. Need mounting, cable management, and power connection. Est. 2 hours.',
      category: 'other',
      priority: 'medium',
      status: 'resolved',
      resolutionNote:
        'Equipment installed. Switch powered up and cabled per customer specifications. Completion report sent.',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — asymmetric bandwidth issue',
      description:
        'Globex is experiencing consistently lower upload bandwidth (40% of contracted) while download is nominal. Suspected traffic policing misconfiguration at demarc. Needs investigation.',
      category: 'issue',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — compliance documentation request',
      description:
        'Globex legal team requires SOC 2 Type II report and data residency certification for their vendor compliance register. Documents needed before 2026-05-15.',
      category: 'other',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — dual-homed path planning',
      description:
        'Globex wishes to implement dual-homed connectivity via two geographically diverse uplinks. Requesting options for physically diverse cross-connect paths and associated pricing.',
      category: 'suggestion',
      priority: 'medium',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — incorrect port assignment in portal',
      description:
        'Portal shows XCS-GLOBEX-007 on panel ODF-C port 22, but our NOC records indicate port 24. Discrepancy discovered during a circuit trace. Please verify and correct inventory.',
      category: 'issue',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — NRC billing on previously waived circuits',
      description:
        'Two circuits that had NRC waiver per amendment 3 of the MSA are now showing NRC charges on the April invoice. Please review MSA amendment 3 and issue corrective credit.',
      category: 'billing',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — emergency generator test impact query',
      description:
        'Globex was not notified of the emergency generator test performed on 2026-04-18. Their monitoring shows micro-outages of 200–500ms during the 45-minute test. Requesting incident report.',
      category: 'issue',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — cooling issue in SUITE-7',
      description:
        'Globex rack temperature sensors are showing 35°C, above their equipment threshold of 30°C. Possible CRAC unit issue. Requesting immediate inspection of cooling in SUITE-7.',
      category: 'issue',
      priority: 'critical',
      status: 'resolved',
      resolutionNote:
        'CRAC unit B2 failed. Spare unit activated and load balanced. Temperature normalized to 26°C within 20 minutes.',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — annual physical security walkthrough',
      description:
        'As part of Globex annual security review, their CISO requests a guided walkthrough of all physical security controls at the datacenter. Please arrange for 2026-05-08.',
      category: 'access',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — customer portal feature gap: bulk export',
      description:
        'Globex network team notes that the customer portal lacks a bulk circuit export feature. This is required for their CMDB reconciliation process. Feature request.',
      category: 'suggestion',
      priority: 'low',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — XCS-GLOBEX-011 commission test failure',
      description:
        'New circuit XCS-GLOBEX-011 failed acceptance testing. BER is 1e-6 against required 1e-12. Circuit cannot be accepted in this state. Re-testing required after investigation.',
      category: 'issue',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — add additional IP transit circuit',
      description:
        'Globex Industries is expanding operations and requires one additional 10G IP transit cross-connect in Q2 2026. Please initiate the order process with their team.',
      category: 'suggestion',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — outage report for April incident',
      description:
        'Following the April 18 generator test micro-outage, Globex requires a formal Incident Report within 5 business days per their SLA agreement. Report has not been received.',
      category: 'other',
      priority: 'high',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — update emergency contact list',
      description:
        'Globex has updated their NOC emergency contacts. New primary: noc@globex.example.com +81-3-1234-5678; Secondary: backup-noc@globex.example.com. Please update in CRM.',
      category: 'other',
      priority: 'low',
      status: 'resolved',
      resolutionNote:
        'Emergency contacts updated in CRM and NOC ticketing system. Confirmed with carol@globex.example.com.',
    },
    {
      portal: 'op',
      orgKey: 'globex',
      creatorKey: 'admin',
      subject: 'Globex — XCS-GLOBEX-002 signal degrading trend',
      description:
        'Globex NOC observes a steady decline in receive optical power on XCS-GLOBEX-002 over 3 months (-0.5 dB/month). At current trend, will reach alarm threshold in 4 months.',
      category: 'issue',
      priority: 'medium',
      status: 'open',
    },

    // ── OP Portal tickets (SP Demo Partner, raised by operator) ──────────
    {
      portal: 'op',
      orgKey: 'sp',
      creatorKey: 'admin',
      subject: 'SP Demo — contract penalty waiver request',
      description:
        'SP Demo Partner formally requests waiver of early termination penalty for 5 circuits being decommissioned due to force majeure event. Legal documentation attached.',
      category: 'billing',
      priority: 'high',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'sp',
      creatorKey: 'admin',
      subject: 'SP Demo — new Point of Presence feasibility',
      description:
        'SP Demo Partner wishes to establish a new PoP in SUITE-4. Requesting feasibility study for 4 cross-connects and a dedicated half-rack allocation.',
      category: 'suggestion',
      priority: 'medium',
      status: 'open',
    },
    {
      portal: 'op',
      orgKey: 'sp',
      creatorKey: 'admin',
      subject: 'SP Demo — quarterly business review scheduling',
      description:
        'Time to schedule the Q2 2026 quarterly business review. Requesting a 2-hour slot with commercial and technical teams present in the first week of May 2026.',
      category: 'other',
      priority: 'low',
      status: 'resolved',
      resolutionNote:
        'QBR scheduled for 2026-05-07 10:00–12:00 JST. Calendar invite sent to all stakeholders.',
    },
    {
      portal: 'op',
      orgKey: 'sp',
      creatorKey: 'admin',
      subject: 'SP Demo — bulk billing statement error',
      description:
        'SP Demo Partners April bulk invoice lists 508 circuits but only 482 are currently active. 26 decommissioned circuits are still being billed. Requesting immediate correction.',
      category: 'billing',
      priority: 'critical',
      status: 'in_progress',
    },
    {
      portal: 'op',
      orgKey: 'sp',
      creatorKey: 'admin',
      subject: 'SP Demo — technical escalation path review',
      description:
        'SP Demo requests a review and update of the joint technical escalation path. Current document is from 2024 and does not reflect recent staffing changes on both sides.',
      category: 'other',
      priority: 'medium',
      status: 'open',
    },
  ];

  let ticketCount = 0;
  const orgMap = { sp: spOrg, acme: acmeOrg, globex: globexOrg };
  const userMap = { spAdmin: spAdminUser, admin: adminUser };

  for (const t of ticketSeeds) {
    const org = orgMap[t.orgKey];
    const creator = userMap[t.creatorKey];
    const exists = await prisma.supportTicket.findFirst({
      where: { subject: t.subject, organizationId: org.id },
    });
    if (!exists) {
      const counter = await prisma.ticketCounter.update({
        where: { id: 1 },
        data: { lastUsed: { increment: 1 } },
      });
      const prefix = t.portal === 'op' ? 'OP' : 'SP';
      const ticketNumber = `${prefix}${String(counter.lastUsed).padStart(6, '0')}`;
      await prisma.supportTicket.create({
        data: {
          ticketNumber,
          portal: t.portal,
          organizationId: org.id,
          createdById: creator.id,
          subject: t.subject,
          description: t.description,
          category: t.category as any,
          priority: t.priority as any,
          status: t.status as any,
          ...(t.resolutionNote ? { resolutionNote: t.resolutionNote } : {}),
        },
      });
      ticketCount++;
    }
  }
  console.log(
    `  ✓ ${ticketCount} new SupportTicket records seeded (${ticketSeeds.length} total templates)`,
  );

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
