import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { StorageService } from '../../infrastructure/storage/storage.service';

const OPERATOR_ROLES = new Set(['super_admin', 'ops_manager', 'ops_technician']);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'text/csv',
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    params: {
      file: Buffer;
      filename: string;
      mimeType: string;
      sizeBytes: number;
      docType: string;
      uploadedById: string;
      orderId?: string;
      workOrderId?: string;
    },
    actor: AuthenticatedUser,
  ) {
    if (!ALLOWED_MIME_TYPES.has(params.mimeType)) {
      throw new BadRequestException(
        `File type '${params.mimeType}' is not allowed. Accepted: PDF, JPEG, PNG, XLSX, CSV`,
      );
    }
    if (params.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds maximum allowed size of 50 MB');
    }

    // Non-operators may only upload to orders/work-orders belonging to their own org.
    if (!OPERATOR_ROLES.has(actor.role)) {
      if (params.orderId) {
        const order = await this.prisma.crossConnectOrder.findUnique({
          where: { id: params.orderId },
          select: { requestingOrgId: true },
        });
        if (!order || order.requestingOrgId !== actor.orgId) {
          throw new ForbiddenException('Access denied');
        }
      } else if (params.workOrderId) {
        const wo = await this.prisma.workOrder.findUnique({
          where: { id: params.workOrderId },
          include: { service: { include: { order: { select: { requestingOrgId: true } } } } },
        });
        if (!wo || wo.service.order.requestingOrgId !== actor.orgId) {
          throw new ForbiddenException('Access denied');
        }
      }
    }

    const s3Key = this.storage.buildKey(
      params.docType,
      params.orderId ?? params.workOrderId ?? 'misc',
      params.filename,
    );
    await this.storage.upload(s3Key, params.file, params.mimeType);

    return this.prisma.document.create({
      data: {
        uploadedById: params.uploadedById,
        filename: params.filename,
        s3Key,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        docType: params.docType as any,
        orderId: params.orderId,
        workOrderId: params.workOrderId,
      },
    });
  }

  async getDownloadUrl(id: string, actor: AuthenticatedUser) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        order: { select: { requestingOrgId: true } },
        workOrder: {
          select: { service: { select: { order: { select: { requestingOrgId: true } } } } },
        },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');

    // Operators (super_admin, ops_manager, ops_technician) can download any document.
    // Customer roles can only download documents belonging to their own org.
    const isOperator = ['super_admin', 'ops_manager', 'ops_technician'].includes(actor.role);
    if (!isOperator) {
      const docOrgId =
        doc.order?.requestingOrgId ??
        (doc.workOrder as any)?.service?.order?.requestingOrgId ??
        null;
      if (docOrgId !== actor.orgId) {
        throw new ForbiddenException('Access denied');
      }
    }

    const url = await this.storage.getPresignedDownloadUrl(doc.s3Key, 3600);
    return { id: doc.id, filename: doc.filename, downloadUrl: url, expiresInSeconds: 3600 };
  }

  async listForOrder(orderId: string, actor: AuthenticatedUser) {
    if (!OPERATOR_ROLES.has(actor.role)) {
      const order = await this.prisma.crossConnectOrder.findUnique({
        where: { id: orderId },
        select: { requestingOrgId: true },
      });
      if (!order || order.requestingOrgId !== actor.orgId) {
        throw new ForbiddenException('Access denied');
      }
    }
    return this.prisma.document.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForWorkOrder(workOrderId: string, actor: AuthenticatedUser) {
    if (!OPERATOR_ROLES.has(actor.role)) {
      const wo = await this.prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: { service: { include: { order: { select: { requestingOrgId: true } } } } },
      });
      if (!wo || wo.service.order.requestingOrgId !== actor.orgId) {
        throw new ForbiddenException('Access denied');
      }
    }
    return this.prisma.document.findMany({
      where: { workOrderId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
