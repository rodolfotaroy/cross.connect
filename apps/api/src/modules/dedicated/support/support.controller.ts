import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateSupportTicketSchema,
  CreateTicketCommentSchema,
  ListSupportTicketsSchema,
  UpdateTicketStatusSchema,
} from '@xc/types/api';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { SupportService } from './support.service';

@ApiTags('sp/support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('sp_admin', 'sp_ops', 'sp_viewer', 'sp_report')
@Controller('sp/support')
export class SupportController {
  constructor(private readonly svc: SupportService) {}

  @Get('contact')
  @ApiOperation({ summary: 'Get app owner contact details' })
  contact() {
    return this.svc.getContactDetails();
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List support tickets for the authenticated org' })
  list(
    @Query(new ZodValidationPipe(ListSupportTicketsSchema))
    query: typeof ListSupportTicketsSchema._type,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.listTickets(user, query);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket detail with comments' })
  getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.getTicket(id, user);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create a new support ticket' })
  create(
    @Body(new ZodValidationPipe(CreateSupportTicketSchema))
    dto: typeof CreateSupportTicketSchema._type,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.createTicket(dto, user);
  }

  @Patch('tickets/:id/status')
  @Roles('sp_admin')
  @ApiOperation({ summary: 'Update ticket status (sp_admin only)' })
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTicketStatusSchema))
    dto: typeof UpdateTicketStatusSchema._type,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.updateTicketStatus(id, dto, user);
  }

  @Post('tickets/:id/comments')
  @ApiOperation({ summary: 'Add a comment to a ticket' })
  addComment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateTicketCommentSchema))
    dto: typeof CreateTicketCommentSchema._type,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.addComment(id, dto, user);
  }
}
