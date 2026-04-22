import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateSupportTicketSchema,
  CreateTicketCommentSchema,
  ListSupportTicketsSchema,
  UpdateTicketStatusSchema,
} from '@xc/types/api';
import { z } from 'zod';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { SupportService } from './support.service';

const CreateOpTicketSchema = CreateSupportTicketSchema.extend({
  orgId: z.string().cuid(),
});

@ApiTags('op/support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'ops_manager', 'ops_technician')
@Controller('op/support')
export class OpSupportController {
  constructor(private readonly svc: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List all support tickets (operator view — all orgs, all portals)' })
  list(
    @Query(new ZodValidationPipe(ListSupportTicketsSchema))
    query: typeof ListSupportTicketsSchema._type,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.listTickets(user, query);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get ticket detail' })
  getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.getTicket(id, user);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Create an OP-prefixed ticket for an organization' })
  create(
    @Body(new ZodValidationPipe(CreateOpTicketSchema))
    dto: z.infer<typeof CreateOpTicketSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { orgId, ...ticketDto } = dto;
    return this.svc.createTicketForOrg(ticketDto, orgId, user);
  }

  @Patch('tickets/:id/status')
  @ApiOperation({ summary: 'Update ticket status (operator roles)' })
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTicketStatusSchema))
    dto: typeof UpdateTicketStatusSchema._type,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.updateTicketStatusOp(id, dto, user);
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
