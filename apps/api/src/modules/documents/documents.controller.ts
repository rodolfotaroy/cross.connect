import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  @Post('orders/:orderId/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document for an order (LOA, CFA, etc.)' })
  uploadForOrder(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('docType') docType: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.upload(
      {
        file: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        docType: docType ?? 'other',
        uploadedById: user.id,
        orderId,
      },
      user,
    );
  }

  @Post('work-orders/:woId/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document for a work order (test result, photo)' })
  uploadForWorkOrder(
    @Param('woId') woId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('docType') docType: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.svc.upload(
      {
        file: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        docType: docType ?? 'photo',
        uploadedById: user.id,
        workOrderId: woId,
      },
      user,
    );
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Get a presigned download URL (1-hour expiry)' })
  getDownloadUrl(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.getDownloadUrl(id, user);
  }

  @Get('orders/:orderId')
  listForOrder(@Param('orderId') orderId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.listForOrder(orderId, user);
  }

  @Get('work-orders/:woId')
  listForWorkOrder(@Param('woId') woId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.listForWorkOrder(woId, user);
  }
}
