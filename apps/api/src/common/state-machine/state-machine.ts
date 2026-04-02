import { TransitionContext, TransitionDef } from '@xc/types';
import { InvalidTransitionError } from '../errors/domain.errors';

// ══════════════════════════════════════════════════════════════════════════════
// Generic State Machine Engine
//
// Usage:
//   const machine = new StateMachine<OrderState, OrderEntity>(ORDER_TRANSITIONS);
//   await machine.transition(order.state, 'under_review', { entity: order, actorId, actorRole });
//
// Guards are synchronous or async functions that throw a domain error on failure.
// They receive the full TransitionContext so they can inspect both the entity
// and the caller's identity.
// ══════════════════════════════════════════════════════════════════════════════

export class StateMachine<S extends string, TEntity = unknown> {
  constructor(private readonly defs: TransitionDef<S, TEntity>[]) {}

  /**
   * Validate and execute a state transition.
   * Throws InvalidTransitionError if the (from, to) pair is not defined.
   * Throws the guard's error if a guard condition is not met.
   */
  async transition(
    current: S,
    next: S,
    ctx: TransitionContext<TEntity>,
  ): Promise<void> {
    const def = this.findDef(current, next);
    if (!def) {
      throw new InvalidTransitionError(current, next);
    }
    if (def.guard) {
      await def.guard(ctx);
    }
  }

  /** Returns all valid next states reachable from `state`. */
  validTransitionsFrom(state: S): S[] {
    return this.defs
      .filter((d) => this.froms(d).includes(state))
      .map((d) => d.to);
  }

  /** Returns true if no further transitions are defined from `state`. */
  isTerminal(state: S): boolean {
    return this.validTransitionsFrom(state).length === 0;
  }

  /** Returns the definition for a (from, to) pair, or undefined if not found. */
  private findDef(current: S, next: S): TransitionDef<S, TEntity> | undefined {
    return this.defs.find(
      (d) => this.froms(d).includes(current) && d.to === next,
    );
  }

  private froms(def: TransitionDef<S, TEntity>): S[] {
    return Array.isArray(def.from)
      ? (def.from as S[])
      : [def.from as S];
  }
}

// Re-export for convenience
export { TransitionContext, TransitionDef } from '@xc/types';
