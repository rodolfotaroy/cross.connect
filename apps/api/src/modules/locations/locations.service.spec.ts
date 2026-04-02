import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { LocationsService } from './locations.service';

const mockPrisma = {
  panel: {
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  port: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    createMany: vi.fn(),
    create: vi.fn(),
  },
  datacenter: {
    findMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
  },
  room: { findUniqueOrThrow: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  rack: { findUniqueOrThrow: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  cage: { findMany: vi.fn(), create: vi.fn() },
} as unknown as PrismaService;

describe('LocationsService', () => {
  let service: LocationsService;

  beforeEach(() => {
    service = new LocationsService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('createPort', () => {
    it('throws ConflictException if label already exists on panel', async () => {
      vi.mocked(mockPrisma.port.findUnique).mockResolvedValueOnce({ id: 'existing' } as any);

      await expect(
        service.createPort('panel-1', {
          label: '01',
          position: 1,
          mediaType: 'smf',
          connectorType: 'lc',
          strandRole: 'tx',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates port when label is unique', async () => {
      vi.mocked(mockPrisma.port.findUnique).mockResolvedValueOnce(null);
      vi.mocked(mockPrisma.port.create).mockResolvedValueOnce({
        id: 'new-port',
        label: '01',
      } as any);

      const result = await service.createPort('panel-1', {
        label: '01',
        position: 1,
        mediaType: 'smf',
        connectorType: 'lc',
        strandRole: 'tx',
      });

      expect(result).toMatchObject({ id: 'new-port' });
    });
  });

  describe('bulkCreatePorts', () => {
    it('generates alternating tx/rx strand roles when alternateTxRx=true', async () => {
      vi.mocked(mockPrisma.panel.findUniqueOrThrow).mockResolvedValueOnce({ id: 'panel-1' } as any);
      vi.mocked(mockPrisma.port.createMany).mockResolvedValueOnce({ count: 4 } as any);
      vi.mocked(mockPrisma.port.findMany).mockResolvedValueOnce([]);

      await service.bulkCreatePorts('panel-1', {
        count: 4,
        mediaType: 'smf',
        connectorType: 'lc',
        labelPrefix: '',
        alternateTxRx: true,
        startPosition: 1,
      });

      const createManyCall = vi.mocked(mockPrisma.port.createMany).mock.calls[0][0];
      const data = (createManyCall as any).data;
      expect(data[0].strandRole).toBe('tx');
      expect(data[1].strandRole).toBe('rx');
      expect(data[2].strandRole).toBe('tx');
      expect(data[3].strandRole).toBe('rx');
    });
  });
});
