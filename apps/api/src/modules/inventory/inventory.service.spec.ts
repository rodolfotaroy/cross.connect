import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from './inventory.service';

// Minimal Prisma mock — only the methods InventoryService calls
const mockPrisma = {
  port: {
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    createMany: vi.fn(),
  },
  panel: {
    findMany: vi.fn(),
  },
  auditEvent: {
    create: vi.fn(),
    createMany: vi.fn(),
  },
  $transaction: vi.fn((fn: any) =>
    fn({
      port: mockPrisma.port,
      auditEvent: mockPrisma.auditEvent,
    }),
  ),
} as unknown as PrismaService;

const mockAudit = { log: vi.fn() } as unknown as AuditService;

describe('InventoryService', () => {
  let service: InventoryService;

  beforeEach(() => {
    service = new InventoryService(mockPrisma, mockAudit);
    vi.clearAllMocks();
  });

  // ── getPortAvailability ───────────────────────────────────────────────────

  describe('getPortAvailability', () => {
    it('returns counts by state including defaults for missing states', async () => {
      vi.mocked(mockPrisma.port.groupBy).mockResolvedValueOnce([
        { state: 'available', _count: { state: 30 } },
        { state: 'in_use', _count: { state: 10 } },
      ] as any);
      vi.mocked(mockPrisma.port.count).mockResolvedValueOnce(48);

      const result = await service.getPortAvailability('panel-1');

      expect(result).toMatchObject({ total: 48, available: 30, inUse: 10, reserved: 0 });
    });
  });

  // ── transitionPortState ───────────────────────────────────────────────────

  describe('transitionPortState', () => {
    it('updates port state when transition is valid', async () => {
      vi.mocked(mockPrisma.port.findUniqueOrThrow).mockResolvedValueOnce({ id: 'p1', state: 'available' } as any);
      vi.mocked(mockPrisma.port.update).mockResolvedValueOnce({ id: 'p1', state: 'reserved' } as any);
      vi.mocked(mockAudit.log).mockResolvedValueOnce({} as any);

      const result = await service.transitionPortState('p1', 'reserved', 'actor-1');

      expect(result).toMatchObject({ state: 'reserved' });
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'port.state_changed' }),
      );
    });

    it('throws BadRequestException for disallowed transition', async () => {
      vi.mocked(mockPrisma.port.findUniqueOrThrow).mockResolvedValueOnce({ id: 'p1', state: 'decommissioned' } as any);

      await expect(service.transitionPortState('p1', 'available', 'actor-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when transitioning to same state', async () => {
      vi.mocked(mockPrisma.port.findUniqueOrThrow).mockResolvedValueOnce({ id: 'p1', state: 'available' } as any);

      await expect(service.transitionPortState('p1', 'in_use', 'actor-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── reservePorts ─────────────────────────────────────────────────────────

  describe('reservePorts', () => {
    it('reserves all ports when all are available', async () => {
      vi.mocked(mockPrisma.port.findMany).mockResolvedValueOnce([
        { id: 'p1', state: 'available', label: '01' },
        { id: 'p2', state: 'available', label: '02' },
      ] as any);
      vi.mocked(mockPrisma.port.updateMany).mockResolvedValueOnce({ count: 2 } as any);
      vi.mocked(mockPrisma.auditEvent.createMany).mockResolvedValueOnce({ count: 2 } as any);

      const result = await service.reservePorts(['p1', 'p2'], 'actor-1', 'cable-path-1');

      expect(result).toMatchObject({ reserved: 2 });
    });

    it('rejects the entire batch if any port is unavailable', async () => {
      vi.mocked(mockPrisma.port.findMany).mockResolvedValueOnce([
        { id: 'p1', state: 'available', label: '01' },
        { id: 'p2', state: 'in_use', label: '02' },
      ] as any);

      await expect(service.reservePorts(['p1', 'p2'], 'actor-1', 'cable-path-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── releasePorts ─────────────────────────────────────────────────────────

  describe('releasePorts', () => {
    it('transitions reserved ports back to available', async () => {
      vi.mocked(mockPrisma.port.updateMany).mockResolvedValueOnce({ count: 2 } as any);
      vi.mocked(mockPrisma.auditEvent.createMany).mockResolvedValueOnce({ count: 2 } as any);

      const result = await service.releasePorts(['p1', 'p2'], 'actor-1');

      expect(result).toMatchObject({ released: 2 });
      const updateCall = vi.mocked(mockPrisma.port.updateMany).mock.calls[0][0];
      expect((updateCall as any).data.state).toBe('available');
    });
  });
});
