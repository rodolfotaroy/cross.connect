import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from './audit.service';

const mockPrisma = {
  auditEvent: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
} as unknown as PrismaService;

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    service = new AuditService(mockPrisma);
    vi.clearAllMocks();
  });

  // ── log ───────────────────────────────────────────────────────────────────

  describe('log', () => {
    it('persists an audit event with all required fields', async () => {
      vi.mocked(mockPrisma.auditEvent.create).mockResolvedValueOnce({ id: 'evt-1' } as any);

      await service.log({
        actorId: 'user-1',
        entityType: 'CrossConnectOrder',
        entityId: 'order-1',
        action: 'order.submitted',
        diff: { before: { state: 'draft' }, after: { state: 'submitted' } },
        orderId: 'order-1',
      });

      expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorId: 'user-1',
            entityType: 'CrossConnectOrder',
            entityId: 'order-1',
            action: 'order.submitted',
            orderId: 'order-1',
          }),
        }),
      );
    });

    it('allows null actorId for system-initiated events', async () => {
      vi.mocked(mockPrisma.auditEvent.create).mockResolvedValueOnce({ id: 'evt-2' } as any);

      await service.log({ entityType: 'Port', entityId: 'port-1', action: 'port.reserved' });

      const call = vi.mocked(mockPrisma.auditEvent.create).mock.calls[0][0];
      expect((call as any).data.actorId).toBeNull();
    });
  });

  // ── listForEntity ─────────────────────────────────────────────────────────

  describe('listForEntity', () => {
    it('returns events ordered by occurredAt descending', async () => {
      const events = [
        { id: 'e2', action: 'order.submitted', occurredAt: new Date('2026-02-02') },
        { id: 'e1', action: 'order.created', occurredAt: new Date('2026-02-01') },
      ];
      vi.mocked(mockPrisma.auditEvent.findMany).mockResolvedValueOnce(events as any);

      const result = await service.listForEntity('CrossConnectOrder', 'order-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('e2');  // most recent first
    });
  });

  // ── listForOrder ─────────────────────────────────────────────────────────

  describe('listForOrder', () => {
    it('filters by orderId', async () => {
      vi.mocked(mockPrisma.auditEvent.findMany).mockResolvedValueOnce([]);

      await service.listForOrder('order-1');

      const call = vi.mocked(mockPrisma.auditEvent.findMany).mock.calls[0][0];
      expect((call as any).where.orderId).toBe('order-1');
    });
  });

  // ── listPaginated ─────────────────────────────────────────────────────────

  describe('listPaginated', () => {
    it('returns paginated results with meta', async () => {
      const events = [{ id: 'e1', action: 'order.created' }];
      vi.mocked(mockPrisma.auditEvent.findMany).mockResolvedValueOnce(events as any);
      vi.mocked(mockPrisma.auditEvent.count).mockResolvedValueOnce(1);

      const result = await service.listPaginated({ page: 1, limit: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, limit: 50, total: 1, totalPages: 1 });
    });

    it('applies entityType filter', async () => {
      vi.mocked(mockPrisma.auditEvent.findMany).mockResolvedValueOnce([]);
      vi.mocked(mockPrisma.auditEvent.count).mockResolvedValueOnce(0);

      await service.listPaginated({ entityType: 'CrossConnectService' });

      const call = vi.mocked(mockPrisma.auditEvent.findMany).mock.calls[0][0];
      expect((call as any).where.entityType).toBe('CrossConnectService');
    });

    it('applies date range filter', async () => {
      vi.mocked(mockPrisma.auditEvent.findMany).mockResolvedValueOnce([]);
      vi.mocked(mockPrisma.auditEvent.count).mockResolvedValueOnce(0);

      await service.listPaginated({ from: '2026-01-01T00:00:00Z', to: '2026-12-31T23:59:59Z' });

      const call = vi.mocked(mockPrisma.auditEvent.findMany).mock.calls[0][0];
      expect((call as any).where.occurredAt).toBeDefined();
      expect((call as any).where.occurredAt.gte).toBeInstanceOf(Date);
    });

    it('caps limit at 200', async () => {
      vi.mocked(mockPrisma.auditEvent.findMany).mockResolvedValueOnce([]);
      vi.mocked(mockPrisma.auditEvent.count).mockResolvedValueOnce(0);

      await service.listPaginated({ limit: 9999 });

      const call = vi.mocked(mockPrisma.auditEvent.findMany).mock.calls[0][0];
      expect((call as any).take).toBeLessThanOrEqual(200);
    });
  });
});
