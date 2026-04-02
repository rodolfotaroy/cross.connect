import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { OrganizationsService } from './organizations.service';

const mockPrisma = {
  organization: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaService;

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(() => {
    service = new OrganizationsService(mockPrisma);
    vi.clearAllMocks();
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated results with meta', async () => {
      const orgs = [{ id: 'org-1', name: 'Acme', code: 'ACME' }];
      vi.mocked(mockPrisma.organization.findMany).mockResolvedValueOnce(orgs as any);
      vi.mocked(mockPrisma.organization.count).mockResolvedValueOnce(1);

      const result = await service.findAll({ page: 1, limit: 20, sortDir: 'asc' });

      expect(result.data).toEqual(orgs);
      expect(result.meta).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('applies orgType filter', async () => {
      vi.mocked(mockPrisma.organization.findMany).mockResolvedValueOnce([]);
      vi.mocked(mockPrisma.organization.count).mockResolvedValueOnce(0);

      await service.findAll({ page: 1, limit: 20, sortDir: 'asc', orgType: 'customer' });

      const call = vi.mocked(mockPrisma.organization.findMany).mock.calls[0][0];
      expect((call as any).where.orgType).toBe('customer');
    });

    it('applies substring search when q is provided', async () => {
      vi.mocked(mockPrisma.organization.findMany).mockResolvedValueOnce([]);
      vi.mocked(mockPrisma.organization.count).mockResolvedValueOnce(0);

      await service.findAll({ page: 1, limit: 20, sortDir: 'asc', q: 'test' });

      const call = vi.mocked(mockPrisma.organization.findMany).mock.calls[0][0];
      expect((call as any).where.OR).toBeDefined();
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = { name: 'Acme Corp', code: 'ACME', orgType: 'customer' as const };

    it('creates organization when code is unique', async () => {
      vi.mocked(mockPrisma.organization.findUnique).mockResolvedValueOnce(null);
      vi.mocked(mockPrisma.organization.create).mockResolvedValueOnce({ id: 'org-1', ...dto } as any);

      const result = await service.create(dto);

      expect(result).toMatchObject({ id: 'org-1' });
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({ data: dto });
    });

    it('throws ConflictException when code already exists', async () => {
      vi.mocked(mockPrisma.organization.findUnique).mockResolvedValueOnce({ id: 'existing' } as any);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates organization fields', async () => {
      vi.mocked(mockPrisma.organization.findUniqueOrThrow).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(mockPrisma.organization.update).mockResolvedValueOnce({ id: 'org-1', name: 'New Name' } as any);

      const result = await service.update('org-1', { name: 'New Name' });

      expect(result).toMatchObject({ name: 'New Name' });
    });
  });

  // ── deactivate ───────────────────────────────────────────────────────────

  describe('deactivate', () => {
    it('sets isActive to false', async () => {
      vi.mocked(mockPrisma.organization.update).mockResolvedValueOnce({ id: 'org-1', isActive: false } as any);

      await service.deactivate('org-1');

      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { isActive: false },
      });
    });
  });

  // ── createUser ───────────────────────────────────────────────────────────

  describe('createUser', () => {
    const dto = {
      email: 'user@example.com',
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'customer_admin' as const,
    };

    it('throws ConflictException when email already exists', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValueOnce({ id: 'existing' } as any);

      await expect(service.createUser('org-1', dto)).rejects.toThrow(ConflictException);
    });

    it('hashes password before persisting', async () => {
      vi.mocked(mockPrisma.user.findUnique).mockResolvedValueOnce(null);
      vi.mocked(mockPrisma.organization.findUniqueOrThrow).mockResolvedValueOnce({ id: 'org-1' } as any);
      vi.mocked(mockPrisma.user.create).mockResolvedValueOnce({ id: 'user-1', email: dto.email } as any);

      await service.createUser('org-1', dto);

      const createCall = vi.mocked(mockPrisma.user.create).mock.calls[0][0];
      // password must not be stored in plain text
      expect((createCall as any).data.passwordHash).toBeDefined();
      expect((createCall as any).data.passwordHash).not.toBe(dto.password);
      expect((createCall as any).data.password).toBeUndefined();
    });
  });
});
