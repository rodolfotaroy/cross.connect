import {
  BadRequestException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PortReservationService } from '../reservations/port-reservation.service';
import { ServicesService } from './services.service';

const makeTx = (mocks: any) => (fn: any) => fn(mocks);

const mockSvcRecord: any = {
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
};
const mockWorkOrder: any = { count: vi.fn() };
const mockCablePath: any = { count: vi.fn() };
const mockAuditEvent: any = { create: vi.fn() };

const txMocks = {
  crossConnectService: mockSvcRecord,
  auditEvent: mockAuditEvent,
};

const mockPrisma = {
  crossConnectService: mockSvcRecord,
  workOrder: mockWorkOrder,
  cablePath: mockCablePath,
  $transaction: vi.fn((fn: any) => makeTx(txMocks)(fn)),
} as unknown as PrismaService;

const mockAudit = {} as unknown as AuditService;

const mockPortReservations = {
  releasePorts: vi.fn().mockResolvedValue(undefined),
} as unknown as PortReservationService;

const opsManager: AuthenticatedUser = {
  id: 'actor-mgr',
  email: 'mgr@dc.com',
  role: 'ops_manager',
  orgId: 'org-ops',
};
const custAdmin: AuthenticatedUser = {
  id: 'actor-cust',
  email: 'cust@co.com',
  role: 'customer_admin',
  orgId: 'org-cust',
};

describe('ServicesService', () => {
  let service: ServicesService;

  beforeEach(() => {
    service = new ServicesService(mockPrisma, mockAudit, mockPortReservations);
    vi.clearAllMocks();
    mockAuditEvent.create.mockResolvedValue({});
    mockWorkOrder.count.mockResolvedValue(0);
    mockCablePath.count.mockResolvedValue(0);
  });

  // ── disconnect ────────────────────────────────────────────────────────────

  describe('disconnect', () => {
    it('transitions active → pending_disconnect for ops_manager', async () => {
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'active',
        isTemporary: false,
        expiresAt: null,
      });
      mockSvcRecord.update.mockResolvedValue({ id: 'svc-1', state: 'pending_disconnect' });

      const result = await service.disconnect(
        'svc-1',
        { reason: 'Customer requested disconnection' },
        opsManager,
      );

      expect(result).toMatchObject({ state: 'pending_disconnect' });
    });

    it('throws ForbiddenException when customer_user role attempts disconnect', async () => {
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'active',
        isTemporary: false,
        expiresAt: null,
      });

      const readOnly: AuthenticatedUser = { ...custAdmin, role: 'customer_viewer' };

      await expect(service.disconnect('svc-1', { reason: 'Test' }, readOnly)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when service is not active', async () => {
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'suspended',
        isTemporary: false,
        expiresAt: null,
      });

      await expect(service.disconnect('svc-1', { reason: 'Test' }, opsManager)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── suspend / resume ──────────────────────────────────────────────────────

  describe('suspend', () => {
    it('transitions active → suspended', async () => {
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'active',
        isTemporary: false,
        expiresAt: null,
      });
      mockSvcRecord.update.mockResolvedValue({ id: 'svc-1', state: 'suspended' });

      const result = await service.suspend('svc-1', { reason: 'Non-payment' }, opsManager);

      expect(result).toMatchObject({ state: 'suspended' });
    });

    it('throws BadRequestException when service is not active', async () => {
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'provisioning',
        isTemporary: false,
        expiresAt: null,
      });

      await expect(service.suspend('svc-1', { reason: 'Test' }, opsManager)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resume', () => {
    it('transitions suspended → active', async () => {
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'suspended',
        isTemporary: false,
        expiresAt: null,
      });
      mockSvcRecord.update.mockResolvedValue({ id: 'svc-1', state: 'active' });

      const result = await service.resume('svc-1', opsManager);

      expect(result).toMatchObject({ state: 'active' });
    });

    it('throws when trying to resume a non-suspended service', async () => {
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'active',
        isTemporary: false,
        expiresAt: null,
      });

      await expect(service.resume('svc-1', opsManager)).rejects.toThrow();
    });
  });

  // ── extend ────────────────────────────────────────────────────────────────

  describe('extend', () => {
    it('extends a temporary service to a later date', async () => {
      const currentExpiry = new Date('2026-06-01T00:00:00Z');
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'active',
        isTemporary: true,
        expiresAt: currentExpiry,
      });
      mockSvcRecord.update.mockResolvedValue({
        id: 'svc-1',
        expiresAt: new Date('2026-09-01T00:00:00Z'),
      });

      const result = await service.extend(
        'svc-1',
        { newExpiresAt: '2026-09-01T00:00:00Z' },
        opsManager,
      );

      expect(mockSvcRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expiresAt: new Date('2026-09-01T00:00:00Z') }),
        }),
      );
    });

    it('throws BadRequestException for a permanent service', async () => {
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'active',
        isTemporary: false,
        expiresAt: null,
      });

      await expect(
        service.extend('svc-1', { newExpiresAt: '2026-09-01T00:00:00Z' }, opsManager),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when new date is not later than current expiry', async () => {
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'active',
        isTemporary: true,
        expiresAt: new Date('2026-09-01T00:00:00Z'),
      });

      await expect(
        service.extend('svc-1', { newExpiresAt: '2026-06-01T00:00:00Z' }, opsManager),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── abortProvisioning ─────────────────────────────────────────────────────

  describe('abortProvisioning', () => {
    it('transitions provisioning → disconnected when no WO has started', async () => {
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'provisioning',
        isTemporary: false,
        expiresAt: null,
      });
      mockSvcRecord.update.mockResolvedValue({ id: 'svc-1', state: 'disconnected' });

      const result = await service.abortProvisioning(
        'svc-1',
        { reason: 'Order cancelled post-approval' },
        opsManager,
      );

      expect(result).toMatchObject({ state: 'disconnected' });
    });

    it('throws UnprocessableEntityException when an install WO is in progress', async () => {
      mockWorkOrder.count.mockResolvedValue(1); // active WO exists
      mockSvcRecord.findUniqueOrThrow.mockResolvedValue({
        id: 'svc-1',
        state: 'provisioning',
        isTemporary: false,
        expiresAt: null,
      });

      await expect(
        service.abortProvisioning('svc-1', { reason: 'Test' }, opsManager),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
