import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OrdersService } from './orders.service';

const mockAuditEvent = { create: vi.fn(), createMany: vi.fn() };

const makeTransaction = (fn: any) =>
  fn({
    crossConnectOrder: mockOrder,
    crossConnectService: mockService,
    orderEndpoint: mockEndpoint,
    auditEvent: mockAuditEvent,
  });

const mockOrder: any = {
  findMany: vi.fn(),
  count: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};
const mockService: any = { create: vi.fn() };
const mockEndpoint: any = { createMany: vi.fn() };

const mockPrisma = {
  crossConnectOrder: mockOrder,
  crossConnectService: mockService,
  $transaction: vi.fn((fn: any) => makeTransaction(fn)),
} as unknown as PrismaService;

const mockAudit = { log: vi.fn() } as unknown as AuditService;

const operator: AuthenticatedUser = {
  id: 'actor-mgr',
  email: 'mgr@dc.com',
  role: 'ops_manager',
  orgId: 'org-ops',
};
const customer: AuthenticatedUser = {
  id: 'actor-cust',
  email: 'cust@co.com',
  role: 'customer_admin',
  orgId: 'org-cust',
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(() => {
    service = new OrdersService(mockPrisma, mockAudit);
    vi.clearAllMocks();
    mockAuditEvent.create.mockResolvedValue({});
    mockEndpoint.createMany.mockResolvedValue({});
  });

  // ── createOrder ───────────────────────────────────────────────────────────

  describe('createOrder', () => {
    const dto = {
      serviceType: 'customer_to_carrier' as const,
      mediaType: 'smf' as const,
      isTemporary: false,
      aSide: { endpointType: 'customer' as const },
      zSide: { endpointType: 'carrier' as const },
    };

    it('creates an order in draft state with generated order number', async () => {
      const createdOrder = { id: 'order-1', orderNumber: 'XCO-2026-12345', state: 'draft' };
      mockOrder.create.mockResolvedValueOnce(createdOrder);

      const result = await service.createOrder(dto, customer);

      expect(result).toMatchObject({ state: 'draft' });
      expect(mockOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ state: 'draft', requestingOrgId: customer.orgId }),
        }),
      );
    });

    it('creates A-side and Z-side endpoints in the same transaction', async () => {
      mockOrder.create.mockResolvedValueOnce({ id: 'order-1', state: 'draft' });

      await service.createOrder(dto, customer);

      expect(mockEndpoint.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ side: 'a_side' }),
            expect.objectContaining({ side: 'z_side' }),
          ]),
        }),
      );
    });
  });

  // ── submitOrder ───────────────────────────────────────────────────────────

  describe('submitOrder', () => {
    it('transitions draft → submitted', async () => {
      mockOrder.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'o1',
        state: 'draft',
        requestingOrgId: customer.orgId,
      });
      mockOrder.update.mockResolvedValueOnce({ id: 'o1', state: 'submitted' });

      const result = await service.submitOrder('o1', customer);

      expect(result).toMatchObject({ state: 'submitted' });
    });

    it('throws BadRequestException when order is not in draft state', async () => {
      mockOrder.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'o1',
        state: 'submitted',
        requestingOrgId: customer.orgId,
      });

      await expect(service.submitOrder('o1', customer)).rejects.toThrow(BadRequestException);
    });

    it("throws ForbiddenException when customer submits another org's order", async () => {
      mockOrder.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'o1',
        state: 'draft',
        requestingOrgId: 'org-other',
      });

      await expect(service.submitOrder('o1', customer)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── reviewOrder ───────────────────────────────────────────────────────────

  describe('reviewOrder', () => {
    it('transitions submitted → under_review', async () => {
      mockOrder.findUniqueOrThrow.mockResolvedValueOnce({ id: 'o1', state: 'submitted' });
      mockOrder.update.mockResolvedValueOnce({ id: 'o1', state: 'under_review' });

      const result = await service.reviewOrder('o1', operator);

      expect(result).toMatchObject({ state: 'under_review' });
    });

    it('throws BadRequestException for non-submitted order', async () => {
      mockOrder.findUniqueOrThrow.mockResolvedValueOnce({ id: 'o1', state: 'draft' });

      await expect(service.reviewOrder('o1', operator)).rejects.toThrow(BadRequestException);
    });
  });

  // ── approveOrder ───────────────────────────────────────────────────────────

  describe('approveOrder', () => {
    it('transitions pending_approval → approved and creates CrossConnectService', async () => {
      mockOrder.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'o1',
        state: 'pending_approval',
        serviceType: 'customer_to_carrier',
        mediaType: 'smf',
        speedGbps: null,
        isTemporary: false,
        requestedExpiresAt: null,
      });
      mockOrder.update.mockResolvedValueOnce({ id: 'o1', state: 'approved' });
      mockService.create.mockResolvedValueOnce({
        id: 'svc-1',
        serviceNumber: 'XC-2026-00001',
        state: 'provisioning',
      });

      const result = await service.approveOrder('o1', {}, operator);

      expect(result.order).toMatchObject({ state: 'approved' });
      expect(result.service).toMatchObject({ state: 'provisioning' });
      expect(mockService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ state: 'provisioning', orderId: 'o1' }),
        }),
      );
    });

    it('throws BadRequestException for non-pending_approval order', async () => {
      mockOrder.findUniqueOrThrow.mockResolvedValueOnce({ id: 'o1', state: 'under_review' });

      await expect(service.approveOrder('o1', {}, operator)).rejects.toThrow(BadRequestException);
    });
  });

  // ── rejectOrder ───────────────────────────────────────────────────────────

  describe('rejectOrder', () => {
    it('transitions pending_approval → rejected with reason', async () => {
      mockOrder.findUniqueOrThrow.mockResolvedValueOnce({ id: 'o1', state: 'pending_approval' });
      mockOrder.update.mockResolvedValueOnce({ id: 'o1', state: 'rejected' });

      const result = await service.rejectOrder(
        'o1',
        { rejectionReason: 'No port capacity at site' },
        operator,
      );

      expect(result).toMatchObject({ state: 'rejected' });
      expect(mockOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ rejectionReason: 'No port capacity at site' }),
        }),
      );
    });
  });

  // ── cancelOrder ───────────────────────────────────────────────────────────

  describe('cancelOrder', () => {
    it('cancels a submitted order', async () => {
      mockOrder.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'o1',
        state: 'submitted',
        requestingOrgId: customer.orgId,
      });
      mockOrder.update.mockResolvedValueOnce({ id: 'o1', state: 'cancelled' });

      const result = await service.cancelOrder(
        'o1',
        { cancelledReason: 'Customer withdrew request' },
        customer,
      );

      expect(result).toMatchObject({ state: 'cancelled' });
    });

    it('throws BadRequestException for terminal states', async () => {
      mockOrder.findUniqueOrThrow.mockResolvedValueOnce({
        id: 'o1',
        state: 'approved',
        requestingOrgId: customer.orgId,
      });

      await expect(
        service.cancelOrder('o1', { cancelledReason: 'Test' }, customer),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
