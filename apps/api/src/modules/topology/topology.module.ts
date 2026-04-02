import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { TopologyController } from './topology.controller';
import { TopologyService } from './topology.service';

@Module({
  imports: [InventoryModule, AuditModule, ReservationsModule],
  providers: [TopologyService],
  controllers: [TopologyController],
  exports: [TopologyService],
})
export class TopologyModule {}
