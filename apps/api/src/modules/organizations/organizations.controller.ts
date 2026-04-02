import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateOrganizationDto,
  CreateUserDto,
  ListOrganizationsDto,
  UpdateOrganizationDto,
  UpdateUserRoleDto,
} from './dto/organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly svc: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List organizations (paginated, filterable)' })
  findAll(@Query(new ZodValidationPipe(ListOrganizationsDto)) query: ListOrganizationsDto) {
    return this.svc.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by id' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: 'Create a new organization' })
  create(@Body(new ZodValidationPipe(CreateOrganizationDto)) dto: CreateOrganizationDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update organization name / contact info' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateOrganizationDto)) dto: UpdateOrganizationDto,
  ) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Soft-deactivate an organization (sets isActive=false)' })
  deactivate(@Param('id') id: string) {
    return this.svc.deactivate(id);
  }

  // -- Users sub-resource ----------------------------------------------------

  @Get(':orgId/users')
  @Roles('super_admin', 'ops_manager', 'ops_technician', 'customer_admin')
  @ApiOperation({ summary: 'List users in an organization' })
  listUsers(@Param('orgId') orgId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.svc.listUsers(orgId, actor);
  }

  @Post(':orgId/users')
  @Roles('super_admin', 'customer_admin')
  @ApiOperation({ summary: 'Create a user and assign to an organization' })
  createUser(
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(CreateUserDto)) dto: CreateUserDto,
  ) {
    return this.svc.createUser(orgId, dto);
  }

  @Patch('users/:userId/deactivate')
  @Roles('super_admin', 'customer_admin')
  @ApiOperation({ summary: 'Deactivate a user account' })
  deactivateUser(@Param('userId') userId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.svc.deactivateUser(userId, actor);
  }

  @Get('users/:userId')
  @Roles('super_admin', 'ops_manager', 'ops_technician', 'customer_admin')
  @ApiOperation({ summary: 'Get a single user by id' })
  getUser(@Param('userId') userId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.svc.getUser(userId, actor);
  }

  @Patch('users/:userId/role')
  @Roles('super_admin', 'customer_admin')
  @ApiOperation({ summary: 'Update a user role' })
  updateUserRole(
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(UpdateUserRoleDto)) dto: UpdateUserRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.svc.updateUserRole(userId, dto, actor);
  }

  @Patch('users/:userId/reactivate')
  @Roles('super_admin', 'customer_admin')
  @ApiOperation({ summary: 'Reactivate a deactivated user account' })
  reactivateUser(@Param('userId') userId: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.svc.reactivateUser(userId, actor);
  }
}
