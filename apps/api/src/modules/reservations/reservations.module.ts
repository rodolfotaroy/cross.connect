// Reservations is a pure service module — no HTTP controller.
// It is the authoritative source for transactional port reservation/release logic.
// Other modules (topology, work-orders) call this service rather than writing
// port state changes directly.

import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PortReservationService } from './port-reservation.service';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [AuditModule],
  providers: [ReservationsService, PortReservationService],
  exports: [ReservationsService, PortReservationService],
})
export class ReservationsModule {}
