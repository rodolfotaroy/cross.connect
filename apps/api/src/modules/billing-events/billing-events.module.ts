import { Module } from '@nestjs/common';
import { BillingEventsController } from './billing-events.controller';
import { BillingEventsService } from './billing-events.service';

@Module({
  providers: [BillingEventsService],
  controllers: [BillingEventsController],
  exports: [BillingEventsService],
})
export class BillingEventsModule {}
