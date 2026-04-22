import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { DedicatedXcService } from './dedicated-xc.service';
import {
  AddDedicatedXcHopDto,
  CreateDedicatedXcDto,
  ListDedicatedXcDto,
  UpdateDedicatedXcDto,
} from './dto/dedicated-xc.dto';

@ApiTags('sp/cross-connects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'sp_admin', 'sp_ops', 'sp_viewer', 'sp_report')
@Controller('sp/cross-connects')
export class DedicatedXcController {
  constructor(private readonly svc: DedicatedXcService) {}

  @Get()
  @ApiOperation({ summary: 'List dedicated cross connects for the authenticated org' })
  list(
    @Query(new ZodValidationPipe(ListDedicatedXcDto)) query: ListDedicatedXcDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single dedicated cross connect with hops' })
  getOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.getOne(id, user);
  }

  @Post()
  @Roles('super_admin', 'sp_admin', 'sp_ops')
  @ApiOperation({ summary: 'Create a new dedicated cross connect' })
  create(
    @Body(new ZodValidationPipe(CreateDedicatedXcDto)) dto: CreateDedicatedXcDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.create(dto, user);
  }

  @Patch(':id')
  @Roles('super_admin', 'sp_admin', 'sp_ops')
  @ApiOperation({ summary: 'Update a dedicated cross connect (sp_ops: draft + own only)' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDedicatedXcDto)) dto: UpdateDedicatedXcDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('super_admin', 'sp_admin', 'sp_ops')
  @ApiOperation({ summary: 'Soft-delete a cross connect (sp_ops: draft + own only)' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.remove(id, user);
  }

  @Post(':id/hops')
  @Roles('super_admin', 'sp_admin', 'sp_ops')
  @ApiOperation({ summary: 'Add a hop to a cross connect' })
  addHop(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddDedicatedXcHopDto)) dto: AddDedicatedXcHopDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.addHop(id, dto, user);
  }

  @Delete(':id/hops/:hopId')
  @Roles('super_admin', 'sp_admin', 'sp_ops')
  @ApiOperation({ summary: 'Remove a hop and renumber remaining hops' })
  removeHop(
    @Param('id') id: string,
    @Param('hopId') hopId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.removeHop(id, hopId, user);
  }
}
