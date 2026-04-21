import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateSpUserSchema, UpdateSpUserSchema } from '@xc/types/api';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { SpTeamService } from './sp-team.service';

@ApiTags('sp/team')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('sp_admin')
@Controller('sp/team')
export class SpTeamController {
  constructor(private readonly svc: SpTeamService) {}

  @Get()
  @ApiOperation({ summary: 'List all users in the dedicated org' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.listUsers(user);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get a single team member' })
  getOne(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.getUser(userId, user);
  }

  @Post()
  @ApiOperation({ summary: 'Invite / create a new user in the dedicated org' })
  create(
    @Body(new ZodValidationPipe(CreateSpUserSchema)) dto: typeof CreateSpUserSchema._type,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.createUser(dto, user);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update a user role or name (cannot change own role)' })
  update(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(UpdateSpUserSchema)) dto: typeof UpdateSpUserSchema._type,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.updateUser(userId, dto, user);
  }

  @Patch(':userId/deactivate')
  @ApiOperation({ summary: 'Deactivate a user (cannot deactivate self)' })
  deactivate(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.deactivateUser(userId, user);
  }

  @Patch(':userId/reactivate')
  @ApiOperation({ summary: 'Reactivate a previously deactivated user' })
  reactivate(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.reactivateUser(userId, user);
  }
}
