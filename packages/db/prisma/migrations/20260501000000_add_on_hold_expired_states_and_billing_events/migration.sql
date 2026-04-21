-- Migration: add_on_hold_expired_states_and_billing_events
-- Adds:
--   • on_hold to OrderState enum
--   • on_hold to WorkOrderState enum
--   • expired to ServiceState enum
--   • service_suspended, service_resumed, service_expired to BillingEventType enum
--   • refreshTokenHash and refreshTokenExpiresAt to User table

-- OrderState: add on_hold
ALTER TYPE "OrderState" ADD VALUE IF NOT EXISTS 'on_hold';

-- WorkOrderState: add on_hold
ALTER TYPE "WorkOrderState" ADD VALUE IF NOT EXISTS 'on_hold';

-- ServiceState: add expired
ALTER TYPE "ServiceState" ADD VALUE IF NOT EXISTS 'expired';

-- BillingEventType: add suspension/expiry events
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'service_suspended';
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'service_resumed';
ALTER TYPE "BillingEventType" ADD VALUE IF NOT EXISTS 'service_expired';

-- User: refresh token rotation support
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "refreshTokenHash"      TEXT,
  ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP(3);
