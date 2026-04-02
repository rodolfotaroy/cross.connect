// ══════════════════════════════════════════════════════════════════════════════
// PORT RESERVATION SERVICE — concurrency-safe reservation and release
//
// Why this needs special care:
//   Two ops technicians could simultaneously assign the same port to two
//   different cable paths. A simple check-then-set has a TOCTOU race:
//
//     T1: SELECT port WHERE id=$1  → state=available  ✓
//     T2: SELECT port WHERE id=$1  → state=available  ✓
//     T1: UPDATE port SET state='reserved' ...        ✓
//     T2: UPDATE port SET state='reserved' ...        ✓  ← double-booked!
//
// Solution:
//   Use PostgreSQL's row-level advisory lock via SELECT ... FOR UPDATE inside
//   a serializable transaction. The FOR UPDATE lock blocks any concurrent
//   transaction that tries to lock the same row until the first commits.
//
//   T1: BEGIN; SELECT port WHERE id=$1 FOR UPDATE → acquires row lock
//   T2: BEGIN; SELECT port WHERE id=$1 FOR UPDATE → BLOCKS until T1 commits
//   T1: Port state confirmed available → UPDATE + INSERT reservation → COMMIT
//   T2: Row lock acquired → port state is now 'reserved' → throws PortNotAvailableError
//
// Batch reservations (multiple ports for one path):
//   All ports in a CablePath are reserved in a single transaction, ordered by
//   port id to prevent deadlock when two concurrent path reservations share ports.
//
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@xc/db';
import { PortNotAvailableError } from '../../common/errors/domain.errors';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface ReservePortInput {
  portId: string;
  serviceId: string;
  cablePathId: string;
  reservedById: string;
}

export interface ReleasePortsInput {
  cablePathId: string;
  releaseReason: string;
  releasedById: string;
  /** 'released' for normal disconnect/decommission; 'cancelled' for order cancellation */
  outcome: 'released' | 'cancelled';
}

@Injectable()
export class PortReservationService {
  private readonly logger = new Logger(PortReservationService.name);

  constructor(private readonly db: PrismaService) {}

  // ── Reserve a batch of ports for a cable path ─────────────────────────────
  //
  // Sorts portIds ascending before locking to prevent deadlock:
  //   Path A wants ports [p3, p1, p2] → sorted [p1, p2, p3]
  //   Path B wants ports [p2, p1, p4] → sorted [p1, p2, p4]
  //   Both will try to lock p1 first; only one proceeds.

  async reserveBatch(inputs: ReservePortInput[]): Promise<void> {
    if (inputs.length === 0) return;

    // Sort by portId for consistent lock ordering
    const sorted = [...inputs].sort((a, b) => a.portId.localeCompare(b.portId));
    const portIds = sorted.map((i) => i.portId);

    await this.db.$transaction(
      async (tx) => {
        // Acquire FOR UPDATE locks on all target ports in id order.
        // $queryRaw is used because Prisma does not generate FOR UPDATE natively.
        const lockedPorts = await tx.$queryRaw<Array<{ id: string; state: string }>>`
          SELECT id, state
          FROM "Port"
          WHERE id = ANY(${portIds}::text[])
          ORDER BY id
          FOR UPDATE
        `;

        // Validate every port is available
        for (const port of lockedPorts) {
          if (port.state !== 'available') {
            throw new PortNotAvailableError(port.id, port.state);
          }
        }

        // Validate we got back the same count (guard against missing ports)
        if (lockedPorts.length !== portIds.length) {
          const found = new Set(lockedPorts.map((p) => p.id));
          const missing = portIds.filter((id) => !found.has(id));
          throw new PortNotAvailableError(missing[0], 'not_found');
        }

        // Write port state updates and reservation records in one batch
        for (const input of sorted) {
          await tx.port.update({
            where: { id: input.portId },
            data: { state: 'reserved' },
          });

          await tx.portReservation.create({
            data: {
              portId: input.portId,
              serviceId: input.serviceId,
              cablePathId: input.cablePathId,
              state: 'active',
              reservedById: input.reservedById,
            },
          });
        }
      },
      // Serializable prevents phantom reads; REPEATABLE READ would also work here
      // but Serializable is safer for correctness vs. a tiny throughput trade-off.
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(`Reserved ${inputs.length} port(s) for cablePathId=${inputs[0].cablePathId}`);
  }

  // ── Activate ports (reserved → in_use) when a cable path goes active ────────

  async activatePorts(cablePathId: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      // Find all active reservations for this path
      const reservations = await tx.portReservation.findMany({
        where: { cablePathId, state: 'active' },
        select: { portId: true, id: true },
      });

      const portIds = reservations.map((r) => r.portId).sort();

      if (portIds.length === 0) return;

      // Lock ports for update
      await tx.$queryRaw`
        SELECT id FROM "Port"
        WHERE id = ANY(${portIds}::text[])
        ORDER BY id
        FOR UPDATE
      `;

      // Transition port state reserved → in_use
      await tx.port.updateMany({
        where: { id: { in: portIds }, state: 'reserved' },
        data: { state: 'in_use' },
      });
    });
  }

  // ── Release ports when a cable path is decommissioned ────────────────────────

  async releasePorts(input: ReleasePortsInput): Promise<void> {
    await this.db.$transaction(
      async (tx) => {
        const reservations = await tx.portReservation.findMany({
          where: { cablePathId: input.cablePathId, state: 'active' },
          select: { id: true, portId: true },
        });

        if (reservations.length === 0) return;

        const portIds = reservations.map((r) => r.portId).sort();

        // Lock rows
        await tx.$queryRaw`
          SELECT id FROM "Port"
          WHERE id = ANY(${portIds}::text[])
          ORDER BY id
          FOR UPDATE
        `;

        // Release all PortReservation records
        await tx.portReservation.updateMany({
          where: { cablePathId: input.cablePathId, state: 'active' },
          data: {
            state: input.outcome,
            releasedAt: new Date(),
            releaseReason: input.releaseReason,
          },
        });

        // Return ports to available
        await tx.port.updateMany({
          where: {
            id: { in: portIds },
            state: { in: ['reserved', 'in_use'] },
          },
          data: { state: 'available' },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    this.logger.log(`Released ${input.outcome} ports for cablePathId=${input.cablePathId}`);
  }

  // ── Reserve a single port (convenience wrapper for ad-hoc ops) ─────────────

  async reserveOne(input: ReservePortInput): Promise<void> {
    await this.reserveBatch([input]);
  }
}
