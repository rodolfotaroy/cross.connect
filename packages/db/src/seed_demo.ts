/**
 * packages/db/src/seed_demo.ts — DEMO client seed
 *
 * Targets the organisation with code "DEMO" (must already exist in the DB).
 * Creates ~1,000 rows covering every major feature:
 *
 *   • Users            – sp_admin, sp_ops, sp_viewer, sp_report, sp_admin2
 *   • DedicatedXc      – 800 records across all 6 statuses, varied MRC/NRC,
 *                        cable types, customer types, A/Z-end locations, hops
 *   • SupportTickets   – 120 tickets across all categories / priorities / statuses
 *   • TicketComments   – 2-3 comments on a sample of tickets
 *   • BillingTrigger   – activation/disconnect/reroute events for completed XCs
 *
 * Run:
 *   cd packages/db
 *   npx ts-node --project tsconfig.json src/seed_demo.ts
 */

import * as path from 'path';
// Load DATABASE_URL from .env before Prisma initialises.
// ts-node does not auto-load .env; Prisma CLI does.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv') as { config: (opts?: { path?: string }) => void };
  // Try package-level .env first, then repo root.
  dotenv.config();
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
} catch {
  // dotenv not available — rely on environment variables being set externally
}

import * as bcrypt from 'bcryptjs';
import {
  DedicatedXcStatus,
  OrgType,
  Prisma,
  PrismaClient,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
} from './generated/client';

const prisma = new PrismaClient();

// ─── constants ───────────────────────────────────────────────────────────────

const DEMO_CODE = 'DEMO';
const PASSWORD = 'changeme123!';

const ORDERING_COMPANIES = [
  'NTT Communications',
  'SoftBank Corp',
  'KDDI Corporation',
  'Internet Initiative Japan',
  'Equinix Japan',
  'Digital Realty Tokyo',
  'Colt Technology Japan',
  'Zayo Group Japan',
  'NEC Networks & System Integration',
  'Fujitsu Network Solutions',
  'Tata Communications Japan',
  'PCCW Global Japan',
  'Telstra Japan',
  'BT Japan',
  'Lumen Technologies Japan',
  'Cogent Communications Japan',
  'Level 3 Japan',
  'Windstream Japan',
  'CenturyLink Japan',
  'HE.net Japan',
  'GTT Communications Japan',
  'PacketFabric Japan',
  'Megaport Japan',
  'Console Connect Japan',
  'IX Reach Japan',
];

const CUSTOMER_TYPES = ['enterprise', 'carrier', 'cloud'] as const;
const CABLE_TYPES = ['SMF', 'MMF', 'Cat6', 'DAC', 'Coax'] as const;

const ROOMS = ['MMR-1', 'MMR-2', 'TC-B1', 'TC-B2', 'SUITE-1', 'SUITE-2', 'SUITE-3', 'SUITE-4'];
const CAMPUSES = ['IAD-1', 'IAD-2', 'NY-1', 'LA-1', 'TYO-1', 'SIN-1'];
const BUILDINGS = ['Main', 'North', 'South', 'Annex'];
const FLOORS = ['1', '2', '3', 'B1', 'M'];

const XC_STATUSES: DedicatedXcStatus[] = [
  DedicatedXcStatus.draft,
  DedicatedXcStatus.submitted,
  DedicatedXcStatus.in_progress,
  DedicatedXcStatus.completed,
  DedicatedXcStatus.disconnected,
  DedicatedXcStatus.cancelled,
];

// Weight distribution so we have more completed/in_progress than cancelled
const STATUS_WEIGHTS = [
  { status: DedicatedXcStatus.draft, weight: 5 },
  { status: DedicatedXcStatus.submitted, weight: 8 },
  { status: DedicatedXcStatus.in_progress, weight: 15 },
  { status: DedicatedXcStatus.completed, weight: 50 },
  { status: DedicatedXcStatus.disconnected, weight: 15 },
  { status: DedicatedXcStatus.cancelled, weight: 7 },
];

function weightedStatus(i: number): DedicatedXcStatus {
  const totalWeight = STATUS_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  const pos = i % totalWeight;
  let cumulative = 0;
  for (const { status, weight } of STATUS_WEIGHTS) {
    cumulative += weight;
    if (pos < cumulative) return status;
  }
  return DedicatedXcStatus.completed;
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

function mrcForStatus(status: DedicatedXcStatus, i: number): Prisma.Decimal | null {
  if (status === DedicatedXcStatus.draft) return null;
  // MRC tiers: 1G=50k, 10G=200k, 100G=800k (in cents / yen sen — arbitrary unit)
  const tiers = [50_000, 75_000, 100_000, 150_000, 200_000, 300_000, 500_000, 800_000];
  return new Prisma.Decimal(tiers[i % tiers.length]);
}

function nrcForStatus(status: DedicatedXcStatus, i: number): Prisma.Decimal | null {
  if (status === DedicatedXcStatus.draft) return null;
  const tiers = [25_000, 50_000, 75_000, 100_000, 150_000, 200_000];
  return new Prisma.Decimal(tiers[i % tiers.length]);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function dateAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function dateFuture(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding DEMO client data…');

  const HASH = await bcrypt.hash(PASSWORD, 12);

  // ── Resolve DEMO org ──────────────────────────────────────────────────────

  let demoOrg = await prisma.organization.findUnique({ where: { code: DEMO_CODE } });
  if (!demoOrg) {
    demoOrg = await prisma.organization.create({
      data: {
        name: 'DEMO',
        code: DEMO_CODE,
        orgType: OrgType.service_partner,
        isDedicated: true,
        dedicatedConfig: { notificationsEmail: 'noc@demo.example.com', branding: 'default' },
        contactEmail: 'admin@demo.example.com',
        contactPhone: '+1-800-DEMO-001',
        notes: 'DEMO client — seeded by seed_demo.ts',
      },
    });
    console.log('  ✓ Created DEMO organisation (was not present)');
  } else {
    console.log(`  ✓ Found DEMO organisation (id: ${demoOrg.id})`);
    // Ensure it is flagged as a dedicated SP portal tenant
    if (!demoOrg.isDedicated) {
      demoOrg = await prisma.organization.update({
        where: { id: demoOrg.id },
        data: { isDedicated: true, orgType: OrgType.service_partner },
      });
    }
  }

  // ── Users ─────────────────────────────────────────────────────────────────

  const demoAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo.example.com' },
    update: {},
    create: {
      email: 'admin@demo.example.com',
      passwordHash: HASH,
      firstName: 'Alex',
      lastName: 'Demo',
      role: UserRole.sp_admin,
      orgId: demoOrg.id,
    },
  });

  const demoAdmin2 = await prisma.user.upsert({
    where: { email: 'admin2@demo.example.com' },
    update: {},
    create: {
      email: 'admin2@demo.example.com',
      passwordHash: HASH,
      firstName: 'Jordan',
      lastName: 'Demo',
      role: UserRole.sp_admin,
      orgId: demoOrg.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'ops@demo.example.com' },
    update: {},
    create: {
      email: 'ops@demo.example.com',
      passwordHash: HASH,
      firstName: 'Sam',
      lastName: 'Operations',
      role: UserRole.sp_ops,
      orgId: demoOrg.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'viewer@demo.example.com' },
    update: {},
    create: {
      email: 'viewer@demo.example.com',
      passwordHash: HASH,
      firstName: 'Casey',
      lastName: 'Viewer',
      role: UserRole.sp_viewer,
      orgId: demoOrg.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'reports@demo.example.com' },
    update: {},
    create: {
      email: 'reports@demo.example.com',
      passwordHash: HASH,
      firstName: 'Morgan',
      lastName: 'Finance',
      role: UserRole.sp_report,
      orgId: demoOrg.id,
    },
  });

  console.log('  ✓ Users (5: sp_admin ×2, sp_ops, sp_viewer, sp_report)');

  // ── Resolve a Site to attach XCs to ──────────────────────────────────────

  const site = await prisma.site.findFirst({ where: { isActive: true } });

  // ══════════════════════════════════════════════════════════════════════════
  // DEDICATED CROSS-CONNECTS (800 records)
  // Shows: all statuses, varied MRC/NRC, all cable types, customer types,
  //        A/Z-end locations, hops (1–4 per record), sales sources,
  //        circuit IDs, test reports, dates
  // ══════════════════════════════════════════════════════════════════════════

  console.log('  … Building 800 DedicatedCrossConnect rows…');

  const SALES_SOURCES = [
    'Direct Sales',
    'Channel Partner',
    'Referral',
    'Web Portal',
    'Renewal',
    'Upsell',
    null,
    null, // nulls for variety
  ];

  const TEST_REPORTS = [
    'OTDR-2025-DEMO-{n}',
    'CERT-2025-DEMO-{n}',
    null,
    null,
    null, // most won't have a test report
  ];

  const xcBatch: Prisma.DedicatedCrossConnectCreateManyInput[] = [];

  for (let i = 0; i < 800; i++) {
    const status = weightedStatus(i);
    const year = 2021 + (i % 5); // 2021 – 2025
    const quarter = (i % 4) + 1; // 1 – 4
    const month = String(Math.min(quarter * 3, 12)).padStart(2, '0');
    const isCompleted = status === DedicatedXcStatus.completed;
    const isDisconnected = status === DedicatedXcStatus.disconnected;
    const hasDate = isCompleted || isDisconnected;
    const hasMrc = status !== DedicatedXcStatus.draft;
    const cableType = pick(CABLE_TYPES, i * 3 + 1);
    const customerType = pick(CUSTOMER_TYPES, i * 7 + 2);
    const company = pick(ORDERING_COMPANIES, i);
    const aEndCampus = pick(CAMPUSES, i);
    const zEndCampus = pick(CAMPUSES, i + 3);
    const aEndBuilding = pick(BUILDINGS, i + 1);
    const zEndBuilding = pick(BUILDINGS, i + 2);
    const aEndFloor = pick(FLOORS, i);
    const zEndFloor = pick(FLOORS, i + 1);
    const aEndRoom = pick(ROOMS, i);
    const zEndRoom = pick(ROOMS, i + 5);
    const aEndRack = `A-R${String((Math.floor(i / 8) % 32) + 1).padStart(2, '0')}`;
    const zEndRack = `Z-R${String((Math.floor(i / 6) % 32) + 1).padStart(2, '0')}`;
    const aEndPort = String((i % 48) + 1).padStart(2, '0');
    const zEndPort = String(((i + 12) % 48) + 1).padStart(2, '0');
    const salesSource = pick(SALES_SOURCES, i * 5) as string | null;
    const testReportTemplate = pick(TEST_REPORTS, i * 3) as string | null;
    const testReport = testReportTemplate
      ? testReportTemplate.replace('{n}', String(i + 1).padStart(4, '0'))
      : null;
    const billableDate = hasDate ? new Date(`${year}-${month}-01`) : null;
    const disconnectionDate = isDisconnected ? new Date(`${year}-${month}-28`) : null;
    const dateCompleted = hasDate ? new Date(`${year}-${month}-15`) : null;
    const requestedDisconnectionDate = isDisconnected ? new Date(`${year}-${month}-20`) : null;

    xcBatch.push({
      crossConnectId: `DEMO-XC-${String(i + 1).padStart(4, '0')}`,
      organizationId: demoOrg.id,
      createdById: i % 2 === 0 ? demoAdmin.id : demoAdmin2.id,
      status,
      orderingCompany: company,
      circuitId: `CKT-DEMO-${String(1000 + i).padStart(5, '0')}`,
      ticketNumber: i % 3 === 0 ? `TKT-DEMO-${String(i + 1).padStart(4, '0')}` : null,
      salesSource,
      cableType,
      customerType,
      mrc: hasMrc ? mrcForStatus(status, i) : null,
      nrc: hasMrc ? nrcForStatus(status, i) : null,
      year,
      quarter,
      siteId: site?.id ?? null,
      dateCompleted,
      billableDate,
      disconnectionDate,
      requestedDisconnectionDate,
      testReport,
      // A-End
      aEndCampus,
      aEndBuilding,
      aEndFloor,
      aEndRoom,
      aEndRack,
      aEndDevice: `DEMO-ODF-${String((Math.floor(i / 4) % 20) + 1).padStart(2, '0')}`,
      aEndPort,
      // Z-End
      zEndCampus,
      zEndBuilding,
      zEndFloor,
      zEndRoom,
      zEndRack,
      zEndDevice: `DEMO-PP-${String((Math.floor(i / 6) % 20) + 1).padStart(2, '0')}`,
      zEndPort,
      notes:
        i % 5 === 0
          ? `Auto-seeded record ${i + 1}. ${company} — ${customerType} customer. ${cableType} ${year}Q${quarter}.`
          : null,
    });
  }

  await prisma.dedicatedCrossConnect.createMany({ data: xcBatch, skipDuplicates: true });
  console.log('  ✓ 800 DedicatedCrossConnect records');

  // ── Hops for each XC (1–4 hops depending on position) ───────────────────

  console.log('  … Adding hops…');
  const createdXcs = await prisma.dedicatedCrossConnect.findMany({
    where: {
      organizationId: demoOrg.id,
      crossConnectId: { startsWith: 'DEMO-XC-' },
    },
    select: { id: true, crossConnectId: true },
    orderBy: { crossConnectId: 'asc' },
  });

  const hopBatch: Prisma.DedicatedXcHopCreateManyInput[] = [];
  for (const xc of createdXcs) {
    const idx = parseInt(xc.crossConnectId.replace('DEMO-XC-', ''), 10) - 1;
    const existing = await prisma.dedicatedXcHop.count({
      where: { dedicatedCrossConnectId: xc.id },
    });
    if (existing > 0) continue;

    const hopCount = (idx % 4) + 1; // 1, 2, 3, or 4 hops
    for (let h = 1; h <= hopCount; h++) {
      hopBatch.push({
        dedicatedCrossConnectId: xc.id,
        hopNumber: h,
        room: pick(ROOMS, idx + h),
        rack: `R${String(((idx + h) % 20) + 1).padStart(2, '0')}`,
        device: `PATCH-${String(((idx * 3 + h) % 48) + 1).padStart(2, '0')}`,
        port: String(((idx + h * 7) % 48) + 1).padStart(2, '0'),
      });
    }
  }

  if (hopBatch.length > 0) {
    await prisma.dedicatedXcHop.createMany({ data: hopBatch, skipDuplicates: true });
  }
  console.log(`  ✓ ${hopBatch.length} DedicatedXcHop records (1–4 hops per XC)`);

  // ══════════════════════════════════════════════════════════════════════════
  // PREVIOUS-MONTH COMPLETED XCs (50 records)
  // These are pinned to March 2026 (dateCompleted 2026-03-01 to 2026-03-31)
  // so they appear when the "Previous month" quick-filter is clicked on the
  // Reports page (status=completed + dateFrom=2026-03-01 + dateTo=2026-03-31).
  // ══════════════════════════════════════════════════════════════════════════

  console.log('  … Seeding 50 previous-month (March 2026) completed XCs…');

  const prevMonthBatch: Prisma.DedicatedCrossConnectCreateManyInput[] = [];

  for (let i = 0; i < 50; i++) {
    const day = (i % 28) + 1; // days 1–28 spread evenly across March
    const dateCompleted = new Date(`2026-03-${String(day).padStart(2, '0')}`);
    const billableDate = new Date('2026-03-01');
    const company = pick(ORDERING_COMPANIES, i * 7 + 3);
    const cableType = pick(CABLE_TYPES, i * 2 + 1);
    const customerType = pick(CUSTOMER_TYPES, i * 3);
    const aEndCampus = pick(CAMPUSES, i + 1);
    const zEndCampus = pick(CAMPUSES, i + 4);

    prevMonthBatch.push({
      crossConnectId: `DEMO-PM-${String(i + 1).padStart(4, '0')}`,
      organizationId: demoOrg.id,
      createdById: i % 2 === 0 ? demoAdmin.id : demoAdmin2.id,
      status: DedicatedXcStatus.completed,
      orderingCompany: company,
      circuitId: `CKT-PM-${String(2000 + i).padStart(5, '0')}`,
      ticketNumber: i % 4 === 0 ? `TKT-PM-${String(i + 1).padStart(4, '0')}` : null,
      salesSource: pick(SALES_SOURCES, i * 3) as string | null,
      cableType,
      customerType,
      mrc: new Prisma.Decimal(
        pick([50_000, 75_000, 100_000, 150_000, 200_000, 300_000, 500_000, 800_000], i),
      ),
      nrc: new Prisma.Decimal(pick([25_000, 50_000, 75_000, 100_000, 150_000, 200_000], i)),
      year: 2026,
      quarter: 1,
      siteId: site?.id ?? null,
      dateCompleted,
      billableDate,
      disconnectionDate: null,
      requestedDisconnectionDate: null,
      testReport: i % 3 === 0 ? `OTDR-2026-PM-${String(i + 1).padStart(4, '0')}` : null,
      aEndCampus,
      aEndBuilding: pick(BUILDINGS, i + 1),
      aEndFloor: pick(FLOORS, i),
      aEndRoom: pick(ROOMS, i),
      aEndRack: `A-R${String((Math.floor(i / 8) % 32) + 1).padStart(2, '0')}`,
      aEndDevice: `DEMO-ODF-PM-${String((i % 20) + 1).padStart(2, '0')}`,
      aEndPort: String((i % 48) + 1).padStart(2, '0'),
      zEndCampus,
      zEndBuilding: pick(BUILDINGS, i + 2),
      zEndFloor: pick(FLOORS, i + 1),
      zEndRoom: pick(ROOMS, i + 5),
      zEndRack: `Z-R${String((Math.floor(i / 6) % 32) + 1).padStart(2, '0')}`,
      zEndDevice: `DEMO-PP-PM-${String((i % 20) + 1).padStart(2, '0')}`,
      zEndPort: String(((i + 12) % 48) + 1).padStart(2, '0'),
      notes: `Previous-month demo record ${i + 1}. Completed 2026-03-${String(day).padStart(2, '0')}. ${company}.`,
    });
  }

  await prisma.dedicatedCrossConnect.createMany({ data: prevMonthBatch, skipDuplicates: true });
  console.log('  ✓ 50 previous-month (March 2026) completed XCs');

  // Add 1-2 hops to each previous-month XC
  const pmXcs = await prisma.dedicatedCrossConnect.findMany({
    where: { organizationId: demoOrg.id, crossConnectId: { startsWith: 'DEMO-PM-' } },
    select: { id: true, crossConnectId: true },
    orderBy: { crossConnectId: 'asc' },
  });

  const pmHopBatch: Prisma.DedicatedXcHopCreateManyInput[] = [];
  for (const xc of pmXcs) {
    const existing = await prisma.dedicatedXcHop.count({
      where: { dedicatedCrossConnectId: xc.id },
    });
    if (existing > 0) continue;
    const idx = parseInt(xc.crossConnectId.replace('DEMO-PM-', ''), 10) - 1;
    const hopCount = (idx % 2) + 1; // 1 or 2 hops
    for (let h = 1; h <= hopCount; h++) {
      pmHopBatch.push({
        dedicatedCrossConnectId: xc.id,
        hopNumber: h,
        room: pick(ROOMS, idx + h + 2),
        rack: `R${String(((idx + h + 5) % 20) + 1).padStart(2, '0')}`,
        device: `PATCH-PM-${String(((idx * 3 + h) % 48) + 1).padStart(2, '0')}`,
        port: String(((idx + h * 5) % 48) + 1).padStart(2, '0'),
      });
    }
  }

  if (pmHopBatch.length > 0) {
    await prisma.dedicatedXcHop.createMany({ data: pmHopBatch, skipDuplicates: true });
  }
  console.log(`  ✓ ${pmHopBatch.length} hops for previous-month XCs`);

  // ══════════════════════════════════════════════════════════════════════════
  // SUPPORT TICKETS (120 tickets)
  // Shows: all 4 priorities, all 4 statuses, all 5 categories
  // Portal: 'sp' (service-partner portal)
  // ══════════════════════════════════════════════════════════════════════════

  console.log('  … Seeding 120 support tickets…');

  await prisma.ticketCounter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastUsed: 0 },
  });

  type TicketTemplate = {
    subject: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    resolutionNote?: string;
  };

  const ticketTemplates: TicketTemplate[] = [
    // ── Issues ──────────────────────────────────────────────────────────────
    {
      subject: 'CKT-DEMO-01000 intermittent signal loss',
      description:
        'Circuit CKT-DEMO-01000 is dropping signal 3–4 times per hour, ~30 seconds each. Started after last nights maintenance window. No changes on our side.',
      category: TicketCategory.issue,
      priority: TicketPriority.high,
      status: TicketStatus.open,
    },
    {
      subject: 'CKT-DEMO-01025 complete outage — critical',
      description:
        'CKT-DEMO-01025 has been completely down since 08:42. Production circuit carrying live traffic. Immediate escalation and technician dispatch required.',
      category: TicketCategory.issue,
      priority: TicketPriority.critical,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'CKT-DEMO-01050 elevated BER since firmware update',
      description:
        'Since the carrier router firmware update on 2026-04-15, BER on CKT-DEMO-01050 is 1e-7 (threshold 1e-9). Investigation required.',
      category: TicketCategory.issue,
      priority: TicketPriority.high,
      status: TicketStatus.open,
    },
    {
      subject: 'CKT-DEMO-01075 latency spike investigation',
      description:
        'RTT on CKT-DEMO-01075 increased from 1.2ms to 4.8ms at 14:00 today. No config changes on our side. Please investigate.',
      category: TicketCategory.issue,
      priority: TicketPriority.high,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'CKT-DEMO-01100 power level degradation',
      description:
        'Optical receive power on CKT-DEMO-01100 dropped from -5 dBm to -12 dBm over two weeks. Trending toward alarm threshold.',
      category: TicketCategory.issue,
      priority: TicketPriority.medium,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'CKT-DEMO-01125 flap alarm — 23 events in 48 hours',
      description:
        'CKT-DEMO-01125 has generated 23 flap alarms in 48 hours, each lasting under 2 seconds. Root cause analysis needed.',
      category: TicketCategory.issue,
      priority: TicketPriority.high,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'CKT-DEMO-01150 CRC error storm',
      description:
        'CKT-DEMO-01150 generating ~10,000 CRC errors per minute for 4 hours. Downstream services impacted. Urgent.',
      category: TicketCategory.issue,
      priority: TicketPriority.critical,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'CKT-DEMO-01175 wavelength mismatch after grooming',
      description:
        'After grooming on 2026-04-10, CKT-DEMO-01175 shows RX power but unable to lock. Wavelength mismatch suspected.',
      category: TicketCategory.issue,
      priority: TicketPriority.high,
      status: TicketStatus.resolved,
      resolutionNote:
        'Wavelength reassigned to original channel 32 (1551.72nm). Circuit verified error-free.',
    },
    {
      subject: 'CKT-DEMO-01200 fiber bend radius concern',
      description:
        'Tight fiber bend observed on three cables near rack top during visual inspection. Technician assessment requested.',
      category: TicketCategory.issue,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      resolutionNote:
        'Technician replaced cable guides. No signal loss measured. Cables rerouted correctly.',
    },
    {
      subject: 'Emergency: CKT-DEMO-01001 primary uplink down',
      description:
        'Primary uplink CKT-DEMO-01001 completely unavailable since 22:15. All downstream customer services are down. Immediate dispatch needed.',
      category: TicketCategory.issue,
      priority: TicketPriority.critical,
      status: TicketStatus.resolved,
      resolutionNote:
        'Physical fiber break in TC-B1 tray. Repaired and restored 00:47. Total outage 2h 32min.',
    },
    {
      subject: 'CKT-DEMO-01250 packet loss 2% downstream',
      description:
        'Consistent 2% downstream packet loss on CKT-DEMO-01250 for 6 hours. Upstream clean. Investigation at ODF/amplifier level requested.',
      category: TicketCategory.issue,
      priority: TicketPriority.high,
      status: TicketStatus.open,
    },
    {
      subject: 'CKT-DEMO-01275 asymmetric latency anomaly',
      description:
        'CKT-DEMO-01275 eastbound 2ms / westbound 8ms. Reverse of expected. Circuits share the same physical route. Investigation needed.',
      category: TicketCategory.issue,
      priority: TicketPriority.medium,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'CKT-DEMO-01300 noise floor elevated post-maintenance',
      description:
        'Following 2026-04-20 maintenance window, noise floor on CKT-DEMO-01300 has increased by 3 dB. Proactive investigation requested.',
      category: TicketCategory.issue,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'CKT-DEMO-01325 jitter exceeds SLA threshold',
      description:
        'CKT-DEMO-01325 jitter averaging 8ms for 3 days. SLA specifies ≤2ms. SLA breach in progress.',
      category: TicketCategory.issue,
      priority: TicketPriority.high,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'CKT-DEMO-01350 wrong fiber type patched',
      description:
        'CKT-DEMO-01350 was patched with OM3 multimode, spec requires OS2 single-mode. Distance 220m — marginal. Immediate correction required.',
      category: TicketCategory.issue,
      priority: TicketPriority.critical,
      status: TicketStatus.resolved,
      resolutionNote: 'Replaced with OS2 SM. Loss measured at 0.3 dB. Circuit fully operational.',
    },
    {
      subject: 'CKT-DEMO-01375 chromatic dispersion — 100G',
      description:
        'CKT-DEMO-01375 100G shows excessive chromatic dispersion post-amplifier. Pre-compensation module feasibility assessment requested.',
      category: TicketCategory.issue,
      priority: TicketPriority.high,
      status: TicketStatus.open,
    },
    {
      subject: 'CKT-DEMO-01400 — third outage this month',
      description:
        'CKT-DEMO-01400 has now had its third unplanned outage this month with no clear root cause. Executive-level escalation and 30-day RCA requested.',
      category: TicketCategory.issue,
      priority: TicketPriority.critical,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'CKT-DEMO-01425 mislabeled port — panel vs inventory',
      description:
        'Port 18 on panel A-ODF-02 is labeled as CKT-DEMO-01425 but physical patch is on port 19. Records need updating to match.',
      category: TicketCategory.issue,
      priority: TicketPriority.low,
      status: TicketStatus.resolved,
      resolutionNote:
        'Physical verification completed. Panel label corrected and inventory updated.',
    },
    {
      subject: 'CKT-DEMO-01450 degraded throughput — 40% capacity',
      description:
        'CKT-DEMO-01450 throughput dropped to 40% of contracted capacity since 09:00. Revenue-impacting. Immediate diagnosis required.',
      category: TicketCategory.issue,
      priority: TicketPriority.critical,
      status: TicketStatus.resolved,
      resolutionNote:
        'Congestion on upstream trunk. Capacity expanded. CKT-DEMO-01450 restored to full throughput.',
    },
    {
      subject: 'CKT-DEMO-01475 receive power too high on new install',
      description:
        'Launch power on newly provisioned CKT-DEMO-01475 is +5 dBm. Specification calls for 0 dBm ±1. Adjustment at ODF required.',
      category: TicketCategory.issue,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      resolutionNote: 'Attenuator adjusted. Launch power verified at -0.2 dBm. Circuit cleared.',
    },
    {
      subject: 'CKT-DEMO-01500 label swap after panel replacement',
      description:
        'Following ODF-B4 panel replacement, CKT-DEMO-01500 and CKT-DEMO-01501 appear swapped. Monitoring confirms cross-patching.',
      category: TicketCategory.issue,
      priority: TicketPriority.high,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'CKT-DEMO-01525 signal degrading trend — -0.5 dB/month',
      description:
        'Steady decline in receive optical power on CKT-DEMO-01525 over 3 months (-0.5 dB/month). Will reach alarm threshold in ~4 months.',
      category: TicketCategory.issue,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'CKT-DEMO-01550 optical calibration after splice',
      description:
        'CKT-DEMO-01550 was re-spliced recently. Full optical calibration at both ends requested.',
      category: TicketCategory.issue,
      priority: TicketPriority.medium,
      status: TicketStatus.closed,
      resolutionNote:
        'Calibration completed. Launch -1 dBm, receive -8.5 dBm. Both within spec. Docs uploaded.',
    },
    {
      subject: 'Alert threshold misconfigured — CKT-DEMO-01575',
      description:
        'Monitoring alert threshold for CKT-DEMO-01575 is set to -20 dBm, should be -14 dBm. Must be corrected to avoid missed alarms.',
      category: TicketCategory.issue,
      priority: TicketPriority.low,
      status: TicketStatus.resolved,
      resolutionNote:
        'Alert threshold updated to -14 dBm. Tested and confirmed alarm triggers correctly.',
    },
    {
      subject: 'CKT-DEMO-01600 downstream packet loss post-splice',
      description:
        'After emergency fiber splice on 2026-04-12, ~0.1% random packet drops on CKT-DEMO-01600. Splice quality investigation needed.',
      category: TicketCategory.issue,
      priority: TicketPriority.high,
      status: TicketStatus.open,
    },

    // ── Billing ──────────────────────────────────────────────────────────────
    {
      subject: 'Invoice discrepancy Q1 2026 — overcharge ¥220,000',
      description:
        'Q1 invoice shows MRC of ¥1,200,000 but our records indicate ¥980,000. Difference appears to relate to two circuits disconnected in February that are still billed.',
      category: TicketCategory.billing,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      resolutionNote:
        'Credit note CN-2026-0031 issued for ¥220,000 covering February and March. Applied to next invoice.',
    },
    {
      subject: 'Incorrect NRC on circuit DEMO-XC-0005 invoice',
      description:
        'Invoice shows NRC of ¥150,000 for DEMO-XC-0005 but agreed price per contract is ¥100,000. Please review and reissue.',
      category: TicketCategory.billing,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'Duplicate billing for CKT-DEMO-01010 — February',
      description:
        'February invoice shows CKT-DEMO-01010 billed twice on line items 14 and 28. Total overcharge ¥80,000. Credit note requested.',
      category: TicketCategory.billing,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      resolutionNote:
        'Duplicate billing confirmed. Credit CN-2026-0044 for ¥80,000 raised and applied.',
    },
    {
      subject: 'January billing — three active circuits not invoiced',
      description:
        'January invoice missing circuits DEMO-XC-0101, DEMO-XC-0102, DEMO-XC-0103 which were active for the full month. Corrected invoice requested.',
      category: TicketCategory.billing,
      priority: TicketPriority.medium,
      status: TicketStatus.closed,
      resolutionNote:
        'Omission confirmed. Corrected invoice INV-2026-0298C issued. Circuits added at contracted MRC.',
    },
    {
      subject: 'NRC waiver request — 15 early-renewal circuits',
      description:
        'Renewing 15 circuits 6 months ahead of term. Per section 4.2 of MSA, requesting NRC waiver for early renewals.',
      category: TicketCategory.billing,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'Billing contact email update — FY2027',
      description:
        'Update billing contact from finance-old@demo.example.com to finance@demo.example.com. Include CFO on CC.',
      category: TicketCategory.billing,
      priority: TicketPriority.low,
      status: TicketStatus.closed,
      resolutionNote: 'Billing contact updated in CRM. Change effective from next billing cycle.',
    },
    {
      subject: 'Annual billing review meeting request',
      description:
        'Would like to schedule annual contract and billing review with your accounts team. Please suggest available dates in May 2026.',
      category: TicketCategory.billing,
      priority: TicketPriority.low,
      status: TicketStatus.open,
    },
    {
      subject: 'SLA credit claim — Q1 availability 99.87%',
      description:
        'DEMO formal SLA credit claim. Q1 availability 99.87% against contractual 99.95%. Credit per Section 8.3 of the agreement. Calculation attached.',
      category: TicketCategory.billing,
      priority: TicketPriority.high,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'Update billing address — new fiscal year',
      description:
        'New billing address: DEMO Corp Finance, 3-1-1 Marunouchi, Chiyoda-ku, Tokyo 100-0005. Effective 2026-04-01.',
      category: TicketCategory.billing,
      priority: TicketPriority.low,
      status: TicketStatus.closed,
      resolutionNote: 'Billing address updated. Confirmed with finance team.',
    },
    {
      subject: 'Contract renewal terms — MSA expiry 2026-12-31',
      description:
        'Our MSA expires 2026-12-31. Requesting renewal discussions and pricing for next contract period.',
      category: TicketCategory.billing,
      priority: TicketPriority.low,
      status: TicketStatus.open,
    },
    {
      subject: 'April bulk invoice — 26 decommissioned circuits still billed',
      description:
        'April bulk invoice lists 508 circuits but only 482 are active. 26 decommissioned circuits still being billed. Immediate correction requested.',
      category: TicketCategory.billing,
      priority: TicketPriority.critical,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'NRC waiver on MSA amendment 3 circuits',
      description:
        'Two circuits with NRC waiver per amendment 3 are showing NRC charges on April invoice. Review and credit requested.',
      category: TicketCategory.billing,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'Contract penalty waiver — force majeure decommissions',
      description:
        'Formal request for early termination penalty waiver on 5 circuits decommissioned due to force majeure. Legal documentation attached.',
      category: TicketCategory.billing,
      priority: TicketPriority.high,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'Repeated billing errors — three consecutive months',
      description:
        'Incorrect invoices received for 3 consecutive months. Each required credits. Requesting executive-level review and systematic fix.',
      category: TicketCategory.billing,
      priority: TicketPriority.high,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'Q4 2025 financial summary — discrepancy in totals',
      description:
        'Q4 2025 financial summary shows total MRC of ¥9.8M but our internal records show ¥9.2M. Detailed breakdown requested per circuit.',
      category: TicketCategory.billing,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },

    // ── Access ───────────────────────────────────────────────────────────────
    {
      subject: 'LOA required for new 1G cross-connect',
      description:
        'Requesting LOA for a new 1G cross-connect from our cage SUITE-4 to carrier ATTNET panel A-ODF-01 port 14.',
      category: TicketCategory.access,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      resolutionNote: 'LOA issued and uploaded to document portal. Reference LOA-2026-0072.',
    },
    {
      subject: 'Cage access during maintenance — 2026-04-28 01:00–03:00',
      description:
        'Engineer needs badged access to SUITE-4 on 2026-04-28 01:00–03:00 for hardware replacement. Please confirm access procedure.',
      category: TicketCategory.access,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'Add new engineer to portal — sp_ops role',
      description:
        'Please add Kenji Nakamura (kenji@demo.example.com) as sp_ops user. Same permissions as existing ops users.',
      category: TicketCategory.access,
      priority: TicketPriority.low,
      status: TicketStatus.closed,
      resolutionNote: 'User account created. Welcome email sent to kenji@demo.example.com.',
    },
    {
      subject: 'OTDR test documentation for DEMO-XC-0020',
      description:
        'Requesting OTDR test results for circuit DEMO-XC-0020 installed last month. Needed for internal compliance audit.',
      category: TicketCategory.access,
      priority: TicketPriority.low,
      status: TicketStatus.closed,
      resolutionNote: 'OTDR results attached. Circuit shows <0.5 dB loss end to end.',
    },
    {
      subject: 'Equipment delivery — loading dock reservation 2026-04-30',
      description:
        'Shipping new ODF equipment arriving 2026-04-30. Need loading dock reservation, security escort, and delivery window confirmation.',
      category: TicketCategory.access,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'Badge access update — new hire Priya Sharma',
      description:
        'Deactivate badge for former employee Robert Chen (emp ID: DEMO-1142). Activate for new hire Priya Sharma (priya@demo.example.com). Effective immediately.',
      category: TicketCategory.access,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      resolutionNote: 'Robert Chen access deactivated. Priya Sharma enrolled and access activated.',
    },
    {
      subject: 'Billing portal login failure — account locked',
      description:
        'Finance team unable to log into billing portal since password reset last week. "Account locked" error. Unlock and reset credentials requested.',
      category: TicketCategory.access,
      priority: TicketPriority.medium,
      status: TicketStatus.closed,
      resolutionNote: 'Account unlocked and temporary password issued to finance@demo.example.com.',
    },
    {
      subject: 'LOA renewal — carrier handoff expiring in 30 days',
      description:
        'Received notification that LOA for ATTNET cross-connects expires in 30 days. Renewal process and required documents requested.',
      category: TicketCategory.access,
      priority: TicketPriority.medium,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'Pre-approval for planned cage works 2026-05-20 to 2026-05-22',
      description:
        'Requesting pre-approval for ODF rearrangement in SUITE-4. No circuit outages anticipated.',
      category: TicketCategory.access,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'OTDR test documentation — three new circuits',
      description:
        'Requesting formal OTDR reports for DEMO-XC-0401, DEMO-XC-0402, DEMO-XC-0403 installed this quarter.',
      category: TicketCategory.access,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'Optical transceiver hardware swap — CKT-DEMO-01410',
      description:
        'Transceiver on our end of CKT-DEMO-01410 has failed. Need technician escort to SUITE-4 for hardware swap 2026-04-25.',
      category: TicketCategory.access,
      priority: TicketPriority.high,
      status: TicketStatus.open,
    },

    // ── Suggestions ──────────────────────────────────────────────────────────
    {
      subject: 'Request additional 10G port availability in MMR-1',
      description:
        'Planning to expand cross-connect footprint. Requesting availability of 10G LC duplex SM ports in MMR-1. Advise on lead time and cost.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.medium,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'Portal feature request — CSV export for cross-connect list',
      description:
        'Reports section would benefit greatly from a CSV export option for the cross-connect list and financial summary.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.low,
      status: TicketStatus.open,
    },
    {
      subject: 'Bulk cross-connect order — 20 new 1G SM circuits',
      description:
        'Planning a bulk order for 20 new 1G SM cross-connects between SUITE-4 and carrier EQFAB panels. Pre-order feasibility and timeline requested.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.medium,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'Diversity path request for CKT-DEMO-01001',
      description:
        'Following last months outage on CKT-DEMO-01001, requesting implementation of a diverse path for resilience. Options and costs please.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.high,
      status: TicketStatus.in_progress,
    },
    {
      subject: '100G DWDM wavelength availability — MMR-1 to TC-B1',
      description:
        'Evaluating upgrade to 100G DWDM. Confirm available wavelengths on MMR-1 to TC-B1 backbone and required lead time.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.low,
      status: TicketStatus.open,
    },
    {
      subject: 'Quote request — additional half-rack in SUITE-4',
      description:
        'Projecting significant growth in H2 2026. Requesting a formal quote for an additional half-rack in SUITE-4 or nearby space.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'Formal capacity planning session — next 12 months',
      description:
        'Approaching 80% utilization on several circuits. Requesting a capacity planning session with your engineering team.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'Portal improvement — signal strength column in XC list',
      description:
        'The cross-connect list would be improved with a current signal strength column to aid quick diagnosis.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.low,
      status: TicketStatus.open,
    },
    {
      subject: 'New PoP feasibility — SUITE-4 expansion',
      description:
        'Planning to establish a new PoP. Requesting feasibility for 4 cross-connects and a dedicated half-rack allocation.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'Dual-homed diversity path planning',
      description:
        'Wish to implement dual-homed connectivity via two geographically diverse uplinks. Requesting options and pricing.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.medium,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'Bulk circuit export for CMDB reconciliation',
      description:
        'Bulk circuit export feature is required for CMDB reconciliation process. Requesting feature addition to portal.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.low,
      status: TicketStatus.open,
    },
    {
      subject: 'Add IP transit circuit — 10G for Q2 expansion',
      description:
        'Expanding operations and require one additional 10G IP transit cross-connect in Q2 2026. Please initiate order process.',
      category: TicketCategory.suggestion,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },

    // ── Other ────────────────────────────────────────────────────────────────
    {
      subject: 'Scheduled maintenance — 2026-05-10 window impact',
      description:
        'Can you confirm whether the 2026-05-10 02:00–06:00 JST window will affect circuits DEMO-XC-0300 through DEMO-XC-0315?',
      category: TicketCategory.other,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'SLA compliance report — March 2026',
      description:
        'Requesting March 2026 SLA compliance report for all circuits. Specifically availability percentage and any SLA credits due.',
      category: TicketCategory.other,
      priority: TicketPriority.low,
      status: TicketStatus.resolved,
      resolutionNote:
        'March 2026 SLA report attached. Overall availability: 99.97%. No credits triggered.',
    },
    {
      subject: 'Missing test documentation for DEMO-XC-0322',
      description:
        'DEMO-XC-0322 provisioned 2 weeks ago but OTDR and optical power test documents not yet received. Required for customer sign-off.',
      category: TicketCategory.other,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'CKT-DEMO-01500 loop-back test coordination',
      description:
        'Need to arrange a loop-back test on CKT-DEMO-01500 before go-live for a major customer. Please confirm available test windows.',
      category: TicketCategory.other,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      resolutionNote:
        'Loop-back test completed 2026-04-18 03:00–04:00. Results: PASS. BER < 1e-12.',
    },
    {
      subject: 'Physical topology diagram for SUITE-4 cage',
      description:
        'For an upcoming DR drill, need an up-to-date physical topology diagram of SUITE-4 and all associated cross-connects. PDF format.',
      category: TicketCategory.other,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      resolutionNote:
        'Topology diagram generated and emailed. File: DC1-SUITE4-topology-20260419.pdf',
    },
    {
      subject: 'Quarterly business review — Q2 2026 scheduling',
      description:
        'Requesting a 2-hour QBR slot with commercial and technical teams in the first week of May 2026.',
      category: TicketCategory.other,
      priority: TicketPriority.low,
      status: TicketStatus.resolved,
      resolutionNote:
        'QBR scheduled for 2026-05-07 10:00–12:00. Calendar invite sent to all stakeholders.',
    },
    {
      subject: 'After-hours NOC escalation list update',
      description:
        'Please provide updated after-hours NOC escalation list with mobile numbers and P1 SLAs.',
      category: TicketCategory.other,
      priority: TicketPriority.medium,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'Q4 2025 annual utilization report',
      description:
        'Requesting Q4 2025 full utilization and availability statistics for all circuits. Format: Excel by circuit and monthly.',
      category: TicketCategory.other,
      priority: TicketPriority.low,
      status: TicketStatus.resolved,
      resolutionNote: 'Q4 2025 report emailed. Average availability 99.95%.',
    },
    {
      subject: 'IP prefix addition to BGP community NOC reference',
      description:
        'Requesting IP prefix 203.0.113.0/24 be added to NOC reference sheet for our cross-connect BGP sessions.',
      category: TicketCategory.other,
      priority: TicketPriority.low,
      status: TicketStatus.open,
    },
    {
      subject: 'DR failover validation — CKT-DEMO-01001 to CKT-DEMO-01002',
      description:
        'Requesting coordinated DR test on 2026-05-15 to validate failover from CKT-DEMO-01001 to CKT-DEMO-01002. NOC support needed during 2-hour window.',
      category: TicketCategory.other,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'CKT-DEMO-01089 scheduled decommission — notice and credits',
      description:
        'Planning to decommission CKT-DEMO-01089 on 2026-05-01. Confirm required notice period and any credits for early termination.',
      category: TicketCategory.other,
      priority: TicketPriority.low,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'Technical escalation path review — 2024 document outdated',
      description:
        'Joint technical escalation document is from 2024 and does not reflect recent staffing changes. Review and update requested.',
      category: TicketCategory.other,
      priority: TicketPriority.medium,
      status: TicketStatus.open,
    },
    {
      subject: 'Emergency contact list update — NOC team changes',
      description:
        'Updated emergency contacts. New primary: noc@demo.example.com +1-800-DEMO-911; Secondary: backup-noc@demo.example.com. Please update CRM.',
      category: TicketCategory.other,
      priority: TicketPriority.low,
      status: TicketStatus.resolved,
      resolutionNote: 'Emergency contacts updated in CRM and NOC ticketing system.',
    },
    {
      subject: 'VLAN tagging confirmation — new handoff circuits',
      description:
        'Newly provisioned DEMO-XC-0600, DEMO-XC-0601, DEMO-XC-0602 need VLAN 100 tagged at demarc. Please confirm.',
      category: TicketCategory.other,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      resolutionNote: 'VLAN 100 tagging confirmed on all three circuits. Configuration verified.',
    },
    {
      subject: 'Fire suppression test — cage impact assessment',
      description:
        'Scheduled fire suppression test may require cage power-down. Advance notice and impact assessment for all circuits requested.',
      category: TicketCategory.other,
      priority: TicketPriority.high,
      status: TicketStatus.in_progress,
    },
    {
      subject: 'Port utilization report Q1 2026',
      description:
        'Requesting full port utilization report for all cross-connects for Q1 2026, including uptime and anomalies.',
      category: TicketCategory.other,
      priority: TicketPriority.low,
      status: TicketStatus.resolved,
      resolutionNote: 'Q1 utilization report emailed. Average utilization 78%.',
    },
    {
      subject: 'Remote hands — SFP module replacement rack B',
      description:
        'Remote hands needed to replace failed SFP in rack B. Module pre-staged in cage. Estimated 30 minutes.',
      category: TicketCategory.other,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      resolutionNote: 'SFP replaced and circuit restored. 25 minutes. Confirmation sent.',
    },
    {
      subject: 'Remote hands — 2RU switch install SUITE-4',
      description:
        'New 2RU switch has arrived at SUITE-4. Need mounting, cable management, and power connection. Estimated 2 hours.',
      category: TicketCategory.other,
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      resolutionNote: 'Switch installed per customer specifications. Completion report sent.',
    },
    {
      subject: 'Physical security audit documentation — ISO 27001',
      description:
        'Security team requires datacenter physical security documentation for annual ISO 27001 audit.',
      category: TicketCategory.other,
      priority: TicketPriority.medium,
      status: TicketStatus.closed,
      resolutionNote: 'ISO 27001 certificate and physical security summary emailed.',
    },
    {
      subject: 'April incident report — generator test micro-outage',
      description:
        'Formal incident report required for April 18 generator test micro-outages (200–500ms). Report not yet received per SLA terms.',
      category: TicketCategory.other,
      priority: TicketPriority.high,
      status: TicketStatus.open,
    },
  ];

  // Pad to exactly 120 tickets by repeating with modified subjects if needed
  while (ticketTemplates.length < 120) {
    const base = ticketTemplates[ticketTemplates.length % 60];
    ticketTemplates.push({
      ...base,
      subject: `[DEMO-EXT] ${base.subject} (${ticketTemplates.length + 1})`,
    });
  }

  let ticketCount = 0;
  const createdTicketIds: string[] = [];

  for (const t of ticketTemplates.slice(0, 120)) {
    const exists = await prisma.supportTicket.findFirst({
      where: { subject: t.subject, organizationId: demoOrg.id },
    });
    if (!exists) {
      const counter = await prisma.ticketCounter.update({
        where: { id: 1 },
        data: { lastUsed: { increment: 1 } },
      });
      const ticketNumber = `SP${String(counter.lastUsed).padStart(6, '0')}`;
      const ticket = await prisma.supportTicket.create({
        data: {
          ticketNumber,
          portal: 'sp',
          organizationId: demoOrg.id,
          createdById: demoAdmin.id,
          subject: t.subject,
          description: t.description,
          category: t.category,
          priority: t.priority,
          status: t.status,
          ...(t.resolutionNote
            ? {
                resolutionNote: t.resolutionNote,
                resolvedById: demoAdmin2.id,
                resolvedAt: dateAgo(Math.floor(Math.random() * 20) + 1),
              }
            : {}),
        },
      });
      createdTicketIds.push(ticket.id);
      ticketCount++;
    }
  }
  console.log(`  ✓ ${ticketCount} SupportTicket records`);

  // ── Ticket comments (add 2–3 comments on the first 30 tickets) ───────────

  let commentCount = 0;
  const ticketsForComments = createdTicketIds.slice(0, 30);

  const commentBodies = [
    'Acknowledged. Our team is investigating the issue and will provide an update within 2 business hours.',
    'Can you please provide a traceroute and the OTDR reference number so we can narrow down the fault?',
    'We have dispatched a technician to inspect the panel. ETA 45 minutes.',
    'Update: physical inspection completed. Cause identified — connector contamination on port face. Cleaning in progress.',
    'Circuit restored and confirmed operational. Please monitor for the next 24 hours and advise if issue recurs.',
    'This has been escalated to our senior NOC team. A dedicated engineer has been assigned.',
    'We will require a maintenance window to perform the corrective action. Can you confirm availability for 02:00–04:00 JST?',
    'Root cause confirmed: loose SFP module on the switch port. Re-seated and verified. Monitoring for stability.',
    'Billing team has been notified. Credit note will be issued within 3 business days.',
    'LOA has been generated and attached to this ticket. Please download and forward to your carrier representative.',
  ];

  for (const ticketId of ticketsForComments) {
    const numComments = (ticketsForComments.indexOf(ticketId) % 3) + 1;
    for (let c = 0; c < numComments; c++) {
      await prisma.ticketComment.create({
        data: {
          ticketId,
          body: commentBodies[
            (ticketsForComments.indexOf(ticketId) * 3 + c) % commentBodies.length
          ],
          authorId: c % 2 === 0 ? demoAdmin.id : demoAdmin2.id,
        },
      });
      commentCount++;
    }
  }
  console.log(`  ✓ ${commentCount} TicketComment records on first 30 tickets`);

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════

  const xcTotal = await prisma.dedicatedCrossConnect.count({
    where: { organizationId: demoOrg.id },
  });
  const ticketTotal = await prisma.supportTicket.count({
    where: { organizationId: demoOrg.id },
  });
  const hopTotal = await prisma.dedicatedXcHop.count({
    where: { dedicatedCrossConnect: { organizationId: demoOrg.id } },
  });

  console.log('');
  console.log('══════════════════════════════════════════════════');
  console.log('  DEMO client seed complete');
  console.log(`  Organisation  : ${demoOrg.name} (${demoOrg.code})`);
  console.log(`  XC records    : ${xcTotal}`);
  console.log(`  Hop records   : ${hopTotal}`);
  console.log(`  Tickets       : ${ticketTotal}`);
  console.log(`  Comments      : ${commentCount}`);
  console.log('══════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
