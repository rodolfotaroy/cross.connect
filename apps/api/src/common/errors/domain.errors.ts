import { HttpException, HttpStatus } from '@nestjs/common';

/** Thrown when a caller attempts a transition not defined in the state machine. */
export class InvalidTransitionError extends HttpException {
  constructor(current: string, attempted: string, entityType?: string) {
    const entity = entityType ? `${entityType} ` : '';
    super(
      `Invalid ${entity}transition: ${current} → ${attempted}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/** Thrown when a guard condition blocks a valid transition. */
export class TransitionGuardError extends HttpException {
  constructor(reason: string) {
    super(reason, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

/** Thrown when a port cannot be reserved because it is already in use or not available. */
export class PortNotAvailableError extends HttpException {
  constructor(portId: string, currentState: string) {
    super(
      `Port ${portId} is not available for reservation (current state: ${currentState})`,
      HttpStatus.CONFLICT,
    );
  }
}

/** Thrown when a port conflict is detected under a concurrent reservation attempt. */
export class PortReservationConflictError extends HttpException {
  constructor(portId: string) {
    super(
      `Port ${portId} was claimed by a concurrent request. Retry with a different port.`,
      HttpStatus.CONFLICT,
    );
  }
}

/** Thrown when the actor's role does not satisfy a guard requirement. */
export class InsufficientRoleError extends HttpException {
  constructor(required: string | string[], actual?: string) {
    const req = Array.isArray(required) ? required.join(' or ') : required;
    const got = actual ? ` (has: ${actual})` : '';
    super(`Action requires role: ${req}${got}`, HttpStatus.FORBIDDEN);
  }
}

/** Thrown when required data (e.g. rejection reason, tech notes) is missing for a transition. */
export class MissingTransitionDataError extends HttpException {
  constructor(field: string) {
    super(`${field} is required to perform this transition`, HttpStatus.BAD_REQUEST);
  }
}
