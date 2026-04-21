import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ServiceExpiryJob } from './service-expiry.job';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  imports: [AuditModule, ReservationsModule],
  providers: [OrdersService, ServicesService, ServiceExpiryJob],
  controllers: [OrdersController, ServicesController],
  exports: [OrdersService, ServicesService],
})
export class CrossConnectsModule {}
