import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateSupportTicketInput,
  CreateTicketCommentInput,
  ListSupportTicketsInput,
  UpdateTicketStatusInput,
} from '@xc/types/api';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { buildPaginatedMeta } from '../../../common/pagination/paginate';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async listTickets(user: AuthenticatedUser, query: ListSupportTicketsInput) {
    const { page, limit, sortBy, sortDir, status, category } = query;
    const where: Record<string, unknown> = {};
    // super_admin sees all orgs' tickets; SP roles see only their own org
    if (user.role !== 'super_admin' && user.orgId) where['organizationId'] = user.orgId;
    if (status) where['status'] = status;
    if (category) where['category'] = category;

    const orderBy = { [sortBy ?? 'createdAt']: sortDir ?? 'desc' };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          resolvedBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { data, meta: buildPaginatedMeta(total, page, limit) };
  }

  async getTicket(ticketId: string, user: AuthenticatedUser) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, ...(user.role !== 'super_admin' && user.orgId ? { organizationId: user.orgId } : {}) },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        comments: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async createTicket(dto: CreateSupportTicketInput, user: AuthenticatedUser) {
    return this.prisma.supportTicket.create({
      data: {
        subject: dto.subject,
        description: dto.description,
        category: dto.category as any,
        priority: dto.priority as any,
        organizationId: user.orgId,
        createdById: user.id,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateTicketStatus(
    ticketId: string,
    dto: UpdateTicketStatusInput,
    user: AuthenticatedUser,
  ) {
    // Only sp_admin or super_admin can change ticket status
    if (user.role !== 'sp_admin' && user.role !== 'super_admin') {
      throw new ForbiddenException('Only sp_admin can update ticket status');
    }
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, ...(user.role !== 'super_admin' && user.orgId ? { organizationId: user.orgId } : {}) },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const data: Record<string, unknown> = { status: dto.status };
    if (dto.status === 'resolved' || dto.status === 'closed') {
      data['resolvedAt'] = new Date();
      data['resolvedById'] = user.id;
      if (dto.resolutionNote) data['resolutionNote'] = dto.resolutionNote;
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async addComment(ticketId: string, dto: CreateTicketCommentInput, user: AuthenticatedUser) {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id: ticketId, ...(user.role !== 'super_admin' && user.orgId ? { organizationId: user.orgId } : {}) },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    return this.prisma.ticketComment.create({
      data: {
        body: dto.body,
        ticketId,
        authorId: user.id,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  /** Returns app-owner contact details from environment configuration */
  getContactDetails() {
    return {
      name: process.env.SUPPORT_CONTACT_NAME ?? 'Support Team',
      email: process.env.SUPPORT_CONTACT_EMAIL ?? 'support@example.com',
      phone: process.env.SUPPORT_CONTACT_PHONE ?? null,
      hours: process.env.SUPPORT_CONTACT_HOURS ?? 'Monday–Friday, 9 AM – 5 PM',
    };
  }
}
