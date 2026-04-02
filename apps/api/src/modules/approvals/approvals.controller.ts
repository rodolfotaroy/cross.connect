import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DecideApprovalDto } from './dto/approval.dto';
import { ApprovalsService } from './approvals.service';

@ApiTags('approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'ops_manager')
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly svc: ApprovalsService) {}

  @Get('queue')
  @ApiOperation({ summary: 'Get pending approval queue (oldest first)' })
  queue() { return this.svc.getPendingQueue(); }

  @Get(':id')
  @ApiOperation({ summary: 'Get an individual approval request with full step history' })
  getOne(@Param('id') id: string) { return this.svc.getApproval(id); }

  @Post(':id/decide')
  @ApiOperation({ summary: 'Record approval decision (approved | rejected | deferred)' })
  decide(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(DecideApprovalDto)) dto: DecideApprovalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.decide(id, dto, user);
  }
}
